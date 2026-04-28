/**
 * Web3 Wallet Configuration
 * Supports BSC (Binance Smart Chain) and Ethereum networks
 * Global configuration object for wallet operations, networks, tokens, and DEX routers
 */

/**
 * Network configurations for supported blockchains
 * @type {Object}
 */
const NETWORKS = {
  bsc: {
    chainId: 56,
    name: 'BNB Smart Chain',
    rpc: 'https://bsc-dataseed1.binance.org',
    rpcFallbacks: [
      'https://bsc-dataseed2.binance.org',
      'https://bsc-dataseed3.binance.org',
      'https://bsc-dataseed4.binance.org'
    ],
    explorer: 'https://bscscan.com',
    explorerApi: 'https://api.bscscan.com/api',
    symbol: 'BNB',
    decimals: 18
  },
  bscTestnet: {
    chainId: 97,
    name: 'BSC Testnet',
    rpc: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
    rpcFallbacks: [
      'https://data-seed-prebsc-2-s1.bnbchain.org:8545',
      'https://data-seed-prebsc-1-s2.bnbchain.org:8545'
    ],
    explorer: 'https://testnet.bscscan.com',
    explorerApi: 'https://api-testnet.bscscan.com/api',
    symbol: 'tBNB',
    decimals: 18,
    isTestnet: true,
    faucet: 'https://testnet.bnbchain.org/faucet-smart'
  },
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    rpc: 'https://eth.llamarpc.com',
    rpcFallbacks: [
      'https://ethereum.publicnode.com',
      'https://rpc.ankr.com/eth',
      'https://cloudflare-eth.com'
    ],
    explorer: 'https://etherscan.io',
    explorerApi: 'https://api.etherscan.io/api',
    symbol: 'ETH',
    decimals: 18
  },
  ethereumSepolia: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpc: 'https://ethereum-sepolia.publicnode.com',
    rpcFallbacks: [
      'https://rpc.sepolia.org',
      'https://rpc.ankr.com/eth_sepolia'
    ],
    explorer: 'https://sepolia.etherscan.io',
    explorerApi: 'https://api-sepolia.etherscan.io/api',
    symbol: 'ETH',
    decimals: 18,
    isTestnet: true,
    faucet: 'https://sepoliafaucet.com'
  }
};

/**
 * Token configurations per network
 * Supports native tokens and ERC-20 tokens with metadata
 * @type {Object}
 */
const TOKENS = {
  bsc: {
    FUNS: {
      // TODO: Replace with actual FUNS token contract address on BSC mainnet
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      symbol: 'FUNS',
      name: 'FunS Token',
      icon: '../../funs-nugi.png',
      coingeckoId: null
    },
    BNB: {
      native: true,
      decimals: 18,
      symbol: 'BNB',
      name: 'Binance Coin',
      icon: '../../dex/icons/bnb.svg',
      coingeckoId: 'binancecoin'
    },
    USDT: {
      address: '0x55d398326f99059fF775485246999027B3197955',
      decimals: 18,
      symbol: 'USDT',
      name: 'Tether USD',
      icon: '../../dex/icons/usdt.svg',
      coingeckoId: 'tether'
    },
    USDC: {
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      decimals: 18,
      symbol: 'USDC',
      name: 'USD Coin',
      icon: '../../dex/icons/usdc.svg',
      coingeckoId: 'usd-coin'
    },
    CAKE: {
      address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
      decimals: 18,
      symbol: 'CAKE',
      name: 'PancakeSwap',
      icon: '../../dex/icons/cake.svg',
      coingeckoId: 'pancakeswap-token'
    }
  },
  bscTestnet: {
    tBNB: {
      native: true,
      decimals: 18,
      symbol: 'tBNB',
      name: 'Test BNB',
      icon: '../../dex/icons/bnb.svg',
      coingeckoId: 'binancecoin'
    },
    USDT: {
      address: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
      decimals: 18,
      symbol: 'USDT',
      name: 'Test USDT',
      icon: '../../dex/icons/usdt.svg',
      coingeckoId: 'tether'
    },
    BUSD: {
      address: '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee',
      decimals: 18,
      symbol: 'BUSD',
      name: 'Test BUSD',
      icon: '../../dex/icons/usdt.svg',
      coingeckoId: 'binance-usd'
    }
  },
  ethereum: {
    ETH: {
      native: true,
      decimals: 18,
      symbol: 'ETH',
      name: 'Ethereum',
      icon: '../../dex/icons/eth.svg',
      coingeckoId: 'ethereum'
    },
    USDT: {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      symbol: 'USDT',
      name: 'Tether USD',
      icon: '../../dex/icons/usdt.svg',
      coingeckoId: 'tether'
    },
    USDC: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      symbol: 'USDC',
      name: 'USD Coin',
      icon: '../../dex/icons/usdc.svg',
      coingeckoId: 'usd-coin'
    }
  },
  ethereumSepolia: {
    ETH: {
      native: true,
      decimals: 18,
      symbol: 'ETH',
      name: 'Test ETH',
      icon: '../../dex/icons/eth.svg',
      coingeckoId: 'ethereum'
    },
    USDC: {
      address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: 6,
      symbol: 'USDC',
      name: 'Test USDC',
      icon: '../../dex/icons/usdc.svg',
      coingeckoId: 'usd-coin'
    }
  }
};

