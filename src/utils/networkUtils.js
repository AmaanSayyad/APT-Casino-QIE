// Network utilities for QIE Testnet
import { qieTestnet } from '@/config/chains';

export const QIE_TESTNET_CONFIG = {
  chainId: '0x7bf', // 1983 in hex
  chainName: 'QIE Testnet',
  nativeCurrency: {
    name: 'QIE',
    symbol: 'QIE',
    decimals: 18,
  },
  rpcUrls: ['https://rpc1testnet.qie.digital/'],
  blockExplorerUrls: ['https://testnet.qie.digital'],
};

export const switchToQIETestnet = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    // Try to switch to QIE Testnet
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: QIE_TESTNET_CONFIG.chainId }],
    });
  } catch (switchError) {
    // If the chain is not added, add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [QIE_TESTNET_CONFIG],
        });
      } catch (addError) {
        throw new Error('Failed to add QIE Testnet to MetaMask');
      }
    } else {
      throw new Error('Failed to switch to QIE Testnet');
    }
  }
};

export const isQIETestnet = (chainId) => {
  return chainId === 1983 || chainId === '0x7bf';
};

export const formatQIEBalance = (balance, decimals = 5) => {
  const numBalance = parseFloat(balance || '0');
  return `${numBalance.toFixed(decimals)} QIE`;
};

export const getQIETestnetExplorerUrl = (txHash) => {
  return `https://testnet.qie.digital/tx/${txHash}`;
};

// Legacy Somnia functions (deprecated - will be removed)
export const SOMNIA_TESTNET_CONFIG = {
  chainId: '0xc488', // 50312 in hex
  chainName: 'Somnia Testnet',
  nativeCurrency: {
    name: 'Somnia Testnet',
    symbol: 'STT',
    decimals: 18,
  },
  rpcUrls: ['https://dream-rpc.somnia.network'],
  blockExplorerUrls: ['https://shannon-explorer.somnia.network'],
};

export const switchToSomniaTestnet = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    // Try to switch to Somnia Testnet
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SOMNIA_TESTNET_CONFIG.chainId }],
    });
  } catch (switchError) {
    // If the chain is not added, add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [SOMNIA_TESTNET_CONFIG],
        });
      } catch (addError) {
        throw new Error('Failed to add Somnia Testnet to MetaMask');
      }
    } else {
      throw new Error('Failed to switch to Somnia Testnet');
    }
  }
};

export const isSomniaTestnet = (chainId) => {
  return chainId === 50312 || chainId === '0xc488';
};

export const formatMonBalance = (balance, decimals = 5) => {
  const numBalance = parseFloat(balance || '0');
  return `${numBalance.toFixed(decimals)} STT`;
};

export const getSomniaTestnetExplorerUrl = (txHash) => {
  return `https://shannon-explorer.somnia.network/tx/${txHash}`;
};
