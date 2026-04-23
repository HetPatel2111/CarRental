import Booking from "../models/Bookings.js";
import Car from "../models/Car.js";
import { calculateBookingPrice, checkAvailbility } from "./bookingController.js";

const MAX_CHAT_MESSAGES = 10;
const DAY_IN_MS = 1000 * 60 * 60 * 24;
const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const sanitizeMessages = (messages = []) => {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && typeof message.content === "string")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content.trim().slice(0, 1500),
    }))
    .filter((message) => message.content)
    .slice(-MAX_CHAT_MESSAGES);
};

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");
const toDateOnly = (date) => new Date(date).toISOString().split("T")[0];
const addDays = (date, days) => new Date(date.getTime() + days * DAY_IN_MS);
const isObjectId = (value = "") => /^[a-f0-9]{24}$/i.test(value);
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
const getNextWeekday = (baseDate, weekdayIndex, forceNextWeek = false) => {
  const result = new Date(baseDate);
  let offset = (weekdayIndex - result.getDay() + 7) % 7;

  if (offset === 0 || forceNextWeek) {
    offset += 7;
  }

  result.setDate(result.getDate() + offset);
  return result;
};
const extractDurationDays = (text) => {
  const match = text.match(/for\s+(\d+)\s*(day|days|night|nights)/i);
  return match ? Number(match[1]) || null : null;
};
const formatDateLabel = (value) => {
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

const serializeCar = (car) => ({
  _id: String(car._id),
  brand: car.brand,
  model: car.model,
  name: `${car.brand} ${car.model}`.trim(),
  category: car.category,
  location: car.location,
  transmission: car.transmission,
  fuel_type: car.fuel_type,
  seating_capacity: car.seating_capacity,
  pricePerDay: car.pricePerDay,
  year: car.year,
  image: car.image,
  description: car.description,
});

const serializeBooking = (booking) => ({
  _id: String(booking._id),
  status: booking.status,
  paymentStatus: booking.paymentStatus,
  price: booking.price,
  pickupDate: toDateOnly(booking.pickupDate),
  returnDate: toDateOnly(booking.returnDate),
  car: booking.car
    ? serializeCar(booking.car)
    : null,
});

const responseJson = (intent, response, action, data = {}) => ({
  success: true,
  intent,
  response,
  action,
  data,
});

const resolveKnownValue = (value, options = []) => {
  const normalizedValue = normalizeString(value).toLowerCase();

  if (!normalizedValue) return null;

  const exact = options.find((option) => option.toLowerCase() === normalizedValue);
  if (exact) return exact;

  const partial = options.find(
    (option) => option.toLowerCase().includes(normalizedValue) || normalizedValue.includes(option.toLowerCase())
  );
  if (partial) return partial;

  const words = normalizedValue.split(/\s+/).filter(Boolean);
  return (
    options.find((option) => {
      const optionWords = option.toLowerCase().split(/\s+/).filter(Boolean);
      return words.some((word) => optionWords.includes(word));
    }) || null
  );
};

const extractSeatCount = (text) => {
  const patterns = [
    /(\d+)\s*[- ]?(seater|seat|seats|people|person|persons|passengers?|members?|adults?)/i,
    /for\s+(\d+)\s*(people|person|persons|passengers?|members?|adults?)/i,
    /(\d+)\s*\+\s*(people|person|persons|passengers?|members?|adults?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }

  return null;
};

const extractBudget = (text) => {
  const patterns = [
    /(?:under|below|less than|max(?:imum)?|budget|around|within|upto|up to)\s*(?:rs\.?|inr|\$)?\s*(\d{2,5})/i,
    /(?:price|budget|cost)\s*(?:is|of|around)?\s*(?:rs\.?|inr|\$)?\s*(\d{2,5})/i,
    /(?:rs\.?|inr|\$)\s*(\d{2,5})/i,
    /(\d{2,5})\s*(?:rs|inr|dollars?)?\s*(?:per day|\/day|a day)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }

  return null;
};

const cleanupLocationText = (value = "") =>
  value
    .replace(/\b(for|with|under|below|less than|budget|pickup|return|tomorrow|today|weekend|automatic|manual|diesel|petrol|electric|hybrid|book|booking|reserve|reservation)\b/gi, " ")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractExplicitLocation = (text, knownLocations = []) => {
  const directKnownMatch = resolveKnownValue(
    knownLocations.find((option) => text.toLowerCase().includes(option.toLowerCase())) || "",
    knownLocations
  );

  if (directKnownMatch) {
    return directKnownMatch;
  }

  const patterns = [
    /\b(?:in|at|from|near)\s+([a-z][a-z\s-]{1,40})(?=$|\b(?:for|with|under|below|pickup|return|on|from|to|tomorrow|today|weekend|automatic|manual|diesel|petrol|electric|hybrid|book|booking|reserve)\b)/i,
    /\blocation\s+(?:is\s+)?([a-z][a-z\s-]{1,40})(?=$|\b(?:for|with|under|below|pickup|return|on|from|to|tomorrow|today|weekend|automatic|manual|diesel|petrol|electric|hybrid|book|booking|reserve)\b)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const candidate = cleanupLocationText(match[1]);
    if (!candidate) continue;

    const matchedKnownLocation = resolveKnownValue(candidate, knownLocations);
    return matchedKnownLocation || candidate.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return null;
};

const extractDatesFromText = (text) => {
  const today = startOfToday();
  const isoDates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
  const durationDays = extractDurationDays(text);

  const buildDateRange = (pickupDate, returnDate = null) => {
    if (!pickupDate) {
      return { pickupDate: null, returnDate: null };
    }

    if (returnDate) {
      return { pickupDate, returnDate };
    }

    if (durationDays && durationDays > 0) {
      return {
        pickupDate,
        returnDate: toDateOnly(addDays(new Date(pickupDate), durationDays)),
      };
    }

    return { pickupDate, returnDate: null };
  };

  if (isoDates.length >= 2) {
    return { pickupDate: isoDates[0], returnDate: isoDates[1] };
  }

  if (isoDates.length === 1) {
    return buildDateRange(isoDates[0]);
  }

  const rangeMatch = text.match(
    /\bfrom\s+(\d{4}-\d{2}-\d{2}|today|tomorrow|day after tomorrow)\s+to\s+(\d{4}-\d{2}-\d{2}|today|tomorrow|day after tomorrow)\b/i
  );

  if (rangeMatch) {
    const pickupDate = extractDatesFromText(rangeMatch[1]).pickupDate;
    const returnDate = extractDatesFromText(rangeMatch[2]).pickupDate;
    return buildDateRange(pickupDate, returnDate);
  }

  if (/day after tomorrow/i.test(text)) {
    return buildDateRange(toDateOnly(addDays(today, 2)));
  }

  if (/tomorrow/i.test(text)) {
    return buildDateRange(toDateOnly(addDays(today, 1)));
  }

  if (/today/i.test(text)) {
    return buildDateRange(toDateOnly(today));
  }

  if (/next weekend/i.test(text)) {
    const saturday = getNextWeekday(today, 6, true);
    return buildDateRange(toDateOnly(saturday), toDateOnly(addDays(saturday, durationDays || 1)));
  }

  if (/this weekend|weekend/i.test(text)) {
    const saturday = getNextWeekday(today, 6);
    return buildDateRange(toDateOnly(saturday), toDateOnly(addDays(saturday, durationDays || 1)));
  }

  const weekdayRegex = /\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi;
  const weekdayMatches = [...text.matchAll(weekdayRegex)];

  if (weekdayMatches.length >= 2) {
    const first = weekdayMatches[0];
    const second = weekdayMatches[1];
    const pickupDate = getNextWeekday(today, WEEKDAY_NAMES.indexOf(first[2].toLowerCase()), Boolean(first[1]));
    let returnDate = getNextWeekday(pickupDate, WEEKDAY_NAMES.indexOf(second[2].toLowerCase()));

    if (returnDate <= pickupDate) {
      returnDate = addDays(returnDate, 7);
    }

    return buildDateRange(toDateOnly(pickupDate), toDateOnly(returnDate));
  }

  if (weekdayMatches.length === 1) {
    const [, nextWord, weekdayName] = weekdayMatches[0];
    const pickupDate = getNextWeekday(today, WEEKDAY_NAMES.indexOf(weekdayName.toLowerCase()), Boolean(nextWord));
    return buildDateRange(toDateOnly(pickupDate));
  }

  return { pickupDate: null, returnDate: null };
};

const inferFiltersFromText = (text, cars) => {
  const lowerText = text.toLowerCase();
  const locations = [...new Set(cars.map((car) => car.location))];
  const categories = [...new Set(cars.map((car) => car.category))];
  const transmissions = [...new Set(cars.map((car) => car.transmission))];
  const fuelTypes = [...new Set(cars.map((car) => car.fuel_type))];
  const carNames = cars.map((car) => `${car.brand} ${car.model}`.trim());

  let category = resolveKnownValue(
    categories.find((option) => lowerText.includes(option.toLowerCase())) || "",
    categories
  );

  if (!category && /(family|road trip|trip|vacation|tour|outstation|mountain)/i.test(lowerText)) {
    category = resolveKnownValue("SUV", categories);
  }

  if (!category && /(business|office|meeting|airport)/i.test(lowerText)) {
    category = resolveKnownValue("Sedan", categories);
  }

  let transmission = resolveKnownValue(
    transmissions.find((option) => lowerText.includes(option.toLowerCase())) || "",
    transmissions
  );

  if (!transmission && /automatic/i.test(lowerText)) transmission = resolveKnownValue("Automatic", transmissions);
  if (!transmission && /manual/i.test(lowerText)) transmission = resolveKnownValue("Manual", transmissions);

  let fuelType = resolveKnownValue(
    fuelTypes.find((option) => lowerText.includes(option.toLowerCase())) || "",
    fuelTypes
  );

  const location = extractExplicitLocation(text, locations);

  const seatCount = extractSeatCount(lowerText);
  const budget = extractBudget(lowerText);
  const parsedDates = extractDatesFromText(text);
  const directCarMatch = cars.find(
    (car) => lowerText.includes(car.brand.toLowerCase()) || lowerText.includes(car.model.toLowerCase())
  );

  const matchedCarName =
    carNames.find((name) => lowerText.includes(name.toLowerCase())) ||
    (directCarMatch ? `${directCarMatch.brand} ${directCarMatch.model}` : null);

  return {
    location,
    category,
    transmission,
    fuelType,
    minSeats: seatCount || (/(family|kids|children|parents)/i.test(lowerText) ? 5 : null),
    maxPrice: budget,
    pickupDate: parsedDates.pickupDate,
    returnDate: parsedDates.returnDate,
    sortBy: /(cheap|budget|affordable|economy|value)/i.test(lowerText)
      ? "priceAsc"
      : /(luxury|premium|vip|wedding)/i.test(lowerText)
        ? "priceDesc"
        : /(newest|latest|new model)/i.test(lowerText)
          ? "newest"
          : null,
    q: matchedCarName,
  };
};

const mergeFilters = (...filtersList) => {
  const merged = {
    location: null,
    category: null,
    transmission: null,
    fuelType: null,
    minSeats: null,
    maxPrice: null,
    pickupDate: null,
    returnDate: null,
    sortBy: null,
    q: null,
  };

  filtersList.forEach((filters) => {
    if (!filters) return;
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        merged[key] = value;
      }
    });
  });

  return merged;
};