/**
 * DEX Router configurations
 * Contains router addresses and factory information for swaps
 * @type {Object}
 */
const DEX_ROUTERS = {
  pancakeswap: {
    address: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    network: 'bsc',
    factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    weth: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
  },
  pancakeswapTestnet: {
    address: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
    network: 'bscTestnet',
    factory: '0x6725f303b657a9451d8ba641348b6761a6cc7a17',
    weth: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'
  },
  uniswap: {
    address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    network: 'ethereum',
    factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  }
};

/**
 * Minimal ERC20 ABI for token interactions
 * Includes essential functions for token operations
 * @type {Array}
 */
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  }
];

/**
 * Minimal DEX Router ABI for swap operations
 * Includes essential swap and quote functions
 * @type {Array}
 */
const ROUTER_ABI = [
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    type: 'function'
  },
  {
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    name: 'swapExactETHForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    type: 'function',
    stateMutability: 'payable'
  },
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    name: 'swapExactTokensForETH',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    type: 'function'
  },
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' }
    ],
    name: 'getAmountsOut',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    type: 'function',
    stateMutability: 'view'
  }
];

/**
 * API Keys for blockchain explorers
 * Placeholders for free tier keys
 * @type {Object}
 */
const API_KEYS = {
  bscscan: '', // TODO: Get free tier API key from https://bscscan.com/apis
  etherscan: '' // TODO: Get free tier API key from https://etherscan.io/apis
};

/**
 * Fiat on-ramp providers configuration
 * Integration with third-party services for buying crypto with fiat currency
 * @type {Object}
 */
const FIAT_PROVIDERS = {
  moonpay: {
    apiKey: '', // TODO: Get from https://dashboard.moonpay.com
    apiUrl: 'https://api.moonpay.com/v3',
    widgetUrl: 'https://buy.moonpay.com',
    supportedCurrencies: ['BNB', 'ETH', 'USDT', 'USDC'],
    supportedPayments: ['credit_card', 'bank_transfer', 'apple_pay', 'google_pay']
  },
  simplex: {
    apiKey: '', // TODO: Get from https://dashboard.simplex.com
    widgetUrl: 'https://checkout.simplexcc.com',
    supportedCurrencies: ['BNB', 'ETH']
  }
};

/**
 * Custom token template for user-added tokens
 * @type {Object}
 */
const CUSTOM_TOKEN_TEMPLATE = {
  address: '',
  decimals: 18,
  symbol: '',
  name: '',
  icon: null,
  coingeckoId: null,
  isCustom: true
};

/**
 * Wallet configuration settings
 * Controls session timeout, gas limits, slippage, and refresh rates
 * @type {Object}
 */
const WALLET_CONFIG = {
  defaultNetwork: 'bsc',
  enabledNetworks: ['bsc'], // Production: BSC mainnet enabled by default
  isTestnetMode: false,
  sessionTimeout: 5 * 60 * 1000, // 5 minutes in milliseconds
  maxGasPrice: '50', // in gwei
  defaultSlippage: 0.5, // percentage
  refreshInterval: 30000, // milliseconds
  walletConnectProjectId: '' // Get from https://cloud.walletconnect.com
};

/**
 * Complete WalletConfig object
 * Aggregates all configuration modules for global access
 * @type {Object}
 */
