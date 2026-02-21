# @speculite/clob-client

Official TypeScript SDK for Speculite market data and developer trading APIs.

## Install

```bash
npm install @speculite/clob-client ethers viem
```

## SDK Architecture

The SDK is now split by concern so it is easier to maintain and extend:

- `src/types.ts`: public types and enums
- `src/errors.ts`: API error types
- `src/internal/*`: reusable constants and pure helpers
- `src/client/baseClient.ts`: transport/auth/signing shared logic
- `src/client/publicClient.ts`: public + developer REST methods
- `src/client/tradingClient.ts`: order creation/signing flow
- `src/client/lifecycleClient.ts`: on-chain lifecycle transaction helpers
- `src/speculiteClobClient.ts`: public facade class + re-exports

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
- `resolveExpiredMarket(marketId)`
- `getOpenOrders(marketId?)`
- `getOrderHistory({ marketId?, limit?, offset? })`
- `getTrades({ marketId?, limit?, offset? })`
- `getPositions({ marketId?, includeClosed?, limit?, offset? })`

### On-chain lifecycle (self-gas)

- `prepareApproveUsdcTx({ spender, amount, usdcAddress })`
- `prepareMintTx({ marketId, amount })`
- `prepareMergeTx({ marketId, pairs, holder })`
- `prepareClaimTx({ marketId })`
- `prepareResolveTx({ marketId, pythAddress, rpcUrl? })`
- `sendPreparedTransaction(tx, account?)`
- `approveUsdc(...)`
- `mintTokens(...)`
- `mergeTokens(...)`
- `claimWinnings(...)`
- `resolveMarket(...)`

### API key management (app-authenticated)

- `listApiKeys(authToken)`
- `revokeApiKey(apiKeyId, authToken)`
- `getWalletActivity(authToken)`

## Notes

- Developer API keys are created in the Speculite web app settings.
- The SDK signs developer API requests with `SPECULITE-API-KEY`, `SPECULITE-TIMESTAMP`, `SPECULITE-SIGNATURE`.
- On-chain lifecycle methods are wallet-native and paid by the user's wallet (no sponsored gas).
- `resolveExpiredMarket` is an API-key endpoint that triggers backend/operator resolution for expired markets.
- Keep API secret and private keys out of source control.

## Wallet-Native Lifecycle Example

```ts
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';
import { SpeculiteClobClient } from '@speculite/clob-client';

const HOST = 'https://api.speculite.com';
const CHAIN_ID = 10143;
const RPC_URL = process.env.RPC_URL!;

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  transport: http(RPC_URL)
});

const client = new SpeculiteClobClient(
  HOST,
  CHAIN_ID,
  account as any,
  {
    apiKey: process.env.SPECULITE_API_KEY!,
    apiSecret: process.env.SPECULITE_API_SECRET!
  },
  0,
  account.address,
  {
    walletClient,
    rpcUrl: RPC_URL,
    pythAddress: process.env.PYTH_ADDRESS as `0x${string}`
  }
);

const mint = await client.mintTokens({
  marketId: 'MARKET_UUID',
  amount: '25',
  account: account.address
});
console.log('mint tx:', mint.hash);

const claim = await client.claimWinnings({
  marketId: 'MARKET_UUID',
  account: account.address
});
console.log('claim tx:', claim.hash);
```
