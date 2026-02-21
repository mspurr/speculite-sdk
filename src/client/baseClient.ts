import crypto from 'crypto';
import { createPublicClient, http, type Account, type Address, type Hex, type PublicClient, type WalletClient } from 'viem';
import { SpeculiteApiError } from '../errors.js';
import {
  DEFAULT_PYTH_PRICE_SERVICE_URL,
  ORDER_TYPES,
} from '../internal/constants.js';
import {
  buildUrl,
  bytesToHex,
  normalizeAddress,
  normalizeHost,
  normalizePythFeedId,
  parseExpiryTimestamp,
} from '../internal/utils.js';
import type {
  ApiCredentials,
  ClientConstructorOptions,
  Market,
  MarketResponse,
  MarketSigningInfo,
  OnchainMarketInfo,
  RequestOptions,
  RuntimeOptions,
  SignerLike,
} from '../types.js';

/**
 * Shared SDK core:
 * - request transport + auth header signing
 * - signer/wallet resolution helpers
 * - market metadata normalization
 * - typed-data signing primitives
 *
 * Feature-specific APIs are implemented in subclasses.
 */
export abstract class BaseClient {
  protected readonly host: string;
  protected readonly chainId: number;
  protected readonly signatureType: number;
  protected readonly fetchImpl: typeof fetch;
  protected readonly now: () => number;
  protected readonly publicClient?: PublicClient;
  protected walletClient?: WalletClient;
  protected readonly rpcUrl?: string;
  protected readonly defaultPythAddress?: Address;
  protected readonly pythPriceServiceUrl: string;

  protected signer?: SignerLike;
  protected funderAddress?: string;
  protected credentials?: ApiCredentials;
  protected nonceCounter = 0;

  protected abstract getMarket(marketId: string): Promise<MarketResponse>;

  /**
   * Creates a client with backward-compatible constructor forms:
   * - legacy positional: `(host, chainId, signer, creds, signatureType?, funderAddress?, runtimeOptions?)`
   * - preferred options: `(host, chainId, signer, creds, { signatureType?, funderAddress?, ...runtimeOptions })`
   */
  constructor(
    host: string,
    chainId: number,
    signer?: SignerLike,
    credentials?: ApiCredentials,
    signatureTypeOrOptions: number | ClientConstructorOptions = 0,
    funderAddress?: string,
    runtimeOptions: RuntimeOptions = {}
  ) {
    let signatureType = 0;
    let resolvedFunderAddress = funderAddress;
    let resolvedRuntimeOptions: RuntimeOptions = runtimeOptions;

    if (typeof signatureTypeOrOptions === 'number') {
      signatureType = signatureTypeOrOptions;
    } else {
      const {
        signatureType: optionsSignatureType = 0,
        funderAddress: optionsFunderAddress,
        ...runtimeFromOptions
      } = signatureTypeOrOptions;
      signatureType = optionsSignatureType;
      resolvedFunderAddress = optionsFunderAddress ?? funderAddress;
      resolvedRuntimeOptions = {
        ...runtimeFromOptions,
        ...runtimeOptions
      };
    }

    this.host = normalizeHost(host);
    this.chainId = chainId;
    this.signer = signer;
    this.credentials = credentials;
    this.signatureType = signatureType;
    this.funderAddress = resolvedFunderAddress;
    this.fetchImpl = resolvedRuntimeOptions.fetch || fetch;
    this.now = resolvedRuntimeOptions.now || (() => Date.now());
    this.publicClient = resolvedRuntimeOptions.publicClient;
    this.walletClient = resolvedRuntimeOptions.walletClient;
    this.rpcUrl = resolvedRuntimeOptions.rpcUrl;
    this.defaultPythAddress = resolvedRuntimeOptions.pythAddress;
    this.pythPriceServiceUrl = resolvedRuntimeOptions.pythPriceServiceUrl || DEFAULT_PYTH_PRICE_SERVICE_URL;
  }

