# @speculite/clob-client

Official TypeScript SDK for Speculite market data and developer trading APIs.

Documentation: https://docs.speculite.com/developer-guide/trading-api-quickstart/

## Install

```bash
npm install @speculite/clob-client ethers viem
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
  }
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
- `getMintFundingStatus({ marketId, amount, account?, rpcUrl? })`
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
- When developer credentials are configured, successful `mintTokens` / `mergeTokens` / `claimWinnings` calls also report lifecycle activity to `/api/developer/lifecycle-events` (best-effort) so profile analytics can attribute API activity.
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
  {
    walletClient,
    rpcUrl: RPC_URL,
    pythAddress: process.env.PYTH_ADDRESS as `0x${string}`
  }
);

const funding = await client.getMintFundingStatus({
  marketId: 'MARKET_UUID',
  amount: '25'
});
if (!funding.hasSufficientAllowance) {
  await client.approveUsdc({
    spender: funding.exchangeAddress,
    usdcAddress: funding.usdcAddress,
    amount: '25'
  });
}

const mint = await client.mintTokens({
  marketId: 'MARKET_UUID',
  amount: '25'
});
console.log('mint tx:', mint.hash);

const claim = await client.claimWinnings({
  marketId: 'MARKET_UUID'
});
console.log('claim tx:', claim.hash);
```
