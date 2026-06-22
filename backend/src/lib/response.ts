import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: Record<string, any>;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ResponseHandler {
  static success<T>(
    c: Context,
    data: T,
    options?: {
      status?: ContentfulStatusCode;
      message?: string;
      meta?: Record<string, any>;
    }
  ) {
    const response: ApiSuccessResponse<T> = {
      success: true,
      data,
    };

    if (options?.message) response.message = options.message;
    if (options?.meta) response.meta = options.meta;

    return c.json(response, options?.status || 200);
  }

  static error(
    c: Context,
    message: string,
    options?: {
      status?: ContentfulStatusCode;
      code?: string;
      details?: any;
    }
  ) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        message,
      },
    };

    if (options?.code) response.error.code = options.code;
    if (options?.details) response.error.details = options.details;

    return c.json(response, options?.status || 400);
  }

  // Helper methods for common HTTP status codes
  static ok<T>(c: Context, data: T, message?: string) {
    return this.success(c, data, { status: 200, message });
  }

  static created<T>(c: Context, data: T, message?: string) {
    return this.success(c, data, { status: 201, message });
  }

  static badRequest(c: Context, message: string, details?: any) {
    return this.error(c, message, { status: 400, code: 'BAD_REQUEST', details });
  }

  static unauthorized(c: Context, message: string = 'Unauthorized') {
    return this.error(c, message, { status: 401, code: 'UNAUTHORIZED' });
  }

  static forbidden(c: Context, message: string = 'Forbidden') {
    return this.error(c, message, { status: 403, code: 'FORBIDDEN' });
  }

  static notFound(c: Context, message: string = 'Not Found') {
    return this.error(c, message, { status: 404, code: 'NOT_FOUND' });
  }

  static tooManyRequests(c: Context, message: string = 'Too Many Requests') {
    return this.error(c, message, { status: 429, code: 'TOO_MANY_REQUESTS' });
  }

  static internalServerError(c: Context, message: string = 'Internal Server Error', details?: any) {
    return this.error(c, message, { status: 500, code: 'INTERNAL_SERVER_ERROR', details });
  }
}