  /** Signature strategy identifier used by upstream systems. */
  getSignatureType(): number {
    return this.signatureType;
  }

  /**
   * Replaces signer and optional funder address at runtime.
   */
  setSigner(signer: SignerLike, funderAddress?: string): void {
    this.signer = signer;
    if (funderAddress) this.funderAddress = funderAddress;
  }

  /** Replaces developer API credentials used for HMAC-auth endpoints. */
  setApiCredentials(credentials: ApiCredentials): void {
    this.credentials = credentials;
  }

  /** Replaces wallet client used for on-chain transaction submission. */
  setWalletClient(walletClient: WalletClient): void {
    this.walletClient = walletClient;
  }

  /** Returns currently configured developer API credentials, if set. */
  getApiCredentials(): ApiCredentials | null {
    return this.credentials || null;
  }

  /** Ensures signer exists and can sign typed data. */
  protected requireSigner(): SignerLike {
    if (!this.signer) {
      throw new Error('A signer is required for order creation');
    }
    if (typeof this.signer.signTypedData !== 'function') {
      throw new Error('Signer must implement signTypedData');
    }
    return this.signer;
  }

  /** Ensures developer API credentials are configured. */
  protected requireCredentials(): ApiCredentials {
    if (!this.credentials) {
      throw new Error('Developer API credentials are required');
    }
    return this.credentials;
  }

  /** Ensures wallet client is configured for on-chain tx sending. */
  protected requireWalletClient(): WalletClient {
    if (!this.walletClient) {
      throw new Error('walletClient is required for on-chain transaction execution');
    }
    return this.walletClient;
  }

  /**
   * Resolves sender address for on-chain txs.
   *
   * Resolution order:
   * 1. explicit `account` argument
   * 2. wallet client's default account / first address
   * 3. signer/funder-derived address
   */
  protected async resolveWalletAccount(
    walletClient: WalletClient,
    account?: Address | Account
  ): Promise<Address | Account> {
    if (account) return account;
    if (walletClient.account) return walletClient.account;
    if (typeof walletClient.getAddresses === 'function') {
      const addresses = await walletClient.getAddresses();
      if (addresses.length > 0) return addresses[0] as Address;
    }
    try {
      return normalizeAddress(await this.resolveMakerAddress(), 'signer.address');
    } catch {
      throw new Error('No wallet account available; pass account explicitly or provide signer/funderAddress');
    }
  }

  /** Returns explicit public client or builds one from RPC URL. */
  protected resolvePublicClient(overrideRpcUrl?: string): PublicClient {
    if (this.publicClient) return this.publicClient;
    const rpcUrl = overrideRpcUrl || this.rpcUrl;
    if (!rpcUrl) {
      throw new Error('rpcUrl is required when publicClient is not configured');
    }
    return createPublicClient({ transport: http(rpcUrl) });
  }

  /** Converts API market payload into normalized on-chain metadata. */
  protected mapMarketToOnchainInfo(
    marketId: string,
    market: Market
  ): OnchainMarketInfo {
    const exchangeAddress = normalizeAddress(market.exchange_address, 'market.exchange_address');
    const marketIdOnchain = Number(market.market_id_onchain);
    if (!Number.isFinite(marketIdOnchain)) {
      throw new Error('Market is missing market_id_onchain');
    }

    return {
      marketId,
      marketIdOnchain: Math.floor(marketIdOnchain),
      exchangeAddress,
      pythFeedId: normalizePythFeedId(market.pyth_feed_id),
      expiryTimestamp: parseExpiryTimestamp(market.expiration_timestamp)
    };
  }

