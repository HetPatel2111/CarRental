export const formatDate = (value) =>
    new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

export const getErrorMessage = (error, fallback = "Something went wrong.") =>
    error?.response?.data?.message || error?.message || fallback;
