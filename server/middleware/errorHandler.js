export const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.originalUrl}`,
    });
};

export const errorHandler = (error, req, res, next) => {
    const statusCode = res.statusCode >= 400 ? res.statusCode : 500;

    res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
    });
};
