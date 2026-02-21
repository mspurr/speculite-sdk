import { LifecycleClient } from './client/lifecycleClient.js';

export * from './types.js';
export { SpeculiteApiError } from './errors.js';

export class SpeculiteClobClient extends LifecycleClient {}
