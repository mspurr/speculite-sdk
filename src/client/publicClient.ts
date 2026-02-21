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

export class PublicClient extends BaseClient {
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

  async resolveExpiredMarket(marketId: string): Promise<DeveloperResolveMarketResponse> {
    const normalizedMarketId = marketId.trim();
    if (!normalizedMarketId) {
      throw new Error('marketId is required');
    }

    return this.request('POST', `/api/developer/markets/${normalizedMarketId}/resolve`, {
      auth: 'developer'
    });
  }

  async postOrder(order: DeveloperOrderRequest): Promise<DeveloperOrderAcceptedResponse> {
    return this.request('POST', '/api/developer/orders', {
      auth: 'developer',
      body: order
    });
  }
}
