import crypto from 'crypto';
import { jest } from '@jest/globals';
import { encodeFunctionData, parseUnits } from 'viem';
import {
  OrderType,
  Side,
  SpeculiteApiError,
  SpeculiteClobClient,
  type ApiCredentials,
  type SignerLike
} from '../speculiteClobClient.js';

const API_CREDS: ApiCredentials = {
  apiKey: 'spec_test_key_123',
  apiSecret: 'spec_test_secret_abc'
};

const EXCHANGE_MINT_ABI = [{
  inputs: [
    { internalType: 'uint256', name: 'marketId', type: 'uint256' },
    { internalType: 'uint256', name: 'amount', type: 'uint256' }
  ],
  name: 'mint',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function'
}] as const;

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
    const firstSignCall = (signer.signTypedData as jest.Mock).mock.calls[0];
    const [domain, types, message] = firstSignCall.length === 1
      ? [firstSignCall[0].domain, firstSignCall[0].types, firstSignCall[0].message]
      : firstSignCall;

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

  it('supports viem local account signer without signer.account field', async () => {
    const viemLocalLikeSigner: SignerLike = {
      address: '0x3333333333333333333333333333333333333333',
      signTypedData: jest.fn(async (args: any) => {
        expect(args.primaryType).toBe('Order');
        expect(args.domain.verifyingContract).toBe('0x4444444444444444444444444444444444444444');
        expect(args.account).toBeUndefined();
        return '0x5678dcba';
      })
    };

    const client = new SpeculiteClobClient(
      'https://api.speculite.com',
      10143,
      viemLocalLikeSigner,
      API_CREDS,
      {
        fetch: jest.fn()
          .mockResolvedValueOnce(
            jsonResponse({
              success: true,
              market: {
                market_id: 'market-1',
                exchange_address: '0x4444444444444444444444444444444444444444',
                market_id_onchain: 55,
                taker_fee_bps: 80
              }
            })
          )
      }
    );

    const order = await client.createOrder({
      marketId: 'market-1',
      outcome: 'YES',
      side: Side.BUY,
      price: 0.5,
      size: 1,
      nonce: '1',
      expiry: 1_900_000_000,
      orderType: OrderType.LIMIT
    });

    expect(order.signature).toBe('0x5678dcba');
    expect((viemLocalLikeSigner.signTypedData as jest.Mock).mock.calls.length).toBe(1);
  });

  it('derives maker address without explicit funder/signature args in constructor', async () => {
    const signer: SignerLike = {
      getAddress: async () => '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      signTypedData: jest.fn().mockResolvedValue('0xdeadbeef')
    };

    const client = new SpeculiteClobClient(
      'https://api.speculite.com',
      10143,
      signer,
      API_CREDS
    );

    const order = await client.createOrder(
      {
        marketId: 'market-2',
        outcome: 'YES',
        side: Side.BUY,
        price: 0.42,
        size: 5,
        nonce: '1001',
        expiry: 1_800_000_000
      },
      {
        marketId: 'market-2',
        exchangeAddress: '0x4444444444444444444444444444444444444444',
        marketIdOnchain: 88,
        takerFeeBps: 80
      }
    );

    expect(order.maker).toBe('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
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

  it('resolves expired market through developer API credentials', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        market_id: 'market-1',
        resolutionTransactionHash: '0xresolvehash',
        resolutionData: {
          resolutionPrice: '55000000',
          winningTokenId: 0,
          winningOutcome: 'YES'
        },
        message: 'Market resolved successfully'
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

    const response = await client.resolveExpiredMarket('market-1');

    expect(response.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.speculite.com/api/developer/markets/market-1/resolve',
      expect.objectContaining({ method: 'POST' })
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('speculite-api-key')).toBe(API_CREDS.apiKey);
    expect(headers.get('speculite-signature')).toBeTruthy();
  });

  it('falls back to market data endpoint when orderbook endpoint returns 404', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        new Response('404 page not found\n', {
          status: 404,
          headers: { 'content-type': 'text/plain; charset=utf-8' }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          market_id: 'market-1',
          midpoint_price: '0.5',
          best_bid: '0.49',
          best_ask: '0.51',
          spread: '0.02',
          timestamp: '2026-01-01T00:00:00.000Z'
        })
      );

    const client = new SpeculiteClobClient(
      'https://api.speculite.com',
      10143,
      undefined,
      API_CREDS,
      0,
      undefined,
      { fetch: fetchMock as unknown as typeof fetch }
    );

    const orderbook = await client.getOrderbook('market-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.speculite.com/clob/orderbook?market_id=market-1',
      expect.objectContaining({ method: 'GET' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.speculite.com/api/market-data/market-1',
      expect.objectContaining({ method: 'GET' })
    );
    expect(orderbook).toEqual({
      market_id: 'market-1',
      bids: [{ price: '0.49', token_id: 0 }],
      asks: [{ price: '0.51', token_id: 0 }],
      last_price: '0.5',
      timestamp: '2026-01-01T00:00:00.000Z'
    });
  });

  it('includes request context in SpeculiteApiError', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({ error: 'failure' }, 500)
    );

    const client = new SpeculiteClobClient(
      'https://api.speculite.com',
      10143,
      undefined,
      API_CREDS,
      0,
      undefined,
      { fetch: fetchMock as unknown as typeof fetch }
    );

    let thrown: unknown;
    try {
      await client.getOpenOrders('market-1');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(SpeculiteApiError);
    expect(thrown).toMatchObject({
      name: 'SpeculiteApiError',
      status: 500,
      method: 'GET',
      path: '/api/developer/orders/open?market_id=market-1',
      url: 'https://api.speculite.com/api/developer/orders/open?market_id=market-1'
    });
    expect((thrown as Error).message).toBe(
      'GET /api/developer/orders/open?market_id=market-1 failed: failure'
    );
    expect(fetchMock).toHaveBeenCalled();
  });

  it('prepares mint transaction payload from market metadata', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        market: {
          market_id: 'market-1',
          exchange_address: '0x1111111111111111111111111111111111111111',
          market_id_onchain: 77,
          taker_fee_bps: 80
        }
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

    const tx = await client.prepareMintTx({
      marketId: 'market-1',
      amount: '2.5'
    });

    expect(tx.kind).toBe('mint');
    expect(tx.to).toBe('0x1111111111111111111111111111111111111111');
    expect(tx.chainId).toBe(10143);
    expect(tx.value).toBeUndefined();
    expect(tx.data).toBe(encodeFunctionData({
      abi: EXCHANGE_MINT_ABI,
      functionName: 'mint',
      args: [77n, parseUnits('2.5', 6)]
    }));
  });

  it('prepares resolve transaction payload with pyth fee buffer', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          market: {
            market_id: 'market-1',
            exchange_address: '0x1111111111111111111111111111111111111111',
            market_id_onchain: 77,
            pyth_feed_id: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            expiration_timestamp: '2026-02-21T00:00:00.000Z'
          }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          binary: {
            data: [
              '0x1234abcd'
            ]
          }
        })
      );

    const publicClient = {
      readContract: jest.fn().mockResolvedValue(12_345n)
    } as any;

    const client = new SpeculiteClobClient(
      'https://api.speculite.com',
      10143,
      undefined,
      API_CREDS,
      0,
      undefined,
      {
        fetch: fetchMock as unknown as typeof fetch,
        publicClient
      }
    );

    const tx = await client.prepareResolveTx({
      marketId: 'market-1',
      pythAddress: '0x2222222222222222222222222222222222222222'
    });

    expect(tx.kind).toBe('resolve');
    expect(tx.to).toBe('0x1111111111111111111111111111111111111111');
    expect(tx.updateData).toEqual(['0x1234abcd']);
    expect(tx.updateFeeWei).toBe(13_345n);
    expect(tx.value).toBe(13_345n);
    expect(publicClient.readContract).toHaveBeenCalledTimes(1);
  });

  it('sends prepared transaction through configured wallet client', async () => {
    const localAccount = {
      address: '0x3333333333333333333333333333333333333333'
    } as any;
    const walletClient = {
      account: localAccount,
      sendTransaction: jest.fn().mockResolvedValue('0xabc123')
    } as any;

    const client = new SpeculiteClobClient(
      'https://api.speculite.com',
      10143,
      undefined,
      API_CREDS,
      0,
      undefined,
      { walletClient }
    );

    const hash = await client.sendPreparedTransaction({
      to: '0x1111111111111111111111111111111111111111',
      data: '0x1234',
      value: 9n,
      chainId: 10143,
      kind: 'claim'
    });

    expect(hash).toBe('0xabc123');
    expect(walletClient.sendTransaction).toHaveBeenCalledWith({
      account: localAccount,
      to: '0x1111111111111111111111111111111111111111',
      data: '0x1234',
      value: 9n,
      chain: null
    });
  });

  it('reads mint funding status (required/balance/allowance)', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        market: {
          market_id: 'market-1',
          exchange_address: '0x1111111111111111111111111111111111111111',
          market_id_onchain: 77
        }
      })
    );
    const walletClient = {
      account: { address: '0x3333333333333333333333333333333333333333' }
    } as any;
    const publicClient = {
      readContract: jest
        .fn()
        .mockResolvedValueOnce('0x4444444444444444444444444444444444444444')
        .mockResolvedValueOnce(parseUnits('10', 6))
        .mockResolvedValueOnce(parseUnits('5', 6))
    } as any;

    const client = new SpeculiteClobClient(
      'https://api.speculite.com',
      10143,
      undefined,
      API_CREDS,
      {
        fetch: fetchMock as unknown as typeof fetch,
        walletClient,
        publicClient
      }
    );

    const funding = await client.getMintFundingStatus({
      marketId: 'market-1',
      amount: '25'
    });

    expect(funding).toEqual({
      owner: '0x3333333333333333333333333333333333333333',
      exchangeAddress: '0x1111111111111111111111111111111111111111',
      usdcAddress: '0x4444444444444444444444444444444444444444',
      requiredAmount: parseUnits('25', 6),
      allowance: parseUnits('10', 6),
      balance: parseUnits('5', 6),
      hasSufficientAllowance: false,
      hasSufficientBalance: false
    });
    expect(publicClient.readContract).toHaveBeenCalledTimes(3);
  });

  it('enriches mint underflow errors with funding diagnostics', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        market: {
          market_id: 'market-1',
          exchange_address: '0x1111111111111111111111111111111111111111',
          market_id_onchain: 77
        }
      })
    );
    const walletClient = {
      account: { address: '0x3333333333333333333333333333333333333333' },
      sendTransaction: jest.fn().mockRejectedValue(
        new Error('execution reverted: arithmetic underflow or overflow (0x11)')
      )
    } as any;
    const publicClient = {
      readContract: jest
        .fn()
        .mockResolvedValueOnce('0x4444444444444444444444444444444444444444')
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(parseUnits('1', 6))
    } as any;

    const client = new SpeculiteClobClient(
      'https://api.speculite.com',
      10143,
      undefined,
      API_CREDS,
      {
        fetch: fetchMock as unknown as typeof fetch,
        walletClient,
        publicClient
      }
    );

    await expect(client.mintTokens({
      marketId: 'market-1',
      amount: '25'
    })).rejects.toThrow(
      'Mint funding check: allowance 0 < required 25; balance 1 < required 25.'
    );
  });

  it('derives wallet account from signer when wallet client has no account', async () => {
    const signer: SignerLike = {
      address: '0x9999999999999999999999999999999999999999',
      signTypedData: jest.fn().mockResolvedValue('0xdeadbeef')
    };
    const walletClient = {
      sendTransaction: jest.fn().mockResolvedValue('0xfeed123')
    } as any;

    const client = new SpeculiteClobClient(
      'https://api.speculite.com',
      10143,
      signer,
      API_CREDS,
      {
        walletClient
      }
    );

    await client.sendPreparedTransaction({
      to: '0x1111111111111111111111111111111111111111',
      data: '0x1234',
      value: 1n,
      chainId: 10143,
      kind: 'claim'
    });

    expect(walletClient.sendTransaction).toHaveBeenCalledWith({
      account: '0x9999999999999999999999999999999999999999',
      to: '0x1111111111111111111111111111111111111111',
      data: '0x1234',
      value: 1n,
      chain: null
    });
  });
});
