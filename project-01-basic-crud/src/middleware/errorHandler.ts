/**
 * Global Error Handler Middleware
 * 
 * Catches all errors throughout the application and returns standardized JSON responses.
 * Prevents stack traces from being exposed in production.
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types/index';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  error: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error.message || 'Internal Server Error';

  const response: ErrorResponse = {
    success: false,
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};