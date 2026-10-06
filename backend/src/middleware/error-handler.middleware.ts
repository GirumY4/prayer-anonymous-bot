import type { ErrorRequestHandler } from 'express';
import { logger } from '../shared/logging/logger.js';

type HttpError = Error & {
  status?: unknown;
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const error = err as HttpError;

  const statusCode =
    typeof error.status === 'number' &&
    Number.isInteger(error.status) &&
    error.status >= 400 &&
    error.status <= 599
      ? error.status
      : 500;

  logger.error({
    event: 'http_request_failed',
    method: req.method,
    statusCode,
  });

  return res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : 'Request failed',
  });
};
