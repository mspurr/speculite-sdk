import crypto from 'crypto';

export const Side = {
  BUY: 'BUY',
  SELL: 'SELL'
} as const;

export const OrderType = {
  LIMIT: 'LIMIT',
  MARKET: 'MARKET'
} as const;

export type OrderSide = typeof Side[keyof typeof Side];
export type OrderTypeValue = typeof OrderType[keyof typeof OrderType];
export type Outcome = 'YES' | 'NO';

export interface ApiCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface CreateOrderArgs {
  marketId: string;
  outcome: Outcome;
  side: OrderSide;
  price: number | string;
  size: number | string;
  nonce?: number | string | bigint;
  expiry?: number;
  orderType?: OrderTypeValue;
  maxSlippage?: number | string;
  maker?: string;
}

export interface MarketSigningInfo {
  marketId: string;
  exchangeAddress: string;
  marketIdOnchain: number;
  takerFeeBps: number;
}

export interface Market {
  market_id: string;
  exchange_address?: string | null;
  market_id_onchain?: number | string | null;
  taker_fee_bps?: number | string | null;
  [key: string]: unknown;
}

export interface MarketsResponse {
  success: boolean;
  markets: Market[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface MarketResponse {
  success: boolean;
  market: Market;
}

export interface MarketDataResponse {
  market_id: string;
  midpoint_price: string | null;
  best_bid: string | null;
  best_ask: string | null;
  spread: string | null;
  timestamp?: string;
}

export interface MarketDataBatchResponse {
  success: boolean;
  data: MarketDataResponse[];
}

export interface OrderbookLevel {
  price: string;
  size?: string;
  token_id?: number;
  tokenId?: number;
  [key: string]: unknown;
}

export interface OrderbookResponse {
  market_id?: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  last_price?: string | null;
  timestamp?: string;
  [key: string]: unknown;
}

export interface DeveloperApiKey {
  api_key_id: string;
  key_prefix: string;
  label: string | null;
  scopes: string[];
  status: 'ACTIVE' | 'REVOKED';
  ip_allowlist: string[];
  expires_at: string | null;
  last_used_at: string | null;
  last_used_ip: string | null;
  created_at: string;
}

export interface DeveloperApiKeysResponse {
  success: boolean;
  keys: DeveloperApiKey[];
}

export interface DeveloperApiKeyRevokeResponse {
  success: boolean;
  api_key_id: string;
  status: 'REVOKED';
}

export interface DeveloperWalletActivity {
  wallet_address: string;
  first_seen_at: string;
  last_seen_at: string;
  order_count: number;
  traded_volume_usdc: string;
}

export interface DeveloperWalletActivityResponse {
  success: boolean;
  wallets: DeveloperWalletActivity[];
}

export interface DeveloperAuthMeResponse {
  success: boolean;
  principal: {
    user_id: string;
    api_key_id: string;
    scopes: string[];
  };
}

export interface DeveloperOpenOrder {
  order_id: string;
  market_id: string;
  side: OrderSide;
  token_id: number;
  type: OrderTypeValue;
  price: string;
  size: string;
  filled_size: string;
  status: string;
  client_order_id: string;
  created_at: string;
}

export interface DeveloperOpenOrdersResponse {
  success: boolean;
  orders: DeveloperOpenOrder[];
}

export interface DeveloperPagination {
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface DeveloperOrderHistoryEntry extends DeveloperOpenOrder {
  outcome: Outcome;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  updated_at?: string;
}

export interface DeveloperOrderHistoryResponse {
  success: boolean;
  orders: DeveloperOrderHistoryEntry[];
  pagination: DeveloperPagination;
}

export interface DeveloperTradeFill {
  trade_id: string;
  market_id: string;
  maker_order_id: string;
  taker_order_id: string;
  role: 'MAKER' | 'TAKER';
  side: OrderSide;
  token_id: number;
  outcome: Outcome;
  price: string;
  size: string;
  client_order_id: string | null;
  settlement_status: string;
  transaction_hash: string | null;
  user_operation_hash: string | null;
  matched_at: string;
}

export interface DeveloperTradesResponse {
  success: boolean;
  trades: DeveloperTradeFill[];
  pagination: DeveloperPagination;
}

export interface DeveloperPosition {
  position_id: string;
  market_id: string;
  market_name: string | null;
  title: string | null;
  question: string | null;
  underlying_symbol: string | null;
  expiration_timestamp: string;
  market_status: string;
  winning_outcome: number | null;
  token_id: number;
  outcome: Outcome;
  quantity: string;
  average_entry_price: string;
  position_status: string;
  updated_at: string;
}

export interface DeveloperPositionsResponse {
  success: boolean;
  positions: DeveloperPosition[];
  pagination: DeveloperPagination;
}

export interface DeveloperListParams {
  marketId?: string;
  limit?: number;
  offset?: number;
}

export interface DeveloperPositionsParams extends DeveloperListParams {
  includeClosed?: boolean;
}

export interface DeveloperOrderAcceptedResponse {
  success: boolean;
  lifecycle_status: 'ACCEPTED';
  order_id: string;
  client_order_id: string;
  market_id: string;
  side: OrderSide;
  outcome: Outcome;
  price: string;
  size: string;
  accepted_at: string;
}

export interface DeveloperCancelOrderResponse {
  success: boolean;
  message: string;
}

export interface DeveloperOrderRequest {
  market_id: string;
  maker: string;
  outcome: Outcome;
  side: OrderSide;
  price: string;
  size: string;
  nonce: string;
  expiry: number;
  signature: string;
  order_type?: OrderTypeValue;
  max_slippage?: string;
}

export interface SignerLike {
  address?: string;
  account?: { address?: string };
  getAddress?: () => Promise<string> | string;
  signTypedData: (...args: any[]) => Promise<string>;
}

interface RuntimeOptions {
  fetch?: typeof fetch;
  now?: () => number;
}

interface RequestOptions {
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  headers?: HeadersInit;
  auth?: 'none' | 'bearer' | 'developer';
  authToken?: string;
}

interface JsonObject {
  [key: string]: unknown;
}

const ORDER_TYPES = {
  Order: [
    { name: 'marketId', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'isSell', type: 'bool' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'amount', type: 'uint256' },
    { name: 'price', type: 'uint256' },
    { name: 'feeBps', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' }
  ]
} as const;

const SCALE = 1_000_000;

function normalizeHost(host: string): string {
  const trimmed = host.trim();
  if (!trimmed) throw new Error('host is required');
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function ensureLeadingSlash(path: string): string {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function buildUrl(baseHost: string, path: string, query?: RequestOptions['query']): URL {
  const url = new URL(`${baseHost}${ensureLeadingSlash(path)}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function parsePositiveNumber(value: number | string, field: string): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a valid number`);
  }
  if (parsed <= 0) {
    throw new Error(`${field} must be greater than 0`);
  }
  return parsed;
}

function scaleToInt(value: number | string, field: string): number {
  const parsed = parsePositiveNumber(value, field);
  const scaled = Math.floor(parsed * SCALE);
  if (!Number.isFinite(scaled) || scaled <= 0) {
    throw new Error(`${field} is too small after scaling`);
  }
  return scaled;
}

function scaledToDecimalString(scaled: number): string {
  const whole = Math.floor(scaled / SCALE);
  const frac = scaled % SCALE;
  if (frac === 0) return String(whole);
  return `${whole}.${frac.toString().padStart(6, '0').replace(/0+$/, '')}`;
}

function normalizeHexSignature(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Signature is empty');
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
}

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

export class SpeculiteClobClient {
  private readonly host: string;
  private readonly chainId: number;
  private readonly signatureType: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;

  private signer?: SignerLike;
  private funderAddress?: string;
  private credentials?: ApiCredentials;
  private nonceCounter = 0;

  constructor(
    host: string,
    chainId: number,
    signer?: SignerLike,
    credentials?: ApiCredentials,
    signatureType = 0,
    funderAddress?: string,
    runtimeOptions: RuntimeOptions = {}
  ) {
    this.host = normalizeHost(host);
    this.chainId = chainId;
    this.signer = signer;
    this.credentials = credentials;
    this.signatureType = signatureType;
    this.funderAddress = funderAddress;
    this.fetchImpl = runtimeOptions.fetch || fetch;
    this.now = runtimeOptions.now || (() => Date.now());
  }

  getSignatureType(): number {
    return this.signatureType;
  }

  setSigner(signer: SignerLike, funderAddress?: string): void {
    this.signer = signer;
    if (funderAddress) this.funderAddress = funderAddress;
  }

  setApiCredentials(credentials: ApiCredentials): void {
    this.credentials = credentials;
  }

  getApiCredentials(): ApiCredentials | null {
    return this.credentials || null;
  }

  async listApiKeys(authToken: string): Promise<DeveloperApiKeysResponse> {
    return this.request('GET', '/api/developer/keys', {
      auth: 'bearer',
      authToken
    });
  }

  async revokeApiKey(
    apiKeyId: string,
    authToken: string
  ): Promise<DeveloperApiKeyRevokeResponse> {
    return this.request('DELETE', `/api/developer/keys/${apiKeyId}`, {
      auth: 'bearer',
      authToken
    });
  }

  async getWalletActivity(authToken: string): Promise<DeveloperWalletActivityResponse> {
    return this.request('GET', '/api/developer/wallets', {
      auth: 'bearer',
      authToken
    });
  }

  async getMarkets(query: RequestOptions['query'] = {}): Promise<MarketsResponse> {
    return this.request('GET', '/api/markets', { query });
  }

  async getMarket(marketId: string): Promise<MarketResponse> {
    return this.request('GET', `/api/markets/${marketId}`);
  }

  async getMarketData(marketId: string): Promise<MarketDataResponse> {
    return this.request('GET', `/api/market-data/${marketId}`);
  }

  async getMarketDataBatch(marketIds: string[]): Promise<MarketDataBatchResponse> {
    return this.request('POST', '/api/market-data/batch', {
      body: { market_ids: marketIds }
    });
  }

  async getOrderbook(marketId: string): Promise<OrderbookResponse> {
    return this.request('GET', '/clob/orderbook', {
      query: { market_id: marketId }
    });
  }

  async getAuthMe(): Promise<DeveloperAuthMeResponse> {
    return this.request('GET', '/api/developer/auth/me', {
      auth: 'developer'
    });
  }

  async getOpenOrders(marketId?: string): Promise<DeveloperOpenOrdersResponse> {
    return this.request('GET', '/api/developer/orders/open', {
      auth: 'developer',
      query: marketId ? { market_id: marketId } : undefined
    });
  }

  async getOrderHistory(params: DeveloperListParams = {}): Promise<DeveloperOrderHistoryResponse> {
    return this.request('GET', '/api/developer/orders/history', {
      auth: 'developer',
      query: {
        market_id: params.marketId,
        limit: params.limit,
        offset: params.offset
      }
    });
  }

  async getTrades(params: DeveloperListParams = {}): Promise<DeveloperTradesResponse> {
    return this.request('GET', '/api/developer/trades', {
      auth: 'developer',
      query: {
        market_id: params.marketId,
        limit: params.limit,
        offset: params.offset
      }
    });
  }

  async getPositions(
    params: DeveloperPositionsParams = {}
  ): Promise<DeveloperPositionsResponse> {
    return this.request('GET', '/api/developer/positions', {
      auth: 'developer',
      query: {
        market_id: params.marketId,
        include_closed: params.includeClosed,
        limit: params.limit,
        offset: params.offset
      }
    });
  }

  async cancelOrder(orderId: string): Promise<DeveloperCancelOrderResponse> {
    return this.request('DELETE', `/api/developer/orders/${orderId}`, {
      auth: 'developer'
    });
  }

  async postOrder(order: DeveloperOrderRequest): Promise<DeveloperOrderAcceptedResponse> {
    return this.request('POST', '/api/developer/orders', {
      auth: 'developer',
      body: order
    });
  }

  async createOrder(
    args: CreateOrderArgs,
    marketInfo?: MarketSigningInfo
  ): Promise<DeveloperOrderRequest> {
    const signer = this.requireSigner();
    const maker = await this.resolveMakerAddress(args.maker);
    const market = marketInfo || await this.fetchMarketSigningInfo(args.marketId);

    const priceScaled = scaleToInt(args.price, 'price');
    if (priceScaled > SCALE) {
      throw new Error('price must be less than or equal to 1');
    }
    const sizeScaled = scaleToInt(args.size, 'size');

    const nonce = args.nonce !== undefined ? String(args.nonce) : this.nextNonce();
    if (!/^\d+$/.test(nonce)) {
      throw new Error('nonce must be an unsigned integer');
    }

    const nowSeconds = Math.floor(this.now() / 1000);
    const expiry = args.expiry !== undefined ? Math.floor(args.expiry) : nowSeconds + 7 * 24 * 60 * 60;
    if (!Number.isFinite(expiry) || expiry <= nowSeconds) {
      throw new Error('expiry must be a future unix timestamp in seconds');
    }

    const isSell = args.side === Side.SELL;
    const tokenId = args.outcome === 'YES' ? 0 : 1;

    const domain = {
      name: 'SpeculiteExchange',
      version: '1',
      chainId: this.chainId,
      verifyingContract: market.exchangeAddress
    };

    const message = {
      marketId: BigInt(market.marketIdOnchain),
      maker,
      isSell,
      tokenId: BigInt(tokenId),
      amount: BigInt(sizeScaled),
      price: BigInt(priceScaled),
      feeBps: BigInt(market.takerFeeBps),
      nonce: BigInt(nonce),
      expiry: BigInt(expiry)
    };

    const signature = normalizeHexSignature(
      await this.signTypedData(signer, domain, message, maker)
    );

    const order: DeveloperOrderRequest = {
      market_id: args.marketId,
      maker,
      outcome: args.outcome,
      side: args.side,
      price: scaledToDecimalString(priceScaled),
      size: scaledToDecimalString(sizeScaled),
      nonce,
      expiry,
      signature,
      order_type: args.orderType || OrderType.LIMIT
    };

    if (args.orderType === OrderType.MARKET && args.maxSlippage !== undefined) {
      const slippageScaled = scaleToInt(args.maxSlippage, 'maxSlippage');
      order.max_slippage = scaledToDecimalString(slippageScaled);
    }

    return order;
  }

  async createAndPostOrder(
    args: CreateOrderArgs,
    marketInfo?: MarketSigningInfo
  ): Promise<DeveloperOrderAcceptedResponse> {
    const order = await this.createOrder(args, marketInfo);
    return this.postOrder(order);
  }

  private requireSigner(): SignerLike {
    if (!this.signer) {
      throw new Error('A signer is required for order creation');
    }
    if (typeof this.signer.signTypedData !== 'function') {
      throw new Error('Signer must implement signTypedData');
    }
    return this.signer;
  }

  private requireCredentials(): ApiCredentials {
    if (!this.credentials) {
      throw new Error('Developer API credentials are required');
    }
    return this.credentials;
  }

  private async resolveMakerAddress(explicitMaker?: string): Promise<string> {
    if (explicitMaker && explicitMaker.trim()) return explicitMaker.trim();
    if (this.funderAddress && this.funderAddress.trim()) return this.funderAddress.trim();
    if (!this.signer) throw new Error('No signer configured');

    if (typeof this.signer.getAddress === 'function') {
      const address = await this.signer.getAddress();
      if (address && String(address).trim()) return String(address).trim();
    }
    if (typeof this.signer.address === 'string' && this.signer.address.trim()) {
      return this.signer.address.trim();
    }
    if (this.signer.account?.address && this.signer.account.address.trim()) {
      return this.signer.account.address.trim();
    }
    throw new Error('Unable to resolve maker address from signer; pass args.maker explicitly');
  }

  private async signTypedData(
    signer: SignerLike,
    domain: Record<string, unknown>,
    message: Record<string, unknown>,
    makerAddress: string
  ): Promise<string> {
    const signTypedData = signer.signTypedData.bind(signer);

    const prefersViemStyle = Boolean(signer.account?.address) && signTypedData.length < 2;
    if (prefersViemStyle) {
      try {
        return await signTypedData({
          account: makerAddress,
          domain,
          types: ORDER_TYPES,
          primaryType: 'Order',
          message
        });
      } catch {
        return signTypedData(domain, ORDER_TYPES, message);
      }
    }

    return signTypedData(domain, ORDER_TYPES, message);
  }

  private nextNonce(): string {
    this.nonceCounter = (this.nonceCounter + 1) % 1000;
    const base = BigInt(this.now());
    return (base * 1000n + BigInt(this.nonceCounter)).toString();
  }

  private async fetchMarketSigningInfo(marketId: string): Promise<MarketSigningInfo> {
    const response = await this.getMarket(marketId);
    const market = response?.market;
    if (!market || typeof market !== 'object') {
      throw new Error('Missing market object in response');
    }

    const exchangeAddress = market.exchange_address;
    const marketIdOnchain = market.market_id_onchain;
    const takerFeeBps = market.taker_fee_bps ?? 0;

    if (typeof exchangeAddress !== 'string' || !exchangeAddress) {
      throw new Error('Market is missing exchange_address');
    }

    const parsedMarketIdOnchain = Number(marketIdOnchain);
    if (!Number.isFinite(parsedMarketIdOnchain)) {
      throw new Error('Market is missing market_id_onchain');
    }

    const parsedTakerFeeBps = Number(takerFeeBps);
    if (!Number.isFinite(parsedTakerFeeBps) || parsedTakerFeeBps < 0) {
      throw new Error('Invalid taker_fee_bps value');
    }

    return {
      marketId,
      exchangeAddress,
      marketIdOnchain: Math.floor(parsedMarketIdOnchain),
      takerFeeBps: Math.floor(parsedTakerFeeBps)
    };
  }

  private buildDeveloperAuthHeaders(
    method: string,
    pathWithQuery: string,
    bodyText: string
  ): Record<string, string> {
    const creds = this.requireCredentials();
    const timestamp = String(Math.floor(this.now() / 1000));
    const payload = `${timestamp}${method.toUpperCase()}${pathWithQuery}${bodyText}`;
    const signature = crypto
      .createHmac('sha256', creds.apiSecret)
      .update(payload)
      .digest('hex');

    return {
      'SPECULITE-API-KEY': creds.apiKey,
      'SPECULITE-TIMESTAMP': timestamp,
      'SPECULITE-SIGNATURE': signature
    };
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = buildUrl(this.host, path, options.query);
    const pathWithQuery = `${url.pathname}${url.search}`;

    const headers = new Headers(options.headers || {});
    let bodyText = '';

    if (options.body !== undefined && options.body !== null) {
      bodyText = typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
      if (!headers.has('content-type')) {
        headers.set('Content-Type', 'application/json');
      }
    }

    if (options.auth === 'bearer') {
      if (!options.authToken) throw new Error('authToken is required');
      headers.set('Authorization', options.authToken.startsWith('Bearer ')
        ? options.authToken
        : `Bearer ${options.authToken}`);
    } else if (options.auth === 'developer') {
      const authHeaders = this.buildDeveloperAuthHeaders(method, pathWithQuery, bodyText);
      for (const [key, value] of Object.entries(authHeaders)) {
        headers.set(key, value);
      }
    }

    const response = await this.fetchImpl(url.toString(), {
      method,
      headers,
      body: bodyText || undefined
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      throw new SpeculiteApiError(response.status, payload);
    }

    return payload as T;
  }
}