  /**
   * Resolves required on-chain market metadata from override or API lookup.
   */
  protected async resolveOnchainMarketInfo(
    marketId: string,
    override?: Partial<OnchainMarketInfo>
  ): Promise<OnchainMarketInfo> {
    const needsFetch = !override?.exchangeAddress || !override?.marketIdOnchain;
    const fetched = needsFetch
      ? this.mapMarketToOnchainInfo(marketId, (await this.getMarket(marketId)).market)
      : null;

    const exchangeAddress = normalizeAddress(
      override?.exchangeAddress || fetched?.exchangeAddress,
      'market.exchangeAddress'
    );
    const marketIdOnchainRaw = override?.marketIdOnchain ?? fetched?.marketIdOnchain;
    if (!Number.isFinite(Number(marketIdOnchainRaw))) {
      throw new Error('market.marketIdOnchain is required');
    }

    return {
      marketId,
      marketIdOnchain: Math.floor(Number(marketIdOnchainRaw)),
      exchangeAddress,
      pythFeedId: normalizePythFeedId(override?.pythFeedId) ?? fetched?.pythFeedId ?? null,
      expiryTimestamp: override?.expiryTimestamp ?? fetched?.expiryTimestamp ?? null
    };
  }

  /**
   * Fetches Pyth update payload(s) for market expiry.
   * Falls back to latest endpoint when allowed.
   */
  protected async fetchPythUpdateData(
    pythFeedId: Hex,
    expiryTimestamp: number,
    priceServiceUrl: string,
    allowLatestFallback: boolean
  ): Promise<Hex[]> {
    const normalizedBase = priceServiceUrl.replace(/\/+$/, '');
    const feedId = pythFeedId.startsWith('0x') ? pythFeedId : `0x${pythFeedId}`;
    const endpoints = [
      `${normalizedBase}/v2/updates/price/${expiryTimestamp}?ids[]=${feedId}&encoding=hex`,
      ...(allowLatestFallback
        ? [`${normalizedBase}/v2/updates/price/latest?ids[]=${feedId}&encoding=hex`]
        : [])
    ];

    let lastError: string | null = null;

    for (const endpoint of endpoints) {
      try {
        const response = await this.fetchImpl(endpoint);
        if (!response.ok) {
          lastError = `Pyth API ${response.status} ${response.statusText}`;
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const payload = await response.json() as any;
          const hexValues = payload?.binary?.data;
          if (Array.isArray(hexValues) && hexValues.length > 0) {
            return hexValues.map((raw: string) => {
              const value = raw.startsWith('0x') ? raw : `0x${raw}`;
              if (!/^0x[0-9a-fA-F]+$/.test(value)) {
                throw new Error('Pyth API returned non-hex updateData payload');
              }
              return value as Hex;
            });
          }
          lastError = 'Pyth API returned JSON without binary.data';
          continue;
        }

        const raw = new Uint8Array(await response.arrayBuffer());
        if (raw.length > 0) {
          return [bytesToHex(raw)];
        }
        lastError = 'Pyth API returned empty binary response';
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    throw new Error(`Failed to fetch Pyth update data: ${lastError || 'unknown error'}`);
  }

  /**
   * Resolves maker/funder address used for signing orders.
   */
  protected async resolveMakerAddress(explicitMaker?: string): Promise<string> {
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

  /**
   * Signs EIP-712 payload, supporting both ethers-style and viem-style signers.
   */
  protected async signTypedData(
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

  /** Generates a monotonic nonce derived from current timestamp. */
  protected nextNonce(): string {
    this.nonceCounter = (this.nonceCounter + 1) % 1000;
    const base = BigInt(this.now());
    return (base * 1000n + BigInt(this.nonceCounter)).toString();
  }

  /** Fetches/validates market data needed for order signing. */
  protected async fetchMarketSigningInfo(marketId: string): Promise<MarketSigningInfo> {
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

  /** Builds HMAC headers for developer-authenticated API requests. */
  protected buildDeveloperAuthHeaders(
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

  /**
   * Executes an HTTP request and parses JSON/text payload.
   * Throws `SpeculiteApiError` on non-2xx responses.
   */
  protected async request<T = unknown>(
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
      throw new SpeculiteApiError(response.status, payload, {
        method,
        path: pathWithQuery,
        url: url.toString()
      });
    }

    return payload as T;
  }
}