const describeMissingFields = (missingFields = []) => {
  const labels = {
    car: "which car you want",
    pickupDate: "pickup date",
    returnDate: "return date",
  };
  const required = missingFields.map((field) => labels[field]).filter(Boolean);

  if (!required.length) return "one more detail";
  if (required.length === 1) return required[0];
  if (required.length === 2) return `${required[0]} and ${required[1]}`;
  return `${required.slice(0, -1).join(", ")}, and ${required.at(-1)}`;
};

const getFollowUpPrompts = (filters = {}, missingFields = [], selectedCar = null) => {
  const prompts = [];

  if (missingFields.includes("car")) {
    if (filters.category && filters.location) {
      prompts.push(`Show ${filters.category} cars in ${filters.location}`);
    } else if (filters.location) {
      prompts.push(`Show available cars in ${filters.location}`);
    } else {
      prompts.push("Show budget cars");
    }
  }

  if (missingFields.includes("pickupDate")) {
    if (selectedCar) {
      prompts.push(`Is ${selectedCar.brand} ${selectedCar.model} available tomorrow?`);
      prompts.push(`Check ${selectedCar.brand} ${selectedCar.model} this weekend`);
    } else {
      prompts.push("I need a car tomorrow");
      prompts.push("I need a car this weekend");
    }
  }

  if (missingFields.includes("returnDate")) {
    prompts.push("Return it the next day");
    prompts.push("Book it for 3 days");
  }

  return [...new Set(prompts)].slice(0, 3);
};

