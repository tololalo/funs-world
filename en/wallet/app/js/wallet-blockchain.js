/**
 * WalletBlockchain - Blockchain connection and balance management module
 * Depends on: ethers.js v6, window.WalletConfig, window.WalletCore
 */

class WalletBlockchain extends EventTarget {
  constructor() {
    super();
    this.providers = {};
    this.currentNetwork = window.WalletConfig?.WALLET_CONFIG?.defaultNetwork || 'bsc';
    this.balances = {};
    this.prices = {};
    this.refreshTimer = null;
    this._priceCache = { data: {}, timestamp: 0 };
    this._priceCacheDuration = 30000; // 30 seconds
  }

  /**
   * Initialize blockchain providers for all configured networks
   */
  async init() {
    try {
      if (!window.WalletConfig || !window.WalletConfig.NETWORKS) {
        throw new Error('WalletConfig.NETWORKS not found');
      }

      // Create providers for enabled networks only
      const enabledNetworks = window.WalletConfig.getEnabledNetworks?.() || Object.keys(window.WalletConfig.NETWORKS);
      for (const networkKey of enabledNetworks) {
        const networkConfig = window.WalletConfig.NETWORKS[networkKey];
        if (!networkConfig) continue;
        try {
          this.providers[networkKey] = new ethers.JsonRpcProvider(
            networkConfig.rpc,
            {
              chainId: networkConfig.chainId,
              name: networkKey
            }
          );
        } catch (error) {
          console.error(`Failed to create provider for ${networkKey}:`, error);
        }
      }

      // Start auto-refresh timer
      const refreshInterval = window.WalletConfig.WALLET_CONFIG?.refreshInterval || 30000;
      this._startAutoRefresh(refreshInterval);

      console.log('WalletBlockchain initialized successfully');
    } catch (error) {
      console.error('WalletBlockchain initialization failed:', error);
      throw error;
    }
  }

  /**
   * Switch to a different network
   * @param {string} networkKey - Network identifier (e.g., 'bsc', 'ethereum')
   */
  async switchNetwork(networkKey) {
    try {
      // If provider doesn't exist yet (newly enabled network), create it
      if (!this.providers[networkKey]) {
        const networkConfig = window.WalletConfig.NETWORKS[networkKey];
        if (!networkConfig) {
          throw new Error(`Network ${networkKey} not configured`);
        }
        this.providers[networkKey] = new ethers.JsonRpcProvider(
          networkConfig.rpc,
          { chainId: networkConfig.chainId, name: networkKey }
        );
      }

      this.currentNetwork = networkKey;

      // Dispatch event
      this.dispatchEvent(new CustomEvent('networkChanged', {
        detail: { network: networkKey }
      }));

      // Refresh balances for new network
      if (window.walletCore?.address || window.WalletCore?.address) {
        const addr = window.walletCore?.address || window.WalletCore?.address;
        await this.fetchAllBalances(addr);
      }

      console.log(`Switched to network: ${networkKey}`);
    } catch (error) {
      console.error('Network switch failed:', error);
      throw error;
    }
  }

  /**
   * Get provider for specified network
   * @param {string} networkKey - Network identifier (optional, uses currentNetwork if not provided)
   * @returns {ethers.JsonRpcProvider}
   */
  getProvider(networkKey = null) {
    const key = networkKey || this.currentNetwork;
    if (!this.providers[key]) {
      throw new Error(`Provider for network ${key} not found`);
    }
    return this.providers[key];
  }

