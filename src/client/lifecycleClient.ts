import { encodeFunctionData, formatUnits, parseUnits, type Address, type Hex } from 'viem';
import {
  ERC20_ABI,
  EXCHANGE_CLAIM_ABI,
  EXCHANGE_MARKET_USDC_ABI,
  EXCHANGE_MERGE_ABI,
  EXCHANGE_MINT_ABI,
  EXCHANGE_RESOLVE_ABI,
  MIN_UPDATE_FEE_BUFFER_WEI,
  PYTH_ABI,
} from '../internal/constants.js';
import { normalizeAddress, toPositiveDecimalString } from '../internal/utils.js';
import type {
  MintFundingStatus,
  MintFundingStatusArgs,
  OnchainExecutionResult,
  OnchainExecutionAccount,
  PrepareApproveUsdcArgs,
  PrepareClaimArgs,
  PrepareMergeArgs,
  PrepareMintArgs,
  PrepareResolveArgs,
  PreparedOnchainTransaction,
  PreparedResolveTransaction,
} from '../types.js';
import { TradingClient } from './tradingClient.js';

/**
 * Wallet-native lifecycle helpers.
 *
 * `prepare*` methods return unsigned tx payloads.
 * action methods (`mintTokens`, `claimWinnings`, ...) prepare + send in one call.
 */
export class LifecycleClient extends TradingClient {
  private buildMintTx(
    marketIdOnchain: number,
    exchangeAddress: Address,
    amount: bigint
  ): PreparedOnchainTransaction {
    const data = encodeFunctionData({
      abi: EXCHANGE_MINT_ABI,
      functionName: 'mint',
      args: [BigInt(marketIdOnchain), amount]
    });

    return {
      to: exchangeAddress,
      data,
      chainId: this.chainId,
      kind: 'mint'
    };
  }

  private executionAccountAddress(account: OnchainExecutionAccount): Address {
    return normalizeAddress(
      typeof account === 'string' ? account : account.address,
      'account'
    );
  }

  private mintFundingHint(status: MintFundingStatus): string {
    const required = formatUnits(status.requiredAmount, 6);
    const allowance = formatUnits(status.allowance, 6);
    const balance = formatUnits(status.balance, 6);
    const failures: string[] = [];

    if (!status.hasSufficientAllowance) {
      failures.push(`allowance ${allowance} < required ${required}`);
    }
    if (!status.hasSufficientBalance) {
      failures.push(`balance ${balance} < required ${required}`);
    }

    const verdict = failures.length > 0
      ? failures.join('; ')
      : 'allowance and balance checks passed';

    return `Mint funding check: ${verdict}. owner=${status.owner} spender=${status.exchangeAddress} usdc=${status.usdcAddress} required=${required} allowance=${allowance} balance=${balance}.`;
  }

  private shouldRunMintFundingDiagnostics(error: unknown): boolean {
    const message = String(error instanceof Error ? error.message : error).toLowerCase();
    return (
      message.includes('underflow or overflow') ||
      message.includes('0x11') ||
      message.includes('usdc_transfer_failed') ||
      message.includes('insufficient allowance') ||
      message.includes('insufficient balance')
    );
  }