const withPrompts = (payload, prompts = []) => ({
  ...payload,
  data: {
    ...(payload.data || {}),
    prompts: prompts.length ? prompts : payload.data?.prompts || [],
  },
});

const createNoMatchResponse = (filters) => {
  const locationNote = filters.location ? ` in ${filters.location}` : "";
  return responseJson(
    "car_search",
    `I could not find matching cars${locationNote} with those filters. Try another budget, dates, or car type and I will refine the search.`,
    "need_details",
    {
      filters,
      cars: [],
      matchType: "none",
      prompts: [
        filters.location ? `Show all cars in ${filters.location}` : "Show available cars",
        "Show cheaper cars",
        "Show SUV options",
      ],
    }
  );
};

const getConversationState = (messages, cars) => {
  const userMessages = messages.filter((message) => message.role === "user");
  const mergedFilters = userMessages.reduce(
    (accumulator, message) => mergeFilters(accumulator, inferFiltersFromText(message.content, cars)),
    mergeFilters()
  );

  const joinedUserText = userMessages.map((message) => message.content).join(" \n ");
  const lastUserMessage = userMessages.at(-1)?.content || "";

  const confirmPayload = lastUserMessage.match(/^CONFIRM_BOOKING::([^:]+)::(\d{4}-\d{2}-\d{2})::(\d{4}-\d{2}-\d{2})$/);
  const selectedBookingPayload = lastUserMessage.match(/^BOOK_CAR::([^:]+)::(\d{4}-\d{2}-\d{2})::(\d{4}-\d{2}-\d{2})$/);
  const cancelPayload = lastUserMessage.match(/^CANCEL_BOOKING::([a-f0-9]{24})$/i);
  const bookingIdMatch = lastUserMessage.match(/[a-f0-9]{24}/i);
  const latestUserText = lastUserMessage.toLowerCase();

  const currentMessageCar = cars.find((item) => {
    const name = `${item.brand} ${item.model}`.toLowerCase();
    return latestUserText.includes(name) ||
      latestUserText.includes(item.brand.toLowerCase()) ||
      latestUserText.includes(item.model.toLowerCase());
  }) || null;

  const car = currentMessageCar || cars.find((item) => {
    const name = `${item.brand} ${item.model}`.toLowerCase();
    return joinedUserText.toLowerCase().includes(name) ||
      joinedUserText.toLowerCase().includes(item.brand.toLowerCase()) ||
      joinedUserText.toLowerCase().includes(item.model.toLowerCase());
  }) || null;

  const wantsBookings = /(my bookings|show bookings|booking history|my reservation|my reservations|what did i book|current bookings)/i.test(lastUserMessage);
  const wantsCancel = Boolean(cancelPayload) || /(cancel|drop|remove)\s*(booking|reservation)?/i.test(lastUserMessage);
  const wantsAvailability = /(available|availability|is .* available)/i.test(lastUserMessage);
  const wantsPricing = /(pricing|dynamic pricing|weekend pricing|demand pricing|why .* price|why .* cost|how .* price)/i.test(lastUserMessage);
  const wantsBooking = /(book|booking|reserve|reservation)/i.test(lastUserMessage) || Boolean(confirmPayload) || Boolean(selectedBookingPayload);
  const wantsConfirmation = Boolean(confirmPayload) || /^(yes|confirm|book it|go ahead|proceed|confirm booking)$/i.test(lastUserMessage.trim());

  return {
    filters: mergedFilters,
    lastUserMessage,
    joinedUserText,
    selectedCar: confirmPayload
      ? cars.find((item) => String(item._id) === confirmPayload[1]) || car
      : selectedBookingPayload
        ? cars.find((item) => String(item._id) === selectedBookingPayload[1]) || car
        : car,
    confirmPayload,
    selectedBookingPayload,
    cancelBookingId: cancelPayload?.[1] || (wantsCancel && bookingIdMatch ? bookingIdMatch[0] : null),
    wantsBookings,
    wantsCancel,
    wantsAvailability,
    wantsPricing,
    wantsBooking,
    wantsConfirmation,
  };
};

