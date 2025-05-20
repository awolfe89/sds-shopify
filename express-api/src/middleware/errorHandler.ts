import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import multer from 'multer';

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
  status?: number;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle Multer errors specifically
  if (err instanceof multer.MulterError) {
    let errorCode = 'UPLOAD_ERROR';
    let errorMessage = err.message;
    let statusCode = 400;
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      errorCode = 'FILE_TOO_LARGE';
      errorMessage = 'File size exceeds the 10MB limit';
      statusCode = 413; // Payload Too Large
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      errorCode = 'UNEXPECTED_FIELD';
      errorMessage = 'Unexpected field in upload form';
    }
    
    return res.status(statusCode).json({
      success: false,
      errors: [{
        code: errorCode,
        message: errorMessage,
        suggestion: errorCode === 'FILE_TOO_LARGE' 
          ? 'Please upload a smaller file or compress the document'
          : 'Please check the upload form field names'
      }]
    });
  }
  
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  
  logger.error(`Error: ${err.message}`, {
    path: req.path,
    method: req.method,
    statusCode,
    errorCode,
    stack: err.stack
  });
  
  res.status(statusCode).json({
    success: false,
    errors: [{
      code: errorCode,
      message: err.message,
      details: err.details
    }]
  });
};