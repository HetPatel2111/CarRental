const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const normalizeEmail = (email = "") => email.trim().toLowerCase();

export const isValidEmail = (email = "") => EMAIL_REGEX.test(normalizeEmail(email));

export const parseDateInput = (value) => {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const getStartOfToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

export const validateBookingDates = (pickupDate, returnDate) => {
    const parsedPickupDate = parseDateInput(pickupDate);
    const parsedReturnDate = parseDateInput(returnDate);

    if (!parsedPickupDate || !parsedReturnDate) {
        return { valid: false, message: "Please provide valid pickup and return dates." };
    }

    if (parsedPickupDate < getStartOfToday()) {
        return { valid: false, message: "Pickup date cannot be in the past." };
    }

    if (parsedReturnDate < parsedPickupDate) {
        return { valid: false, message: "Return date must be the same as or after pickup date." };
    }

    return { valid: true, parsedPickupDate, parsedReturnDate };
};

export const calculateRentalDays = (pickupDate, returnDate) => {
    const diffInDays = Math.ceil((returnDate - pickupDate) / DAY_IN_MS);
    return Math.max(1, diffInDays);
};
