import type { Account, Address, Hex, PublicClient, WalletClient } from 'viem';

/** Trade side used by order creation and order/trade responses. */
export const Side = {
  BUY: 'BUY',
  SELL: 'SELL'
} as const;

/** Order execution mode. */
export const OrderType = {
  LIMIT: 'LIMIT',
  MARKET: 'MARKET'
} as const;

export type OrderSide = typeof Side[keyof typeof Side];
export type OrderTypeValue = typeof OrderType[keyof typeof OrderType];
export type Outcome = 'YES' | 'NO';

/** Developer API credentials generated from the Speculite app UI. */
export interface ApiCredentials {
  apiKey: string;
  apiSecret: string;
}

/** High-level order arguments for `createOrder` / `createAndPostOrder`. */
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

/** Canonical market metadata used for order-signing domain resolution. */
export interface MarketSigningInfo {
  marketId: string;
  exchangeAddress: string;
  marketIdOnchain: number;
  takerFeeBps: number;
}

/** ---------- Public Market Data Types ---------- */
export interface Market {
  market_id: string;
  exchange_address?: string | null;
  market_id_onchain?: number | string | null;
  taker_fee_bps?: number | string | null;
  pyth_address?: string | null;
  pyth_feed_id?: string | null;
  expiration_timestamp?: string | number | null;
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

/** ---------- Developer API Types ---------- */
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
  source_channel?: 'WEB' | 'API';
  source_api_key_id?: string | null;
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
  source_channel?: 'WEB' | 'API';
  source_api_key_id?: string | null;
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

/** Response returned when an order is accepted by the backend lifecycle queue. */
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

export interface DeveloperResolveMarketResponse {
  success: boolean;
  market_id: string;
  resolutionTransactionHash: string;
  resolutionData: {
    resolutionPrice: string;
    winningTokenId: number;
    winningOutcome?: string;
  } | null;
  message: string;
}

export type DeveloperLifecycleAction = 'MINT' | 'MERGE' | 'CLAIM';

export interface DeveloperLifecycleEventRequest {
  market_id: string;
  wallet_address?: string;
  action: DeveloperLifecycleAction;
  amount?: string;
  transaction_hash: string;
}

export interface DeveloperLifecycleEventResponse {
  success: boolean;
  recorded: boolean;
  activity: {
    transaction_id: string | null;
    market_id: string;
    wallet_address: string | null;
    action: DeveloperLifecycleAction;
    amount: string;
    transaction_hash: string;
    source_channel: 'API';
    source_api_key_id: string;
  };
}

/** ---------- V2 AI Resolution Types ---------- */
export interface V2MarketContext {
  categoryHint?: 'OBJECTIVE_PRICE' | 'STRUCTURED_EVENT';
  assetSymbol?: string | null;
  comparison?: 'above' | 'below' | null;
  strikePrice?: number | string | null;
  pythFeedId?: string | null;
  primarySourceUrl?: string | null;
  yesEvidencePhrases?: string[] | null;
  noEvidencePhrases?: string[] | null;
  dataSourceKey?: string | null;
  sourcePath?: string | null;
  expectedValue?: string | number | boolean | null;
  sourceUrls?: string[] | null;
  sourceSelectionPolicy?: 'PRIMARY_ONLY' | 'PRIMARY_THEN_FALLBACK' | 'CONSENSUS' | null;
}

export interface V2MarketPlanRequest {
  question: string;
  expirationTimestamp?: string | null;
  marketContext?: V2MarketContext | null;
}

export interface V2MarketCreateRequest extends V2MarketPlanRequest {
  confirmedResolutionSpecHash: string;
}

export interface ResolutionSpec {
  specVersion: string;
  plannerVersion: string;
  marketKind: 'OBJECTIVE_PRICE' | 'STRUCTURED_EVENT';
  outcomeType: 'BINARY';
  finalityMode: 'IMMEDIATE_FINAL';
  canonicalQuestion: string;
  expirationTimestamp: string | null;
  toolCatalogVersion: string;
  toolCatalogHash: string;
  steps: Array<{
    toolKey: string;
    adapterName: string;
    adapterVersion: string;
    sourceKind: 'STRUCTURED_API' | 'DOCUMENT_PAGE' | 'PRICE_FEED';
    params: Record<string, unknown>;
  }>;
  decisionRule:
    | {
        kind: 'price_threshold';
        comparison: 'above' | 'below';
        strikePrice: string;
        assetSymbol: string;
        pythFeedId: string;
      }
    | {
        kind: 'document_phrase_match';
        sourceUrls: string[];
        sourceSelectionPolicy: 'PRIMARY_ONLY' | 'PRIMARY_THEN_FALLBACK' | 'CONSENSUS';
        yesEvidencePhrases: string[];
        noEvidencePhrases: string[];
      }
    | {
        kind: 'structured_json_value';
        sourceUrls: string[];
        sourceSelectionPolicy: 'PRIMARY_ONLY' | 'PRIMARY_THEN_FALLBACK' | 'CONSENSUS';
        jsonPath: string;
        expectedValue: string | number | boolean;
      };
}

export interface V2SourceReference {
  sourceUrl: string;
  toolKey: string;
  sourceKind: 'STRUCTURED_API' | 'DOCUMENT_PAGE' | 'PRICE_FEED';
  selectionRole: 'PRIMARY' | 'FALLBACK';
  priority: number;
}

export interface V2CreatorResolutionRules {
  title: string;
  canonicalQuestion: string;
  finalityMode: 'IMMEDIATE_FINAL';
  sources: V2SourceReference[];
  sourceSelectionPolicy: 'PRIMARY_ONLY' | 'PRIMARY_THEN_FALLBACK' | 'CONSENSUS';
  resolutionSummary: string;
  invalidIf: string[];
}

export interface V2MarketPlanResult {
  decision: 'READY' | 'REJECTED';
  title: string;
  canonicalQuestion: string;
  plannerVersion: string;
  plannerRuntimeKind: 'LOCAL_RULES' | 'HTTP_LLM';
  plannerRuntimeVersion: string;
  marketKind: 'OBJECTIVE_PRICE' | 'STRUCTURED_EVENT' | null;
  marketStatus: string;
  toolCatalogVersion: string;
  toolCatalogHash: string;
  resolutionSpec: ResolutionSpec | null;
  resolutionSpecHash: string | null;
  creatorConfirmationRequired: boolean;
  creatorRules: V2CreatorResolutionRules | null;
  rejectionReason: string | null;
  plannerAttestation: PlannerRunRecord;
}

export interface V2Market {
  marketId: string;
  question: string;
  canonicalQuestion: string;
  expirationTimestamp: string | null;
  marketKind: 'OBJECTIVE_PRICE' | 'STRUCTURED_EVENT' | null;
  status: string;
  plannerDecision: 'READY' | 'REJECTED';
  rejectionReason: string | null;
  toolCatalogVersion: string;
  toolCatalogHash: string;
  resolutionSpecHash: string | null;
  createdAt: string;
  updatedAt: string;
  resolutionSpec: ResolutionSpec | null;
  latestPlannerRun: PlannerRunRecord | null;
  latestRun: ResolutionRun | null;
  latestAttestation: RunAttestationRecord | null;
  challenges: ChallengeRecord[];
}

export interface PlannerRunRecord {
  plannerRunId: string;
  runtimeKind: 'LOCAL_RULES' | 'HTTP_LLM';
  runtimeVersion: string;
  inputHash: string;
  outputHash: string;
  validatedPlanHash: string | null;
  attestationPayload: Record<string, unknown>;
  signature: string | null;
  createdAt: string;
}

export interface ResolutionRun {
  runId: string;
  marketId: string;
  status: string;
  proposedOutcome: 'YES' | 'NO' | null;
  rationale: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface RunAttestationRecord {
  attestationId: string;
  marketId: string;
  runId: string;
  runtimeKind: 'LOCAL_HASHED' | 'HTTP_EXECUTOR';
  runtimeVersion: string;
  inputHash: string;
  outputHash: string;
  evidenceBundleHash: string;
  proposalHash: string;
  attestationPayload: Record<string, unknown>;
  signature: string | null;
  createdAt: string;
}

export interface EvidenceItem {
  evidenceId: string;
  marketId: string;
  runId: string;
  toolKey: string;
  adapterName: string;
  adapterVersion: string;
  sourceUrl: string | null;
  retrievalTimestamp: string;
  contentHash: string;
  normalizedOutput: Record<string, unknown>;
  rawArtifact: unknown;
  createdAt: string;
}

export interface ChallengeRecord {
  challengeId: string;
  marketId: string;
  status: 'OPEN';
  reason: string;
  details: string | null;
  challengerId: string | null;
  createdAt: string;
}

export interface V2MarketPlanResponse {
  success: boolean;
  plan: V2MarketPlanResult;
}

export interface V2MarketResponse {
  success: boolean;
  market: V2Market;
}

export interface V2ResolutionResponse {
  success: boolean;
  run: ResolutionRun;
  evidence: EvidenceItem[];
  attestation: RunAttestationRecord;
}

export interface V2EvidenceResponse {
  success: boolean;
  evidence: EvidenceItem[];
}

export interface V2ChallengeCreateRequest {
  reason: string;
  details?: string | null;
  challengerId?: string | null;
}

export interface V2ChallengeResponse {
  success: boolean;
  challenge: ChallengeRecord;
}

export interface V2ChallengesResponse {
  success: boolean;
  challenges: ChallengeRecord[];
}

export interface V2AttestationsResponse {
  success: boolean;
  attestations: RunAttestationRecord[];
}

export interface V2PlannerRunsResponse {
  success: boolean;
  plannerRuns: PlannerRunRecord[];
}

export interface MarketAnchorEnvelope {
  chainVersion: string;
  envelopeType: 'MARKET_ROOT';
  marketId: string;
  canonicalQuestionHash: string;
  resolutionSpecHash: string | null;
  toolCatalogVersion: string;
  toolCatalogHash: string;
  createdAt: string;
  envelopeHash: string;
}

export interface PlannerAnchorEnvelope {
  chainVersion: string;
  envelopeType: 'PLANNER_RUN';
  marketId: string;
  plannerRunId: string;
  previousEnvelopeHash: string | null;
  marketEnvelopeHash: string;
  runtimeKind: 'LOCAL_RULES' | 'HTTP_LLM';
  runtimeVersion: string;
  inputHash: string;
  outputHash: string;
  validatedPlanHash: string | null;
  attestationPayloadHash: string;
  signature: string | null;
  createdAt: string;
  envelopeHash: string;
}

export interface ResolutionAnchorEnvelope {
  chainVersion: string;
  envelopeType: 'RESOLUTION_RUN';
  marketId: string;
  runId: string;
  attestationId: string;
  previousEnvelopeHash: string | null;
  marketEnvelopeHash: string;
  plannerEnvelopeHash: string | null;
  runtimeKind: 'LOCAL_HASHED' | 'HTTP_EXECUTOR';
  runtimeVersion: string;
  inputHash: string;
  outputHash: string;
  evidenceBundleHash: string;
  proposalHash: string;
  attestationPayloadHash: string;
  signature: string | null;
  createdAt: string;
  envelopeHash: string;
}

export interface V2AnchorBundle {
  chainVersion: string;
  marketId: string;
  marketEnvelope: MarketAnchorEnvelope;
  plannerEnvelopes: PlannerAnchorEnvelope[];
  resolutionEnvelopes: ResolutionAnchorEnvelope[];
  latestPlannerEnvelopeHash: string | null;
  latestResolutionEnvelopeHash: string | null;
  chainHeadHash: string;
  anchorBundleHash: string;
  onchainAnchorPayload: {
    marketEnvelopeHash: string;
    plannerEnvelopeHash: string | null;
    resolutionEnvelopeHash: string | null;
    chainHeadHash: string;
    anchorBundleHash: string;
  };
}

export interface V2AnchorBundleResponse {
  success: boolean;
  anchorBundle: V2AnchorBundle;
}

/** ---------- Signing and Lifecycle Transaction Types ---------- */
/** Raw order payload shape expected by `/api/developer/orders`. */
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

/** Minimal signer abstraction accepted by the SDK. */
export interface SignerLike {
  address?: string;
  account?: { address?: string };
  getAddress?: () => Promise<string> | string;
  signTypedData: (...args: any[]) => Promise<string>;
}

/** Generic prepared transaction representation used by lifecycle helpers. */
export interface PreparedOnchainTransaction {
  to: Address;
  data: Hex;
  value?: bigint;
  chainId: number;
  kind: 'approve_usdc' | 'mint' | 'merge' | 'claim' | 'resolve';
}

export interface PreparedResolveTransaction extends PreparedOnchainTransaction {
  kind: 'resolve';
  updateData: Hex[];
  updateFeeWei: bigint;
  marketIdOnchain: number;
}

/** Account accepted by lifecycle tx senders (local account preferred). */
export type OnchainExecutionAccount = Account | Address;

/** On-chain metadata required to build lifecycle transactions. */
export interface OnchainMarketInfo {
  marketId: string;
  marketIdOnchain: number;
  exchangeAddress: Address;
  pythAddress?: Address | null;
  pythFeedId?: Hex | null;
  expiryTimestamp?: number | null;
}

export interface PrepareApproveUsdcArgs {
  spender: Address;
  amount: number | string;
  usdcAddress: Address;
}

export interface PrepareMintArgs {
  marketId: string;
  amount: number | string;
  market?: Partial<OnchainMarketInfo>;
}

export interface MintFundingStatusArgs extends PrepareMintArgs {
  account?: OnchainExecutionAccount;
  rpcUrl?: string;
}

export interface MintFundingStatus {
  owner: Address;
  exchangeAddress: Address;
  usdcAddress: Address;
  requiredAmount: bigint;
  allowance: bigint;
  balance: bigint;
  hasSufficientAllowance: boolean;
  hasSufficientBalance: boolean;
}

export interface PrepareMergeArgs {
  marketId: string;
  pairs: number | string;
  holder: Address;
  market?: Partial<OnchainMarketInfo>;
}

export interface PrepareClaimArgs {
  marketId: string;
  market?: Partial<OnchainMarketInfo>;
}

export interface PrepareResolveArgs {
  marketId: string;
  market?: Partial<OnchainMarketInfo>;
  rpcUrl?: string;
  pythPriceServiceUrl?: string;
  allowLatestFallback?: boolean;
}

/** Return type for lifecycle methods that both prepare and submit txs. */
export interface OnchainExecutionResult<T extends PreparedOnchainTransaction> {
  hash: Hex;
  tx: T;
}

/**
 * Runtime overrides for networking/chain integrations.
 * Useful in tests and advanced integrations.
 */
export interface RuntimeOptions {
  fetch?: typeof fetch;
  now?: () => number;
  publicClient?: PublicClient;
  walletClient?: WalletClient;
  rpcUrl?: string;
  pythPriceServiceUrl?: string;
}

/** Preferred constructor options for `SpeculiteClobClient`. */
export interface ClientConstructorOptions extends RuntimeOptions {
  signatureType?: number;
  funderAddress?: string;
}

/** Internal request options used by client transport. */
export interface RequestOptions {
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  headers?: HeadersInit;
  auth?: 'none' | 'bearer' | 'developer';
  authToken?: string;
}

/** Lightweight JSON object shape used by error extraction utilities. */
export interface JsonObject {
  [key: string]: unknown;
}
