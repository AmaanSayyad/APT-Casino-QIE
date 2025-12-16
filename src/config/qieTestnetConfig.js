// QIE Testnet Configuration
export const qieTestnetConfig = {
  id: 1983,
  name: 'QIE Testnet',
  network: 'qie-testnet',
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
};

export const qieTestnetTokens = {
  QIE: {
    address: 'native',
    decimals: 18,
    symbol: 'QIE',
    name: 'QIE Token',
    isNative: true,
  },
};

export default qieTestnetConfig;