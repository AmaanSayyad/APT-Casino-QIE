// Network Configuration
export const ARBITRUM_NETWORKS = {
  SEPOLIA: 'arbitrum-sepolia',
  MAINNET: 'arbitrum-one',
  DEVNET: 'arbitrum-devnet'
};

export const QIE_NETWORKS = {
  TESTNET: 'qie-testnet',
};



// Arbitrum Network URLs
export const ARBITRUM_NETWORK_URLS = {
  [ARBITRUM_NETWORKS.SEPOLIA]: "https://sepolia-rollup.arbitrum.io/rpc",
  [ARBITRUM_NETWORKS.MAINNET]: "https://arb1.arbitrum.io/rpc",
  [ARBITRUM_NETWORKS.DEVNET]: "http://localhost:8545"
};

// Arbitrum Faucet URLs
export const ARBITRUM_FAUCET_URLS = {
  [ARBITRUM_NETWORKS.SEPOLIA]: "https://faucet.triangleplatform.com/arbitrum/sepolia",
  [ARBITRUM_NETWORKS.DEVNET]: "http://localhost:8545"
};

// Arbitrum Explorer URLs
export const ARBITRUM_EXPLORER_URLS = {
  [ARBITRUM_NETWORKS.SEPOLIA]: "https://sepolia.arbiscan.io",
  [ARBITRUM_NETWORKS.MAINNET]: "https://arbiscan.io",
  [ARBITRUM_NETWORKS.DEVNET]: "http://localhost:8545"
};

// QIE Network URLs
export const QIE_NETWORK_URLS = {
  [QIE_NETWORKS.TESTNET]: "https://rpc1testnet.qie.digital/",
};



// QIE Explorer URLs
export const QIE_EXPLORER_URLS = {
  [QIE_NETWORKS.TESTNET]: "https://testnet.qie.digital",
};



// Default network (can be changed via environment variable)
export const DEFAULT_NETWORK = QIE_NETWORKS.TESTNET;

// QIE Contract Addresses
export const QIE_CONTRACTS = {
  [QIE_NETWORKS.TESTNET]: {
    treasury: process.env.NEXT_PUBLIC_QIE_TREASURY_ADDRESS || "",
    gameLogger: process.env.NEXT_PUBLIC_QIE_GAME_LOGGER_ADDRESS || "",
    gameNFT: process.env.NEXT_PUBLIC_QIE_GAME_NFT_ADDRESS || ""
  }
};



// Casino Module Configuration
export const CASINO_MODULE_CONFIG = {
  [ARBITRUM_NETWORKS.SEPOLIA]: {
    moduleAddress: process.env.NEXT_PUBLIC_CASINO_MODULE_ADDRESS || "0x1234567890123456789012345678901234567890123456789012345678901234",
    moduleName: "casino",
    rouletteModule: "roulette",
    minesModule: "mines",
    wheelModule: "wheel"
  },
  [ARBITRUM_NETWORKS.MAINNET]: {
    moduleAddress: process.env.NEXT_PUBLIC_CASINO_MODULE_ADDRESS || "0x1234567890123456789012345678901234567890123456789012345678901234",
    moduleName: "casino",
    rouletteModule: "roulette",
    minesModule: "mines",
    wheelModule: "wheel"
  },
  [ARBITRUM_NETWORKS.DEVNET]: {
    moduleAddress: process.env.NEXT_PUBLIC_CASINO_MODULE_ADDRESS || "0x1234567890123456789012345678901234567890123456789012345678901234",
    moduleName: "casino",
    rouletteModule: "roulette",
    minesModule: "mines",
    wheelModule: "wheel"
  }
};

// Token Configuration
export const TOKEN_CONFIG = {
  ARB: {
    name: "Arbitrum ETH",
    symbol: "ARB",
    decimals: 18,
    type: "native"
  },
  ARB_ETH: {
    name: "Arbitrum ETH",
    symbol: "ARB",
    decimals: 18,
    type: "native"
  },
  QIE: {
    name: "QIE Token",
    symbol: "QIE",
    decimals: 18,
    type: "native"
  },

};

// Network Information
export const NETWORK_INFO = {
  [ARBITRUM_NETWORKS.SEPOLIA]: {
    name: "Arbitrum Sepolia",
    chainId: 421614,
    nativeCurrency: TOKEN_CONFIG.ARB,
    explorer: ARBITRUM_EXPLORER_URLS[ARBITRUM_NETWORKS.SEPOLIA],
    faucet: ARBITRUM_FAUCET_URLS[ARBITRUM_NETWORKS.SEPOLIA]
  },
  [ARBITRUM_NETWORKS.MAINNET]: {
    name: "Arbitrum One",
    chainId: 42161,
    nativeCurrency: TOKEN_CONFIG.ARB,
    explorer: ARBITRUM_EXPLORER_URLS[ARBITRUM_NETWORKS.MAINNET]
  },
  [ARBITRUM_NETWORKS.DEVNET]: {
    name: "Arbitrum Devnet",
    chainId: 1337,
    nativeCurrency: TOKEN_CONFIG.ARB,
    explorer: ARBITRUM_EXPLORER_URLS[ARBITRUM_NETWORKS.DEVNET],
    faucet: ARBITRUM_FAUCET_URLS[ARBITRUM_NETWORKS.DEVNET]
  },
  [QIE_NETWORKS.TESTNET]: {
    name: "QIE Testnet",
    chainId: 1983,
    nativeCurrency: TOKEN_CONFIG.QIE,
    explorer: QIE_EXPLORER_URLS[QIE_NETWORKS.TESTNET]
  },

};

// Export default configuration
export default {
  ARBITRUM_NETWORKS,
  ARBITRUM_NETWORK_URLS,
  ARBITRUM_FAUCET_URLS,
  ARBITRUM_EXPLORER_URLS,
  QIE_NETWORKS,
  QIE_NETWORK_URLS,
  QIE_EXPLORER_URLS,
  QIE_CONTRACTS,
  DEFAULT_NETWORK,
  CASINO_MODULE_CONFIG,
  TOKEN_CONFIG,
  NETWORK_INFO
}; 
