# @speculite/clob-client

Official TypeScript SDK for Speculite market data and developer trading APIs.

## Install

```bash
npm install @speculite/clob-client ethers
```

## Quickstart

```ts
import { Wallet } from 'ethers';
import { SpeculiteClobClient, Side, OrderType } from '@speculite/clob-client';

const HOST = 'https://api.speculite.com';
const CHAIN_ID = 10143;

const signer = new Wallet(process.env.PRIVATE_KEY!);

const client = new SpeculiteClobClient(
  HOST,
  CHAIN_ID,
  signer,
  {
    apiKey: process.env.SPECULITE_API_KEY!,
    apiSecret: process.env.SPECULITE_API_SECRET!
  },
  0,
  signer.address
);

const markets = await client.getMarkets({ statusFilter: 'active', limit: 1 });
const marketId = markets.markets[0].market_id;

const order = await client.createAndPostOrder({
  marketId,
  outcome: 'YES',
  side: Side.BUY,
  price: 0.5,
  size: 10,
  orderType: OrderType.LIMIT
});

console.log(order.order_id, order.lifecycle_status);
```

## API Coverage

### Public market data

- `getMarkets(query)`
- `getMarket(marketId)`
- `getMarketData(marketId)`
- `getMarketDataBatch(marketIds)`
- `getOrderbook(marketId)`

### Developer trading

- `getAuthMe()`
- `postOrder(order)`
- `createOrder(args, marketInfo?)`
- `createAndPostOrder(args, marketInfo?)`
- `cancelOrder(orderId)`
- `getOpenOrders(marketId?)`
- `getOrderHistory({ marketId?, limit?, offset? })`
- `getTrades({ marketId?, limit?, offset? })`
- `getPositions({ marketId?, includeClosed?, limit?, offset? })`

### API key management (app-authenticated)

- `listApiKeys(authToken)`
- `revokeApiKey(apiKeyId, authToken)`
- `getWalletActivity(authToken)`

## Notes

- Developer API keys are created in the Speculite web app settings.
- The SDK signs developer API requests with `SPECULITE-API-KEY`, `SPECULITE-TIMESTAMP`, `SPECULITE-SIGNATURE`.
- Keep API secret and private keys out of source control.