const WalletConfig = {
  NETWORKS,
  TOKENS,
  DEX_ROUTERS,
  ERC20_ABI,
  ROUTER_ABI,
  API_KEYS,
  FIAT_PROVIDERS,
  WALLET_CONFIG,

  /**
   * Get network configuration by name
   * @param {string} networkName - Network name (bsc or ethereum)
   * @returns {Object|null} Network configuration or null if not found
   */
  getNetwork: function(networkName) {
    return this.NETWORKS[networkName] || null;
  },

  /**
   * Get token configuration for a specific network
   * @param {string} networkName - Network name
   * @param {string} tokenSymbol - Token symbol
   * @returns {Object|null} Token configuration or null if not found
   */
  getToken: function(networkName, tokenSymbol) {
    return this.TOKENS[networkName]?.[tokenSymbol] || null;
  },

  /**
   * Get DEX router configuration by name
   * @param {string} routerName - Router name (pancakeswap or uniswap)
   * @returns {Object|null} Router configuration or null if not found
   */
  getRouter: function(routerName) {
    return this.DEX_ROUTERS[routerName] || null;
  },

  /**
   * Get enabled networks list
   * @returns {string[]} Array of enabled network keys
   */
  getEnabledNetworks: function() {
    return this.WALLET_CONFIG.enabledNetworks || ['bsc'];
  },

  /**
   * Enable or disable a network
   * @param {string} networkKey - Network to toggle
   * @param {boolean} enabled - Enable or disable
   */
  toggleNetwork: function(networkKey, enabled) {
    if (!this.NETWORKS[networkKey]) return;
    const networks = this.WALLET_CONFIG.enabledNetworks;
    const idx = networks.indexOf(networkKey);
    if (enabled && idx === -1) {
      networks.push(networkKey);
    } else if (!enabled && idx !== -1) {
      // Don't allow disabling the default network
      if (networkKey === this.WALLET_CONFIG.defaultNetwork) return;
      networks.splice(idx, 1);
    }
    // Save to localStorage
    try {
      localStorage.setItem('funs_enabled_networks', JSON.stringify(networks));
    } catch(e) {}
  },

  /**
   * Load enabled networks from localStorage
   */
  loadEnabledNetworks: function() {
    try {
      const saved = localStorage.getItem('funs_enabled_networks');
      if (saved) {
        const networks = JSON.parse(saved);
        if (Array.isArray(networks) && networks.length > 0) {
          this.WALLET_CONFIG.enabledNetworks = networks;
        }
      }
    } catch(e) {}
  },

  /**
   * Get custom tokens from localStorage
   * @param {string} networkKey - Network identifier
   * @returns {Object} Custom tokens object
   */
  getCustomTokens: function(networkKey) {
    try {
      const saved = localStorage.getItem(`funs_custom_tokens_${networkKey}`);
      return saved ? JSON.parse(saved) : {};
    } catch(e) {
      return {};
    }
  },

  /**
   * Add a custom token
   * @param {string} networkKey - Network identifier
   * @param {Object} tokenData - Token data {address, decimals, symbol, name}
   * @returns {boolean} Success
   */
  addCustomToken: function(networkKey, tokenData) {
    try {
      const customTokens = this.getCustomTokens(networkKey);
      customTokens[tokenData.symbol] = {
        ...CUSTOM_TOKEN_TEMPLATE,
        ...tokenData,
        isCustom: true
      };
      localStorage.setItem(`funs_custom_tokens_${networkKey}`, JSON.stringify(customTokens));
      return true;
    } catch(e) {
      return false;
    }
  },

  /**
   * Remove a custom token
   * @param {string} networkKey - Network identifier
   * @param {string} tokenSymbol - Token symbol to remove
   * @returns {boolean} Success
   */
  removeCustomToken: function(networkKey, tokenSymbol) {
    try {
      const customTokens = this.getCustomTokens(networkKey);
      if (customTokens[tokenSymbol]) {
        delete customTokens[tokenSymbol];
        localStorage.setItem(`funs_custom_tokens_${networkKey}`, JSON.stringify(customTokens));
        return true;
      }
      return false;
    } catch(e) {
      return false;
    }
  },

  /**
   * Get all tokens (built-in + custom) for a network
   * @param {string} networkName - Network name
   * @returns {Object} Merged tokens object
   */
  getAllTokens: function(networkName) {
    const builtIn = this.TOKENS[networkName] || {};
    const custom = this.getCustomTokens(networkName);
    return { ...builtIn, ...custom };
  },

  /**
   * Get all tokens for a specific network
   * @param {string} networkName - Network name
   * @returns {Object|null} All tokens for the network or null if not found
   */
  getNetworkTokens: function(networkName) {
    return this.getAllTokens(networkName);
  },

  /**
   * Get RPC URLs with fallbacks for a network
   * @param {string} networkName - Network name
   * @returns {string[]} Array of RPC URLs (primary + fallbacks)
   */
  getRpcUrls: function(networkName) {
    const network = this.NETWORKS[networkName];
    if (!network) return [];
    const urls = [network.rpc];
    if (network.rpcFallbacks) {
      urls.push(...network.rpcFallbacks);
    }
    return urls;
  },

  /**
   * Get the currently active network
   * @returns {string} Active network name
   */
  getActiveNetwork: function() {
    return this.WALLET_CONFIG.defaultNetwork;
  }
};

// Load saved settings on startup
if (typeof window !== 'undefined') {
  window.WalletConfig = WalletConfig;
  window.FIAT_PROVIDERS = FIAT_PROVIDERS;
  WalletConfig.loadEnabledNetworks();
}

// Export for module systems (CommonJS, ES6)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WalletConfig;
}
