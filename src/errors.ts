import type { JsonObject } from './types.js';

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

export class SpeculiteApiError extends Error {
  /** HTTP status returned by the Speculite API. */
  readonly status: number;
  /** Raw response payload returned by the API. */
  readonly payload: unknown;

  constructor(status: number, payload: unknown) {
    super(readJsonErrorMessage(payload, status));
    this.name = 'SpeculiteApiError';
    this.status = status;
    this.payload = payload;
  }
}
