import { OrderType, Side, type CreateOrderArgs, type DeveloperOrderAcceptedResponse, type DeveloperOrderRequest, type MarketSigningInfo } from '../types.js';
import { normalizeHexSignature, scaleToInt, scaledToDecimalString } from '../internal/utils.js';
import { PublicClient } from './publicClient.js';

/**
 * Order signing/composition helpers layered on top of REST methods.
 */
export class TradingClient extends PublicClient {
  /**
   * Builds and signs an EIP-712 order payload without submitting it.
   */
  async createOrder(
    args: CreateOrderArgs,
    marketInfo?: MarketSigningInfo
  ): Promise<DeveloperOrderRequest> {
    const signer = this.requireSigner();
    const maker = await this.resolveMakerAddress(args.maker);
    const market = marketInfo || await this.fetchMarketSigningInfo(args.marketId);

    const priceScaled = scaleToInt(args.price, 'price');
    if (priceScaled > 1_000_000) {
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

  /**
   * Convenience wrapper: `createOrder` + `postOrder`.
   */
  async createAndPostOrder(
    args: CreateOrderArgs,
    marketInfo?: MarketSigningInfo
  ): Promise<DeveloperOrderAcceptedResponse> {
    const order = await this.createOrder(args, marketInfo);
    return this.postOrder(order);
  }
}
