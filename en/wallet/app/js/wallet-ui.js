// Escape HTML to prevent XSS when inserting user/blockchain data into innerHTML
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

class WalletUI {
  constructor() {
    // WalletCore is a class, create an instance
    this.walletCore = new window.WalletCore();
    window.walletCore = this.walletCore; // Make instance globally accessible
    this.walletBlockchain = new window.WalletBlockchain();
    window.WalletBlockchain = this.walletBlockchain; // Keep backward compat
    this.walletTransactions = window.WalletTransactions;
    this.walletConfig = window.WalletConfig;
    this.currentToken = 'BNB';
    this.currentTimeRange = '1d';
    this.isLocked = true;
    this.pinAttempts = 0;
    this.maxPinAttempts = 3;
    this.selectedTokenForSend = 'BNB';
    this.selectedTokenForSwap = 'BNB';
    this.swapQuoteTimer = null;
  }

  // Main initialization
  async init() {
    try {
      const walletExists = this.walletCore.isWalletExists();

      if (!walletExists) {
        this.showOnboarding();
      } else {
        this.showPinEntry();
      }

      this.setupEventListeners();
      this.setupModals();
      this.setupNetworkSelector();
      this.setupSettingsPanel();
      this.setupCustomTokenModal();
      // Initialize blockchain providers
      await this.walletBlockchain.init();
    } catch (error) {
      console.error('지갑 초기화 실패:', error);
      this.showToast('지갑 초기화 실패', 'error');
    }
  }

