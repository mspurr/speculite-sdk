import crypto from 'crypto';
import {
  OrderType,
  Side,
  SpeculiteClobClient,
  type ApiCredentials,
  type SignerLike
} from '../speculiteClobClient.js';

const API_CREDS: ApiCredentials = {
  apiKey: 'spec_test_key_123',
  apiSecret: 'spec_test_secret_abc'
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  });
}

describe('SpeculiteClobClient', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('signs developer-auth requests with expected HMAC payload format', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({ success: true, orders: [] })
    );

    const client = new SpeculiteClobClient(
      'https://api.speculite.com',
      10143,
      undefined,
      API_CREDS,
      0,
      undefined,
      { fetch: fetchMock as unknown as typeof fetch, now: () => 1_700_000_000_000 }
    );

    await client.getOpenOrders('market-1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('https://api.speculite.com/api/developer/orders/open?market_id=market-1');
    const headers = new Headers(init.headers);
    expect(headers.get('speculite-api-key')).toBe(API_CREDS.apiKey);
    expect(headers.get('speculite-timestamp')).toBe('1700000000');

    const payload = '1700000000GET/api/developer/orders/open?market_id=market-1';
    const expectedSignature = crypto
      .createHmac('sha256', API_CREDS.apiSecret)
      .update(payload)
      .digest('hex');

    expect(headers.get('speculite-signature')).toBe(expectedSignature);
  });

  it('creates and posts a signed LIMIT order with market metadata lookup', async () => {
    const signer: SignerLike = {
      address: '0x2222222222222222222222222222222222222222',
      signTypedData: jest.fn().mockResolvedValue('0xabcdef1234')
    };

    const fetchMock = jest.fn()
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          market: {
            market_id: 'market-1',
            exchange_address: '0x1111111111111111111111111111111111111111',
            market_id_onchain: 77,
            taker_fee_bps: 80
          }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          lifecycle_status: 'ACCEPTED',
          order_id: '123'
        })
      );

    const client = new SpeculiteClobClient(
      'https://api.speculite.com',
      10143,
      signer,
      API_CREDS,
      0,
      undefined,
      { fetch: fetchMock as unknown as typeof fetch, now: () => 1_700_000_000_000 }
    );

    const result = await client.createAndPostOrder({
      marketId: 'market-1',
      outcome: 'YES',
      side: Side.BUY,
      price: 0.51,
      size: 10,
      nonce: '123',
      expiry: 1_800_000_000,
      orderType: OrderType.LIMIT
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        order_id: '123'
      })
    );

    expect((signer.signTypedData as jest.Mock).mock.calls.length).toBe(1);
    const [domain, types, message] = (signer.signTypedData as jest.Mock).mock.calls[0];

    expect(domain).toEqual({
      name: 'SpeculiteExchange',
      version: '1',
      chainId: 10143,
      verifyingContract: '0x1111111111111111111111111111111111111111'
    });
    expect(types.Order).toHaveLength(9);
    expect(message).toEqual({
      marketId: 77n,
      maker: '0x2222222222222222222222222222222222222222',
      isSell: false,
      tokenId: 0n,
      amount: 10000000n,
      price: 510000n,
      feeBps: 80n,
      nonce: 123n,
      expiry: 1800000000n
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [postUrl, postInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(postUrl).toBe('https://api.speculite.com/api/developer/orders');
    const body = JSON.parse(postInit.body as string);

    expect(body).toEqual({
      market_id: 'market-1',
      maker: '0x2222222222222222222222222222222222222222',
      outcome: 'YES',
      side: 'BUY',
      price: '0.51',
      size: '10',
      nonce: '123',
      expiry: 1800000000,
      signature: '0xabcdef1234',
      order_type: 'LIMIT'
    });
  });

  it('uses explicitly provided credentials for authenticated calls', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          principal: {
            user_id: 'user-1',
            api_key_id: 'key-1',
            scopes: ['orders:read', 'orders:write']
          }
        })
      );

    const client = new SpeculiteClobClient(
      'https://api.speculite.com',
      10143,
      undefined,
      undefined,
      0,
      undefined,
      { fetch: fetchMock as unknown as typeof fetch, now: () => 1_700_000_000_000 }
    );

    client.setApiCredentials({
      apiKey: 'spec_created_key',
      apiSecret: 'spec_created_secret'
    });

    await client.getAuthMe();

    const [, authMeInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const authMeHeaders = new Headers(authMeInit.headers);
    expect(authMeHeaders.get('speculite-api-key')).toBe('spec_created_key');
  });

  it('supports viem-style signer payload for typed data signing', async () => {
    const viemLikeSigner: SignerLike = {
      account: {
        address: '0x3333333333333333333333333333333333333333'
      },
      signTypedData: jest.fn(async (args: any) => {
        expect(args.primaryType).toBe('Order');
        expect(args.account).toBe('0x3333333333333333333333333333333333333333');
        expect(args.domain.verifyingContract).toBe('0x4444444444444444444444444444444444444444');
        return '0x1234abcd';
      })
    };

    const client = new SpeculiteClobClient(
      'https://api.speculite.com',
      10143,
      viemLikeSigner,
      API_CREDS,
      0,
      undefined,
      { now: () => 1_700_000_000_000 }
    );

    const order = await client.createOrder(
      {
        marketId: 'market-2',
        outcome: 'NO',
        side: Side.SELL,
        price: 0.62,
        size: 3.5,
        nonce: '777',
        expiry: 1_800_000_000
      },
      {
        marketId: 'market-2',
        exchangeAddress: '0x4444444444444444444444444444444444444444',
        marketIdOnchain: 88,
        takerFeeBps: 80
      }
    );

    expect(order.signature).toBe('0x1234abcd');
    expect((viemLikeSigner.signTypedData as jest.Mock).mock.calls.length).toBe(1);
  });

  it('fetches developer order history, trades, and positions with typed query params', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          orders: [],
          pagination: { limit: 20, offset: 10, has_more: false }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          trades: [],
          pagination: { limit: 50, offset: 0, has_more: false }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          positions: [],
          pagination: { limit: 100, offset: 0, has_more: false }
        })
      );

    const client = new SpeculiteClobClient(
      'https://api.speculite.com',
      10143,
      undefined,
      API_CREDS,
      0,
      undefined,
      { fetch: fetchMock as unknown as typeof fetch, now: () => 1_700_000_000_000 }
    );

    await client.getOrderHistory({ marketId: 'market-1', limit: 20, offset: 10 });
    await client.getTrades({ marketId: 'market-1', limit: 50, offset: 0 });
    await client.getPositions({ marketId: 'market-1', includeClosed: true, limit: 100, offset: 0 });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.speculite.com/api/developer/orders/history?market_id=market-1&limit=20&offset=10',
      expect.objectContaining({ method: 'GET' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.speculite.com/api/developer/trades?market_id=market-1&limit=50&offset=0',
      expect.objectContaining({ method: 'GET' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://api.speculite.com/api/developer/positions?market_id=market-1&include_closed=true&limit=100&offset=0',
      expect.objectContaining({ method: 'GET' })
    );
  });
});
