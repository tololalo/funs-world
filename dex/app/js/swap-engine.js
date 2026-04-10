/**
 * SwapEngine - DEX Aggregator for FunSwap
 * Uses 1inch API with fallback to PancakeSwap Router V2 on BSC (chainId 56)
 * Depends on: ethers.js v6, window.WalletConfig
 *
 * Usage:
 *   SwapEngine.setApiKey('your-1inch-api-key');
 *   const engine = new SwapEngine();
 *   const quote = await engine.getQuote(fromToken, toToken, amount);
 *   const txData = await engine.getSwapTransaction(fromToken, toToken, amount, walletAddress);
 */

class SwapEngine extends EventTarget {
  constructor() {
    super();

    // Network configuration
    this.chainId = 56; // BSC (BNB Smart Chain)
    this.chainIdHex = '0x38'; // Hex representation of 56

    // 1inch API configuration
    this.apiBase = 'https://api.1inch.dev';
    this.apiVersion = 'v6.0';
    this.apiKey = ''; // User sets via SwapEngine.setApiKey()

    // Referrer configuration (FunS fee address)
    this.referrerAddress = ''; // Optional: set via setReferrer()
    this.referrerFee = 0; // 0-3% fee

    // Cache for token data
    this._tokenCache = {};
    this._supportedTokensCache = null;
    this._cacheExpiry = 3600000; // 1 hour
    this._lastCacheTime = 0;

    // PancakeSwap Router V2 configuration
    this.PANCAKESWAP_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
    this.PANCAKESWAP_FACTORY = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';

    // Native and wrapped token addresses on BSC
    this.NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    this.WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

    // Common token addresses on BSC
    this.TOKENS = {
      BNB: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      USDT: '0x55d398326f99059fF775485246999027B3197955',
      USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
      CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
      FUNS: '0x0000000000000000000000000000000000000000', // Placeholder
    };

    // Minimal ERC20 ABI for token operations
    this.ERC20_ABI = [
      // approve
      {
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function'
      },
      // allowance
      {
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' }
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
      },
      // balanceOf
      {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
      },
      // decimals
      {
        name: 'decimals',
        outputs: [{ name: '', type: 'uint8' }],
        stateMutability: 'view',
        type: 'function'
      },
      // name
      {
        name: 'name',
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function'
      },
      // symbol
      {
        name: 'symbol',
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function'
      }
    ];

    // PancakeSwap Router V2 ABI (minimal)
    this.ROUTER_V2_ABI = [
      {
        inputs: [
          { name: 'amountIn', type: 'uint256' },
          { name: 'path', type: 'address[]' }
        ],
        name: 'getAmountsOut',
        outputs: [{ name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function'
      },
      {
        inputs: [
          { name: 'amountOut', type: 'uint256' },
          { name: 'path', type: 'address[]' }
        ],
        name: 'getAmountsIn',
        outputs: [{ name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function'
      }
    ];

    this._provider = null;
    this._initProvider();
  }

  /**
   * Initialize ethers.js provider for BSC
   * @private
   */
  _initProvider() {
    try {
      if (typeof ethers === 'undefined') {
        console.warn('ethers.js not loaded. Provider initialization deferred.');
        return;
      }
      this._provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org', {
        chainId: this.chainId,
        name: 'bsc'
      });
    } catch (error) {
      console.error('Failed to initialize provider:', error);
    }
  }

  /**
   * Set 1inch API key (static method)
   * @param {string} key - API key from 1inch
   */
  static setApiKey(key) {
    SwapEngine.prototype._staticApiKey = key;
  }

  /**
   * Get the current API key (instance method with static fallback)
   * @private
   * @returns {string} API key
   */
  _getApiKey() {
    return this.apiKey || SwapEngine.prototype._staticApiKey || '';
  }

  /**
   * Set referrer address for FunS fee
   * @param {string} address - Ethereum address to receive referrer fees
   * @param {number} fee - Fee percentage (0-3)
   */
  setReferrer(address, fee = 0) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Invalid Ethereum address');
    }
    if (fee < 0 || fee > 3) {
      throw new Error('Fee must be between 0 and 3%');
    }
    this.referrerAddress = address;
    this.referrerFee = fee;
  }

