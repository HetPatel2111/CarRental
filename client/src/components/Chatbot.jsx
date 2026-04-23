import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "../contex/AppContext";

const CHATBOT_STORAGE_KEY = "car-rental-chatbot-messages";

const starterPrompts = [
  "Find budget cars in Delhi",
  "Book Toyota Corolla tomorrow",
  "Show my bookings",
];
const defaultMessages = [
  {
    role: "assistant",
    content:
      "I can help you find cars, check availability, create bookings, show your bookings, and cancel them. Tell me what you want to do.",
    intent: "car_search",
    action: "need_details",
    data: { prompts: starterPrompts },
  },
];

const getCarsFromMessage = (message = {}) => message?.data?.cars || message?.data?.alternatives || [];
const getBookingsFromMessage = (message = {}) => message?.data?.bookings || [];
const hasBookingDates = (message = {}) => Boolean(message?.data?.filters?.pickupDate && message?.data?.filters?.returnDate);
const formatDateLabel = (value) => {
  if (!value) return "";

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return value;
  }
};

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const hasUsefulFilters = (filters = {}) =>
  Boolean(
    filters.location ||
      filters.category ||
      filters.transmission ||
      filters.fuelType ||
      filters.minSeats ||
      filters.maxPrice ||
      filters.pickupDate ||
      filters.returnDate ||
      filters.q
  );

const buildCarsSearchParams = (message = {}) => {
  const params = new URLSearchParams();
  const filters = message?.data?.filters || {};
  const cars = getCarsFromMessage(message);

  if (filters.location && filters.pickupDate && filters.returnDate) {
    params.set("PickupLocation", filters.location);
    params.set("pickupDate", filters.pickupDate);
    params.set("returnDate", filters.returnDate);
  }

  if (filters.location) params.set("location", filters.location);
  if (filters.category) params.set("category", filters.category);
  if (filters.transmission) params.set("transmission", filters.transmission);
  if (filters.fuelType) params.set("fuelType", filters.fuelType);
  if (filters.minSeats) params.set("minSeats", filters.minSeats);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.q) params.set("q", filters.q);

  if (cars.length > 0) {
    params.set("recommendedIds", cars.map((car) => car._id).join(","));
  }

  return params;
};

