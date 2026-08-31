import multer from "multer";

export const errorHandler = (err, req, res, next) => {
  console.error("API Error:", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File is too large. Maximum allowed size is 5MB.";
    } else {
      message = `Upload error: ${err.message}`;
    }
  } else if (err.name === "CastError") {
    statusCode = 404;
    message = "Resource not found (invalid ID format).";
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};
