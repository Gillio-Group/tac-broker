export class APIError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class UnauthorizedError extends APIError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends APIError {
  constructor(message = 'Not Found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends APIError {
  constructor(message = 'Validation Error', details?: any) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

export class IntegrationError extends APIError {
  constructor(message = 'Integration Error', details?: any) {
    super(message, 502, details);
    this.name = 'IntegrationError';
  }
}

export class GunBrokerApiError extends APIError {
  constructor(message: string, status: number = 500, details?: any) {
    super(message, status, details);
    this.name = 'GunBrokerApiError';
  }
}

export function handleAPIError(error: unknown) {
  if (error instanceof APIError) {
    return {
      error: error.message,
      status: error.status,
      details: error.details,
    };
  }

  console.error('Unhandled error:', error);
  return {
    error: 'Internal Server Error',
    status: 500,
    details: error instanceof Error ? error.message : 'Unknown error',
  };
} 