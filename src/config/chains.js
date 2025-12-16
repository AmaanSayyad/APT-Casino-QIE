/**
 * Custom Chain Definitions
 * Defines custom chains not included in wagmi/chains
 */

import { defineChain } from 'viem';

// QIE Testnet Chain Definition
export const qieTestnet = defineChain({
  id: 1983,
  name: 'QIE Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'QIE',
    symbol: 'QIE',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc1testnet.qie.digital/'],
    },
    public: {
      http: ['https://rpc1testnet.qie.digital/'],
    },
  },
  blockExplorers: {
    default: {
      name: 'QIE Testnet Explorer',
      url: 'https://testnet.qie.digital',
    },
  },
  testnet: true,
});

// Somnia Testnet Chain Definition
// Configuration based on official network.md documentation
export const somniaTestnet = defineChain({
  id: 50312, // Correct chain ID (0xc488 in hex)
  name: 'Somnia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'], // Primary RPC from network.md
    },
    public: {
      http: ['https://dream-rpc.somnia.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Shannon Explorer',
      url: 'https://shannon-explorer.somnia.network', // Official explorer
    },
  },
  testnet: true,
});

export default {
  qieTestnet,
  somniaTestnet,
};
