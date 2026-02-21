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
export const MIN_UPDATE_FEE_BUFFER_WEI = 1000n;
export const DEFAULT_PYTH_PRICE_SERVICE_URL = 'https://hermes.pyth.network';

export const ERC20_ABI = [{
  inputs: [
    { internalType: 'address', name: 'spender', type: 'address' },
    { internalType: 'uint256', name: 'value', type: 'uint256' }
  ],
  name: 'approve',
  outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
  stateMutability: 'nonpayable',
  type: 'function'
}] as const;

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

export const EXCHANGE_CLAIM_ABI = [{
  inputs: [{ internalType: 'uint256', name: 'marketId', type: 'uint256' }],
  name: 'claimWinnings',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function'
}] as const;

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

export const PYTH_ABI = [{
  inputs: [{ internalType: 'bytes[]', name: 'updateData', type: 'bytes[]' }],
  name: 'getUpdateFee',
  outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  stateMutability: 'view',
  type: 'function'
}] as const;