  /**
   * Get swap quote from 1inch API
   * Returns estimated output amount, gas, protocols used, and price impact
   *
   * @param {string} fromToken - Source token address (use NATIVE_TOKEN for BNB)
   * @param {string} toToken - Destination token address
   * @param {string|BigInt} amount - Amount in wei (smallest unit)
   * @param {number} slippage - Slippage tolerance in percentage (default: 1)
   * @returns {Promise<Object>} Quote data: { toAmount, estimatedGas, protocols, priceImpact, fromToken, toToken, fromAmount }
   */
  async getQuote(fromToken, toToken, amount, slippage = 1) {
    try {
      // Normalize input
      const fromAddr = this._normalizeToken(fromToken);
      const toAddr = this._normalizeToken(toToken);
      const amountWei = BigInt(amount).toString();

      // Try 1inch first
      try {
        const quote = await this._get1inchQuote(fromAddr, toAddr, amountWei, slippage);
        this.dispatchEvent(new CustomEvent('quoteReceived', {
          detail: { source: '1inch', quote }
        }));
        return quote;
      } catch (error1inch) {
        console.warn('1inch quote failed, falling back to PancakeSwap:', error1inch.message);

        // Fallback to PancakeSwap
        const quote = await this._getPancakeSwapQuote(fromAddr, toAddr, amountWei, slippage);
        this.dispatchEvent(new CustomEvent('quoteReceived', {
          detail: { source: 'pancakeswap', quote }
        }));
        return quote;
      }
    } catch (error) {
      console.error('Failed to get quote:', error);
      this.dispatchEvent(new CustomEvent('quoteFailed', {
        detail: { error: error.message }
      }));
      throw error;
    }
  }

  /**
   * Get quote from 1inch API
   * @private
   */
  async _get1inchQuote(fromToken, toToken, amount, slippage) {
    const apiKey = this._getApiKey();
    const endpoint = `${this.apiBase}/swap/${this.apiVersion}/${this.chainId}/quote`;

    const params = new URLSearchParams({
      src: fromToken,
      dst: toToken,
      amount: amount,
      ...(this.referrerAddress && this.referrerFee > 0 && {
        fee: (this.referrerFee * 100).toString(), // 1inch expects fee in 0.01% units
        referrer: this.referrerAddress
      })
    });

    const headers = {
      'Accept': 'application/json',
      ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
    };

    const response = await fetch(`${endpoint}?${params}`, { headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`1inch API error: ${response.status} - ${error.description || error.message || 'Unknown error'}`);
    }

    const data = await response.json();

    // Normalize 1inch response
    return {
      fromAmount: BigInt(data.fromTokenAmount || amount),
      toAmount: BigInt(data.toTokenAmount || '0'),
      fromToken: fromToken,
      toToken: toToken,
      estimatedGas: data.estimatedGas ? parseInt(data.estimatedGas) : 150000,
      protocols: data.protocols || [],
      priceImpact: data.priceImpact ? parseFloat(data.priceImpact) : 0,
      source: '1inch'
    };
  }

