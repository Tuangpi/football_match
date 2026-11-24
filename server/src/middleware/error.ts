import { Request, Response, NextFunction } from 'express';

type ErrorWithCode = Error & { code?: string };

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: ErrorWithCode,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal server error';
  const isTest = process.env.NODE_ENV === 'test';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }

  if (isTest && statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(isTest && statusCode >= 500 && {
      error: {
        name: err.name,
        message: err.message,
        ...(err.code && { code: err.code }),
      },
    }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFound = (_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
};