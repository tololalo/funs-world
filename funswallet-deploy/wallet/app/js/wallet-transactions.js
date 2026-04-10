/**
 * WalletTransactions Module
 * Handles all transaction logic for Web3 crypto wallet
 * Dependencies: ethers.js v6, window.WalletConfig, window.WalletCore, window.WalletBlockchain
 */

class WalletTransactions {
  constructor() {
    this.transactionCache = new Map();
    this.gasEstimates = new Map();
  }

  /**
   * Send native tokens (ETH, BNB, etc.)
   * @param {string} to - Recipient address
   * @param {string} amount - Amount to send
   * @param {string} networkKey - Network identifier
   * @returns {Promise<Object>} Transaction result { hash, status, gasUsed }
   */
  async sendNativeToken(to, amount, networkKey) {
    try {
      // Validate WalletCore is unlocked
      if (!window.walletCore || window.walletCore.isLocked) {
        throw new Error('Wallet is locked. Please unlock before sending transactions.');
      }

      // Validate address format
      if (!ethers.isAddress(to)) {
        throw new Error(`Invalid recipient address: ${to}`);
      }

      // Parse amount
      let parsedAmount;
      try {
        parsedAmount = ethers.parseEther(amount);
      } catch (error) {
        throw new Error(`Invalid amount format: ${amount}`);
      }

      // Get provider and signer
      const provider = window.WalletBlockchain.getProvider(networkKey);
      const signer = window.walletCore.wallet.connect(provider);

      // Get current gas price
      const feeData = await provider.getFeeData();
      let gasPrice;
      let maxFeePerGas;
      let maxPriorityFeePerGas;

      if (feeData.maxFeePerGas) {
        // EIP-1559
        maxFeePerGas = feeData.maxFeePerGas;
        maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      } else {
        // Legacy gas price
        gasPrice = feeData.gasPrice;
      }

      // Estimate gas
      const estimateGasParams = {
        to,
        value: parsedAmount
      };
      const gasLimit = await provider.estimateGas(estimateGasParams);

      // Build transaction
      const txParams = {
        to,
        value: parsedAmount,
        gasLimit: (gasLimit * 120n) / 100n // Add 20% buffer
      };

      if (maxFeePerGas) {
        txParams.maxFeePerGas = maxFeePerGas;
        txParams.maxPriorityFeePerGas = maxPriorityFeePerGas;
      } else {
        txParams.gasPrice = gasPrice;
      }

      // Send transaction
      const tx = await signer.sendTransaction(txParams);
      const hash = tx.hash;

      // Dispatch transaction sent event
      window.dispatchEvent(new CustomEvent('transactionSent', {
        detail: { hash, type: 'nativeToken', to, amount }
      }));

      // Wait for confirmation
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction failed - no receipt received');
      }

      const status = receipt.status === 1 ? 'confirmed' : 'failed';

      // Dispatch confirmed event
      window.dispatchEvent(new CustomEvent('transactionConfirmed', {
        detail: { hash, status, gasUsed: receipt.gasUsed.toString() }
      }));

      return {
        hash,
        status,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber,
        confirmations: receipt.confirmations
      };
    } catch (error) {
      const errorMsg = `Failed to send native token: ${error.message}`;
      window.dispatchEvent(new CustomEvent('transactionFailed', {
        detail: { error: errorMsg }
      }));
      throw new Error(errorMsg);
    }
  }

  /**
   * Send ERC20 tokens
   * @param {string} tokenSymbol - Token symbol (e.g., 'USDC')
   * @param {string} to - Recipient address
   * @param {string} amount - Amount to send
   * @param {string} networkKey - Network identifier
   * @returns {Promise<Object>} Transaction result { hash, status, gasUsed }
   */
  async sendERC20Token(tokenSymbol, to, amount, networkKey) {
    try {
      // Validate WalletCore is unlocked
      if (!window.walletCore || window.walletCore.isLocked) {
        throw new Error('Wallet is locked. Please unlock before sending transactions.');
      }

      // Validate address format
      if (!ethers.isAddress(to)) {
        throw new Error(`Invalid recipient address: ${to}`);
      }

      // Get token config
      const tokenConfig = window.WalletConfig.TOKENS[networkKey]?.[tokenSymbol];
      if (!tokenConfig) {
        throw new Error(`Token ${tokenSymbol} not found in configuration`);
      }

      const tokenAddress = tokenConfig.address;
      if (!tokenAddress) {
        throw new Error(`Token ${tokenSymbol} not available on network ${networkKey}`);
      }

      // Get provider and signer
      const provider = window.WalletBlockchain.getProvider(networkKey);
      const signer = window.walletCore.wallet.connect(provider);

      // Create contract instance
      const erc20ABI = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];
      const contract = new ethers.Contract(tokenAddress, erc20ABI, signer);

      // Get token decimals
      const decimals = await contract.decimals();

      // Parse amount
      let parsedAmount;
      try {
        parsedAmount = ethers.parseUnits(amount, decimals);
      } catch (error) {
        throw new Error(`Invalid amount format for ${decimals} decimals: ${amount}`);
      }

      // Check balance is sufficient
      const userBalance = await contract.balanceOf(signer.address);
      if (userBalance < parsedAmount) {
        throw new Error(`Insufficient balance. Have: ${ethers.formatUnits(userBalance, decimals)} ${tokenSymbol}`);
      }

      // Estimate gas
      const estimateGasParams = {
        to: tokenAddress,
        data: contract.interface.encodeFunctionData('transfer', [to, parsedAmount])
      };
      const gasLimit = await provider.estimateGas(estimateGasParams);

      // Get fee data for gas price
      const feeData = await provider.getFeeData();
      let txParams = {
        gasLimit: (gasLimit * 120n) / 100n // Add 20% buffer
      };

      if (feeData.maxFeePerGas) {
        txParams.maxFeePerGas = feeData.maxFeePerGas;
        txParams.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      } else {
        txParams.gasPrice = feeData.gasPrice;
      }

      // Call transfer
      const tx = await contract.transfer(to, parsedAmount, txParams);
      const hash = tx.hash;

      // Dispatch transaction sent event
      window.dispatchEvent(new CustomEvent('transactionSent', {
        detail: { hash, type: 'erc20Token', token: tokenSymbol, to, amount }
      }));

      // Wait for confirmation
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction failed - no receipt received');
      }

      const status = receipt.status === 1 ? 'confirmed' : 'failed';

      // Dispatch confirmed event
      window.dispatchEvent(new CustomEvent('transactionConfirmed', {
        detail: { hash, status, gasUsed: receipt.gasUsed.toString() }
      }));

      return {
        hash,
        status,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber,
        confirmations: receipt.confirmations
      };
    } catch (error) {
      const errorMsg = `Failed to send ERC20 token: ${error.message}`;
      window.dispatchEvent(new CustomEvent('transactionFailed', {
        detail: { hash: null, error: errorMsg }
      }));
      throw new Error(errorMsg);
    }
  }

  /**
   * Approve token spending by a spender address
   * @param {string} tokenSymbol - Token symbol
   * @param {string} spenderAddress - Address allowed to spend
   * @param {string} amount - Amount to approve
   * @param {string} networkKey - Network identifier
   * @returns {Promise<Object>} Transaction result { hash, status }
   */
  async approveToken(tokenSymbol, spenderAddress, amount, networkKey) {
    try {
      // Validate WalletCore is unlocked
      if (!window.walletCore || window.walletCore.isLocked) {
        throw new Error('Wallet is locked. Please unlock before approving tokens.');
      }

      // Validate spender address
      if (!ethers.isAddress(spenderAddress)) {
        throw new Error(`Invalid spender address: ${spenderAddress}`);
      }

      // Get token config
      const tokenConfig = window.WalletConfig.TOKENS[networkKey]?.[tokenSymbol];
      if (!tokenConfig) {
        throw new Error(`Token ${tokenSymbol} not found in configuration`);
      }

      const tokenAddress = tokenConfig.address;
      if (!tokenAddress) {
        throw new Error(`Token ${tokenSymbol} not available on network ${networkKey}`);
      }

      // Get provider and signer
      const provider = window.WalletBlockchain.getProvider(networkKey);
      const signer = window.walletCore.wallet.connect(provider);

      // Create contract instance
      const erc20ABI = [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function decimals() view returns (uint8)'
      ];
      const contract = new ethers.Contract(tokenAddress, erc20ABI, signer);

      // Get token decimals
      const decimals = await contract.decimals();

      // Parse amount (use max uint256 if amount is 'unlimited')
      let parsedAmount;
      if (amount === 'unlimited' || amount === 'max') {
        parsedAmount = ethers.MaxUint256;
      } else {
        try {
          parsedAmount = ethers.parseUnits(amount, decimals);
        } catch (error) {
          throw new Error(`Invalid amount format: ${amount}`);
        }
      }

      // Get fee data
      const feeData = await provider.getFeeData();
      let txParams = {};

      if (feeData.maxFeePerGas) {
        txParams.maxFeePerGas = feeData.maxFeePerGas;
        txParams.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      } else {
        txParams.gasPrice = feeData.gasPrice;
      }

      // Call approve
      const tx = await contract.approve(spenderAddress, parsedAmount, txParams);
      const hash = tx.hash;

      // Dispatch transaction sent event
      window.dispatchEvent(new CustomEvent('transactionSent', {
        detail: { hash, type: 'approve', token: tokenSymbol, spender: spenderAddress }
      }));

      // Wait for confirmation
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Approval failed - no receipt received');
      }

      const status = receipt.status === 1 ? 'confirmed' : 'failed';

      // Dispatch confirmed event
      window.dispatchEvent(new CustomEvent('transactionConfirmed', {
        detail: { hash, status }
      }));

      return {
        hash,
        status,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      const errorMsg = `Failed to approve token: ${error.message}`;
      window.dispatchEvent(new CustomEvent('transactionFailed', {
        detail: { hash: null, error: errorMsg }
      }));
      throw new Error(errorMsg);
    }
  }

  /**
   * Get token allowance for spender
   * @param {string} tokenSymbol - Token symbol
   * @param {string} ownerAddress - Owner address
   * @param {string} spenderAddress - Spender address
   * @param {string} networkKey - Network identifier
   * @returns {Promise<string>} Formatted allowance amount
   */
  async getTokenAllowance(tokenSymbol, ownerAddress, spenderAddress, networkKey) {
    try {
      // Validate addresses
      if (!ethers.isAddress(ownerAddress)) {
        throw new Error(`Invalid owner address: ${ownerAddress}`);
      }
      if (!ethers.isAddress(spenderAddress)) {
        throw new Error(`Invalid spender address: ${spenderAddress}`);
      }

      // Get token config
      const tokenConfig = window.WalletConfig.TOKENS[networkKey]?.[tokenSymbol];
      if (!tokenConfig) {
        throw new Error(`Token ${tokenSymbol} not found in configuration`);
      }

      const tokenAddress = tokenConfig.address;
      if (!tokenAddress) {
        throw new Error(`Token ${tokenSymbol} not available on network ${networkKey}`);
      }

      // Get provider
      const provider = window.WalletBlockchain.getProvider(networkKey);

      // Create contract instance
      const erc20ABI = [
        'function allowance(address owner, address spender) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];
      const contract = new ethers.Contract(tokenAddress, erc20ABI, provider);

      // Get allowance and decimals
      const [allowance, decimals] = await Promise.all([
        contract.allowance(ownerAddress, spenderAddress),
        contract.decimals()
      ]);

      // Format allowance
      const formattedAllowance = ethers.formatUnits(allowance, decimals);

      return {
        allowance: formattedAllowance,
        raw: allowance.toString(),
        decimals
      };
    } catch (error) {
      throw new Error(`Failed to get token allowance: ${error.message}`);
    }
  }

  /**
   * Swap tokens on DEX
   * @param {string} fromToken - Source token symbol
   * @param {string} toToken - Destination token symbol
   * @param {string} amount - Amount to swap
   * @param {number} slippage - Slippage tolerance in percentage (e.g., 0.5 for 0.5%)
   * @param {string} networkKey - Network identifier
   * @returns {Promise<Object>} Swap result { hash, amountIn, amountOut, status }
   */
  async swapTokens(fromToken, toToken, amount, slippage, networkKey) {
    try {
      // Validate WalletCore is unlocked
      if (!window.walletCore || window.walletCore.isLocked) {
        throw new Error('Wallet is locked. Please unlock before swapping tokens.');
      }

      if (slippage < 0 || slippage > 100) {
        throw new Error('Slippage must be between 0 and 100');
      }

      // Get provider and signer
      const provider = window.WalletBlockchain.getProvider(networkKey);
      const signer = window.walletCore.wallet.connect(provider);
      const userAddress = signer.address;

      // Get router address and config
      const router = this._getRouterForNetwork(networkKey);
      if (!router) {
        throw new Error(`No DEX router configured for network ${networkKey}`);
      }

      // Get token configs
      const fromTokenConfig = window.WalletConfig.TOKENS[networkKey]?.[fromToken];
      const toTokenConfig = window.WalletConfig.TOKENS[networkKey]?.[toToken];

      if (!fromTokenConfig || !toTokenConfig) {
        throw new Error(`Token configuration not found for ${fromToken} or ${toToken}`);
      }

      const fromTokenAddress = fromTokenConfig.address;
      const toTokenAddress = toTokenConfig.address;

      if (!fromTokenAddress || !toTokenAddress) {
        throw new Error(`Tokens not available on network ${networkKey}`);
      }

      // Build swap path
      const path = this._getSwapPath(fromTokenAddress, toTokenAddress, networkKey);

      // Get decimals for amount parsing
      const provider2 = window.WalletBlockchain.getProvider(networkKey);
      const erc20ABI = ['function decimals() view returns (uint8)'];
      const fromTokenContract = new ethers.Contract(fromTokenAddress, erc20ABI, provider2);
      const decimals = await fromTokenContract.decimals();

      // Parse input amount
      const amountIn = ethers.parseUnits(amount, decimals);

      // Create router contract
      const routerABI = [
        'function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)',
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)',
        'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)',
        'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)',
        'function WETH() view returns (address)',
        'function factory() view returns (address)'
      ];
      const routerContract = new ethers.Contract(router.address, routerABI, signer);

      // Get amounts out
      const amounts = await routerContract.getAmountsOut(amountIn, path);
      const amountOut = amounts[amounts.length - 1];

      // Calculate minimum amount with slippage
      const amountOutMin = (amountOut * BigInt(10000 - Math.floor(slippage * 100))) / 10000n;

      // Get fee data
      const feeData = await provider.getFeeData();
      let txParams = {};

      if (feeData.maxFeePerGas) {
        txParams.maxFeePerGas = feeData.maxFeePerGas;
        txParams.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      } else {
        txParams.gasPrice = feeData.gasPrice;
      }

      // Set deadline (20 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + 20 * 60;

      // Determine swap type and execute
      const isFromNative = this._isNativeToken(fromToken, networkKey);
      const isToNative = this._isNativeToken(toToken, networkKey);

      let tx;

      if (isFromNative) {
        // ETH/BNB → Token
        txParams.value = amountIn;
        tx = await routerContract.swapExactETHForTokens(
          amountOutMin,
          path,
          userAddress,
          deadline,
          txParams
        );
      } else if (isToNative) {
        // Token → ETH/BNB
        // Check and set approval
        await this._ensureTokenApproval(fromTokenAddress, router.address, amountIn, signer);
        tx = await routerContract.swapExactTokensForETH(
          amountIn,
          amountOutMin,
          path,
          userAddress,
          deadline,
          txParams
        );
      } else {
        // Token → Token
        // Check and set approval
        await this._ensureTokenApproval(fromTokenAddress, router.address, amountIn, signer);
        tx = await routerContract.swapExactTokensForTokens(
          amountIn,
          amountOutMin,
          path,
          userAddress,
          deadline,
          txParams
        );
      }

      const hash = tx.hash;

      // Dispatch swap started event
      window.dispatchEvent(new CustomEvent('transactionSent', {
        detail: { hash, type: 'swap', fromToken, toToken, amountIn: amount }
      }));

      // Wait for confirmation
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Swap failed - no receipt received');
      }

      const status = receipt.status === 1 ? 'confirmed' : 'failed';
      const toTokenDecimals = await new ethers.Contract(toTokenAddress, erc20ABI, provider).decimals();
      const amountOutFormatted = ethers.formatUnits(amountOut, toTokenDecimals);

      // Dispatch swap completed event
      window.dispatchEvent(new CustomEvent('swapCompleted', {
        detail: {
          hash,
          fromToken,
          toToken,
          amountIn: amount,
          amountOut: amountOutFormatted,
          status
        }
      }));

      return {
        hash,
        amountIn: amount,
        amountOut: amountOutFormatted,
        status,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      const errorMsg = `Failed to swap tokens: ${error.message}`;
      window.dispatchEvent(new CustomEvent('transactionFailed', {
        detail: { hash: null, error: errorMsg }
      }));
      throw new Error(errorMsg);
    }
  }

  /**
   * Get swap quote without executing
   * @param {string} fromToken - Source token symbol
   * @param {string} toToken - Destination token symbol
   * @param {string} amount - Amount to swap
   * @param {string} networkKey - Network identifier
   * @returns {Promise<Object>} Quote { amountOut, priceImpact, path, fee }
   */
  async getSwapQuote(fromToken, toToken, amount, networkKey) {
    try {
      // Get router
      const router = this._getRouterForNetwork(networkKey);
      if (!router) {
        throw new Error(`No DEX router configured for network ${networkKey}`);
      }

      // Get token configs
      const fromTokenConfig = window.WalletConfig.TOKENS[networkKey]?.[fromToken];
      const toTokenConfig = window.WalletConfig.TOKENS[networkKey]?.[toToken];

      if (!fromTokenConfig || !toTokenConfig) {
        throw new Error(`Token configuration not found for ${fromToken} or ${toToken}`);
      }

      const fromTokenAddress = fromTokenConfig.address;
      const toTokenAddress = toTokenConfig.address;

      if (!fromTokenAddress || !toTokenAddress) {
        throw new Error(`Tokens not available on network ${networkKey}`);
      }

      // Get provider
      const provider = window.WalletBlockchain.getProvider(networkKey);

      // Build path
      const path = this._getSwapPath(fromTokenAddress, toTokenAddress, networkKey);

      // Get token decimals
      const erc20ABI = ['function decimals() view returns (uint8)'];
      const fromTokenContract = new ethers.Contract(fromTokenAddress, erc20ABI, provider);
      const toTokenContract = new ethers.Contract(toTokenAddress, erc20ABI, provider);
      const [fromDecimals, toDecimals] = await Promise.all([
        fromTokenContract.decimals(),
        toTokenContract.decimals()
      ]);

      // Parse input amount
      const amountIn = ethers.parseUnits(amount, fromDecimals);

      // Get amounts out
      const routerABI = ['function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)'];
      const routerContract = new ethers.Contract(router.address, routerABI, provider);

      const amounts = await routerContract.getAmountsOut(amountIn, path);
      const amountOut = amounts[amounts.length - 1];
      const amountOutFormatted = ethers.formatUnits(amountOut, toDecimals);

      // Calculate price impact
      const inputValue = parseFloat(amount);
      const outputValue = parseFloat(amountOutFormatted);
      const directRate = outputValue / inputValue;
      const spotRate = directRate * 1.01; // Simplified - actual calculation would be more complex
      const priceImpact = ((spotRate - directRate) / spotRate * 100).toFixed(2);

      // Get fee (typically 0.3% for Uniswap, 0.25% for PancakeSwap)
      const fee = router.type === 'pancakeswap' ? 0.25 : 0.3;

      return {
        amountOut: amountOutFormatted,
        priceImpact: `${priceImpact}%`,
        path: path.map(addr => this._shortAddress(addr)),
        fee: `${fee}%`,
        raw: {
          amountOut: amountOut.toString(),
          path
        }
      };
    } catch (error) {
      throw new Error(`Failed to get swap quote: ${error.message}`);
    }
  }

  /**
   * Estimate gas for various transaction types
   * @param {string} type - Transaction type: 'send', 'sendToken', 'swap', 'approve'
   * @param {Object} params - Parameters for gas estimation
   * @returns {Promise<Object>} Gas estimate { gasLimit, gasCost, gasCostUsd }
   */
  async getGasEstimate(type, params) {
    try {
      if (!params || !params.networkKey) {
        throw new Error('networkKey is required in params');
      }

      const provider = window.WalletBlockchain.getProvider(params.networkKey);
      const feeData = await provider.getFeeData();

      let estimatedGas = 21000n; // Base for native transfer

      switch (type) {
        case 'send':
          estimatedGas = 21000n;
          break;

        case 'sendToken':
          estimatedGas = 65000n; // Typical ERC20 transfer
          break;

        case 'swap':
          estimatedGas = 200000n; // Typical swap
          break;

        case 'approve':
          estimatedGas = 45000n; // Typical approve
          break;

        default:
          throw new Error(`Unknown transaction type: ${type}`);
      }

      // Calculate cost
      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('50', 'gwei');
      const gasCostWei = estimatedGas * gasPrice;
      const gasCostEther = ethers.formatEther(gasCostWei);

      // ETH/USD price not available - prices can be fetched separately
      const gasCostUsd = 'N/A';

      return {
        gasLimit: estimatedGas.toString(),
        gasCost: gasCostEther,
        gasCostUsd,
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
        raw: {
          gasLimit: estimatedGas,
          gasCostWei
        }
      };
    } catch (error) {
      throw new Error(`Failed to estimate gas: ${error.message}`);
    }
  }

  /**
   * Build optimal swap path
   * @private
   * @param {string} fromTokenAddress - From token address
   * @param {string} toTokenAddress - To token address
   * @param {string} networkKey - Network identifier
   * @returns {string[]} Path array
   */
  _getSwapPath(fromTokenAddress, toTokenAddress, networkKey) {
    // Find WETH address from router config
    let wethAddress = null;
    for (const [, routerConfig] of Object.entries(window.WalletConfig.DEX_ROUTERS || {})) {
      if (routerConfig.network === networkKey) {
        wethAddress = routerConfig.weth;
        break;
      }
    }

    // Direct path if one is WETH or they're the same
    if (fromTokenAddress === toTokenAddress) {
      return [fromTokenAddress];
    }

    if (fromTokenAddress === wethAddress || toTokenAddress === wethAddress) {
      return [fromTokenAddress, toTokenAddress];
    }

    // Path through WETH
    if (wethAddress) {
      return [fromTokenAddress, wethAddress, toTokenAddress];
    }

    // Fallback: direct path
    return [fromTokenAddress, toTokenAddress];
  }

  /**
   * Get appropriate DEX router for network
   * @private
   * @param {string} networkKey - Network identifier
   * @returns {Object|null} Router config { address, type, name }
   */
  _getRouterForNetwork(networkKey) {
    const routers = window.WalletConfig.DEX_ROUTERS;
    if (!routers) {
      return null;
    }

    // Map network to router
    const routerMap = {
      'bsc': 'pancakeswap',
      'ethereum': 'uniswap',
      'polygon': 'uniswap',
      'arbitrum': 'uniswap',
      'optimism': 'uniswap'
    };

    const routerType = routerMap[networkKey];
    if (!routerType) {
      return null;
    }

    const routerConfig = routers[routerType];
    if (!routerConfig || routerConfig.network !== networkKey) {
      return null;
    }

    return {
      address: routerConfig.address,
      type: routerType,
      name: routerType.charAt(0).toUpperCase() + routerType.slice(1)
    };
  }

  /**
   * Check if token is native currency
   * @private
   * @param {string} tokenSymbol - Token symbol
   * @param {string} networkKey - Network identifier
   * @returns {boolean} True if native token
   */
  _isNativeToken(tokenSymbol, networkKey) {
    const nativeTokens = {
      'ethereum': 'ETH',
      'bsc': 'BNB',
      'polygon': 'MATIC',
      'arbitrum': 'ETH',
      'optimism': 'ETH'
    };

    return tokenSymbol === nativeTokens[networkKey];
  }

  /**
   * Ensure token approval for spending
   * @private
   * @param {string} tokenAddress - Token address
   * @param {string} spenderAddress - Spender address
   * @param {bigint} amount - Amount to spend
   * @param {Object} signer - Signer object
   */
  async _ensureTokenApproval(tokenAddress, spenderAddress, amount, signer) {
    const erc20ABI = [
      'function allowance(address owner, address spender) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)'
    ];

    const contract = new ethers.Contract(tokenAddress, erc20ABI, signer);
    const allowance = await contract.allowance(signer.address, spenderAddress);

    if (allowance < amount) {
      const approveTx = await contract.approve(spenderAddress, ethers.MaxUint256);
      await approveTx.wait();
    }
  }

  /**
   * Validate sufficient balance for token
   * @private
   * @param {string} tokenAddress - Token address
   * @param {bigint} amount - Amount to check
   * @param {Object} provider - Provider object
   * @param {string} userAddress - User's address
   * @returns {Promise<boolean>} True if sufficient balance
   */
  async _validateSufficientBalance(tokenAddress, amount, provider, userAddress) {
    const erc20ABI = ['function balanceOf(address account) view returns (uint256)'];
    const contract = new ethers.Contract(tokenAddress, erc20ABI, provider);
    const balance = await contract.balanceOf(userAddress);
    return balance >= amount;
  }

  /**
   * Shorten address for display
   * @private
   * @param {string} address - Full address
   * @returns {string} Shortened address (0x1234...5678)
   */
  _shortAddress(address) {
    if (!address || address.length < 10) {
      return address;
    }
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Clear transaction cache
   */
  clearCache() {
    this.transactionCache.clear();
    this.gasEstimates.clear();
  }
}

// Initialize and assign to window
window.WalletTransactions = new WalletTransactions();