  // Onboarding screen
  showOnboarding() {
    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.innerHTML = `
      <div class="onboarding-container">
        <div class="onboarding-header">
          <h1>지갑 시작하기</h1>
          <p>블록체인 자산을 안전하게 관리하세요</p>
        </div>
        <div class="onboarding-options">
          <button class="onboarding-btn create-wallet-btn">
            <span class="icon">+</span>
            <span class="text">새 지갑 만들기</span>
          </button>
          <button class="onboarding-btn import-wallet-btn">
            <span class="icon">⇄</span>
            <span class="text">기존 지갑 복구</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.create-wallet-btn').addEventListener('click', () => {
      this.showCreateWalletFlow(overlay);
    });

    overlay.querySelector('.import-wallet-btn').addEventListener('click', () => {
      this.showImportWalletFlow(overlay);
    });
  }

  // Create wallet flow
  showCreateWalletFlow(overlay) {
    const mnemonic = this.walletCore.generateMnemonic();
    const words = mnemonic.split(' ');

    const container = overlay.querySelector('.onboarding-container');
    container.innerHTML = `
      <div class="onboarding-header">
        <h1>시드 구문 저장</h1>
        <p>다음 12개의 단어를 안전한 곳에 기록하세요</p>
      </div>
      <div class="mnemonic-warning">
        <span class="warning-icon">⚠️</span>
        <p>이 시드 구문을 안전한 곳에 보관하세요. 분실 시 지갑을 복구할 수 없습니다.</p>
      </div>
      <div class="mnemonic-grid">
        ${words.map((word, index) => `
          <div class="mnemonic-item">
            <span class="word-number">${index + 1}</span>
            <span class="word-text">${word}</span>
          </div>
        `).join('')}
      </div>
      <button class="onboarding-btn confirm-mnemonic-btn">시드 구문 확인</button>
    `;

    container.querySelector('.confirm-mnemonic-btn').addEventListener('click', () => {
      this.showMnemonicConfirmation(overlay, words, mnemonic);
    });
  }

  // Confirm mnemonic words
  showMnemonicConfirmation(overlay, words, mnemonic) {
    const indices = [2, 6, 10]; // Word 3, 7, 11 (0-indexed)
    const requiredWords = indices.map(i => words[i]);
    let confirmed = [null, null, null];

    const container = overlay.querySelector('.onboarding-container');
    container.innerHTML = `
      <div class="onboarding-header">
        <h1>시드 구문 확인</h1>
        <p>다음 단어들을 입력하세요</p>
      </div>
      <div class="confirmation-items">
        ${indices.map((idx, i) => `
          <div class="confirmation-item">
            <label>단어 #${idx + 1}</label>
            <input type="text" class="confirmation-input" data-index="${i}" placeholder="단어 입력">
          </div>
        `).join('')}
      </div>
      <button class="onboarding-btn confirm-words-btn" disabled>계속</button>
    `;

    const inputs = container.querySelectorAll('.confirmation-input');
    const btn = container.querySelector('.confirm-words-btn');

    inputs.forEach((input, i) => {
      input.addEventListener('input', (e) => {
        confirmed[i] = e.target.value.trim().toLowerCase();
        const allFilled = confirmed.every(v => v);
        btn.disabled = !allFilled;
      });
    });

    btn.addEventListener('click', () => {
      const isValid = requiredWords.every((word, i) => word.toLowerCase() === confirmed[i]);
      if (!isValid) {
        this.showToast('입력한 단어가 일치하지 않습니다', 'error');
        return;
      }
      this.showPinSetup(overlay, mnemonic, 'create');
    });
  }

  // Import wallet flow
  showImportWalletFlow(overlay) {
    const container = overlay.querySelector('.onboarding-container');
    container.innerHTML = `
      <div class="onboarding-header">
        <h1>지갑 복구</h1>
        <p>시드 구문 또는 개인키를 입력하세요</p>
      </div>
      <div class="import-options">
        <button class="import-option-btn active" data-option="mnemonic">시드 구문</button>
        <button class="import-option-btn" data-option="textarea">텍스트 붙여넣기</button>
      </div>
      <div class="import-mnemonic-container">
        <div class="mnemonic-inputs">
          ${Array(12).fill(0).map((_, i) => `
            <input type="text" class="mnemonic-input" placeholder="${i + 1}" data-index="${i}">
          `).join('')}
        </div>
      </div>
      <div class="import-textarea-container" style="display: none;">
        <textarea class="import-textarea" placeholder="시드 구문을 공백으로 구분하여 입력하세요"></textarea>
      </div>
      <button class="onboarding-btn import-wallet-confirm-btn" disabled>계속</button>
    `;

    const mnemonicContainer = container.querySelector('.import-mnemonic-container');
    const textareaContainer = container.querySelector('.import-textarea-container');
    const options = container.querySelectorAll('.import-option-btn');
    const confirmBtn = container.querySelector('.import-wallet-confirm-btn');

    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        options.forEach(o => o.classList.remove('active'));
        e.target.classList.add('active');

        if (e.target.dataset.option === 'mnemonic') {
          mnemonicContainer.style.display = 'block';
          textareaContainer.style.display = 'none';
        } else {
          mnemonicContainer.style.display = 'none';
          textareaContainer.style.display = 'block';
        }
      });
    });

    const validateInputs = () => {
      const option = container.querySelector('.import-option-btn.active').dataset.option;
      let words = [];

      if (option === 'mnemonic') {
        words = Array.from(container.querySelectorAll('.mnemonic-input'))
          .map(input => input.value.trim())
          .filter(w => w);
      } else {
        words = container.querySelector('.import-textarea').value.trim().split(/\s+/);
      }

      confirmBtn.disabled = words.length !== 12;
      return words.length === 12 ? words : null;
    };

    container.querySelectorAll('.mnemonic-input, .import-textarea').forEach(input => {
      input.addEventListener('input', validateInputs);
    });

    confirmBtn.addEventListener('click', () => {
      const option = container.querySelector('.import-option-btn.active').dataset.option;
      let words = [];

      if (option === 'mnemonic') {
        words = Array.from(container.querySelectorAll('.mnemonic-input'))
          .map(input => input.value.trim());
      } else {
        words = container.querySelector('.import-textarea').value.trim().split(/\s+/);
      }

      if (words.length !== 12) {
        this.showToast('12개의 단어를 입력하세요', 'error');
        return;
      }

      const mnemonic = words.join(' ');
      this.showPinSetup(overlay, mnemonic, 'import');
    });
  }

  // PIN setup
  showPinSetup(overlay, mnemonic, flow) {
    let confirmPin = '';
    let confirmingPin = false;

    const container = overlay.querySelector('.onboarding-container');
    container.innerHTML = `
      <div class="onboarding-header">
        <h1>Set Password</h1>
        <p>Set a password of at least 8 characters</p>
      </div>
      <div class="pin-display">
        <div class="pin-keyboard-wrapper">
          <input type="password" class="pin-input pin-keyboard-input" maxlength="20" placeholder="••••••••" autocomplete="new-password">
          <button class="pin-toggle-btn" type="button" aria-label="Toggle visibility">
            <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg class="eye-off-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </button>
        </div>
      </div>
      <button class="onboarding-btn pin-confirm-btn" disabled>확인</button>
    `;

    const input = container.querySelector('.pin-input');
    const confirmBtn = container.querySelector('.pin-confirm-btn');
    const toggleBtn = container.querySelector('.pin-toggle-btn');

    toggleBtn.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggleBtn.querySelector('.eye-icon').style.display = isPassword ? 'none' : '';
      toggleBtn.querySelector('.eye-off-icon').style.display = isPassword ? '' : 'none';
    });

    input.addEventListener('input', () => {
      confirmBtn.disabled = input.value.length < 8;
    });

    const doConfirm = () => {
      const pin = input.value;
      if (pin.length < 8) return;
      if (!confirmingPin) {
        confirmPin = pin;
        input.value = '';
        confirmBtn.disabled = true;
        container.querySelector('.onboarding-header h1').textContent = 'Confirm Password';
        container.querySelector('.onboarding-header p').textContent = 'Re-enter your password';
        confirmingPin = true;
        input.focus();
      } else {
        if (pin === confirmPin) {
          this.createWallet(mnemonic, confirmPin, flow, overlay);
        } else {
          this.showToast('Passwords do not match', 'error');
          input.value = '';
          confirmPin = '';
          confirmingPin = false;
          confirmBtn.disabled = true;
          container.querySelector('.onboarding-header h1').textContent = 'Set Password';
          container.querySelector('.onboarding-header p').textContent = 'Set a password of at least 8 characters';
          input.focus();
        }
      }
    };

    confirmBtn.addEventListener('click', doConfirm);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doConfirm(); });
    setTimeout(() => input.focus(), 100);
  }

  // Create or import wallet
  async createWallet(mnemonic, pin, flow, overlay) {
    try {
      const stopLoading = this.showLoading(overlay, '지갑을 생성 중입니다...');

      if (flow === 'create') {
        this.walletCore.createWallet(mnemonic, pin);
      } else {
        this.walletCore.importWallet(mnemonic, pin);
      }

      stopLoading();
      overlay.remove();

      this.isLocked = false;
      this.loadDashboard();
      this.showToast('지갑이 성공적으로 생성되었습니다', 'success');

      window.dispatchEvent(new CustomEvent('walletCreated'));
    } catch (error) {
      console.error('지갑 생성 실패:', error);
      this.showToast(error.message || '지갑 생성 실패', 'error');
    }
  }

  // PIN entry
  showPinEntry() {
    const overlay = document.createElement('div');
    overlay.className = 'pin-entry-overlay';
    overlay.innerHTML = `
      <div class="pin-entry-container">
        <div class="pin-entry-header">
          <h1>Enter Password</h1>
          <p>Unlock your wallet</p>
        </div>
        <div class="pin-display">
          <div class="pin-keyboard-wrapper">
            <input type="password" class="pin-input pin-keyboard-input" maxlength="20" placeholder="••••••••" autocomplete="current-password">
            <button class="pin-toggle-btn" type="button" aria-label="Toggle visibility">
              <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg class="eye-off-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>
        <button class="onboarding-btn pin-unlock-btn" disabled style="margin-top:8px;">Unlock</button>
        <div class="pin-error" style="display: none;"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('.pin-input');
    const unlockBtn = overlay.querySelector('.pin-unlock-btn');
    const toggleBtn = overlay.querySelector('.pin-toggle-btn');
    const errorDiv = overlay.querySelector('.pin-error');

    toggleBtn.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggleBtn.querySelector('.eye-icon').style.display = isPassword ? 'none' : '';
      toggleBtn.querySelector('.eye-off-icon').style.display = isPassword ? '' : 'none';
    });

    input.addEventListener('input', () => {
      unlockBtn.disabled = input.value.length < 1;
      errorDiv.style.display = 'none';
    });

    const tryUnlock = () => {
      const pin = input.value;
      if (pin.length < 1) return;
      try {
        this.walletCore.unlockWallet(pin);
        this.pinAttempts = 0;
        overlay.remove();
        this.isLocked = false;
        this.loadDashboard();
        window.dispatchEvent(new CustomEvent('walletUnlocked'));
      } catch (error) {
        this.pinAttempts++;
        errorDiv.textContent = `Incorrect password (${this.pinAttempts}/${this.maxPinAttempts})`;
        errorDiv.style.display = 'block';
        input.parentElement.classList.add('shake');
        setTimeout(() => input.parentElement.classList.remove('shake'), 500);
        input.value = '';
        unlockBtn.disabled = true;

        if (this.pinAttempts >= this.maxPinAttempts) {
          errorDiv.textContent = 'Too many attempts. Please restart the app.';
          input.disabled = true;
          unlockBtn.disabled = true;
        }
      }
    };

    unlockBtn.addEventListener('click', tryUnlock);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
    setTimeout(() => input.focus(), 100);
  }

  // PIN confirmation for transactions
  showPinConfirmation(callback) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'pin-confirmation-overlay';
      overlay.innerHTML = `
        <div class="pin-confirmation-container">
          <div class="pin-confirmation-header">
            <h1>Transaction Confirmation</h1>
            <p>Enter password to confirm transaction</p>
          </div>
          <div class="pin-display">
            <div class="pin-keyboard-wrapper">
              <input type="password" class="pin-input pin-keyboard-input" maxlength="20" placeholder="••••••••" autocomplete="current-password">
              <button class="pin-toggle-btn" type="button" aria-label="Toggle visibility">
                <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg class="eye-off-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </div>
          <button class="onboarding-btn pin-confirm-action-btn" disabled style="margin-top:8px;">Confirm</button>
          <div class="pin-error" style="display: none;"></div>
        </div>
      `;

      document.body.appendChild(overlay);

      const input = overlay.querySelector('.pin-input');
      const confirmBtn = overlay.querySelector('.pin-confirm-action-btn');
      const toggleBtn = overlay.querySelector('.pin-toggle-btn');
      const errorDiv = overlay.querySelector('.pin-error');
      let attempts = 0;

      toggleBtn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggleBtn.querySelector('.eye-icon').style.display = isPassword ? 'none' : '';
        toggleBtn.querySelector('.eye-off-icon').style.display = isPassword ? '' : 'none';
      });

      input.addEventListener('input', () => {
        confirmBtn.disabled = input.value.length < 1;
        errorDiv.style.display = 'none';
      });

      const tryConfirm = () => {
        const pin = input.value;
        if (pin.length < 1) return;
        try {
          this.walletCore.verifyPin(pin);
          overlay.remove();
          document.removeEventListener('keydown', closeOnEsc);
          if (callback) callback();
          resolve(true);
        } catch (error) {
          attempts++;
          errorDiv.textContent = `Incorrect password (${attempts}/3)`;
          errorDiv.style.display = 'block';
          input.parentElement.classList.add('shake');
          setTimeout(() => input.parentElement.classList.remove('shake'), 500);
          input.value = '';
          confirmBtn.disabled = true;

          if (attempts >= 3) {
            document.removeEventListener('keydown', closeOnEsc);
            overlay.remove();
            resolve(false);
          }
        }
      };

      confirmBtn.addEventListener('click', tryConfirm);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryConfirm(); });

      // Close on ESC
      const closeOnEsc = (e) => {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', closeOnEsc);
          overlay.remove();
          resolve(false);
        }
      };
      document.addEventListener('keydown', closeOnEsc);
      setTimeout(() => input.focus(), 100);
    });
  }

  // Load dashboard
  async loadDashboard() {
    try {
      const address = this.walletCore.getAddress();
      document.querySelector('#addressDisplay span').textContent =
        `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

      const balances = await this.walletBlockchain.getBalances();
      this.updateBalances(balances);
      this.updateTokenList(balances);
      this.updateChart(this.currentToken, this.currentTimeRange);
      this.updateTransactionHistory();
      this.setupChartTimeButtons();
      this.setupTransactionFilters();

      // Auto-refresh
      setInterval(() => {
        this.walletBlockchain.getBalances().then(b => this.updateBalances(b));
        this.updateTransactionHistory();
      }, 30000); // Every 30 seconds
    } catch (error) {
      console.error('대시보드 로드 실패:', error);
      this.showToast('데이터 로드 실패', 'error');
    }
  }

  // Update balances
  async updateBalances(balances) {
    let totalUSD = 0;

    for (const token in balances) {
      const balance = balances[token];
      try {
        const price = await this.walletBlockchain.getTokenPrice(token);
        const value = balance * price;
        totalUSD += value;
      } catch (error) {
        console.warn(`가격 조회 실패: ${token}`);
      }
    }

    const counterSpan = document.querySelector('.balance-amount h1 .counter span');
    if (counterSpan) {
      this.animateCounter(counterSpan, 0, totalUSD, 1000);
    }
  }

  // Animate counter
  animateCounter(element, start, end, duration) {
    const startTime = Date.now();
    const update = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value = start + (end - start) * progress;
      element.textContent = `$${value.toFixed(2)}`;
      if (progress < 1) requestAnimationFrame(update);
    };
    update();
  }

  // Update token list
  async updateTokenList(balances) {
    const tokenList = document.querySelector('.token-list');
    tokenList.innerHTML = '';

    for (const token in balances) {
      const balance = balances[token];
      if (balance === 0) continue;

      let price = 0;
      let change24h = 0;

      try {
        const priceData = await this.walletBlockchain.getTokenPrice(token);
        price = typeof priceData === 'object' ? priceData.price : priceData;
        change24h = typeof priceData === 'object' ? priceData.change24h : 0;
      } catch (error) {
        console.warn(`가격 조회 실패: ${token}`);
      }

      const usdValue = balance * price;
      const item = document.createElement('div');
      item.className = 'token-item';
      item.innerHTML = `
        <div class="token-info">
          <div class="token-icon">${this.getTokenIcon(token)}</div>
          <div class="token-details">
            <div class="token-name">${token}</div>
            <div class="token-balance">${balance.toFixed(4)} ${token}</div>
          </div>
        </div>
        <div class="token-value">
          <div class="token-price">$${usdValue.toFixed(2)}</div>
          <div class="token-change ${change24h >= 0 ? 'positive' : 'negative'}">
            ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%
          </div>
        </div>
      `;

      item.addEventListener('click', () => {
        this.currentToken = token;
        document.querySelectorAll('.token-item').forEach(t => t.classList.remove('active'));
        item.classList.add('active');
        this.updateChart(token, this.currentTimeRange);
      });

      tokenList.appendChild(item);
    }

    // Select first token by default
    const firstToken = tokenList.querySelector('.token-item');
    if (firstToken) firstToken.click();
  }

  // Update chart
  async updateChart(tokenSymbol, timeRange) {
    try {
      const chartToken = document.querySelector('#chartToken');
      if (chartToken) chartToken.textContent = tokenSymbol;

      const priceHistory = await this.walletBlockchain.fetchPriceHistory(tokenSymbol, timeRange);
      if (!priceHistory || priceHistory.length === 0) {
        this.showToast('차트 데이터를 불러올 수 없습니다', 'warning');
        return;
      }

      const prices = priceHistory.map(p => p.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice || 1;

      const chartLine = document.querySelector('#chartLine');
      const chartFill = document.querySelector('#chartFill');

      if (chartLine && chartFill) {
        const points = prices.map((price, index) => {
          const x = (index / (prices.length - 1)) * 1000;
          const y = 250 - ((price - minPrice) / priceRange) * 250;
          return `${x},${y}`;
        }).join(' ');

        const fillPoints = `0,250 ${points} 1000,250`;

        chartLine.setAttribute('points', points);
        chartFill.setAttribute('points', fillPoints);

        // Update stats
        const currentPrice = prices[prices.length - 1];
        const openPrice = prices[0];
        const highPrice = Math.max(...prices);

        const priceCounter = document.querySelector('.chart-price .counter');
        if (priceCounter) {
          priceCounter.textContent = `$${currentPrice.toFixed(2)}`;
        }

        const volumeItems = document.querySelectorAll('.volume-item .volume-value');
        if (volumeItems.length >= 3) {
          volumeItems[0].textContent = `$${(currentPrice * 1000).toFixed(0)}`; // Volume estimate
          volumeItems[1].textContent = `$${openPrice.toFixed(2)}`;
          volumeItems[2].textContent = `$${highPrice.toFixed(2)}`;
        }
      }
    } catch (error) {
      console.error('차트 업데이트 실패:', error);
      this.showToast('차트 업데이트 실패', 'error');
    }
  }

  // Update transaction history
  async updateTransactionHistory() {
    try {
      const transactions = await this.walletTransactions.getTransactionHistory();
      const txList = document.querySelector('.transaction-list');

      if (!txList) return;

      txList.innerHTML = '';

      if (transactions.length === 0) {
        txList.innerHTML = '<div class="no-transactions">거래 내역이 없습니다</div>';
        return;
      }

      transactions.forEach(tx => {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        item.dataset.txType = tx.type;

        const icon = this.getTransactionIcon(tx.type);
        const statusText = this.getTransactionStatusText(tx.status);
        const statusClass = tx.status === 'confirmed' ? 'confirmed' : 'pending';
        const relativeTime = this.formatRelativeTime(tx.timestamp);

        item.innerHTML = `
          <div class="tx-icon">${icon}</div>
          <div class="tx-info">
            <div class="tx-type">${escapeHtml(this.getTransactionTypeText(tx.type))}</div>
            <div class="tx-time">${escapeHtml(relativeTime)}</div>
          </div>
          <div class="tx-amount">
            <div class="tx-value">${tx.type === 'send' ? '-' : '+'}${escapeHtml(tx.amount)} ${escapeHtml(tx.token)}</div>
            <div class="tx-status ${statusClass}">${escapeHtml(statusText)}</div>
          </div>
        `;

        item.addEventListener('click', () => {
          this.showTransactionDetail(tx);
        });

        txList.appendChild(item);
      });
    } catch (error) {
      console.error('거래 내역 로드 실패:', error);
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Address copy button
    const copyBtn = document.querySelector('#copyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const address = this.walletCore.getAddress();
        navigator.clipboard.writeText(address).then(() => {
          this.showToast('주소가 복사되었습니다', 'success');
        });
      });
    }

    // Wallet button
    const walletBtn = document.querySelector('#walletBtn');
    if (walletBtn) {
      walletBtn.addEventListener('click', () => {
        if (this.isLocked) {
          this.showPinEntry();
        } else {
          // Show account menu
          this.showAccountMenu();
        }
      });
    }

    // Window events
    window.addEventListener('walletCreated', () => this.loadDashboard());
    window.addEventListener('walletUnlocked', () => this.loadDashboard());
    window.addEventListener('walletLocked', () => this.showPinEntry());
    window.addEventListener('balancesUpdated', (e) => this.updateBalances(e.detail));
    window.addEventListener('networkChanged', () => this.loadDashboard());
    window.addEventListener('transactionSent', (e) => {
      this.showToast(`거래 전송됨: ${e.detail.hash}`, 'info');
    });
    window.addEventListener('transactionConfirmed', () => {
      this.showToast('거래가 완료되었습니다', 'success');
      this.updateTransactionHistory();
    });
    window.addEventListener('transactionFailed', (e) => {
      this.showToast(`Transaction failed: ${e.detail.error}`, 'error');
    });

    // Backup buttons
    const seedBackupBtn = document.getElementById('seedBackupBtn');
    if (seedBackupBtn) {
      seedBackupBtn.addEventListener('click', () => this.showBackupModal('seed'));
    }
    const walletBackupBtn = document.getElementById('walletBackupBtn');
    if (walletBackupBtn) {
      walletBackupBtn.addEventListener('click', () => this.showBackupModal('all'));
    }
  }

  // Setup modals
  setupModals() {
    this.setupSendModal();
    this.setupReceiveModal();
    this.setupSwapModal();
    this.setupBuyModal();
  }

  // Send modal
  setupSendModal() {
    const sendForm = document.querySelector('#sendForm');
    if (!sendForm) return;

    const tokenSelect = sendForm.querySelector('[name="token"]');
    const addressInput = sendForm.querySelector('[name="address"]');
    const amountInput = sendForm.querySelector('[name="amount"]');
    const submitBtn = sendForm.querySelector('button[type="submit"]');

    if (submitBtn) {
      submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const token = tokenSelect?.value || this.selectedTokenForSend;
        const address = addressInput?.value;
        const amount = parseFloat(amountInput?.value);

        if (!address || !amount || amount <= 0) {
          this.showToast('모든 필드를 올바르게 입력하세요', 'error');
          return;
        }

        if (!this.isValidAddress(address)) {
          this.showToast('올바른 주소가 아닙니다', 'error');
          return;
        }

        try {
          // Get gas estimate
          const gasEstimate = await this.walletBlockchain.estimateGas('transfer', {
            to: address,
            amount: amount,
            token: token
          });

          // Show confirmation
          const confirmed = await this.showSendConfirmation(token, address, amount, gasEstimate);
          if (!confirmed) return;

          // Get PIN confirmation
          const pinConfirmed = await this.showPinConfirmation(() => {
            this.showToast('거래를 처리 중입니다...', 'info');
          });

          if (!pinConfirmed) {
            this.showToast('거래가 취소되었습니다', 'warning');
            return;
          }

          // Send transaction
          const txHash = await this.walletTransactions.sendTransaction({
            to: address,
            amount: amount,
            token: token
          });

          this.showToast(`거래가 전송되었습니다: ${txHash.substring(0, 10)}...`, 'success');

          const modal = sendForm.closest('.modal');
          if (modal) modal.style.display = 'none';

          // Clear form
          if (addressInput) addressInput.value = '';
          if (amountInput) amountInput.value = '';

          // Refresh history
          setTimeout(() => this.updateTransactionHistory(), 2000);
        } catch (error) {
          console.error('거래 전송 실패:', error);
          this.showToast(error.message || '거래 전송 실패', 'error');
        }
      });
    }
  }

  // Receive modal
  setupReceiveModal() {
    const receiveModal = document.querySelector('#receiveModal');
    if (!receiveModal) return;

    const address = this.walletCore.getAddress();
    const addressDisplay = receiveModal.querySelector('[data-address]');

    if (addressDisplay) {
      addressDisplay.textContent = address;
    }

    // Generate QR code
    const qrContainer = receiveModal.querySelector('[data-qr]');
    if (qrContainer && window.QRCode) {
      qrContainer.innerHTML = '';
      new window.QRCode(qrContainer, {
        text: address,
        width: 200,
        height: 200,
        colorDark: '#FF6B35',
        colorLight: '#1a1f35'
      });
    }

    const copyBtn = receiveModal.querySelector('[data-copy-address]');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(address).then(() => {
          this.showToast('주소가 복사되었습니다', 'success');
        });
      });
    }
  }

  // Swap modal
  setupSwapModal() {
    const swapForm = document.querySelector('#swapForm');
    if (!swapForm) return;

    const fromToken = swapForm.querySelector('[name="from-token"]');
    const toToken = swapForm.querySelector('[name="to-token"]');
    const fromAmount = swapForm.querySelector('[name="from-amount"]');
    const toAmount = swapForm.querySelector('[name="to-amount"]');
    const submitBtn = swapForm.querySelector('button[type="submit"]');

    const fetchSwapQuote = async () => {
      if (!fromAmount.value || parseFloat(fromAmount.value) <= 0) return;

      try {
        clearTimeout(this.swapQuoteTimer);
        this.swapQuoteTimer = setTimeout(async () => {
          const quote = await this.walletBlockchain.getSwapQuote(
            fromToken.value,
            toToken.value,
            parseFloat(fromAmount.value)
          );

          toAmount.value = quote.outputAmount.toFixed(6);

          // Show price impact
          const priceImpact = quote.priceImpact || 0;
          const impactElement = swapForm.querySelector('[data-price-impact]');
          if (impactElement) {
            impactElement.textContent = `가격 영향: ${priceImpact.toFixed(2)}%`;
            impactElement.className = priceImpact > 5 ? 'warning' : '';
          }
        }, 500);
      } catch (error) {
        console.error('스왑 견적 조회 실패:', error);
      }
    };

    fromAmount.addEventListener('input', fetchSwapQuote);
    fromToken.addEventListener('change', fetchSwapQuote);
    toToken.addEventListener('change', fetchSwapQuote);

    if (submitBtn) {
      submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const amount = parseFloat(fromAmount.value);
        if (!amount || amount <= 0) {
          this.showToast('올바른 금액을 입력하세요', 'error');
          return;
        }

        try {
          // Show confirmation
          const confirmed = await this.showSwapConfirmation(
            fromToken.value,
            toToken.value,
            amount,
            parseFloat(toAmount.value)
          );

          if (!confirmed) return;

          // Check allowance and approve if needed
          const needsApproval = await this.walletBlockchain.checkAllowance(
            fromToken.value,
            amount
          );

          if (needsApproval) {
            this.showToast('토큰 승인 중...', 'info');
            await this.walletTransactions.approveToken(fromToken.value);
            this.showToast('토큰이 승인되었습니다', 'success');
          }

          // Get PIN confirmation
          const pinConfirmed = await this.showPinConfirmation();
          if (!pinConfirmed) {
            this.showToast('스왑이 취소되었습니다', 'warning');
            return;
          }

          // Execute swap
          const txHash = await this.walletTransactions.executeSwap(
            fromToken.value,
            toToken.value,
            amount
          );

          this.showToast(`스왑이 실행되었습니다: ${txHash.substring(0, 10)}...`, 'success');

          const modal = swapForm.closest('.modal');
          if (modal) modal.style.display = 'none';

          fromAmount.value = '';
          toAmount.value = '';
          setTimeout(() => this.updateTransactionHistory(), 2000);
        } catch (error) {
          console.error('스왑 실행 실패:', error);
          this.showToast(error.message || '스왑 실행 실패', 'error');
        }
      });
    }
  }

  // Buy modal
  setupBuyModal() {
    const buyForm = document.querySelector('#buyForm');
    if (!buyForm) return;

    const token = buyForm.querySelector('[name="token"]');
    const amount = buyForm.querySelector('[name="amount"]');
    const submitBtn = buyForm.querySelector('button[type="submit"]');

    if (submitBtn) {
      submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const selectedToken = token?.value || 'BNB';
        const selectedAmount = parseFloat(amount?.value);

        if (!selectedAmount || selectedAmount <= 0) {
          this.showToast('올바른 금액을 입력하세요', 'error');
          return;
        }

        try {
          // Redirect to payment gateway
          const paymentUrl = this.walletConfig.getPaymentGatewayUrl(selectedToken, selectedAmount);
          window.open(paymentUrl, '_blank');

          const modal = buyForm.closest('.modal');
          if (modal) modal.style.display = 'none';
        } catch (error) {
          console.error('구매 실패:', error);
          this.showToast('구매 페이지를 열 수 없습니다', 'error');
        }
      });
    }
  }

  // Setup network selector
  setupNetworkSelector() {
    const networkSelector = document.querySelector('#networkSelector');
    if (!networkSelector) return;

    const enabledNetworks = window.WalletConfig.getEnabledNetworks?.() || ['bsc'];
    const networkNames = {
      'bsc': 'BNB Chain',
      'bscTestnet': 'BSC Testnet',
      'ethereum': 'Ethereum',
      'ethereumSepolia': 'Ethereum Sepolia'
    };

    const currentNetwork = this.walletBlockchain.currentNetwork || 'bsc';

    networkSelector.innerHTML = `
      <button class="network-current">${networkNames[currentNetwork] || 'BNB Chain'}</button>
      <div class="network-dropdown">
        ${enabledNetworks.map(net => `
          <button class="network-option ${net === currentNetwork ? 'active' : ''}" data-network="${net}">${networkNames[net] || net}</button>
        `).join('')}
      </div>
    `;

    const currentBtn = networkSelector.querySelector('.network-current');
    const options = networkSelector.querySelectorAll('.network-option');

    currentBtn.addEventListener('click', () => {
      networkSelector.classList.toggle('open');
    });

    options.forEach(option => {
      option.addEventListener('click', async () => {
        const network = option.dataset.network;
        try {
          const stopLoading = this.showLoading(networkSelector, '네트워크 변경 중...');
          await this.walletBlockchain.switchNetwork(network);
          stopLoading();
          currentBtn.textContent = option.textContent;
          networkSelector.classList.remove('open');
          options.forEach(o => o.classList.remove('active'));
          option.classList.add('active');
          this.loadDashboard();
          this.showToast('네트워크가 변경되었습니다', 'success');
        } catch (error) {
          console.error('네트워크 변경 실패:', error);
          this.showToast('네트워크 변경 실패', 'error');
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!networkSelector.contains(e.target)) {
        networkSelector.classList.remove('open');
      }
    });
  }

  // Settings panel
  setupSettingsPanel() {
    const settingsBtn = document.querySelector('#settingsBtn');
    if (!settingsBtn) return;

    settingsBtn.addEventListener('click', () => {
      this.showSettingsPanel();
    });
  }

  showSettingsPanel() {
    const enabledNetworks = window.WalletConfig.getEnabledNetworks?.() || ['bsc'];
    const isEthEnabled = enabledNetworks.includes('ethereum');
    const isSepoliaEnabled = enabledNetworks.includes('ethereumSepolia');

    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.innerHTML = `
      <div class="settings-panel">
        <div class="settings-header">
          <h2>설정</h2>
          <button class="settings-close-btn">✕</button>
        </div>
        <div class="settings-content">
          <div class="settings-section">
            <h3>네트워크 관리</h3>
            <div class="network-toggle-list">
              <div class="network-toggle-item">
                <div class="network-toggle-info">
                  <span class="network-toggle-name">BNB Smart Chain</span>
                  <span class="network-toggle-desc">기본 네트워크</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" checked disabled>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="network-toggle-item">
                <div class="network-toggle-info">
                  <span class="network-toggle-name">Ethereum</span>
                  <span class="network-toggle-desc">선택적 활성화</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="ethToggle" ${isEthEnabled ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="network-toggle-item">
                <div class="network-toggle-info">
                  <span class="network-toggle-name">Ethereum Sepolia</span>
                  <span class="network-toggle-desc">테스트넷</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="ethSepoliaToggle" ${isSepoliaEnabled ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
          <div class="settings-section">
            <h3>커스텀 토큰</h3>
            <p class="settings-desc">컨트랙트 주소로 토큰을 직접 추가할 수 있습니다.</p>
            <div class="custom-token-list" id="customTokenList"></div>
            <button class="add-custom-token-btn" id="addCustomTokenBtn">+ 토큰 추가</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Load custom tokens list
    this.refreshCustomTokenList();

    // Close button
    overlay.querySelector('.settings-close-btn').addEventListener('click', () => {
      overlay.remove();
    });

    // Close on outside click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // Ethereum toggle
    const ethToggle = overlay.querySelector('#ethToggle');
    if (ethToggle) {
      ethToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        window.WalletConfig.toggleNetwork('ethereum', enabled);

        if (enabled) {
          await this.walletBlockchain.enableNetwork('ethereum');
          this.showToast('Ethereum 네트워크가 활성화되었습니다', 'success');
        } else {
          try {
            this.walletBlockchain.disableNetwork('ethereum');
            this.showToast('Ethereum 네트워크가 비활성화되었습니다', 'info');
          } catch(err) {
            e.target.checked = true;
            this.showToast(err.message, 'error');
          }
        }

        // Refresh network selector
        this.setupNetworkSelector();
      });
    }

    // Ethereum Sepolia testnet toggle
    const ethSepoliaToggle = overlay.querySelector('#ethSepoliaToggle');
    if (ethSepoliaToggle) {
      ethSepoliaToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        window.WalletConfig.toggleNetwork('ethereumSepolia', enabled);

        if (enabled) {
          try {
            await this.walletBlockchain.enableNetwork('ethereumSepolia');
            this.showToast('Ethereum Sepolia 테스트넷이 활성화되었습니다', 'success');
          } catch (err) {
            e.target.checked = false;
            window.WalletConfig.toggleNetwork('ethereumSepolia', false);
            this.showToast(err.message || 'Failed to enable network', 'error');
          }
        } else {
          try {
            this.walletBlockchain.disableNetwork('ethereumSepolia');
            this.showToast('Ethereum Sepolia 테스트넷이 비활성화되었습니다', 'info');
          } catch (err) {
            e.target.checked = true;
            window.WalletConfig.toggleNetwork('ethereumSepolia', true);
            this.showToast(err.message, 'error');
          }
        }

        this.setupNetworkSelector();
      });
    }

    // Add custom token button
    const addBtn = overlay.querySelector('#addCustomTokenBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.showAddCustomTokenModal();
      });
    }
  }

  refreshCustomTokenList() {
    const listEl = document.querySelector('#customTokenList');
    if (!listEl) return;

    const currentNetwork = this.walletBlockchain.currentNetwork || 'bsc';
    const customTokens = window.WalletConfig.getCustomTokens(currentNetwork);

    if (Object.keys(customTokens).length === 0) {
      listEl.innerHTML = '<p class="no-custom-tokens">추가된 커스텀 토큰이 없습니다</p>';
      return;
    }

    listEl.innerHTML = Object.entries(customTokens).map(([symbol, token]) => `
      <div class="custom-token-item" data-symbol="${symbol}">
        <div class="custom-token-info">
          <span class="custom-token-symbol">${symbol}</span>
          <span class="custom-token-name">${token.name}</span>
          <span class="custom-token-address">${token.address.substring(0, 6)}...${token.address.substring(token.address.length - 4)}</span>
        </div>
        <button class="remove-custom-token-btn" data-symbol="${symbol}">✕</button>
      </div>
    `).join('');

    // Remove buttons
    listEl.querySelectorAll('.remove-custom-token-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sym = e.target.dataset.symbol;
        if (confirm(`${sym} 토큰을 제거하시겠습니까?`)) {
          window.WalletConfig.removeCustomToken(currentNetwork, sym);
          this.refreshCustomTokenList();
          this.showToast(`${sym} 토큰이 제거되었습니다`, 'success');
        }
      });
    });
  }

  // Custom token modal
  setupCustomTokenModal() {
    // Will be triggered from settings panel
  }

  showAddCustomTokenModal() {
    const modal = document.createElement('div');
    modal.className = 'custom-token-modal';
    modal.innerHTML = `
      <div class="custom-token-modal-content">
        <h2>커스텀 토큰 추가</h2>
        <div class="custom-token-form">
          <div class="form-group">
            <label>컨트랙트 주소</label>
            <input type="text" id="customTokenAddress" placeholder="0x..." class="form-input">
            <div class="token-loading" style="display:none;">토큰 정보 조회 중...</div>
          </div>
          <div class="form-group">
            <label>토큰 심볼</label>
            <input type="text" id="customTokenSymbol" placeholder="자동 입력" class="form-input" readonly>
          </div>
          <div class="form-group">
            <label>토큰 이름</label>
            <input type="text" id="customTokenName" placeholder="자동 입력" class="form-input" readonly>
          </div>
          <div class="form-group">
            <label>소수점 자릿수</label>
            <input type="number" id="customTokenDecimals" placeholder="자동 입력" class="form-input" readonly>
          </div>
        </div>
        <div class="custom-token-buttons">
          <button class="btn-cancel" id="cancelCustomToken">취소</button>
          <button class="btn-confirm" id="confirmCustomToken" disabled>추가</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const addressInput = modal.querySelector('#customTokenAddress');
    const symbolInput = modal.querySelector('#customTokenSymbol');
    const nameInput = modal.querySelector('#customTokenName');
    const decimalsInput = modal.querySelector('#customTokenDecimals');
    const loadingDiv = modal.querySelector('.token-loading');
    const confirmBtn = modal.querySelector('#confirmCustomToken');
    const cancelBtn = modal.querySelector('#cancelCustomToken');

    let tokenData = null;

    // Auto-fetch token info when address is entered
    let fetchTimer = null;
    addressInput.addEventListener('input', () => {
      const address = addressInput.value.trim();
      clearTimeout(fetchTimer);

      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        symbolInput.value = '';
        nameInput.value = '';
        decimalsInput.value = '';
        confirmBtn.disabled = true;
        tokenData = null;
        return;
      }

      loadingDiv.style.display = 'block';
      fetchTimer = setTimeout(async () => {
        try {
          const provider = this.walletBlockchain.getProvider();
          const erc20ABI = [
            'function symbol() view returns (string)',
            'function name() view returns (string)',
            'function decimals() view returns (uint8)'
          ];
          const contract = new ethers.Contract(address, erc20ABI, provider);

          const [symbol, name, decimals] = await Promise.all([
            contract.symbol(),
            contract.name(),
            contract.decimals()
          ]);

          symbolInput.value = symbol;
          nameInput.value = name;
          decimalsInput.value = decimals.toString();
          loadingDiv.style.display = 'none';

          tokenData = { address, symbol, name, decimals: Number(decimals) };
          confirmBtn.disabled = false;
        } catch (error) {
          loadingDiv.style.display = 'none';
          symbolInput.value = '';
          nameInput.value = '';
          decimalsInput.value = '';
          confirmBtn.disabled = true;
          tokenData = null;
          this.showToast('유효하지 않은 토큰 컨트랙트 주소입니다', 'error');
        }
      }, 800);
    });

    // Cancel
    cancelBtn.addEventListener('click', () => modal.remove());

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Confirm add
    confirmBtn.addEventListener('click', () => {
      if (!tokenData) return;

      const currentNetwork = this.walletBlockchain.currentNetwork || 'bsc';

      // Check if already exists
      const existing = window.WalletConfig.getAllTokens(currentNetwork);
      if (existing[tokenData.symbol]) {
        this.showToast(`${tokenData.symbol} 토큰이 이미 존재합니다`, 'warning');
        return;
      }

      const success = window.WalletConfig.addCustomToken(currentNetwork, tokenData);
      if (success) {
        this.showToast(`${tokenData.symbol} 토큰이 추가되었습니다`, 'success');
        this.refreshCustomTokenList();
        modal.remove();

        // Refresh balances
        if (!this.isLocked) {
          this.loadDashboard();
        }
      } else {
        this.showToast('토큰 추가에 실패했습니다', 'error');
      }
    });
  }

  // Setup chart time buttons
  setupChartTimeButtons() {
    const timeButtons = document.querySelectorAll('.time-btn');
    timeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        timeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTimeRange = btn.dataset.range || btn.textContent.toLowerCase();
        this.updateChart(this.currentToken, this.currentTimeRange);
      });
    });
  }

  // Setup transaction filters
  setupTransactionFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;

        const items = document.querySelectorAll('.transaction-item');
        items.forEach(item => {
          if (filter === 'all' || item.dataset.txType === filter) {
            item.style.display = 'block';
          } else {
            item.style.display = 'none';
          }
        });
      });
    });
  }

  // Show send confirmation
  async showSendConfirmation(token, address, amount, gasEstimate) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'confirmation-modal';
      modal.innerHTML = `
        <div class="confirmation-content">
          <h2>거래 확인</h2>
          <div class="confirmation-details">
            <div class="detail-row">
              <span>토큰:</span>
              <strong>${token}</strong>
            </div>
            <div class="detail-row">
              <span>수신 주소:</span>
              <strong>${address.substring(0, 10)}...${address.substring(address.length - 8)}</strong>
            </div>
            <div class="detail-row">
              <span>금액:</span>
              <strong>${amount} ${token}</strong>
            </div>
            <div class="detail-row">
              <span>가스비:</span>
              <strong>${gasEstimate.toFixed(6)} BNB</strong>
            </div>
          </div>
          <div class="confirmation-buttons">
            <button class="btn-cancel">취소</button>
            <button class="btn-confirm">확인</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('.btn-cancel').addEventListener('click', () => {
        modal.remove();
        resolve(false);
      });

      modal.querySelector('.btn-confirm').addEventListener('click', () => {
        modal.remove();
        resolve(true);
      });
    });
  }

  // Show swap confirmation
  async showSwapConfirmation(fromToken, toToken, fromAmount, toAmount) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'confirmation-modal';
      modal.innerHTML = `
        <div class="confirmation-content">
          <h2>스왑 확인</h2>
          <div class="swap-flow">
            <div class="token-amount">
              <span class="amount">${fromAmount}</span>
              <span class="token">${fromToken}</span>
            </div>
            <div class="swap-arrow">⇄</div>
            <div class="token-amount">
              <span class="amount">${toAmount.toFixed(6)}</span>
              <span class="token">${toToken}</span>
            </div>
          </div>
          <div class="confirmation-buttons">
            <button class="btn-cancel">취소</button>
            <button class="btn-confirm">확인</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('.btn-cancel').addEventListener('click', () => {
        modal.remove();
        resolve(false);
      });

      modal.querySelector('.btn-confirm').addEventListener('click', () => {
        modal.remove();
        resolve(true);
      });
    });
  }

  // Show transaction detail
  showTransactionDetail(tx) {
    const modal = document.createElement('div');
    modal.className = 'tx-detail-modal';
    modal.innerHTML = `
      <div class="tx-detail-content">
        <h2>거래 상세</h2>
        <div class="tx-detail">
          <div class="detail-row">
            <span>유형:</span>
            <strong>${escapeHtml(this.getTransactionTypeText(tx.type))}</strong>
          </div>
          <div class="detail-row">
            <span>금액:</span>
            <strong>${escapeHtml(tx.amount)} ${escapeHtml(tx.token)}</strong>
          </div>
          <div class="detail-row">
            <span>상태:</span>
            <strong>${escapeHtml(this.getTransactionStatusText(tx.status))}</strong>
          </div>
          <div class="detail-row">
            <span>해시:</span>
            <code>${escapeHtml(tx.hash)}</code>
          </div>
          <div class="detail-row">
            <span>시간:</span>
            <strong>${escapeHtml(new Date(tx.timestamp * 1000).toLocaleString('ko-KR'))}</strong>
          </div>
          ${tx.to ? `
            <div class="detail-row">
              <span>수신자:</span>
              <code>${escapeHtml(tx.to)}</code>
            </div>
          ` : ''}
        </div>
        <div class="tx-detail-buttons">
          <button class="btn-close">닫기</button>
          <button class="btn-explorer">블록 익스플로러 보기</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.btn-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('.btn-explorer')?.addEventListener('click', () => {
      const explorerUrl = this.walletBlockchain.getExplorerUrl(tx.hash);
      window.open(explorerUrl, '_blank');
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Show account menu
  showAccountMenu() {
    const menu = document.createElement('div');
    menu.className = 'account-menu';
    menu.innerHTML = `
      <button class="menu-item settings-btn">설정</button>
      <button class="menu-item lock-wallet-btn">지갑 잠금</button>
      <button class="menu-item export-wallet-btn">개인키 내보내기</button>
      <button class="menu-item disconnect-btn">연결 해제</button>
    `;

    document.body.appendChild(menu);

    menu.querySelector('.settings-btn').addEventListener('click', () => {
      menu.remove();
      this.showSettingsPanel();
    });

    menu.querySelector('.lock-wallet-btn').addEventListener('click', () => {
      this.walletCore.lockWallet();
      this.isLocked = true;
      menu.remove();
      this.showPinEntry();
      window.dispatchEvent(new CustomEvent('walletLocked'));
    });

    menu.querySelector('.export-wallet-btn').addEventListener('click', () => {
      this.showToast('개인키 내보내기는 보안 상 비활성화되어 있습니다', 'warning');
    });

    menu.querySelector('.disconnect-btn').addEventListener('click', () => {
      if (confirm('지갑을 연결 해제하시겠습니까?')) {
        this.walletCore.lockWallet();
        this.isLocked = true;
        menu.remove();
        window.location.reload();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && e.target !== document.querySelector('#walletBtn')) {
        menu.remove();
      }
    });
  }

  // Toast notification
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${this.getToastIcon(type)}</span>
      <span class="toast-message">${message}</span>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  // Show loading state
  showLoading(element, message = '로딩 중...') {
    const loader = document.createElement('div');
    loader.className = 'loader-overlay';
    loader.innerHTML = `
      <div class="loader-content">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;

    element.appendChild(loader);

    return () => {
      loader.remove();
    };
  }

  // Format relative time
  formatRelativeTime(timestamp) {
    const now = Date.now() / 1000;
    const diff = Math.floor(now - timestamp);

    if (diff < 60) return '방금';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;

    return new Date(timestamp * 1000).toLocaleDateString('ko-KR');
  }

  // Helper methods
  getTokenIcon(token) {
    const icons = {
      'BNB': '🔶',
      'ETH': '⟠',
      'USDT': '₮',
      'USDC': '◎',
      'BUSD': '🅱️'
    };
    return icons[token] || '💰';
  }

  getTransactionIcon(type) {
    const icons = {
      'send': '↑',
      'receive': '↓',
      'swap': '⇄',
      'approve': '✓'
    };
    return icons[type] || '→';
  }

  getTransactionTypeText(type) {
    const texts = {
      'send': '전송',
      'receive': '수신',
      'swap': '스왑',
      'approve': '승인'
    };
    return texts[type] || type;
  }

  getTransactionStatusText(status) {
    const texts = {
      'pending': '대기중',
      'confirmed': '완료',
      'failed': '실패'
    };
    return texts[status] || status;
  }

  getToastIcon(type) {
    const icons = {
      'success': '✓',
      'error': '✕',
      'info': 'ℹ',
      'warning': '⚠'
    };
    return icons[type] || '•';
  }

  showBackupModal(initialTab = 'seed') {
    if (this.isLocked) {
      this.showToast('Please unlock your wallet first', 'warning');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'pin-confirmation-overlay';
    overlay.innerHTML = `
      <div class="pin-confirmation-container" style="max-width:380px;width:90%;">
        <div class="pin-confirmation-header">
          <h1>🔐 Wallet Backup</h1>
          <p>Enter password to view backup information</p>
        </div>
        <div class="pin-display">
          <div class="pin-keyboard-wrapper">
            <input type="password" class="pin-input pin-keyboard-input" maxlength="20" placeholder="••••••••" autocomplete="current-password">
            <button class="pin-toggle-btn" type="button" aria-label="Toggle visibility">
              <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg class="eye-off-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>
        <button class="onboarding-btn pin-backup-confirm-btn" disabled style="margin-top:8px;">Confirm</button>
        <div class="pin-error" style="display:none;color:#ff4444;text-align:center;margin-top:8px;font-size:13px;"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('.pin-input');
    const confirmBtn = overlay.querySelector('.pin-backup-confirm-btn');
    const toggleBtn = overlay.querySelector('.pin-toggle-btn');
    const errorDiv = overlay.querySelector('.pin-error');
    let attempts = 0;

    toggleBtn.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggleBtn.querySelector('.eye-icon').style.display = isPassword ? 'none' : '';
      toggleBtn.querySelector('.eye-off-icon').style.display = isPassword ? '' : 'none';
    });

    input.addEventListener('input', () => {
      confirmBtn.disabled = input.value.length < 1;
      errorDiv.style.display = 'none';
    });

    const tryConfirm = async () => {
      const pin = input.value;
      if (pin.length < 1) return;
      const valid = await this.walletCore.validatePin(pin);
      if (valid) {
        overlay.remove();
        this._showBackupContent(pin, initialTab);
      } else {
        attempts++;
        input.value = '';
        confirmBtn.disabled = true;
        errorDiv.textContent = `Incorrect password (${attempts}/3)`;
        errorDiv.style.display = 'block';
        if (attempts >= 3) { overlay.remove(); }
      }
    };

    confirmBtn.addEventListener('click', tryConfirm);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryConfirm(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    setTimeout(() => input.focus(), 100);
  }

  async _showBackupContent(pin, initialTab) {
    let mnemonic = null;
    let privateKey = null;

    try {
      mnemonic = await this.walletCore.exportMnemonic(pin);
    } catch (e) { /* no mnemonic */ }

    try {
      const encDataStr = localStorage.getItem('funs_wallet_data');
      if (encDataStr) {
        const encData = JSON.parse(encDataStr);
        privateKey = await this.walletCore._decryptPrivateKey(encData, pin);
      }
    } catch (e) { /* ignore */ }

    const overlay = document.createElement('div');
    overlay.className = 'pin-confirmation-overlay';
    overlay.innerHTML = `
      <div class="pin-confirmation-container" style="max-width:420px;width:92%;max-height:85vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="font-size:18px;font-weight:700;">🔐 Wallet Backup</h2>
          <button id="backupCloseBtn" style="background:none;border:none;color:rgba(255,255,255,0.5);font-size:22px;cursor:pointer;padding:4px;">✕</button>
        </div>
        <div style="background:rgba(255,100,50,0.12);border:1px solid rgba(255,100,50,0.3);border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#FF6B35;">
          ⚠️ Never share this with anyone. Anyone with this information has full access to your wallet.
        </div>
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <button class="backup-tab-btn" data-tab="seed" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:${initialTab === 'seed' ? 'var(--primary)' : 'rgba(255,255,255,0.05)'};color:white;font-size:13px;cursor:pointer;">Seed Phrase</button>
          <button class="backup-tab-btn" data-tab="key" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:${initialTab !== 'seed' ? 'var(--primary)' : 'rgba(255,255,255,0.05)'};color:white;font-size:13px;cursor:pointer;">Private Key</button>
        </div>
        <div id="backupSeedPanel" style="display:${initialTab === 'seed' ? 'block' : 'none'};">
          ${mnemonic ? `
            <p style="font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:12px;">Write down these 12 words and store them in a safe place.</p>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
              ${mnemonic.split(' ').map((w, i) => `<div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:8px 10px;font-size:13px;"><span style="color:rgba(255,255,255,0.4);font-size:11px;display:block;">${i + 1}</span>${w}</div>`).join('')}
            </div>
            <button id="copySeedBtn" style="width:100%;padding:12px;background:var(--primary);border:none;border-radius:12px;color:white;font-size:14px;font-weight:600;cursor:pointer;">Copy Seed Phrase</button>
          ` : `<p style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">No seed phrase backup available.</p>`}
        </div>
        <div id="backupKeyPanel" style="display:${initialTab !== 'seed' ? 'block' : 'none'};">
          ${privateKey ? `
            <p style="font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:12px;">Store your private key in a safe place.</p>
            <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:14px;word-break:break-all;font-size:12px;font-family:monospace;margin-bottom:14px;">${privateKey}</div>
            <button id="copyKeyBtn" style="width:100%;padding:12px;background:var(--primary);border:none;border-radius:12px;color:white;font-size:14px;font-weight:600;cursor:pointer;">Copy Private Key</button>
          ` : `<p style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">Unable to load private key.</p>`}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#backupCloseBtn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelectorAll('.backup-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        overlay.querySelectorAll('.backup-tab-btn').forEach(b => {
          b.style.background = b.dataset.tab === tab ? 'var(--primary)' : 'rgba(255,255,255,0.05)';
        });
        overlay.querySelector('#backupSeedPanel').style.display = tab === 'seed' ? 'block' : 'none';
        overlay.querySelector('#backupKeyPanel').style.display = tab !== 'seed' ? 'block' : 'none';
      });
    });

    const copySeedBtn = overlay.querySelector('#copySeedBtn');
    if (copySeedBtn) {
      copySeedBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(mnemonic).then(() => {
          copySeedBtn.textContent = 'Copied ✓';
          setTimeout(() => { copySeedBtn.textContent = 'Copy Seed Phrase'; }, 2000);
        });
      });
    }

    const copyKeyBtn = overlay.querySelector('#copyKeyBtn');
    if (copyKeyBtn) {
      copyKeyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(privateKey).then(() => {
          copyKeyBtn.textContent = 'Copied ✓';
          setTimeout(() => { copyKeyBtn.textContent = 'Copy Private Key'; }, 2000);
        });
      });
    }
  }

  isValidAddress(address) {
    // Simple validation for BSC/Ethereum addresses
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  window.walletUI = new WalletUI();
  window.walletUI.init();
});
