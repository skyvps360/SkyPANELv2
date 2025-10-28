/**
 * Error Normalization Utilities
 * Standardizes error responses from different providers
 */

import { ProviderType, ProviderError } from './IProviderService.js';

/**
 * Normalize Linode API errors
 */
export function normalizeLinodeError(error: any, provider: ProviderType = 'linode'): ProviderError {
  // Linode error format: { errors: [{ field: string, reason: string }] }
  if (error?.errors && Array.isArray(error.errors) && error.errors.length > 0) {
    const firstError = error.errors[0];
    return {
      code: 'VALIDATION_ERROR',
      message: firstError.reason || 'Validation error',
      field: firstError.field,
      provider,
      originalError: error,
    };
  }

  // HTTP error with status
  if (error?.status) {
    return {
      code: `HTTP_${error.status}`,
      message: error.statusText || error.message || `HTTP ${error.status} error`,
      provider,
      originalError: error,
    };
  }

  // Generic error
  if (error instanceof Error) {
    return {
      code: 'API_ERROR',
      message: error.message,
      provider,
      originalError: error,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    provider,
    originalError: error,
  };
}

/**
 * Normalize DigitalOcean API errors
 */
export function normalizeDigitalOceanError(error: any, provider: ProviderType = 'digitalocean'): ProviderError {
  // DigitalOcean error format: { id: string, message: string }
  if (error?.id && error?.message) {
    return {
      code: error.id.toUpperCase().replace(/-/g, '_'),
      message: error.message,
      provider,
      originalError: error,
    };
  }

  // DigitalOcean error with data property
  if (error?.data) {
    if (error.data.id && error.data.message) {
      return {
        code: error.data.id.toUpperCase().replace(/-/g, '_'),
        message: error.data.message,
        provider,
        originalError: error,
      };
    }
    
    // Handle validation errors
    if (error.data.errors) {
      const firstError = Array.isArray(error.data.errors) ? error.data.errors[0] : error.data.errors;
      return {
        code: 'VALIDATION_ERROR',
        message: firstError?.message || 'Validation error',
        field: firstError?.field,
        provider,
        originalError: error,
      };
    }
  }

  // HTTP error with status
  if (error?.status) {
    const statusMessages: Record<number, string> = {
      400: 'Bad request - invalid parameters',
      401: 'Authentication failed - invalid API token',
      403: 'Access forbidden - insufficient permissions',
      404: 'Resource not found',
      422: 'Unprocessable entity - validation failed',
      429: 'Rate limit exceeded',
      500: 'DigitalOcean server error',
      502: 'Bad gateway - DigitalOcean service unavailable',
      503: 'Service unavailable - DigitalOcean is down',
      504: 'Gateway timeout - DigitalOcean request timed out',
    };

    return {
      code: `HTTP_${error.status}`,
      message: statusMessages[error.status] || error.statusText || error.message || `HTTP ${error.status} error`,
      provider,
      originalError: error,
    };
  }

  // Generic error
  if (error instanceof Error) {
    return {
      code: 'API_ERROR',
      message: error.message,
      provider,
      originalError: error,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    provider,
    originalError: error,
  };
}

/**
 * Parse error response from fetch
 */
export async function parseErrorResponse(response: Response, provider: ProviderType): Promise<ProviderError> {
  let errorData: any;

  try {
    const text = await response.text();
    errorData = JSON.parse(text);
  } catch {
    // If we can't parse JSON, use status text
    return {
      code: `HTTP_${response.status}`,
      message: response.statusText || `HTTP ${response.status} error`,
      provider,
    };
  }

  // Normalize based on provider
  if (provider === 'linode') {
    return normalizeLinodeError(errorData, provider);
  } else if (provider === 'digitalocean') {
    return normalizeDigitalOceanError(errorData, provider);
  }

  // Generic normalization
  return {
    code: `HTTP_${response.status}`,
    message: errorData?.message || response.statusText || `HTTP ${response.status} error`,
    provider,
    originalError: errorData,
  };
}

/**
 * Map common error codes to user-friendly messages
 */
export function getUserFriendlyMessage(error: ProviderError): string {
  const codeMap: Record<string, string> = {
    'MISSING_CREDENTIALS': 'API credentials are not configured. Please contact your administrator.',
    'INVALID_CREDENTIALS': 'API credentials are invalid. Please contact your administrator.',
    'HTTP_401': 'Authentication failed. Please contact your administrator.',
    'HTTP_403': 'Access forbidden. Please contact your administrator.',
    'HTTP_404': 'Resource not found.',
    'HTTP_429': 'Rate limit exceeded. Please try again later.',
    'HTTP_500': 'Provider service error. Please try again later.',
    'HTTP_503': 'Provider service unavailable. Please try again later.',
    'VALIDATION_ERROR': error.message,
    'NOT_FOUND': 'The requested resource was not found.',
    'UNAUTHORIZED': 'Authentication failed. Please contact your administrator.',
  };

  return codeMap[error.code] || error.message || 'An error occurred';
}
