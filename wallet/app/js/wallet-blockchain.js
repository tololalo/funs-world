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

    // Rate limiting for CoinGecko API
    this._lastApiCall = 0;
    this._apiMinInterval = 1500; // 1.5 seconds between calls

    // Cache for transaction history
    this._txHistoryCache = {};
    this._txHistoryCacheTTL = 60000; // 1 minute
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
          const rpcUrls = window.WalletConfig.getRpcUrls?.(networkKey) || [networkConfig.rpc];
          let provider = null;

          for (const rpcUrl of rpcUrls) {
            let testProvider = null;
            try {
              testProvider = new ethers.JsonRpcProvider(
                rpcUrl,
                {
                  chainId: networkConfig.chainId,
                  name: networkKey
                },
                { staticNetwork: true, polling: false }
              );
              // Quick connectivity test with 5 second timeout
              await Promise.race([
                testProvider.getBlockNumber(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('RPC timeout')), 5000))
              ]);
              provider = testProvider;
              console.log(`[FunS] Connected to ${networkKey} via ${rpcUrl}`);
              break;
            } catch (rpcError) {
              // Destroy the failed testProvider to stop internal polling timers
              if (testProvider) {
                try { testProvider.destroy(); } catch (_) {}
              }
              console.warn(`[FunS] RPC failed for ${networkKey}: ${rpcUrl}`, rpcError.message);
            }
          }

          if (provider) {
            this.providers[networkKey] = provider;
          } else {
            // Create provider without testing (offline mode), disable polling to avoid background load
            this.providers[networkKey] = new ethers.JsonRpcProvider(
              networkConfig.rpc,
              { chainId: networkConfig.chainId, name: networkKey },
              { staticNetwork: true, polling: false }
            );
            console.warn(`[FunS] ${networkKey}: Using primary RPC without connectivity test`);
          }
        } catch (error) {
          console.error(`Failed to create provider for ${networkKey}:`, error);
        }
      }

      // Set current network to default if not already set
      if (!this.currentNetwork || !this.providers[this.currentNetwork]) {
        this.currentNetwork = window.WalletConfig?.WALLET_CONFIG?.defaultNetwork || 'bsc';
      }

      // Emit networkChanged event on init
      this.dispatchEvent(new CustomEvent('networkChanged', {
        detail: { network: this.currentNetwork }
      }));

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
   * Wrap a promise with a timeout to prevent indefinite hangs
   * @private
   */
  _withTimeout(promise, timeoutMs = 10000, errorMsg = 'Operation timed out') {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs))
    ]);
  }

  /**
   * Rate-limited fetch for CoinGecko API calls with AbortController timeout
   * @private
   */
  async _rateLimitedFetch(url, timeoutMs = 10000) {
    const now = Date.now();
    const timeSinceLastCall = now - this._lastApiCall;
    if (timeSinceLastCall < this._apiMinInterval) {
      await new Promise(resolve => setTimeout(resolve, this._apiMinInterval - timeSinceLastCall));
    }
    this._lastApiCall = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        console.warn('[FunS] Rate-limited fetch failed:', response.status);
        return null;
      }
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Switch to a different network
   * @param {string} networkKey - Network identifier (e.g., 'bsc', 'ethereum')
   */
  async switchNetwork(networkKey) {
    // If provider doesn't exist yet (newly enabled network), create it
    if (!this.providers[networkKey]) {
      const networkConfig = window.WalletConfig.NETWORKS[networkKey];
      if (!networkConfig) {
        throw new Error(`Network ${networkKey} not configured`);
      }
      this.providers[networkKey] = new ethers.JsonRpcProvider(
        networkConfig.rpc,
        { chainId: networkConfig.chainId, name: networkKey },
        { staticNetwork: true, polling: false }
      );
    }

    this.currentNetwork = networkKey;

    // Invalidate price cache on network switch to prevent stale USD values
    this._priceCache = { data: null, timestamp: 0 };

    // Dispatch event
    this.dispatchEvent(new CustomEvent('networkChanged', {
      detail: { network: networkKey }
    }));

    // Refresh balances for new network — non-fatal: balance fetch failure
    // should not revert the network switch.
    if (window.walletCore?.address) {
      try {
        await this.fetchAllBalances(window.walletCore.address);
      } catch (balanceError) {
        console.warn(`Balance fetch failed after switching to ${networkKey}:`, balanceError);
      }
    }

    console.log(`Switched to network: ${networkKey}`);
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
   * Get current network information
   * @returns {Object} Network info with name, chainId, isTestnet, symbol, explorer
   */
  getNetworkInfo() {
    const networkConfig = window.WalletConfig.NETWORKS[this.currentNetwork];
    if (!networkConfig) {
      console.error('[FunS] Network config not found:', this.currentNetwork);
      return null;
    }
    return {
      key: this.currentNetwork,
      name: networkConfig?.name || 'Unknown',
      chainId: networkConfig?.chainId || 0,
      isTestnet: networkConfig?.isTestnet || false,
      symbol: networkConfig?.symbol || 'ETH',
      explorer: networkConfig?.explorer || '',
      faucet: networkConfig?.faucet || null
    };
  }

  /**
   * Check if currently connected to blockchain
   * @returns {Promise<boolean>}
   */
  async isConnected() {
    try {
      const provider = this.getProvider();
      await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current gas price with speed options
   * @returns {Promise<Object>} Gas prices for slow/standard/fast
   */
  async getGasPrice() {
    try {
      const provider = this.getProvider();
      const feeData = await this._withTimeout(provider.getFeeData(), 10000, 'getFeeData timed out');
      const baseGasPrice = feeData.gasPrice || ethers.parseUnits('5', 'gwei');

      return {
        slow: {
          gwei: ethers.formatUnits(baseGasPrice * 80n / 100n, 'gwei'),
          wei: (baseGasPrice * 80n / 100n).toString()
        },
        standard: {
          gwei: ethers.formatUnits(baseGasPrice, 'gwei'),
          wei: baseGasPrice.toString()
        },
        fast: {
          gwei: ethers.formatUnits(baseGasPrice * 120n / 100n, 'gwei'),
          wei: (baseGasPrice * 120n / 100n).toString()
        }
      };
    } catch (error) {
      console.error('Failed to get gas price:', error);
      return {
        slow: { gwei: '3', wei: ethers.parseUnits('3', 'gwei').toString() },
        standard: { gwei: '5', wei: ethers.parseUnits('5', 'gwei').toString() },
        fast: { gwei: '7', wei: ethers.parseUnits('7', 'gwei').toString() }
      };
    }
  }

  /**
   * Get balances for current wallet (wrapper around fetchAllBalances)
   * @returns {Promise<Object>} Balances object
   */
  async getBalances() {
    try {
      const addr = window.walletCore?.address;
      if (!addr) {
        throw new Error('No wallet address available');
      }
      return await this.fetchAllBalances(addr);
    } catch (error) {
      console.error('Failed to get balances:', error);
      throw error;
    }
  }

  /**
   * Get token price by symbol
   * @param {string} symbol - Token symbol (e.g., 'BNB', 'USDT')
   * @returns {Promise<Object>} Price object with usd and change24h
   */
  async getTokenPrice(symbol) {
    try {
      const prices = await this.fetchPrices();
      const networkConfig = window.WalletConfig.NETWORKS[this.currentNetwork];
      const networkTokens = window.WalletConfig.getAllTokens?.(this.currentNetwork) || window.WalletConfig.TOKENS[this.currentNetwork] || {};

      let coingeckoId = null;

      // Find coingeckoId for this symbol
      if (symbol === networkConfig.symbol) {
        coingeckoId = this._getNativeCoingeckoId(this.currentNetwork);
      } else {
        const token = networkTokens?.[symbol];
        coingeckoId = token?.coingeckoId;
      }

      if (!coingeckoId) {
        console.warn('[FunS] CoinGecko ID not found for:', symbol);
        throw new Error(`CoinGecko ID not found for token ${symbol}`);
      }

      return prices[coingeckoId] || { usd: 0, change24h: 0 };
    } catch (error) {
      console.error(`Failed to get price for ${symbol}:`, error);
      return { usd: 0, change24h: 0 };
    }
  }

  /**
   * Get swap quote (DEX swap estimation)
   * @param {string} fromToken - Source token symbol
   * @param {string} toToken - Destination token symbol
   * @param {string} amount - Amount to swap
   * @returns {Promise<Object>} Swap quote with estimated output
   */
  async getSwapQuote(fromToken, toToken, amount) {
    try {
      const networkConfig = window.WalletConfig.NETWORKS[this.currentNetwork];
      if (!networkConfig) {
        throw new Error(`Network config not found for ${this.currentNetwork}`);
      }

      const networkTokens = window.WalletConfig.getAllTokens?.(this.currentNetwork) || window.WalletConfig.TOKENS[this.currentNetwork] || {};
      const fromTokenConfig = fromToken === networkConfig.symbol ? networkConfig : networkTokens[fromToken];
      const toTokenConfig = toToken === networkConfig.symbol ? networkConfig : networkTokens[toToken];

      if (!fromTokenConfig || !toTokenConfig) {
        throw new Error('Token configuration not found');
      }

      // Get DEX router based on network
      const routerConfig = this.currentNetwork === 'bsc'
        ? window.WalletConfig.DEX_ROUTERS.pancakeswap
        : window.WalletConfig.DEX_ROUTERS.uniswap;

      if (!routerConfig) {
        throw new Error(`No DEX router configured for ${this.currentNetwork}`);
      }

      const provider = this.getProvider();
      const router = new ethers.Contract(
        routerConfig.address,
        window.WalletConfig.ROUTER_ABI,
        provider
      );

      // Build path
      const path = [fromTokenConfig.address, toTokenConfig.address];
      const decimals = fromTokenConfig.decimals || 18;
      const amountIn = ethers.parseUnits(amount, decimals);

      // Get amounts out
      const amounts = await this._withTimeout(router.getAmountsOut(amountIn, path), 10000, 'getAmountsOut timed out');
      const outputDecimals = toTokenConfig.decimals || 18;
      const outputAmount = ethers.formatUnits(amounts[amounts.length - 1], outputDecimals);

      // Price impact based on liquidity depth estimation
      // For small trades (<1% of pool), impact is minimal
      // This is a conservative estimate
      const priceImpact = Math.min(parseFloat(amount) * 0.003, 5).toFixed(2); // 0.3% per unit, max 5%

      return {
        fromToken,
        toToken,
        inputAmount: amount,
        outputAmount: outputAmount,
        priceImpact: parseFloat(priceImpact)
      };
    } catch (error) {
      console.error('Failed to get swap quote:', error);
      throw error;
    }
  }

  /**
   * Check token allowance for spending
   * @param {string} tokenSymbol - Token symbol
   * @param {string} spenderAddress - Address that will spend tokens
   * @param {string} ownerAddress - Address that owns tokens (optional, uses wallet address)
   * @returns {Promise<string>} Allowance amount
   */
  async checkAllowance(tokenSymbol, spenderAddress, ownerAddress = null) {
    try {
      const owner = ownerAddress || window.walletCore?.address;
      if (!owner) {
        throw new Error('No wallet address available');
      }

      if (!ethers.isAddress(spenderAddress)) {
        throw new Error('Invalid spender address');
      }

      const networkConfig = window.WalletConfig.NETWORKS[this.currentNetwork];
      const networkTokens = window.WalletConfig.getAllTokens?.(this.currentNetwork) || window.WalletConfig.TOKENS[this.currentNetwork] || {};
      const tokenConfig = networkTokens[tokenSymbol];

      if (!tokenConfig || !tokenConfig.address) {
        throw new Error(`Token ${tokenSymbol} not configured`);
      }

      const provider = this.getProvider();
      const contract = new ethers.Contract(
        tokenConfig.address,
        this._getERC20ABI(),
        provider
      );

      const allowance = await this._withTimeout(contract.allowance(owner, spenderAddress), 10000, 'allowance check timed out');
      const decimals = tokenConfig.decimals || 18;
      return ethers.formatUnits(allowance, decimals);
    } catch (error) {
      console.error('Failed to check allowance:', error);
      throw error;
    }
  }

  /**
   * Get explorer URL for a transaction
   * @param {string} txHash - Transaction hash
   * @param {string} networkKey - Network identifier (optional, uses current network)
   * @returns {string} Full explorer URL
   */
  getExplorerUrl(txHash, networkKey = null) {
    const key = networkKey || this.currentNetwork;
    const networkConfig = window.WalletConfig.NETWORKS[key];

    if (!networkConfig || !networkConfig.explorer) {
      return '';
    }

    return `${networkConfig.explorer}/tx/${txHash}`;
  }

  /**
   * Fetch all balances for an address on current network
   * @param {string} address - Wallet address
   * @returns {Promise<Object>} Formatted balances object with tokens array and totalUSD
   */
  async fetchAllBalances(address) {
    // Concurrency guard: skip if a fetch is already in progress
    if (this._isFetchingBalances) {
      return this.balances ? {
        tokens: Object.entries(this.balances).map(([symbol, d]) => ({
          symbol, name: d.name, balance: d.balance,
          balanceUSD: `$${d.usdValue || 0}`, change: '0.0%',
          icon: d.icon, native: false, decimals: d.decimals, address: d.address
        })),
        totalUSD: 0
      } : null;
    }
    this._isFetchingBalances = true;
    try {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid address format');
      }

      const provider = this.getProvider();
      const networkConfig = window.WalletConfig.NETWORKS[this.currentNetwork];

      if (!networkConfig) {
        throw new Error(`Network config not found for ${this.currentNetwork}`);
      }

      const balancesMap = {};
      const tokens = [];
      let totalUSD = 0;

      // Fetch native token balance
      const nativeBalance = await this._withTimeout(provider.getBalance(address), 10000, 'getBalance timed out');
      const nativeFormatted = ethers.formatUnits(nativeBalance, 18);
      const nativeSymbol = networkConfig.symbol || 'BNB';
      balancesMap[nativeSymbol] = {
        balance: nativeFormatted,
        decimals: 18,
        address: null,
        usdValue: 0,
        change24h: 0,
        name: networkConfig.name || nativeSymbol,
        icon: networkConfig.icon || `./icons/${nativeSymbol.toLowerCase()}.svg`
      };

      // Fetch ERC-20 token balances in parallel (not sequentially)
      const networkTokens = window.WalletConfig.getAllTokens?.(this.currentNetwork) || window.WalletConfig.TOKENS[this.currentNetwork] || {};
      if (networkTokens) {
        const tokenEntries = Object.entries(networkTokens).filter(([, tokenConfig]) =>
          !tokenConfig.native &&
          tokenConfig.address &&
          tokenConfig.address !== '0x0000000000000000000000000000000000000000'
        );

        const tokenResults = await Promise.allSettled(
          tokenEntries.map(([symbol, tokenConfig]) =>
            this.getTokenBalance(address, tokenConfig, this.currentNetwork)
              .then(balance => ({ symbol, tokenConfig, balance }))
          )
        );

        for (const result of tokenResults) {
          if (result.status === 'fulfilled') {
            const { symbol, tokenConfig, balance } = result.value;
            balancesMap[symbol] = {
              balance: balance,
              decimals: tokenConfig.decimals,
              address: tokenConfig.address,
              usdValue: 0,
              change24h: 0,
              isCustom: tokenConfig.isCustom || false,
              name: tokenConfig.name || symbol,
              icon: tokenConfig.icon || `./icons/${symbol.toLowerCase()}.svg`
            };
          } else {
            console.warn(`Failed to fetch balance for token:`, result.reason);
          }
        }
      }

      // Fetch USD prices and enrich balances
      await this._enrichBalancesWithPrices(balancesMap, networkConfig);

      // Convert to array format and calculate total
      for (const [symbol, balanceData] of Object.entries(balancesMap)) {
        const change24h = balanceData.change24h || 0;
        const changeStr = change24h > 0 ? `+${change24h.toFixed(1)}%` : `${change24h.toFixed(1)}%`;
        const usdValue = balanceData?.usdValue != null ? parseFloat(balanceData.usdValue) : 0;

        tokens.push({
          symbol: symbol,
          name: balanceData.name,
          balance: balanceData.balance,
          balanceUSD: `$${balanceData.usdValue}`,
          change: changeStr,
          icon: balanceData.icon,
          native: symbol === nativeSymbol,
          decimals: balanceData.decimals,
          address: balanceData.address
        });

        totalUSD += usdValue;
      }

      const result = {
        tokens: tokens,
        totalUSD: parseFloat(totalUSD.toFixed(2))
      };

      // Store balances (both formats for backward compatibility)
      this.balances = balancesMap;

      // Dispatch event
      this.dispatchEvent(new CustomEvent('balancesUpdated', {
        detail: { balances: result }
      }));

      return result;
    } catch (error) {
      console.error('Failed to fetch balances:', error);
      throw error;
    } finally {
      this._isFetchingBalances = false;
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
      const balance = await this._withTimeout(provider.getBalance(address), 10000, 'getBalance timed out');
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

      const balance = await this._withTimeout(contract.balanceOf(address), 10000, 'balanceOf timed out');
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

      const response = await this._rateLimitedFetch(url);
      if (!response || !response.ok) {
        throw new Error(`CoinGecko API error: ${response?.status || 'no response'}`);
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

      const response = await this._rateLimitedFetch(url);
      if (!response || !response.ok) {
        throw new Error(`CoinGecko API error: ${response?.status || 'no response'}`);
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
      const gasLimit = await this._withTimeout(provider.estimateGas(txParams), 10000, 'estimateGas timed out');

      // Get fee data
      const feeData = await this._withTimeout(provider.getFeeData(), 10000, 'getFeeData timed out');
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
   * Works even without API keys by gracefully falling back
   * @param {string} address - Wallet address
   * @param {string} networkKey - Network identifier (optional)
   * @returns {Promise<Array>} Array of transaction objects (empty array if API not available)
   */
  async getTransactionHistory(address, networkKey = null) {
    try {
      if (!ethers.isAddress(address)) {
        console.warn('Invalid address format for transaction history');
        return [];
      }

      const key = networkKey || this.currentNetwork;
      const networkConfig = window.WalletConfig.NETWORKS[key];

      if (!networkConfig || !networkConfig.explorerApi) {
        console.warn(`Explorer API not configured for ${key}, returning empty transaction history`);
        return [];
      }

      // Check transaction history cache
      const cacheKey = `${address}_${key}`;
      const cached = this._txHistoryCache[cacheKey];
      if (cached && Date.now() - cached.timestamp < this._txHistoryCacheTTL) {
        return cached.data;
      }

      const transactions = [];

      // Get the appropriate API key (optional)
      const apiKeyMap = { bsc: window.WalletConfig.API_KEYS?.bscscan, ethereum: window.WalletConfig.API_KEYS?.etherscan };
      const apiKey = apiKeyMap[key] || '';

      try {
        // Fetch normal transactions
        const normalTxUrl = `${networkConfig.explorerApi}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
        const normalTxController = new AbortController();
        const normalTxTimeout = setTimeout(() => normalTxController.abort(), 10000);
        let normalTxResponse;
        try {
          normalTxResponse = await fetch(normalTxUrl, { signal: normalTxController.signal });
        } finally {
          clearTimeout(normalTxTimeout);
        }
        const normalTxData = await normalTxResponse.json();

        if (normalTxData.result && Array.isArray(normalTxData.result)) {
          for (const tx of normalTxData.result) {
            transactions.push(this._formatTransaction(tx, address));
          }
        }
      } catch (error) {
        console.warn('Failed to fetch normal transactions:', error);
        // Continue with token transfers even if normal transactions fail
      }

      try {
        // Fetch ERC-20 transfers
        const tokenTxUrl = `${networkConfig.explorerApi}?module=account&action=tokentx&address=${address}&sort=desc&apikey=${apiKey}`;
        const tokenTxController = new AbortController();
        const tokenTxTimeout = setTimeout(() => tokenTxController.abort(), 10000);
        let tokenTxResponse;
        try {
          tokenTxResponse = await fetch(tokenTxUrl, { signal: tokenTxController.signal });
        } finally {
          clearTimeout(tokenTxTimeout);
        }
        const tokenTxData = await tokenTxResponse.json();

        if (tokenTxData.result && Array.isArray(tokenTxData.result)) {
          for (const tx of tokenTxData.result) {
            transactions.push(this._formatTransaction(tx, address, true));
          }
        }
      } catch (error) {
        console.warn('Failed to fetch token transfers:', error);
        // Continue with what we have
      }

      // Sort by timestamp (newest first)
      transactions.sort((a, b) => b.timestamp - a.timestamp);

      // Cache the results
      this._txHistoryCache[cacheKey] = { data: transactions, timestamp: Date.now() };

      return transactions;
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
      // Return empty array instead of throwing
      return [];
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
    for (const key of Object.keys(this.providers)) {
      try { this.providers[key].destroy(); } catch (_) {}
    }
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
        { chainId: networkConfig.chainId, name: networkKey },
        { staticNetwork: true, polling: false }
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
      try { this.providers[networkKey].destroy(); } catch (_) {}
      delete this.providers[networkKey];
    }
  }

  /**
   * PRIVATE METHODS
   */

  /**
   * Start auto-refresh timer
   * Only refreshes when wallet is unlocked (has address)
   * @private
   */
  _startAutoRefresh(interval = 30000) {
    this.stopRefresh();

    this.refreshTimer = setInterval(async () => {
      try {
        // Check if wallet is unlocked (has an address)
        const addr = window.walletCore?.address;
        const isWalletUnlocked = window.walletCore?.isUnlocked?.() || !!addr;

        if (addr && isWalletUnlocked) {
          // fetchAllBalances already calls _enrichBalancesWithPrices → fetchPrices internally.
          // Do not call fetchPrices() again here — that doubles the CoinGecko API traffic.
          await this.fetchAllBalances(addr);
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
      'bscTestnet': 'binancecoin',
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
