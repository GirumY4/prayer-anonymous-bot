import type { ErrorRequestHandler } from 'express';
import { logger } from '../shared/logging/logger.js';
import { ApplicationError } from '../shared/errors/application-error.js';

type HttpError = Error & {
  status?: unknown;
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ApplicationError) {
    logger.warn(
      {
        event: 'application_error',
        code: err.code,
        method: req.method,
      },
      err.message,
    );

    res.status(err.statusCode).json({
      error: err.code,
    });
    return;
  }

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
