import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * Error Response Interface
 */
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  errors?: any[];
  stack?: string;
}

/**
 * Custom Application Error
 */
export class AppError extends Error {
  statusCode: number;
  error: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, error: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error Handler
 */
export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
      return;
    }

    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: errors.array().map((err: any) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  };
};

/**
 * Async Handler Wrapper
 * Catches errors from async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not Found Handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.path}`,
  });
};

/**
 * Global Error Handler
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  const response: ErrorResponse = {
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  };

  let statusCode = 500;

  // Handle known error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    response.error = err.error;
    response.message = err.message;
  } else if (err.name === 'ValidationError') {
    // Mongoose Validation Error
    statusCode = 400;
    response.error = 'VALIDATION_ERROR';
    response.message = err.message;
  } else if (err.name === 'CastError') {
    // Mongoose Cast Error (invalid ObjectId)
    statusCode = 400;
    response.error = 'INVALID_ID';
    response.message = 'Invalid ID format';
  } else if ((err as any).code === 11000) {
    // MongoDB Duplicate Key Error
    statusCode = 409;
    response.error = 'DUPLICATE_ERROR';
    response.message = 'Duplicate entry found';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    response.error = 'INVALID_TOKEN';
    response.message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    response.error = 'TOKEN_EXPIRED';
    response.message = 'Token has expired';
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default {
  AppError,
  validateRequest,
  asyncHandler,
  notFoundHandler,
  errorHandler,
};