const carMatchesFilters = (car, filters, options = {}) => {
  const { ignoreBudget = false, ignoreCategory = false } = options;

  if (filters.location && car.location.toLowerCase() !== filters.location.toLowerCase()) return false;
  if (!ignoreCategory && filters.category && car.category.toLowerCase() !== filters.category.toLowerCase()) return false;
  if (filters.transmission && !car.transmission.toLowerCase().includes(filters.transmission.toLowerCase())) return false;
  if (filters.fuelType && car.fuel_type.toLowerCase() !== filters.fuelType.toLowerCase()) return false;
  if (filters.minSeats && car.seating_capacity < filters.minSeats) return false;
  if (!ignoreBudget && filters.maxPrice && car.pricePerDay > filters.maxPrice) return false;

  if (filters.q) {
    const searchable = `${car.brand} ${car.model} ${car.description}`.toLowerCase();
    if (!searchable.includes(filters.q.toLowerCase())) return false;
  }

  return true;
};

const sortCars = (cars, sortBy) => {
  const sorted = [...cars];
  switch (sortBy) {
    case "priceAsc":
      return sorted.sort((a, b) => a.pricePerDay - b.pricePerDay);
    case "priceDesc":
      return sorted.sort((a, b) => b.pricePerDay - a.pricePerDay);
    case "newest":
      return sorted.sort((a, b) => b.year - a.year);
    default:
      return sorted.sort((a, b) => a.pricePerDay - b.pricePerDay);
  }
};

