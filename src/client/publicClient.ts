import { BaseClient } from './baseClient.js';
import type {
  DeveloperApiKeyRevokeResponse,
  DeveloperApiKeysResponse,
  DeveloperAuthMeResponse,
  DeveloperCancelOrderResponse,
  DeveloperOpenOrdersResponse,
  DeveloperOrderAcceptedResponse,
  DeveloperOrderHistoryResponse,
  DeveloperOrderRequest,
  DeveloperListParams,
  DeveloperPositionsParams,
  DeveloperPositionsResponse,
  DeveloperResolveMarketResponse,
  DeveloperTradesResponse,
  DeveloperWalletActivityResponse,
  MarketDataBatchResponse,
  MarketDataResponse,
  MarketResponse,
  MarketsResponse,
  OrderbookResponse,
  RequestOptions,
} from '../types.js';

/**
 * Read/data and authenticated REST methods.
 *
 * Includes:
 * - public market reads
 * - developer key management helpers (bearer-auth)
 * - developer trading/account state methods (HMAC-auth)
 */
export class PublicClient extends BaseClient {
  /** Lists API keys for the authenticated app user (UI/session token). */
  async listApiKeys(authToken: string): Promise<DeveloperApiKeysResponse> {
    return this.request('GET', '/api/developer/keys', {
      auth: 'bearer',
      authToken
    });
  }

  /** Revokes one API key for the authenticated app user. */
  async revokeApiKey(
    apiKeyId: string,
    authToken: string
  ): Promise<DeveloperApiKeyRevokeResponse> {
    return this.request('DELETE', `/api/developer/keys/${apiKeyId}`, {
      auth: 'bearer',
      authToken
    });
  }

  /** Returns wallet activity observed through developer-key trading. */
  async getWalletActivity(authToken: string): Promise<DeveloperWalletActivityResponse> {
    return this.request('GET', '/api/developer/wallets', {
      auth: 'bearer',
      authToken
    });
  }

  /** Fetches markets with optional query filters. */
  async getMarkets(query: RequestOptions['query'] = {}): Promise<MarketsResponse> {
    return this.request('GET', '/api/markets', { query });
  }

  /** Fetches one market by UUID. */
  async getMarket(marketId: string): Promise<MarketResponse> {
    return this.request('GET', `/api/markets/${marketId}`);
  }

  /** Fetches latest market data point for one market. */
  async getMarketData(marketId: string): Promise<MarketDataResponse> {
    return this.request('GET', `/api/market-data/${marketId}`);
  }

  /** Fetches latest market data points for multiple markets. */
  async getMarketDataBatch(marketIds: string[]): Promise<MarketDataBatchResponse> {
    return this.request('POST', '/api/market-data/batch', {
      body: { market_ids: marketIds }
    });
  }

  /** Fetches current orderbook snapshot for one market. */
  async getOrderbook(marketId: string): Promise<OrderbookResponse> {
    return this.request('GET', '/clob/orderbook', {
      query: { market_id: marketId }
    });
  }

  /** Validates current developer API credentials. */
  async getAuthMe(): Promise<DeveloperAuthMeResponse> {
    return this.request('GET', '/api/developer/auth/me', {
      auth: 'developer'
    });
  }

  /** Lists open/partially-filled orders for developer principal. */
  async getOpenOrders(marketId?: string): Promise<DeveloperOpenOrdersResponse> {
    return this.request('GET', '/api/developer/orders/open', {
      auth: 'developer',
      query: marketId ? { market_id: marketId } : undefined
    });
  }

  /** Lists historical orders for developer principal. */
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

  /** Lists trade fills for developer principal. */
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

  /** Lists tracked positions for developer principal. */
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

  /** Cancels one open order owned by developer principal. */
  async cancelOrder(orderId: string): Promise<DeveloperCancelOrderResponse> {
    return this.request('DELETE', `/api/developer/orders/${orderId}`, {
      auth: 'developer'
    });
  }

  /** Triggers backend/operator resolution for an expired market. */
  async resolveExpiredMarket(marketId: string): Promise<DeveloperResolveMarketResponse> {
    const normalizedMarketId = marketId.trim();
    if (!normalizedMarketId) {
      throw new Error('marketId is required');
    }

    return this.request('POST', `/api/developer/markets/${normalizedMarketId}/resolve`, {
      auth: 'developer'
    });
  }

  /** Posts an already-signed order payload. */
  async postOrder(order: DeveloperOrderRequest): Promise<DeveloperOrderAcceptedResponse> {
    return this.request('POST', '/api/developer/orders', {
      auth: 'developer',
      body: order
    });
  }
}
