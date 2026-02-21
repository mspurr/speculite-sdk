import { LifecycleClient } from './client/lifecycleClient.js';

export * from './types.js';
export { SpeculiteApiError } from './errors.js';

/**
 * Public SDK entry point.
 *
 * `SpeculiteClobClient` composes:
 * - public market data methods
 * - developer-key trading methods
 * - wallet-native lifecycle transaction helpers
 *
 * The class intentionally has no extra logic; behavior is implemented
 * in the layered client modules for easier maintenance.
 */
export class SpeculiteClobClient extends LifecycleClient {}