const scoreCars = (cars, filters) =>
  cars
    .map((car) => {
      let score = 0;
      if (filters.location) score += car.location === filters.location ? 6 : -4;
      if (filters.category) score += car.category === filters.category ? 4 : 0;
      if (filters.transmission) score += car.transmission === filters.transmission ? 2 : 0;
      if (filters.fuelType) score += car.fuel_type === filters.fuelType ? 2 : 0;
      if (filters.minSeats) score += car.seating_capacity >= filters.minSeats ? 3 : -8;
      if (filters.maxPrice) score += car.pricePerDay <= filters.maxPrice ? 3 : -Math.min(6, Math.ceil((car.pricePerDay - filters.maxPrice) / 40));
      if (!filters.maxPrice) score += Math.max(0, 3 - Math.floor(car.pricePerDay / 150));
      return { car, score };
    })
    .sort((a, b) => b.score - a.score || a.car.pricePerDay - b.car.pricePerDay)
    .map((item) => item.car);

const getRecommendationPool = (cars, filters) => {
  const locationScopedCars = filters.location
    ? cars.filter((car) => car.location.toLowerCase() === filters.location.toLowerCase())
    : cars;

  const strict = sortCars(locationScopedCars.filter((car) => carMatchesFilters(car, filters)), filters.sortBy);
  if (strict.length) return { cars: strict.slice(0, 3), matchType: "exact" };

  const relaxedBudget = filters.maxPrice
    ? sortCars(locationScopedCars.filter((car) => carMatchesFilters(car, filters, { ignoreBudget: true })), filters.sortBy)
    : [];
  if (relaxedBudget.length) return { cars: relaxedBudget.slice(0, 3), matchType: "overBudget" };

  const relaxedCategory = filters.category
    ? sortCars(locationScopedCars.filter((car) => carMatchesFilters(car, filters, { ignoreCategory: true })), filters.sortBy)
    : [];
  if (relaxedCategory.length) return { cars: relaxedCategory.slice(0, 3), matchType: "differentCategory" };

  if (filters.location) {
    return { cars: [], matchType: "none" };
  }

  return { cars: scoreCars(sortCars(locationScopedCars, filters.sortBy), filters).slice(0, 3), matchType: "closest" };
};

const ensureReturnDate = (pickupDate, returnDate) => {
  if (!pickupDate) return { pickupDate: null, returnDate: null };
  if (returnDate) return { pickupDate, returnDate };
  return { pickupDate, returnDate: toDateOnly(addDays(new Date(pickupDate), 1)) };
};

const requireLoginResponse = (message) =>
  responseJson("auth_required", message, "login_required", {
    prompts: ["Log in to continue", "Show available cars", "Show my bookings"],
  });

