/**
 * EIP-712 typed-data schema used for off-chain order signatures.
 */
export const ORDER_TYPES = {
  Order: [
    { name: 'marketId', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'isSell', type: 'bool' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'amount', type: 'uint256' },
    { name: 'price', type: 'uint256' },
    { name: 'feeBps', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' }
  ]
} as const;

export const SCALE = 1_000_000;
/** Minimum extra wei added when paying Pyth update fee to avoid edge underpayment. */
export const MIN_UPDATE_FEE_BUFFER_WEI = 1000n;
/** Default Hermes endpoint used to fetch Pyth update payloads. */
export const DEFAULT_PYTH_PRICE_SERVICE_URL = 'https://hermes.pyth.network';

/** ERC20 ABI subset needed for USDC approvals and funding checks. */
export const ERC20_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' }
    ],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

/** Exchange ABI subset needed to discover the market's USDC token. */
export const EXCHANGE_MARKET_USDC_ABI = [{
  inputs: [
    { internalType: 'uint256', name: 'marketId', type: 'uint256' }
  ],
  name: 'getMarketUSDC',
  outputs: [{ internalType: 'address', name: '', type: 'address' }],
  stateMutability: 'view',
  type: 'function'
}] as const;

/** Exchange ABI subset needed to mint paired outcome tokens. */
export const EXCHANGE_MINT_ABI = [{
  inputs: [
    { internalType: 'uint256', name: 'marketId', type: 'uint256' },
    { internalType: 'uint256', name: 'amount', type: 'uint256' }
  ],
  name: 'mint',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function'
}] as const;

/** Exchange ABI subset needed to merge paired tokens back into USDC. */
export const EXCHANGE_MERGE_ABI = [{
  inputs: [
    { internalType: 'uint256', name: 'marketId', type: 'uint256' },
    { internalType: 'address', name: 'holder', type: 'address' },
    { internalType: 'uint256', name: 'pairs', type: 'uint256' }
  ],
  name: 'mergeFor',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function'
}] as const;

/** Exchange ABI subset needed to claim winnings on resolved markets. */
export const EXCHANGE_CLAIM_ABI = [{
  inputs: [{ internalType: 'uint256', name: 'marketId', type: 'uint256' }],
  name: 'claimWinnings',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function'
}] as const;

/** Exchange ABI subset needed to resolve a market with Pyth updates. */
export const EXCHANGE_RESOLVE_ABI = [{
  inputs: [
    { internalType: 'uint256', name: 'marketId', type: 'uint256' },
    { internalType: 'address', name: 'pyth', type: 'address' },
    { internalType: 'bytes[]', name: 'updateData', type: 'bytes[]' }
  ],
  name: 'resolveMarketWithPyth',
  outputs: [],
  stateMutability: 'payable',
  type: 'function'
}] as const;

/** Pyth ABI subset needed to quote fee for a price update payload. */
export const PYTH_ABI = [{
  inputs: [{ internalType: 'bytes[]', name: 'updateData', type: 'bytes[]' }],
  name: 'getUpdateFee',
  outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  stateMutability: 'view',
  type: 'function'
}] as const;
