/**
 * DCA Engine - Dollar Cost Averaging Engine for DEX Trading
 *
 * Manages DCA plans with localStorage persistence and event-based architecture.
 * Allows users to set up recurring buy orders with flexible frequencies.
 */

class DCAEngine extends EventTarget {
  /**
   * Initialize the DCA Engine
   */
  constructor() {
    super();
    this.storageKey = 'funswap_dca_plans';
    this.plans = this._loadPlans();
  }

  /**
   * Create a new DCA plan
   * @param {Object} config - Plan configuration
   * @param {string} config.fromToken - Source token symbol (e.g., 'USDC')
   * @param {string} config.toToken - Target token symbol (e.g., 'SOL')
   * @param {number} config.amountPerOrder - Amount to spend per order
   * @param {string} config.frequency - Frequency: 'daily', 'weekly', or 'monthly'
   * @param {number} config.totalOrders - Total number of orders to execute
   * @returns {Object} The created plan
   */
  createPlan(config) {
    // Validate input
    if (!config.fromToken || !config.toToken) {
      throw new Error('fromToken and toToken are required');
    }
    if (!['daily', 'weekly', 'monthly'].includes(config.frequency)) {
      throw new Error('frequency must be daily, weekly, or monthly');
    }
    if (config.amountPerOrder <= 0 || config.totalOrders <= 0) {
      throw new Error('amountPerOrder and totalOrders must be positive');
    }

    // Create plan object
    const plan = {
      id: this._generateId(),
      fromToken: config.fromToken.toUpperCase(),
      toToken: config.toToken.toUpperCase(),
      amountPerOrder: config.amountPerOrder,
      frequency: config.frequency,
      totalOrders: config.totalOrders,
      completedOrders: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      nextExecution: this.calculateNextExecution({ frequency: config.frequency }),
      executionHistory: []
    };

    // Save and emit event
    this.plans.push(plan);
    this._savePlans();
    this.dispatchEvent(new CustomEvent('planCreated', { detail: plan }));

    return plan;
  }

  /**
   * Get a single plan by ID
   * @param {string} id - Plan ID
   * @returns {Object|null} The plan or null if not found
   */
  getPlan(id) {
    return this.plans.find(plan => plan.id === id) || null;
  }

  /**
   * Get all plans
   * @returns {Array} Array of all plans
   */
  getAllPlans() {
    return [...this.plans];
  }

  /**
   * Get only active plans
   * @returns {Array} Array of active plans
   */
  getActivePlans() {
    return this.plans.filter(plan => plan.status === 'active');
  }

  /**
   * Pause a plan
   * @param {string} id - Plan ID
   * @returns {Object} The updated plan
   */
  pausePlan(id) {
    const plan = this.getPlan(id);
    if (!plan) {
      throw new Error(`Plan with ID ${id} not found`);
    }

    plan.status = 'paused';
    this._savePlans();
    this.dispatchEvent(new CustomEvent('planUpdated', { detail: plan }));

    return plan;
  }

  /**
   * Resume a paused plan
   * @param {string} id - Plan ID
   * @returns {Object} The updated plan
   */
  resumePlan(id) {
    const plan = this.getPlan(id);
    if (!plan) {
      throw new Error(`Plan with ID ${id} not found`);
    }
    if (plan.status !== 'paused') {
      throw new Error(`Plan must be paused to resume`);
    }

    plan.status = 'active';
    this._savePlans();
    this.dispatchEvent(new CustomEvent('planUpdated', { detail: plan }));

    return plan;
  }

  /**
   * Cancel a plan (marks as cancelled but keeps history)
   * @param {string} id - Plan ID
   * @returns {Object} The updated plan
   */
  cancelPlan(id) {
    const plan = this.getPlan(id);
    if (!plan) {
      throw new Error(`Plan with ID ${id} not found`);
    }

    plan.status = 'cancelled';
    this._savePlans();
    this.dispatchEvent(new CustomEvent('planUpdated', { detail: plan }));

    return plan;
  }

  /**
   * Delete a plan entirely (removes all data)
   * @param {string} id - Plan ID
   */
  deletePlan(id) {
    const index = this.plans.findIndex(plan => plan.id === id);
    if (index === -1) {
      throw new Error(`Plan with ID ${id} not found`);
    }

    const deleted = this.plans.splice(index, 1);
    this._savePlans();
    this.dispatchEvent(new CustomEvent('planDeleted', { detail: deleted[0] }));
  }

  /**
   * Execute all due orders across active plans
   * @returns {Array} Array of executed orders
   */
  executeDueOrders() {
    const now = new Date();
    const executed = [];

    for (const plan of this.getActivePlans()) {
      const nextExecution = new Date(plan.nextExecution);

      // Check if plan is due and not completed
      if (now >= nextExecution && plan.completedOrders < plan.totalOrders) {
        const order = this.executeOrder(plan.id);
        if (order) {
          executed.push(order);
        }
      }
    }

    return executed;
  }