  /**
   * Fetch all balances for an address on current network
   * @param {string} address - Wallet address
   * @returns {Promise<Object>} Balances object
   */
  async fetchAllBalances(address) {
    try {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid address format');
      }

      const provider = this.getProvider();
      const networkConfig = window.WalletConfig.NETWORKS[this.currentNetwork];

      if (!networkConfig) {
        throw new Error(`Network config not found for ${this.currentNetwork}`);
      }

      const balances = {};

      // Fetch native token balance
      const nativeBalance = await provider.getBalance(address);
      const nativeFormatted = ethers.formatUnits(nativeBalance, 18);
      balances[networkConfig.symbol || 'BNB'] = {
        balance: nativeFormatted,
        decimals: 18,
        address: null,
        usdValue: 0,
        change24h: 0
      };

      // Fetch ERC-20 token balances (built-in + custom)
      const networkTokens = window.WalletConfig.getAllTokens?.(this.currentNetwork) || window.WalletConfig.TOKENS[this.currentNetwork] || {};
      if (networkTokens) {
        for (const [symbol, tokenConfig] of Object.entries(networkTokens)) {
          if (tokenConfig.native) continue;
          if (!tokenConfig.address || tokenConfig.address === '0x0000000000000000000000000000000000000000') continue;
          try {
            const balance = await this.getTokenBalance(address, tokenConfig, this.currentNetwork);
            balances[symbol] = {
              balance: balance,
              decimals: tokenConfig.decimals,
              address: tokenConfig.address,
              usdValue: 0,
              change24h: 0,
              isCustom: tokenConfig.isCustom || false
            };
          } catch (error) {
            console.warn(`Failed to fetch balance for ${symbol}:`, error);
          }
        }
      }

      // Fetch USD prices
      await this._enrichBalancesWithPrices(balances, networkConfig);

      // Store balances
      this.balances = balances;

      // Dispatch event
      this.dispatchEvent(new CustomEvent('balancesUpdated', {
        detail: { balances: balances }
      }));

      return balances;
    } catch (error) {
      console.error('Failed to fetch balances:', error);
      throw error;
    }
  }

  /**
   * Get native token balance for an address
   * @param {string} address - Wallet address
   * @param {string} networkKey - Network identifier (optional)
   * @returns {Promise<string>} Formatted balance
   */
  async getNativeBalance(address, networkKey = null) {
    try {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid address format');
      }

      const provider = this.getProvider(networkKey);
      const balance = await provider.getBalance(address);
      return ethers.formatUnits(balance, 18);
    } catch (error) {
      console.error('Failed to fetch native balance:', error);
      throw error;
    }
  }

  /**
   * Get ERC-20 token balance for an address
   * @param {string} address - Wallet address
   * @param {Object} tokenConfig - Token configuration
   * @param {string} networkKey - Network identifier (optional)
   * @returns {Promise<string>} Formatted balance
   */
  async getTokenBalance(address, tokenConfig, networkKey = null) {
    try {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid address format');
      }

      if (!ethers.isAddress(tokenConfig.address)) {
        throw new Error('Invalid token address format');
      }

      const provider = this.getProvider(networkKey);

      const contract = new ethers.Contract(
        tokenConfig.address,
        this._getERC20ABI(),
        provider
      );

      const balance = await contract.balanceOf(address);
      const decimals = tokenConfig.decimals || 18;
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
      throw error;
    }
  }

  /**
   * Fetch token prices from CoinGecko API
   * @returns {Promise<Object>} Prices object
   */
  async fetchPrices() {
    try {
      const now = Date.now();

      // Check cache
      if (this._priceCache.data && (now - this._priceCache.timestamp) < this._priceCacheDuration) {
        return this._priceCache.data;
      }

      const networkConfig = window.WalletConfig.NETWORKS[this.currentNetwork];
      const networkTokens = window.WalletConfig.getAllTokens?.(this.currentNetwork) || window.WalletConfig.TOKENS[this.currentNetwork] || {};
      if (!networkConfig) {
        return {};
      }

      // Collect all coingecko IDs
      const coingeckoIds = [];
      const tokens = {};

      if (networkConfig.symbol) {
        const nativeCoingeckoId = this._getNativeCoingeckoId(this.currentNetwork);
        if (nativeCoingeckoId) {
          coingeckoIds.push(nativeCoingeckoId);
          tokens[nativeCoingeckoId] = networkConfig.symbol;
        }
      }

      if (networkTokens) {
        for (const [symbol, token] of Object.entries(networkTokens)) {
          if (token.coingeckoId) {
            coingeckoIds.push(token.coingeckoId);
            tokens[token.coingeckoId] = symbol;
          }
        }
      }

      if (coingeckoIds.length === 0) {
        return {};
      }

      const ids = coingeckoIds.join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const prices = {};

      for (const [coingeckoId, priceData] of Object.entries(data)) {
        prices[coingeckoId] = {
          usd: priceData.usd || 0,
          change24h: priceData.usd_24h_change || 0
        };
      }

      // Update cache
      this._priceCache = { data: prices, timestamp: now };

      // Dispatch event
      this.dispatchEvent(new CustomEvent('pricesUpdated', {
        detail: { prices: prices }
      }));

      return prices;
    } catch (error) {
      console.error('Failed to fetch prices:', error);
      // Return cached data even if stale
      return this._priceCache.data || {};
    }
  }

  /**
   * Fetch price history for a token
   * @param {string} coingeckoId - CoinGecko token ID
   * @param {string} days - Time period ('1h', '1d', '1w', '1m', '1y')
   * @returns {Promise<Array>} Array of [timestamp, price] pairs
   */
  async fetchPriceHistory(coingeckoId, days = '1d') {
    try {
      const dayMap = {
        '1h': 1,
        '1d': 1,
        '1w': 7,
        '1m': 30,
        '1y': 365
      };

      const daysParam = dayMap[days] || 1;
      const url = `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=${daysParam}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      return data.prices || [];
    } catch (error) {
      console.error('Failed to fetch price history:', error);
      throw error;
    }
  }

  /**
   * Estimate gas for a transaction
   * @param {Object} txParams - Transaction parameters
   * @param {string} networkKey - Network identifier (optional)
   * @returns {Promise<Object>} Gas estimation object
   */
  async estimateGas(txParams, networkKey = null) {
    try {
      const provider = this.getProvider(networkKey);

      // Estimate gas
      const gasLimit = await provider.estimateGas(txParams);

      // Get fee data
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('1', 'gwei');

      // Calculate costs
      const gasCostWei = gasLimit * gasPrice;
      const gasCostEth = ethers.formatUnits(gasCostWei, 18);

      // Get native token price for USD conversion
      const nativeCoingeckoId = this._getNativeCoingeckoId(networkKey || this.currentNetwork);
      const prices = await this.fetchPrices();
      const nativePrice = prices[nativeCoingeckoId]?.usd || 0;
      const gasCostUsd = parseFloat(gasCostEth) * nativePrice;

      return {
        gasLimit: gasLimit.toString(),
        gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
        gasCost: gasCostEth,
        gasCostUsd: gasCostUsd.toFixed(2)
      };
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for an address
   * @param {string} address - Wallet address
   * @param {string} networkKey - Network identifier (optional)
   * @returns {Promise<Array>} Array of transaction objects
   */
  async getTransactionHistory(address, networkKey = null) {
    try {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid address format');
      }

      const key = networkKey || this.currentNetwork;
      const networkConfig = window.WalletConfig.NETWORKS[key];

      if (!networkConfig || !networkConfig.explorerApi) {
        throw new Error(`Explorer API not configured for ${key}`);
      }

      const transactions = [];

      // Get the appropriate API key
      const apiKeyMap = { bsc: window.WalletConfig.API_KEYS?.bscscan, ethereum: window.WalletConfig.API_KEYS?.etherscan };
      const apiKey = apiKeyMap[key] || '';

      // Fetch normal transactions
      const normalTxUrl = `${networkConfig.explorerApi}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
      const normalTxResponse = await fetch(normalTxUrl);
      const normalTxData = await normalTxResponse.json();

      if (normalTxData.result && Array.isArray(normalTxData.result)) {
        for (const tx of normalTxData.result) {
          transactions.push(this._formatTransaction(tx, address));
        }
      }

      // Fetch ERC-20 transfers
      const tokenTxUrl = `${networkConfig.explorerApi}?module=account&action=tokentx&address=${address}&sort=desc&apikey=${apiKey}`;
      const tokenTxResponse = await fetch(tokenTxUrl);
      const tokenTxData = await tokenTxResponse.json();

      if (tokenTxData.result && Array.isArray(tokenTxData.result)) {
        for (const tx of tokenTxData.result) {
          transactions.push(this._formatTransaction(tx, address, true));
        }
      }

      // Sort by timestamp (newest first)
      transactions.sort((a, b) => b.timestamp - a.timestamp);

      return transactions;
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
      throw error;
    }
  }

  /**
   * Stop auto-refresh timer
   */
  stopRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Destroy the blockchain instance
   */
  destroy() {
    this.stopRefresh();
    this.providers = {};
    this.balances = {};
    this.prices = {};
    this._priceCache = { data: {}, timestamp: 0 };
  }

  /**
   * Enable a network provider on-the-fly
   * @param {string} networkKey - Network identifier
   */
  async enableNetwork(networkKey) {
    const networkConfig = window.WalletConfig.NETWORKS[networkKey];
    if (!networkConfig) {
      throw new Error(`Network ${networkKey} not found in configuration`);
    }
    if (!this.providers[networkKey]) {
      this.providers[networkKey] = new ethers.JsonRpcProvider(
        networkConfig.rpc,
        { chainId: networkConfig.chainId, name: networkKey }
      );
    }
  }

  /**
   * Disable a network provider
   * @param {string} networkKey - Network identifier
   */
  disableNetwork(networkKey) {
    if (this.currentNetwork === networkKey) {
      throw new Error('Cannot disable the currently active network');
    }
    if (this.providers[networkKey]) {
      delete this.providers[networkKey];
    }
  }

  /**
   * PRIVATE METHODS
   */

  /**
   * Start auto-refresh timer
   * @private
   */
  _startAutoRefresh(interval) {
    this.stopRefresh();

    this.refreshTimer = setInterval(async () => {
      try {
        const addr = window.walletCore?.address || window.WalletCore?.address;
        if (addr) {
          await this.fetchAllBalances(addr);
          await this.fetchPrices();
        }
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, interval);
  }

  /**
   * Enrich balances with USD prices
   * @private
   */
  async _enrichBalancesWithPrices(balances, networkConfig) {
    try {
      const prices = await this.fetchPrices();
      const networkTokens = window.WalletConfig.getAllTokens?.(this.currentNetwork) || window.WalletConfig.TOKENS[this.currentNetwork] || {};

      for (const [symbol, balanceData] of Object.entries(balances)) {
        let coingeckoId = null;

        // Find coingeckoId
        if (symbol === networkConfig.symbol) {
          coingeckoId = this._getNativeCoingeckoId(this.currentNetwork);
        } else {
          const token = networkTokens?.[symbol];
          coingeckoId = token?.coingeckoId;
        }

        if (coingeckoId && prices[coingeckoId]) {
          const priceData = prices[coingeckoId];
          balanceData.usdValue = (parseFloat(balanceData.balance) * priceData.usd).toFixed(2);
          balanceData.change24h = priceData.change24h;
        }
      }
    } catch (error) {
      console.warn('Failed to enrich balances with prices:', error);
    }
  }

  /**
   * Format raw transaction for display
   * @private
   */
  _formatTransaction(rawTx, address, isTokenTransfer = false) {
    const isIncoming = rawTx.to?.toLowerCase() === address.toLowerCase();
    const txType = this._detectTransactionType(rawTx, address, isTokenTransfer);

    return {
      hash: rawTx.hash,
      type: txType,
      from: rawTx.from,
      to: rawTx.to,
      value: isTokenTransfer ? rawTx.value : ethers.formatUnits(rawTx.value || 0, 18),
      token: isTokenTransfer ? rawTx.tokenSymbol : null,
      timestamp: parseInt(rawTx.timeStamp) * 1000,
      status: rawTx.isError === '0' ? 'success' : 'failed',
      blockNumber: rawTx.blockNumber,
      gasPrice: ethers.formatUnits(rawTx.gasPrice || 0, 'gwei'),
      gasUsed: rawTx.gasUsed || '0'
    };
  }

  /**
   * Detect transaction type (send/receive/swap)
   * @private
   */
  _detectTransactionType(tx, address, isTokenTransfer = false) {
    const addressLower = address.toLowerCase();
    const fromLower = (tx.from || '').toLowerCase();
    const toLower = (tx.to || '').toLowerCase();

    if (isTokenTransfer) {
      return toLower === addressLower ? 'receive' : 'send';
    }

    if (toLower === addressLower) {
      return 'receive';
    } else if (fromLower === addressLower) {
      // Could be send or swap - check for interaction with DEX
      if (tx.input && tx.input.length > 2) {
        return 'swap'; // Has function call data
      }
      return 'send';
    }

    return 'unknown';
  }

  /**
   * Get native coingecko ID for a network
   * @private
   */
  _getNativeCoingeckoId(networkKey) {
    const coingeckoMap = {
      'bsc': 'binancecoin',
      'ethereum': 'ethereum',
      'polygon': 'matic-network',
      'avalanche': 'avalanche-2',
      'fantom': 'fantom',
      'arbitrum': 'ethereum',
      'optimism': 'ethereum',
      'base': 'ethereum'
    };

    return coingeckoMap[networkKey] || null;
  }

  /**
   * Get ERC-20 ABI
   * @private
   */
  _getERC20ABI() {
    return [
      'function balanceOf(address account) external view returns (uint256)',
      'function decimals() external view returns (uint8)',
      'function transfer(address to, uint256 amount) external returns (bool)',
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function allowance(address owner, address spender) external view returns (uint256)',
      'event Transfer(address indexed from, address indexed to, uint256 value)',
      'event Approval(address indexed owner, address indexed spender, uint256 value)'
    ];
  }
}

// Assign to global scope
window.WalletBlockchain = WalletBlockchain;