const buildCarSearchResponse = (filters, pool) => {
  if (pool.matchType === "none" || pool.cars.length === 0) {
    return createNoMatchResponse(filters);
  }

  const cars = pool.cars.map(serializeCar);
  const response = cars.length
    ? pool.matchType === "overBudget"
      ? `I found the closest cars, but they are slightly above your budget. Here are the best options.`
      : pool.matchType === "differentCategory"
        ? `I could not find that exact car type, so I picked the closest available alternatives.`
        : `Here are the best matching cars based on your request.`
    : "I could not find a strong match yet. Share one more detail like city, budget, dates, or car type and I will narrow it down.";

  return withPrompts(responseJson("car_search", response, "show_cars", {
    filters,
    cars,
    matchType: pool.matchType,
  }), [
    !filters.location ? "Show cars in Delhi" : null,
    !filters.pickupDate ? "I need a car tomorrow" : null,
    !filters.category ? "Show SUV options" : null,
  ].filter(Boolean).slice(0, 3));
};

const buildPricingExplanation = () =>
  responseJson(
    "pricing_explanation",
    "Current backend pricing is duration-based: total price = price per day x number of rental days. Weekend, demand, and surge multipliers are not implemented in the backend yet.",
    "pricing_explanation",
    {
      pricingModel: {
        type: "duration_based",
        formula: "pricePerDay x rentalDays",
        weekendPricingActive: false,
        demandPricingActive: false,
      },
    }
  );

const buildAvailabilityResponse = async (state, cars) => {
  if (!state.selectedCar) {
    const pool = getRecommendationPool(cars, state.filters);
    return responseJson(
      "availability_check",
      "Tell me the car name you want to check, and I will verify availability. Here are some likely matches in the meantime.",
      "show_cars",
      {
        filters: state.filters,
        cars: pool.cars.map(serializeCar),
        missingFields: ["car"],
        prompts: getFollowUpPrompts(state.filters, ["car"]),
      }
    );
  }

  const { pickupDate, returnDate } = ensureReturnDate(state.filters.pickupDate, state.filters.returnDate);

  if (!pickupDate) {
    return responseJson(
      "availability_check",
      `I found ${state.selectedCar.brand} ${state.selectedCar.model}. Please share the pickup date so I can check availability.`,
      "need_details",
      {
        missingFields: ["pickupDate"],
        car: serializeCar(state.selectedCar),
        prompts: getFollowUpPrompts(state.filters, ["pickupDate"], state.selectedCar),
      }
    );
  }

  const isAvailable = await checkAvailbility(state.selectedCar._id, pickupDate, returnDate);

  if (isAvailable) {
    return responseJson(
      "availability_check",
      `${state.selectedCar.brand} ${state.selectedCar.model} is available from ${pickupDate} to ${returnDate}. If you want, I can prepare the booking now.`,
      "confirm_booking",
      {
        bookingPreview: {
          carId: String(state.selectedCar._id),
          carName: `${state.selectedCar.brand} ${state.selectedCar.model}`,
          pickupDate,
          returnDate,
          totalCost: calculateBookingPrice(state.selectedCar.pricePerDay, pickupDate, returnDate),
        },
        cars: [serializeCar(state.selectedCar)],
        prompts: [`Book ${state.selectedCar.brand} ${state.selectedCar.model}`, "Show similar cars"],
      }
    );
  }

  const alternatives = getRecommendationPool(
    cars.filter((car) => String(car._id) !== String(state.selectedCar._id)),
    mergeFilters(state.filters, {
      location: state.selectedCar.location,
      category: state.selectedCar.category,
      minSeats: state.selectedCar.seating_capacity,
    })
  ).cars.map(serializeCar);

  return responseJson(
    "availability_check",
    `${state.selectedCar.brand} ${state.selectedCar.model} is not available from ${pickupDate} to ${returnDate}. I found a few similar alternatives for you.`,
    "show_alternatives",
      {
        requestedCar: serializeCar(state.selectedCar),
        pickupDate,
        returnDate,
        alternatives,
        prompts: ["Show cheaper alternatives", "Show automatic cars", "Show cars this weekend"],
      }
  );
};