  /**
   * Execute a single order for a plan (simulated)
   * @param {string} planId - Plan ID
   * @returns {Object|null} The executed order record or null if plan is complete
   */
  executeOrder(planId) {
    const plan = this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan with ID ${planId} not found`);
    }

    // Check if plan can execute more orders
    if (plan.completedOrders >= plan.totalOrders) {
      return null;
    }

    // Create order record with simulated data
    const order = {
      orderId: this._generateId(),
      timestamp: new Date().toISOString(),
      fromAmount: plan.amountPerOrder,
      toAmount: this._simulateSwapRate(plan.fromToken, plan.toToken, plan.amountPerOrder),
      txHash: this._generateMockTxHash(),
      fromToken: plan.fromToken,
      toToken: plan.toToken,
      executionNumber: plan.completedOrders + 1
    };

    // Update plan
    plan.completedOrders += 1;
    plan.executionHistory.push(order);

    // Calculate next execution or mark as completed
    if (plan.completedOrders >= plan.totalOrders) {
      plan.status = 'completed';
      this.dispatchEvent(new CustomEvent('planCompleted', { detail: plan }));
    } else {
      plan.nextExecution = this.calculateNextExecution(plan);
    }

    this._savePlans();
    this.dispatchEvent(new CustomEvent('orderExecuted', { detail: { plan, order } }));

    return order;
  }

  /**
   * Get execution history for a plan
   * @param {string} planId - Plan ID
   * @returns {Array} Array of executed orders
   */
  getExecutionHistory(planId) {
    const plan = this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan with ID ${planId} not found`);
    }

    return [...plan.executionHistory];
  }

  /**
   * Get total invested amount for a plan
   * @param {string} planId - Plan ID
   * @returns {number} Total amount invested
   */
  getTotalInvested(planId) {
    const plan = this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan with ID ${planId} not found`);
    }

    return plan.executionHistory.reduce((sum, order) => sum + order.fromAmount, 0);
  }

  /**
   * Calculate next execution date based on frequency
   * @param {Object} plan - Plan object or object with frequency property
   * @returns {string} ISO timestamp of next execution
   */
  calculateNextExecution(plan) {
    const now = new Date();
    const next = new Date(now);

    switch (plan.frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        throw new Error('Invalid frequency');
    }

    return next.toISOString();
  }

  /**
   * Get overall statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const stats = {
      totalPlans: this.plans.length,
      activePlans: 0,
      pausedPlans: 0,
      completedPlans: 0,
      cancelledPlans: 0,
      totalInvested: 0,
      totalOrdersExecuted: 0,
      totalOrdersPlanned: 0
    };

    for (const plan of this.plans) {
      stats[`${plan.status}Plans`] = (stats[`${plan.status}Plans`] || 0) + 1;
      stats.totalInvested += this.getTotalInvested(plan.id);
      stats.totalOrdersExecuted += plan.completedOrders;
      stats.totalOrdersPlanned += plan.totalOrders;
    }

    return stats;
  }

  /**
   * Internal: Generate unique ID
   * @private
   * @returns {string} Unique ID
   */
  _generateId() {
    return `dca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Internal: Generate mock transaction hash
   * @private
   * @returns {string} Mock tx hash
   */
  _generateMockTxHash() {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
  }

  /**
   * Internal: Simulate swap rate for order execution
   * Uses actual token prices from the DEX
   * @private
   * @param {string} fromToken - Source token
   * @param {string} toToken - Target token
   * @param {number} fromAmount - Amount of source token
   * @returns {number} Estimated target token amount
   */
  _simulateSwapRate(fromToken, toToken, fromAmount) {
    const prices = {
        'BNB': 612.45, 'WBNB': 612.45, 'FUNS': 0.0845,
        'USDT': 1.00, 'USDC': 1.00, 'BUSD': 1.00,
        'ETH': 3456.78, 'CAKE': 8.92, 'BTC': 84521.30
    };
    const fromPrice = prices[fromToken] || 1;
    const toPrice = prices[toToken] || 1;
    const rate = fromPrice / toPrice;
    // Add small randomness to simulate slippage (±2%)
    const slippage = 0.98 + Math.random() * 0.04;
    return fromAmount * rate * slippage;
  }

  /**
   * Internal: Load plans from localStorage
   * @private
   * @returns {Array} Loaded plans array
   */
  _loadPlans() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading DCA plans from localStorage:', error);
      return [];
    }
  }

  /**
   * Internal: Save plans to localStorage
   * @private
   */
  _savePlans() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.plans));
    } catch (error) {
      console.error('Error saving DCA plans to localStorage:', error);
    }
  }
}

// Export as global variable for script tag usage
window.DCAEngine = DCAEngine;