  /** Prepares ERC20 approve tx (typically USDC -> exchange). */
  async prepareApproveUsdcTx(args: PrepareApproveUsdcArgs): Promise<PreparedOnchainTransaction> {
    const spender = normalizeAddress(args.spender, 'spender');
    const usdcAddress = normalizeAddress(args.usdcAddress, 'usdcAddress');
    const amount = parseUnits(toPositiveDecimalString(args.amount, 'amount'), 6);
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount]
    });

    return {
      to: usdcAddress,
      data,
      chainId: this.chainId,
      kind: 'approve_usdc'
    };
  }

  /** Prepares mint tx for paired YES/NO tokens. */
  async prepareMintTx(args: PrepareMintArgs): Promise<PreparedOnchainTransaction> {
    const market = await this.resolveOnchainMarketInfo(args.marketId, args.market);
    const amount = parseUnits(toPositiveDecimalString(args.amount, 'amount'), 6);
    return this.buildMintTx(market.marketIdOnchain, market.exchangeAddress, amount);
  }

  /** Prepares merge tx to redeem paired tokens back to USDC. */
  async prepareMergeTx(args: PrepareMergeArgs): Promise<PreparedOnchainTransaction> {
    const market = await this.resolveOnchainMarketInfo(args.marketId, args.market);
    const holder = normalizeAddress(args.holder, 'holder');
    const pairs = parseUnits(toPositiveDecimalString(args.pairs, 'pairs'), 6);
    const data = encodeFunctionData({
      abi: EXCHANGE_MERGE_ABI,
      functionName: 'mergeFor',
      args: [BigInt(market.marketIdOnchain), holder, pairs]
    });

    return {
      to: market.exchangeAddress,
      data,
      chainId: this.chainId,
      kind: 'merge'
    };
  }

  /** Prepares claim tx for resolved-market winnings. */
  async prepareClaimTx(args: PrepareClaimArgs): Promise<PreparedOnchainTransaction> {
    const market = await this.resolveOnchainMarketInfo(args.marketId, args.market);
    const data = encodeFunctionData({
      abi: EXCHANGE_CLAIM_ABI,
      functionName: 'claimWinnings',
      args: [BigInt(market.marketIdOnchain)]
    });

    return {
      to: market.exchangeAddress,
      data,
      chainId: this.chainId,
      kind: 'claim'
    };
  }

  /**
   * Prepares resolve tx:
   * - fetches Pyth update data
   * - computes update fee + safety buffer
   * - returns payable tx payload
   */
  async prepareResolveTx(args: PrepareResolveArgs): Promise<PreparedResolveTransaction> {
    const market = await this.resolveOnchainMarketInfo(args.marketId, args.market);
    const pythAddress = normalizeAddress(
      args.pythAddress || this.defaultPythAddress,
      'pythAddress'
    );
    if (!market.pythFeedId) {
      throw new Error('Market is missing pyth_feed_id');
    }
    if (!market.expiryTimestamp) {
      throw new Error('Market is missing expiration_timestamp');
    }

    const updateData = await this.fetchPythUpdateData(
      market.pythFeedId,
      market.expiryTimestamp,
      args.pythPriceServiceUrl || this.pythPriceServiceUrl,
      args.allowLatestFallback !== false
    );

    const publicClient = this.resolvePublicClient(args.rpcUrl);
    const updateFee = await publicClient.readContract({
      address: pythAddress,
      abi: PYTH_ABI,
      functionName: 'getUpdateFee',
      args: [updateData]
    }) as bigint;

    const feeBuffer = updateFee > 100_000n
      ? updateFee / 100n
      : MIN_UPDATE_FEE_BUFFER_WEI;
    const feeWithBuffer = updateFee + feeBuffer;

    const data = encodeFunctionData({
      abi: EXCHANGE_RESOLVE_ABI,
      functionName: 'resolveMarketWithPyth',
      args: [BigInt(market.marketIdOnchain), pythAddress, updateData]
    });

    return {
      to: market.exchangeAddress,
      data,
      value: feeWithBuffer,
      chainId: this.chainId,
      kind: 'resolve',
      updateData,
      updateFeeWei: feeWithBuffer,
      marketIdOnchain: market.marketIdOnchain
    };
  }

  /**
   * Reads USDC allowance/balance required for `mint`.
   *
   * This is useful before `mintTokens` and also used internally
   * to diagnose underflow-style reverts from ERC20 `transferFrom`.
   */
  async getMintFundingStatus(args: MintFundingStatusArgs): Promise<MintFundingStatus> {
    const market = await this.resolveOnchainMarketInfo(args.marketId, args.market);
    const requiredAmount = parseUnits(toPositiveDecimalString(args.amount, 'amount'), 6);
    const walletClient = this.requireWalletClient();
    const executionAccount = await this.resolveWalletAccount(walletClient, args.account);
    const owner = this.executionAccountAddress(executionAccount);

    const publicClient = this.resolvePublicClient(args.rpcUrl);
    const usdcAddress = normalizeAddress(await publicClient.readContract({
      address: market.exchangeAddress,
      abi: EXCHANGE_MARKET_USDC_ABI,
      functionName: 'getMarketUSDC',
      args: [BigInt(market.marketIdOnchain)]
    }) as Address, 'market.usdcAddress');

    const [allowance, balance] = await Promise.all([
      publicClient.readContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [owner, market.exchangeAddress]
      }) as Promise<bigint>,
      publicClient.readContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [owner]
      }) as Promise<bigint>
    ]);

    return {
      owner,
      exchangeAddress: market.exchangeAddress,
      usdcAddress,
      requiredAmount,
      allowance,
      balance,
      hasSufficientAllowance: allowance >= requiredAmount,
      hasSufficientBalance: balance >= requiredAmount
    };
  }

  /** Sends a prepared transaction via configured wallet client. */
  async sendPreparedTransaction(
    tx: PreparedOnchainTransaction,
    account?: OnchainExecutionAccount
  ): Promise<Hex> {
    const walletClient = this.requireWalletClient();
    const fromAccount = await this.resolveWalletAccount(walletClient, account);

    return walletClient.sendTransaction({
      account: fromAccount,
      to: tx.to,
      data: tx.data,
      value: tx.value || 0n,
      chain: walletClient.chain ?? null
    });
  }

  /** Prepares + sends approve tx. */
  async approveUsdc(
    args: PrepareApproveUsdcArgs & { account?: OnchainExecutionAccount }
  ): Promise<OnchainExecutionResult<PreparedOnchainTransaction>> {
    const tx = await this.prepareApproveUsdcTx(args);
    const hash = await this.sendPreparedTransaction(tx, args.account);
    return { hash, tx };
  }

  /** Prepares + sends mint tx. */
  async mintTokens(
    args: PrepareMintArgs & { account?: OnchainExecutionAccount; rpcUrl?: string }
  ): Promise<OnchainExecutionResult<PreparedOnchainTransaction>> {
    const market = await this.resolveOnchainMarketInfo(args.marketId, args.market);
    const amount = parseUnits(toPositiveDecimalString(args.amount, 'amount'), 6);
    const tx = this.buildMintTx(market.marketIdOnchain, market.exchangeAddress, amount);
    const walletClient = this.requireWalletClient();
    const executionAccount = await this.resolveWalletAccount(walletClient, args.account);

    try {
      const hash = await walletClient.sendTransaction({
        account: executionAccount,
        to: tx.to,
        data: tx.data,
        value: tx.value || 0n,
        chain: walletClient.chain ?? null
      });
      return { hash, tx };
    } catch (error) {
      if (!this.shouldRunMintFundingDiagnostics(error)) {
        throw error;
      }

      try {
        const funding = await this.getMintFundingStatus({
          ...args,
          market,
          account: executionAccount
        });
        const base = error instanceof Error ? error.message : String(error);
        throw new Error(`${base}\n${this.mintFundingHint(funding)}`);
      } catch (diagnosticError) {
        if (diagnosticError instanceof Error && diagnosticError.message.includes('Mint funding check:')) {
          throw diagnosticError;
        }
        const base = error instanceof Error ? error.message : String(error);
        const diagnosticMessage = diagnosticError instanceof Error
          ? diagnosticError.message
          : String(diagnosticError);
        throw new Error(
          `${base}\nMint funding check unavailable: ${diagnosticMessage}`
        );
      }
    }
  }

  /** Prepares + sends merge tx. */
  async mergeTokens(
    args: PrepareMergeArgs & { account?: OnchainExecutionAccount }
  ): Promise<OnchainExecutionResult<PreparedOnchainTransaction>> {
    const tx = await this.prepareMergeTx(args);
    const hash = await this.sendPreparedTransaction(tx, args.account);
    return { hash, tx };
  }

  /** Prepares + sends claim tx. */
  async claimWinnings(
    args: PrepareClaimArgs & { account?: OnchainExecutionAccount }
  ): Promise<OnchainExecutionResult<PreparedOnchainTransaction>> {
    const tx = await this.prepareClaimTx(args);
    const hash = await this.sendPreparedTransaction(tx, args.account);
    return { hash, tx };
  }

  /** Prepares + sends resolve tx. */
  async resolveMarket(
    args: PrepareResolveArgs & { account?: OnchainExecutionAccount }
  ): Promise<OnchainExecutionResult<PreparedResolveTransaction>> {
    const tx = await this.prepareResolveTx(args);
    const hash = await this.sendPreparedTransaction(tx, args.account);
    return { hash, tx };
  }
}