const buildBookingPreparation = async (state, cars, user) => {
  if (!user) {
    return requireLoginResponse("Please log in before I create or manage a booking.");
  }

  const pickupDate = state.selectedBookingPayload?.[2] || state.filters.pickupDate;
  const returnDate = state.selectedBookingPayload?.[3] || state.filters.returnDate;

  if (!state.selectedCar) {
    const pool = getRecommendationPool(cars, state.filters);
    return responseJson(
      "booking_prepare",
      "I need to know which car you want to book. Here are the best matching options so you can choose one.",
      "show_cars",
      {
        filters: state.filters,
        cars: pool.cars.map(serializeCar),
        missingFields: ["car"],
        prompts: getFollowUpPrompts(state.filters, ["car"]),
      }
    );
  }

  if (!pickupDate || !returnDate) {
    const missingFields = [!pickupDate ? "pickupDate" : null, !returnDate ? "returnDate" : null].filter(Boolean);
    return responseJson(
      "booking_prepare",
      `I found ${state.selectedCar.brand} ${state.selectedCar.model}. Please share ${describeMissingFields(missingFields)} before I prepare the booking.`,
      "need_details",
      {
        missingFields,
        car: serializeCar(state.selectedCar),
        prompts: getFollowUpPrompts(state.filters, missingFields, state.selectedCar),
      }
    );
  }

  const isAvailable = await checkAvailbility(state.selectedCar._id, pickupDate, returnDate);

  if (!isAvailable) {
    const alternatives = getRecommendationPool(
      cars.filter((car) => String(car._id) !== String(state.selectedCar._id)),
      mergeFilters(state.filters, { location: state.selectedCar.location })
    ).cars.map(serializeCar);

    return responseJson(
      "booking_prepare",
      `${state.selectedCar.brand} ${state.selectedCar.model} is not available for those dates. Here are a few alternatives you can book instead.`,
      "show_alternatives",
      {
        requestedCar: serializeCar(state.selectedCar),
        alternatives,
        prompts: ["Show cars for different dates", "Show cheaper cars", "Show similar cars"],
      }
    );
  }

  const totalCost = calculateBookingPrice(
    state.selectedCar.pricePerDay,
    pickupDate,
    returnDate
  );

  return responseJson(
    "booking_prepare",
    `${state.selectedCar.brand} ${state.selectedCar.model} is available. Total cost is INR ${totalCost}. Please confirm if you want me to create the booking.`,
    "confirm_booking",
    {
        bookingPreview: {
          carId: String(state.selectedCar._id),
          carName: `${state.selectedCar.brand} ${state.selectedCar.model}`,
          pickupDate,
          returnDate,
          totalCost,
        },
      car: serializeCar(state.selectedCar),
      prompts: ["Confirm booking", "Show similar cars"],
    }
  );
};

const performBooking = async (state, user) => {
  if (!user) {
    return requireLoginResponse("Please log in before I create or manage a booking.");
  }

  const payloadCar = state.confirmPayload?.[1] || state.selectedCar?._id;
  const pickupDate = state.confirmPayload?.[2] || state.filters.pickupDate;
  const returnDate = state.confirmPayload?.[3] || state.filters.returnDate;

  if (!payloadCar || !pickupDate || !returnDate) {
    return responseJson(
      "booking_confirm",
      "I still need the car, pickup date, and return date before I can complete the booking.",
      "need_details",
      {
        missingFields: [!payloadCar ? "car" : null, !pickupDate ? "pickupDate" : null, !returnDate ? "returnDate" : null].filter(Boolean),
        prompts: ["Show matching cars", "I need a car tomorrow", "Book it for 3 days"],
      }
    );
  }

  const carData = await Car.findById(payloadCar);
  if (!carData) {
    return responseJson("booking_confirm", "I could not find that car anymore. Please choose another option.", "show_cars", {});
  }

  const isAvailable = await checkAvailbility(carData._id, pickupDate, returnDate);
  if (!isAvailable) {
    return responseJson(
      "booking_confirm",
      `${carData.brand} ${carData.model} is no longer available for those dates. Please choose different dates or another car.`,
      "booking_failed",
      {
        car: serializeCar(carData),
        prompts: ["Show similar cars", "Show cars this weekend", "Show cheaper options"],
      }
    );
  }

  const totalCost = calculateBookingPrice(carData.pricePerDay, pickupDate, returnDate);
  const booking = await Booking.create({
    car: carData._id,
    owner: carData.owner,
    user: user._id,
    pickupDate,
    returnDate,
    price: totalCost,
    status: "pending",
    paymentStatus: "pending",
  });

  await booking.populate("car");

  return responseJson(
    "booking_confirm",
    `Booking created successfully for ${carData.brand} ${carData.model} from ${formatDateLabel(pickupDate)} to ${formatDateLabel(returnDate)}. Current status is pending.`,
    "booking_success",
    {
      booking: serializeBooking(booking),
      prompts: ["Show my bookings", "Find another car"],
    }
  );
};