const Chatbot = () => {
  const { axios, navigate, requestLogin, user, token } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const storedMessages = localStorage.getItem(CHATBOT_STORAGE_KEY);
      return storedMessages ? JSON.parse(storedMessages) : defaultMessages;
    } catch {
      return defaultMessages;
    }
  });
  const scrollAnchorRef = useRef(null);

  const requireChatLogin = () => {
    requestLogin({
      onSuccess: () => setIsOpen(true),
    });
  };

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        scrollAnchorRef.current?.scrollIntoView({ behavior: "auto" });
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!user) {
      setIsOpen(false);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(CHATBOT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const latestCarMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant" && (getCarsFromMessage(message).length || hasUsefulFilters(message?.data?.filters))),
    [messages]
  );

  const openCarsFromMessage = (message = {}) => {
    const params = buildCarsSearchParams(message);
    const carsPath = `/cars${params.toString() ? `?${params.toString()}` : ""}`;

    if (!user) {
      requestLogin({ redirectPath: carsPath });
      return;
    }

    navigate(carsPath);
    setIsOpen(false);
  };

  const handlePromptAction = (prompt) => {
    if (!user) {
      requireChatLogin();
      return;
    }

    if (prompt === "Log in to continue") {
      requireChatLogin();
      return;
    }

    submitMessage(prompt);
  };

  const handleBookCar = (message, car) => {
    const pickupDate = message?.data?.filters?.pickupDate;
    const returnDate = message?.data?.filters?.returnDate;

    if (!pickupDate || !returnDate) {
      submitMessage(`Book ${car.name || `${car.brand} ${car.model}`}`);
      return;
    }

    if (!user) {
      requireChatLogin();
      return;
    }

    submitMessage(`BOOK_CAR::${car._id}::${pickupDate}::${returnDate}`);
  };

  const handlePayment = async ({ carId, carName, pickupDate, returnDate }) => {
    if (!pickupDate || !returnDate) {
      submitMessage(`Book ${carName}`);
      return;
    }

    if (!token || !user) {
      requireChatLogin();
      return;
    }

    setIsPaying(true);

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        throw new Error("Razorpay checkout failed to load");
      }

      const { data } = await axios.post("/api/bookings/create-order", {
        car: carId,
        pickupDate,
        returnDate,
      });

      if (!data.success) {
        throw new Error(data.message || "Unable to create payment order");
      }

      const razorpay = new window.Razorpay({
        key: data.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "CarRental",
        description: `${carName} booking payment`,
        order_id: data.order.id,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#0f766e",
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false);
          },
        },
        handler: async (response) => {
          try {
            const verification = await axios.post("/api/bookings/verify-payment", {
              car: carId,
              pickupDate,
              returnDate,
              ...response,
            });

            if (!verification.data.success) {
              throw new Error(verification.data.message || "Payment verification failed");
            }

            setMessages((currentMessages) => [
              ...currentMessages,
              {
                role: "assistant",
                content: `Payment successful. ${carName} has been booked from ${pickupDate} to ${returnDate}.`,
                intent: "booking_success",
                action: "booking_success",
                data: {
                  prompts: ["Show my bookings", "Find another car"],
                },
              },
            ]);
          } catch (error) {
            setMessages((currentMessages) => [
              ...currentMessages,
              {
                role: "assistant",
                content: error.response?.data?.message || error.message || "Payment verification failed.",
                intent: "error",
                action: "error",
                data: {},
              },
            ]);
          } finally {
            setIsPaying(false);
          }
        },
      });

      razorpay.open();
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: error.response?.data?.message || error.message || "Unable to complete payment right now.",
          intent: "error",
          action: "error",
          data: {},
        },
      ]);
      setIsPaying(false);
    }
  };

  const submitMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    if (!user) {
      requireChatLogin();
      return;
    }

    const userMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setIsOpen(true);
    setIsLoading(true);

    try {
      const { data } = await axios.post("/api/chat/recommend", {
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
      });

      if (!data.success) {
        throw new Error(data.response || data.message || "Unable to reach the trip planner right now.");
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: data.response,
          intent: data.intent,
          action: data.action,
          data: data.data || {},
        },
      ]);
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content:
            error.response?.data?.response ||
            error.response?.data?.message ||
            error.message ||
            "Something went wrong while processing your request.",
          intent: "error",
          action: "error",
          data: {},
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCarCards = (cars = [], message = {}) => {
    if (!cars.length) return null;

    return (
      <div className="mt-4 space-y-3">
        {cars.map((car) => (
          <div key={car._id} className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-slate-700 shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{car.name || `${car.brand} ${car.model}`}</p>
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">{car.location}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{car.category} • {car.transmission}</p>
              </div>

              <p className="text-sm font-semibold text-slate-900">INR {car.pricePerDay}<span className="text-xs font-normal text-slate-500">/day</span></p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2.5 py-1">{car.seating_capacity} seats</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1">{car.fuel_type}</span>
              {hasBookingDates(message) && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                  {formatDateLabel(message.data.filters.pickupDate)} to {formatDateLabel(message.data.filters.returnDate)}
                </span>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigate(`/car-details/${car._id}`);
                  setIsOpen(false);
                }}
                className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-600"
              >
                View Details
              </button>

              {hasBookingDates(message) ? (
                <button
                  type="button"
                  onClick={() =>
                    handlePayment({
                      carId: car._id,
                      carName: car.name || `${car.brand} ${car.model}`,
                      pickupDate: message?.data?.filters?.pickupDate,
                      returnDate: message?.data?.filters?.returnDate,
                    })
                  }
                  disabled={isPaying}
                  className="flex-1 rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isPaying ? "Processing..." : "Pay & Book"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBookCar(message, car)}
                  className="flex-1 rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700"
                >
                  Select Car
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderBookingPreview = (message = {}) => {
    const preview = message?.data?.bookingPreview;
    if (!preview) return null;

    return (
      <div className="mt-3 rounded-2xl bg-white px-3 py-3 text-slate-700">
        <p className="font-semibold">{preview.carName}</p>
        <p className="mt-1 text-xs text-slate-500">{preview.pickupDate} to {preview.returnDate}</p>
        <p className="mt-1 text-sm font-medium">Total: INR {preview.totalCost}</p>

        <div className="mt-3 flex gap-2">
          {message.action === "confirm_booking" && (
            <button
              type="button"
              onClick={() => submitMessage(`CONFIRM_BOOKING::${preview.carId}::${preview.pickupDate}::${preview.returnDate}`)}
              className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Confirm First
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              handlePayment({
                carId: preview.carId,
                carName: preview.carName,
                pickupDate: preview.pickupDate,
                returnDate: preview.returnDate,
              })
            }
            disabled={isPaying}
            className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isPaying ? "Processing..." : "Pay Now"}
          </button>
        </div>
      </div>
    );
  };

  const renderBookings = (message = {}) => {
    const bookings = getBookingsFromMessage(message);
    if (!bookings.length) return null;

    return (
      <div className="mt-3 space-y-2">
        {bookings.map((booking) => (
          <div key={booking._id} className="rounded-2xl bg-white px-3 py-3 text-slate-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{booking.car?.name || `${booking.car?.brand || "Car"} ${booking.car?.model || ""}`.trim()}</p>
                <p className="text-xs text-slate-500">{booking.pickupDate} to {booking.returnDate}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize text-slate-600">{booking.status}</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              <span>INR {booking.price}</span>
              <span>{booking.car?.location}</span>
            </div>

            {booking.status !== "cancelled" && (
              <button
                type="button"
                onClick={() => submitMessage(`CANCEL_BOOKING::${booking._id}`)}
                className="mt-3 rounded-full border border-red-200 px-4 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
              >
                Cancel Booking
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-[26rem] overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.96))] shadow-[0_35px_120px_rgba(15,23,42,0.24)] backdrop-blur-2xl md:right-6">
          <div className="rounded-t-[30px] bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.45),_transparent_35%),linear-gradient(135deg,_#0f172a,_#1e293b_55%,_#0369a1)] px-5 py-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-sky-100/70">Rental Concierge</p>
                <h3 className="mt-1 text-xl font-semibold">Search and book inside chat</h3>
                <p className="mt-1 max-w-xs text-sm text-sky-50/80">Find the right car, verify dates, and complete the booking flow without leaving this panel.</p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-white/90 transition hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>

          <div className="max-h-[62vh] space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#f8fbff_0%,#f8fafc_100%)] px-4 py-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-[28px] px-4 py-3 text-sm shadow-sm ${
                  message.role === "user"
                    ? "bg-[linear-gradient(135deg,#2563eb,#0f766e)] text-white"
                    : "border border-white/70 bg-white/90 text-slate-700 shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
                }`}>
                  <p className="whitespace-pre-wrap leading-6">{message.content}</p>

                  {message.data?.prompts?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.data.prompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => handlePromptAction(prompt)}
                          className="rounded-full bg-white px-3 py-1 text-xs text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}

                  {renderCarCards(getCarsFromMessage(message), message)}
                  {renderBookingPreview(message)}
                  {renderBookings(message)}

                  {message.action === "login_required" && !user && (
                    <button
                      type="button"
                      onClick={requireChatLogin}
                      className="mt-3 rounded-full bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-500"
                    >
                      Log In To Continue
                    </button>
                  )}

                  {message.data?.authMessage && (
                    <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      {message.data.authMessage}
                    </p>
                  )}

                  {(getCarsFromMessage(message).length > 0 || hasUsefulFilters(message.data?.filters)) && (
                    <button
                      type="button"
                      onClick={() => openCarsFromMessage(message)}
                        className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-700"
                      >
                        Open Matching Cars
                      </button>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-3xl bg-slate-100 px-4 py-3 text-sm text-slate-500">Working on that...</div>
              </div>
            )}

            <div ref={scrollAnchorRef} />
          </div>

            <div className="border-t border-slate-200/80 bg-white/90 px-4 py-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handlePromptAction(prompt)}
                  className="rounded-full border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {latestCarMessage && (
              <button
                type="button"
                onClick={() => openCarsFromMessage(latestCarMessage)}
                className="mb-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Open Latest Matches
              </button>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Try: Is Toyota Corolla available tomorrow?"
                className="h-12 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
              />

              <button
                type="submit"
                disabled={isLoading}
                className="h-12 rounded-2xl bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (!user) {
            requireChatLogin();
            return;
          }

          setIsOpen((open) => !open);
        }}
        className="fixed bottom-6 right-4 z-50 flex items-center gap-3 rounded-full bg-slate-900 px-5 py-4 text-sm font-medium text-white shadow-[0_18px_50px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:bg-slate-800 md:right-6"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold">AI</span>
        Rental Assistant
      </button>
    </>
  );
};

export default Chatbot;