  /**
   * Get swap transaction from 1inch API
   * Returns transaction data ready for wallet to sign
   *
   * @param {string} fromToken - Source token address
   * @param {string} toToken - Destination token address
   * @param {string|BigInt} amount - Amount in wei
   * @param {string} fromAddress - Wallet address executing the swap
   * @param {number} slippage - Slippage tolerance in percentage
   * @returns {Promise<Object>} Transaction data: { to, data, value, gas, gasPrice }
   */
  async getSwapTransaction(fromToken, toToken, amount, fromAddress, slippage = 1) {
    try {
      if (!/^0x[a-fA-F0-9]{40}$/.test(fromAddress)) {
        throw new Error('Invalid wallet address');
      }

      const fromAddr = this._normalizeToken(fromToken);
      const toAddr = this._normalizeToken(toToken);
      const amountWei = BigInt(amount).toString();

      // Try 1inch first
      try {
        const tx = await this._get1inchSwapTransaction(fromAddr, toAddr, amountWei, fromAddress, slippage);
        this.dispatchEvent(new CustomEvent('swapTransactionReady', {
          detail: { source: '1inch', tx }
        }));
        return tx;
      } catch (error1inch) {
        console.warn('1inch swap failed, falling back to PancakeSwap:', error1inch.message);

        // Fallback to PancakeSwap
        const tx = await this._getPancakeSwapSwapTransaction(fromAddr, toAddr, amountWei, fromAddress, slippage);
        this.dispatchEvent(new CustomEvent('swapTransactionReady', {
          detail: { source: 'pancakeswap', tx }
        }));
        return tx;
      }
    } catch (error) {
      console.error('Failed to build swap transaction:', error);
      this.dispatchEvent(new CustomEvent('swapTransactionFailed', {
        detail: { error: error.message }
      }));
      throw error;
    }
  }

