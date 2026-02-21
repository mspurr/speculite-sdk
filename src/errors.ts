import type { JsonObject } from './types.js';

export interface SpeculiteApiErrorContext {
  method?: string;
  path?: string;
  url?: string;
}

/**
 * Extracts a readable message from heterogeneous API error payloads.
 */
function readJsonErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }
  if (payload && typeof payload === 'object') {
    const obj = payload as JsonObject;
    const message = obj.message;
    const error = obj.error;
    if (typeof message === 'string' && message.trim()) return message;
    if (typeof error === 'string' && error.trim()) return error;
  }
  return `Speculite API request failed with status ${status}`;
}

function formatRequestContext(context?: SpeculiteApiErrorContext): string {
  if (!context) return '';
  const method = context.method?.trim().toUpperCase();
  const path = context.path?.trim();
  if (method && path) return `${method} ${path}`;
  if (path) return path;
  return '';
}

export class SpeculiteApiError extends Error {
  /** HTTP status returned by the Speculite API. */
  readonly status: number;
  /** Raw response payload returned by the API. */
  readonly payload: unknown;
  /** HTTP method used for the failed request (when available). */
  readonly method?: string;
  /** Request path (including query string) for the failed request (when available). */
  readonly path?: string;
  /** Full URL for the failed request (when available). */
  readonly url?: string;

  constructor(
    status: number,
    payload: unknown,
    context: SpeculiteApiErrorContext = {}
  ) {
    const baseMessage = readJsonErrorMessage(payload, status);
    const requestContext = formatRequestContext(context);
    super(requestContext ? `${requestContext} failed: ${baseMessage}` : baseMessage);
    this.name = 'SpeculiteApiError';
    this.status = status;
    this.payload = payload;
    this.method = context.method;
    this.path = context.path;
    this.url = context.url;
  }
}
