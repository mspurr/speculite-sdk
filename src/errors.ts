import type { JsonObject } from './types.js';

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
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, payload: unknown) {
    super(readJsonErrorMessage(payload, status));
    this.name = 'SpeculiteApiError';
    this.status = status;
    this.payload = payload;
  }
}