  /**
   * Get swap transaction from 1inch API
   * @private
   */
  async _get1inchSwapTransaction(fromToken, toToken, amount, fromAddress, slippage) {
    const apiKey = this._getApiKey();
    const endpoint = `${this.apiBase}/swap/${this.apiVersion}/${this.chainId}/swap`;

    const slippageBps = Math.round(slippage * 100); // Convert percentage to basis points

    const params = new URLSearchParams({
      src: fromToken,
      dst: toToken,
      amount: amount,
      from: fromAddress,
      slippage: slippageBps,
      ...(this.referrerAddress && this.referrerFee > 0 && {
        fee: (this.referrerFee * 100).toString(),
        referrer: this.referrerAddress
      }),
      disableEstimate: 'false',
      allowPartialFill: 'false'
    });

    const headers = {
      'Accept': 'application/json',
      ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
    };

    const response = await fetch(`${endpoint}?${params}`, { headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`1inch swap API error: ${response.status} - ${error.description || error.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const txData = data.tx || {};

    return {
      to: txData.to,
      data: txData.data,
      value: txData.value || '0',
      gas: txData.gas ? parseInt(txData.gas) : 500000,
      gasPrice: txData.gasPrice || '0',
      from: fromAddress,
      source: '1inch'
    };
  }

  /**
   * Get token allowance for spender
   * @param {string} tokenAddress - Token contract address
   * @param {string} walletAddress - Owner wallet address
   * @param {string} spenderAddress - Spender address (optional, defaults to 1inch Router)
   * @returns {Promise<BigInt>} Allowance amount in wei
   */
  async getAllowance(tokenAddress, walletAddress, spenderAddress = null) {
    try {
      if (!this._provider) this._initProvider();
      if (!this._provider) throw new Error('Provider not initialized');

      const spender = spenderAddress || this._get1inchRouterAddress();
      const contract = new ethers.Contract(tokenAddress, this.ERC20_ABI, this._provider);

      const allowance = await contract.allowance(walletAddress, spender);
      return BigInt(allowance);
    } catch (error) {
      console.error('Failed to get allowance:', error);
      throw error;
    }
  }

  /**
   * Build approval transaction for token spending
   * @param {string} tokenAddress - Token contract address
   * @param {string|BigInt} amount - Amount to approve (use MAX_INT for unlimited)
   * @param {string} spenderAddress - Spender address (optional, defaults to 1inch Router)
   * @returns {Promise<Object>} Approval transaction data: { to, data, from }
   */
  async getApprovalTransaction(tokenAddress, amount, spenderAddress = null) {
    try {
      if (!this._provider) this._initProvider();
      if (!this._provider) throw new Error('Provider not initialized');

      const spender = spenderAddress || this._get1inchRouterAddress();
      const contract = new ethers.Contract(tokenAddress, this.ERC20_ABI, this._provider);

      // Encode the approve function call
      const amountWei = amount === 'MAX_INT' ? ethers.MaxUint256 : BigInt(amount);
      const encodedData = contract.interface.encodeFunctionData('approve', [spender, amountWei]);

      return {
        to: tokenAddress,
        data: encodedData,
        value: '0',
        source: 'approval'
      };
    } catch (error) {
      console.error('Failed to build approval transaction:', error);
      throw error;
    }
  }

  /**
   * Get token information (symbol, name, decimals, etc.)
   * @param {string} tokenAddress - Token contract address
   * @returns {Promise<Object>} Token info: { address, symbol, name, decimals, logoURI }
   */
  async getTokenInfo(tokenAddress) {
    try {
      // Check cache first
      if (this._tokenCache[tokenAddress]) {
        const cached = this._tokenCache[tokenAddress];
        if (Date.now() - cached.timestamp < this._cacheExpiry) {
          return cached.data;
        }
      }

      // Try 1inch token metadata API
      try {
        const apiKey = this._getApiKey();
        const endpoint = `${this.apiBase}/token/${this.chainId}/${tokenAddress}`;
        const headers = {
          'Accept': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        };

        const response = await fetch(endpoint, { headers });
        if (response.ok) {
          const data = await response.json();
          const tokenInfo = {
            address: tokenAddress,
            symbol: data.symbol || 'UNKNOWN',
            name: data.name || 'Unknown Token',
            decimals: data.decimals || 18,
            logoURI: data.logoURI || null
          };

          // Cache it
          this._tokenCache[tokenAddress] = {
            data: tokenInfo,
            timestamp: Date.now()
          };

          return tokenInfo;
        }
      } catch (error1inch) {
        console.warn('1inch token metadata failed:', error1inch.message);
      }

      // Fallback: Query blockchain
      if (!this._provider) this._initProvider();
      if (!this._provider) throw new Error('Provider not initialized');

      const contract = new ethers.Contract(tokenAddress, this.ERC20_ABI, this._provider);
      const [symbol, name, decimals] = await Promise.all([
        contract.symbol().catch(() => 'UNKNOWN'),
        contract.name().catch(() => 'Unknown Token'),
        contract.decimals().catch(() => 18)
      ]);

      const tokenInfo = {
        address: tokenAddress,
        symbol,
        name,
        decimals,
        logoURI: null
      };

      // Cache it
      this._tokenCache[tokenAddress] = {
        data: tokenInfo,
        timestamp: Date.now()
      };

      return tokenInfo;
    } catch (error) {
      console.error('Failed to get token info for', tokenAddress, ':', error);
      // Return minimal fallback
      return {
        address: tokenAddress,
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 18,
        logoURI: null
      };
    }
  }

  /**
   * Get all supported tokens on BSC from 1inch
   * @returns {Promise<Array>} Array of supported token objects
   */
  async getSupportedTokens() {
    try {
      // Check cache
      if (this._supportedTokensCache && Date.now() - this._lastCacheTime < this._cacheExpiry) {
        return this._supportedTokensCache;
      }

      const apiKey = this._getApiKey();
      const endpoint = `${this.apiBase}/token/${this.chainId}`;
      const headers = {
        'Accept': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      };

      const response = await fetch(endpoint, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch supported tokens: ${response.status}`);
      }

      const data = await response.json();
      const tokens = data.tokens || [];

      // Cache the result
      this._supportedTokensCache = tokens;
      this._lastCacheTime = Date.now();

      return tokens;
    } catch (error) {
      console.error('Failed to get supported tokens:', error);
      // Return common tokens as fallback
      return Object.values(this.TOKENS).map((addr, index) => ({
        address: addr,
        symbol: Object.keys(this.TOKENS)[index],
        name: Object.keys(this.TOKENS)[index]
      }));
    }
  }

  /**
   * Helper: Format amount with decimals
   * Converts wei (as string or BigInt) to human-readable format
   *
   * @param {string|BigInt|number} amount - Amount in wei
   * @param {number} decimals - Token decimals
   * @param {number} displayDecimals - How many decimals to display (default: 4)
   * @returns {string} Formatted amount
   */
  formatAmount(amount, decimals = 18, displayDecimals = 4) {
    try {
      const amountBigInt = BigInt(amount);
      const divisor = BigInt(10) ** BigInt(decimals);
      const whole = amountBigInt / divisor;
      const remainder = amountBigInt % divisor;

      const wholeStr = whole.toString();
      let remainderStr = remainder.toString().padStart(decimals, '0');
      remainderStr = remainderStr.substring(0, displayDecimals);

      if (displayDecimals === 0 || remainder === BigInt(0)) {
        return wholeStr;
      }

      return `${wholeStr}.${remainderStr}`;
    } catch (error) {
      console.error('Format amount error:', error);
      return '0';
    }
  }

  /**
   * Helper: Parse amount with decimals
   * Converts human-readable format to wei (as string)
   *
   * @param {string|number} amount - Amount in human-readable format
   * @param {number} decimals - Token decimals
   * @returns {string} Amount in wei as string
   */
  parseAmount(amount, decimals = 18) {
    try {
      const amountStr = amount.toString();
      const [whole, fraction] = amountStr.split('.');

      const wholePart = whole || '0';
      const fractionPart = (fraction || '').padEnd(decimals, '0').substring(0, decimals);

      const result = BigInt(wholePart) * BigInt(10) ** BigInt(decimals) + BigInt(fractionPart || '0');
      return result.toString();
    } catch (error) {
      console.error('Parse amount error:', error);
      return '0';
    }
  }

  /**
   * PancakeSwap Router V2 fallback: Get quote
   * @private
   */
  async _getPancakeSwapQuote(fromToken, toToken, amount, slippage) {
    try {
      if (!this._provider) this._initProvider();
      if (!this._provider) throw new Error('Provider not initialized');

      // Normalize to WBNB if native
      const from = fromToken === this.NATIVE_TOKEN ? this.WBNB : fromToken;
      const to = toToken === this.NATIVE_TOKEN ? this.WBNB : toToken;

      const router = new ethers.Contract(
        this.PANCAKESWAP_ROUTER,
        this.ROUTER_V2_ABI,
        this._provider
      );

      // Get amounts out
      const amountIn = BigInt(amount);
      const path = from.toLowerCase() === to.toLowerCase() ? [from] : [from, to];

      const amounts = await router.getAmountsOut(amountIn, path);
      const toAmountBigInt = BigInt(amounts[amounts.length - 1]);

      return {
        fromAmount: amountIn,
        toAmount: toAmountBigInt,
        fromToken: fromToken,
        toToken: toToken,
        estimatedGas: 150000,
        protocols: [{ name: 'PancakeSwap V2' }],
        priceImpact: 0,
        source: 'pancakeswap'
      };
    } catch (error) {
      console.error('PancakeSwap quote failed:', error);
      throw new Error(`PancakeSwap fallback failed: ${error.message}`);
    }
  }

  /**
   * PancakeSwap Router V2 fallback: Build swap transaction
   * @private
   */
  async _getPancakeSwapSwapTransaction(fromToken, toToken, amount, fromAddress, slippage) {
    try {
      if (!this._provider) this._initProvider();
      if (!this._provider) throw new Error('Provider not initialized');

      // Normalize to WBNB if native
      const from = fromToken === this.NATIVE_TOKEN ? this.WBNB : fromToken;
      const to = toToken === this.NATIVE_TOKEN ? this.WBNB : toToken;

      const amountIn = BigInt(amount);
      const path = from.toLowerCase() === to.toLowerCase() ? [from] : [from, to];

      // Get minimum output with slippage
      const router = new ethers.Contract(
        this.PANCAKESWAP_ROUTER,
        this.ROUTER_V2_ABI,
        this._provider
      );

      const amounts = await router.getAmountsOut(amountIn, path);
      const expectedOut = BigInt(amounts[amounts.length - 1]);
      const slippageBps = BigInt(Math.round(slippage * 100)); // basis points (100 = 1%)
      const minOut = (expectedOut * (BigInt(10000) - slippageBps)) / BigInt(10000);

      // Build swap transaction data
      // Note: This is a simplified version. In production, you might use:
      // - swapExactTokensForTokens for token-to-token
      // - swapExactETHForTokens for native-to-token
      // - swapExactTokensForETH for token-to-native

      const iface = new ethers.Interface(this.ROUTER_V2_ABI);
      const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes

      let txData;
      if (fromToken === this.NATIVE_TOKEN && toToken !== this.NATIVE_TOKEN) {
        // BNB -> Token: swapExactETHForTokens
        const routerAbiWithSwaps = [
          {
            inputs: [
              { name: 'amountOutMin', type: 'uint256' },
              { name: 'path', type: 'address[]' },
              { name: 'to', type: 'address' },
              { name: 'deadline', type: 'uint256' }
            ],
            name: 'swapExactETHForTokens',
            outputs: [{ name: 'amounts', type: 'uint256[]' }],
            stateMutability: 'payable',
            type: 'function'
          }
        ];
        const routerIface = new ethers.Interface(routerAbiWithSwaps);
        txData = routerIface.encodeFunctionData('swapExactETHForTokens', [
          minOut.toString(),
          path,
          fromAddress,
          deadline
        ]);
      } else if (fromToken !== this.NATIVE_TOKEN && toToken === this.NATIVE_TOKEN) {
        // Token -> BNB: swapExactTokensForETH
        const routerAbiWithSwaps = [
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
            stateMutability: 'nonpayable',
            type: 'function'
          }
        ];
        const routerIface = new ethers.Interface(routerAbiWithSwaps);
        txData = routerIface.encodeFunctionData('swapExactTokensForETH', [
          amountIn.toString(),
          minOut.toString(),
          path,
          fromAddress,
          deadline
        ]);
      } else {
        // Token -> Token: swapExactTokensForTokens
        const routerAbiWithSwaps = [
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
            stateMutability: 'nonpayable',
            type: 'function'
          }
        ];
        const routerIface = new ethers.Interface(routerAbiWithSwaps);
        txData = routerIface.encodeFunctionData('swapExactTokensForTokens', [
          amountIn.toString(),
          minOut.toString(),
          path,
          fromAddress,
          deadline
        ]);
      }

      return {
        to: this.PANCAKESWAP_ROUTER,
        data: txData,
        value: fromToken === this.NATIVE_TOKEN ? amountIn.toString() : '0',
        gas: 300000,
        gasPrice: '0',
        from: fromAddress,
        source: 'pancakeswap'
      };
    } catch (error) {
      console.error('PancakeSwap swap transaction failed:', error);
      throw new Error(`PancakeSwap swap failed: ${error.message}`);
    }
  }

  /**
   * Get 1inch Router address for the current chain
   * @private
   */
  _get1inchRouterAddress() {
    // 1inch Router V6 address varies by chain
    // For BSC (chainId 56), the router is at a specific address
    // This is a fallback; the actual address should be fetched from 1inch API
    const routers = {
      56: '0x1111111254fb6c44bac0bed2854e76f90643097d', // BSC 1inch Router V6
    };
    return routers[this.chainId] || this.PANCAKESWAP_ROUTER;
  }

  /**
   * Normalize token address
   * Handles both token symbols and addresses
   * @private
   */
  _normalizeToken(token) {
    // If it's a known symbol, get the address
    if (this.TOKENS[token]) {
      return this.TOKENS[token];
    }
    // Otherwise assume it's an address
    if (typeof token === 'string' && token.startsWith('0x')) {
      return token.toLowerCase();
    }
    throw new Error(`Invalid token: ${token}`);
  }

  /**
   * Clear cache (useful for testing or force refresh)
   */
  clearCache() {
    this._tokenCache = {};
    this._supportedTokensCache = null;
    this._lastCacheTime = 0;
  }
}

// Expose to window
if (typeof window !== 'undefined') {
  window.SwapEngine = SwapEngine;
}

// Export for Node.js/module environments if applicable
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SwapEngine;
}