const listBookings = async (user) => {
  if (!user) {
    return requireLoginResponse("Please log in to view your bookings.");
  }

  const bookings = await Booking.find({ user: user._id }).populate("car").sort({ createdAt: -1 });

  return responseJson(
    "booking_management",
    bookings.length
      ? `Here are your current bookings.`
      : `You do not have any bookings yet.`,
    "show_bookings",
    {
      bookings: bookings.map(serializeBooking),
      prompts: bookings.length ? ["Cancel my latest booking", "Find another car"] : ["Find cars tomorrow", "Show SUV cars"],
    }
  );
};

const cancelBookingFlow = async (state, user) => {
  if (!user) {
    return requireLoginResponse("Please log in before cancelling a booking.");
  }

  let booking = null;

  if (state.cancelBookingId && isObjectId(state.cancelBookingId)) {
    booking = await Booking.findOne({ _id: state.cancelBookingId, user: user._id }).populate("car");
  }

  if (!booking && state.selectedCar) {
    booking = await Booking.findOne({
      user: user._id,
      car: state.selectedCar._id,
      status: { $ne: "cancelled" },
    }).populate("car").sort({ createdAt: -1 });
  }

  if (!booking) {
    const bookings = await Booking.find({ user: user._id }).populate("car").sort({ createdAt: -1 });
    return responseJson(
      "booking_management",
      "I could not identify which booking to cancel. Please choose one from your current bookings.",
      "show_bookings",
      {
        bookings: bookings.map(serializeBooking),
        prompts: ["Cancel my latest booking", "Show my bookings", "Find another car"],
      }
    );
  }

  booking.status = "cancelled";
  if (booking.paymentStatus === "pending") {
    booking.paymentStatus = "failed";
  }
  await booking.save();

  return responseJson(
    "booking_management",
    `Booking for ${booking.car.brand} ${booking.car.model} has been cancelled successfully.`,
    "booking_cancelled",
    {
      booking: serializeBooking(booking),
      prompts: ["Show my bookings", "Find another car", "Show available cars tomorrow"],
    }
  );
};

const determineIntent = (state) => {
  if (state.wantsBookings) return "booking_management";
  if (state.wantsCancel) return "cancel_booking";
  if (state.wantsPricing) return "pricing_explanation";
  if (state.wantsAvailability) return "availability_check";
  if (state.wantsConfirmation) return "booking_confirm";
  if (state.wantsBooking) return "booking_prepare";
  return "car_search";
};

export const recommendCarsWithChat = async (req, res) => {
  try {
    const messages = sanitizeMessages(req.body?.messages);
    const cars = await Car.find({ isAvaliable: true }).sort({ createdAt: -1 });

    if (!messages.length) {
      return res.json(
        responseJson(
          "car_search",
          "Tell me your budget, city, dates, or car type and I will search the best options or help with a booking.",
          "need_details",
          { prompts: ["Find budget cars in Delhi", "Book Toyota Corolla tomorrow", "Show my bookings"] }
        )
      );
    }

    const state = getConversationState(messages, cars);
    const intent = determineIntent(state);

    let result;
    switch (intent) {
      case "booking_management":
        result = await listBookings(req.user);
        break;
      case "cancel_booking":
        result = await cancelBookingFlow(state, req.user);
        break;
      case "pricing_explanation":
        result = buildPricingExplanation();
        break;
      case "availability_check":
        result = await buildAvailabilityResponse(state, cars);
        break;
      case "booking_confirm":
        result = await performBooking(state, req.user);
        break;
      case "booking_prepare":
        result = await buildBookingPreparation(state, cars, req.user);
        break;
      default:
        result = buildCarSearchResponse(state.filters, getRecommendationPool(cars, state.filters));
        break;
    }

    if (req.authError && !req.user && ["booking_prepare", "booking_confirm", "booking_management", "cancel_booking"].includes(intent)) {
      result.data = { ...result.data, authMessage: req.authError };
    }

    res.json(result);
  } catch (error) {
    console.log(error.message);
    res.json({
      success: false,
      intent: "error",
      response: error.message || "Something went wrong while processing the request.",
      action: "error",
      data: {},
    });
  }
};
