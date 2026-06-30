export function notFound(req, res) {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = status >= 500 ? 'Internal Server Error' : err.message;

  if (status >= 500) {
    console.error('[API Error]', {
      method: req.method,
      path: req.originalUrl,
      message: err.message,
      stack: err.stack,
    });
  }

  return res.status(status).json({
    error: message,
  });
}

export function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

