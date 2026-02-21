import type { Address, Hex } from 'viem';
import { SCALE } from './constants.js';
import type { RequestOptions } from '../types.js';

export function normalizeHost(host: string): string {
  const trimmed = host.trim();
  if (!trimmed) throw new Error('host is required');
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function ensureLeadingSlash(path: string): string {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

export function buildUrl(baseHost: string, path: string, query?: RequestOptions['query']): URL {
  const url = new URL(`${baseHost}${ensureLeadingSlash(path)}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

export function parsePositiveNumber(value: number | string, field: string): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a valid number`);
  }
  if (parsed <= 0) {
    throw new Error(`${field} must be greater than 0`);
  }
  return parsed;
}

export function toPositiveDecimalString(value: number | string, field: string): string {
  parsePositiveNumber(value, field);
  return typeof value === 'number' ? value.toString() : value.trim();
}

export function scaleToInt(value: number | string, field: string): number {
  const parsed = parsePositiveNumber(value, field);
  const scaled = Math.floor(parsed * SCALE);
  if (!Number.isFinite(scaled) || scaled <= 0) {
    throw new Error(`${field} is too small after scaling`);
  }
  return scaled;
}

export function scaledToDecimalString(scaled: number): string {
  const whole = Math.floor(scaled / SCALE);
  const frac = scaled % SCALE;
  if (frac === 0) return String(whole);
  return `${whole}.${frac.toString().padStart(6, '0').replace(/0+$/, '')}`;
}

export function normalizeHexSignature(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Signature is empty');
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
}

export function normalizeAddress(value: unknown, fieldName: string): Address {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
  const trimmed = value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    throw new Error(`${fieldName} must be a valid 20-byte hex address`);
  }
  return trimmed as Address;
}

export function normalizePythFeedId(value: unknown): Hex | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withPrefix = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(withPrefix)) {
    throw new Error('market pyth_feed_id must be 32-byte hex');
  }
  return withPrefix as Hex;
}

export function parseExpiryTimestamp(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  }
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric > 1_000_000_000_000 ? Math.floor(numeric / 1000) : Math.floor(numeric);
    }
    const dateMs = Date.parse(value);
    if (Number.isFinite(dateMs)) {
      return Math.floor(dateMs / 1000);
    }
  }
  return null;
}

export function bytesToHex(bytes: Uint8Array): Hex {
  const body = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `0x${body}` as Hex;
}
