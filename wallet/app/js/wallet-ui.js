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

      // Initialize blockchain providers (non-blocking)
      try {
        await this.walletBlockchain.init();
      } catch (networkError) {
        console.warn('[FunS] 블록체인 네트워크 연결 대기 중:', networkError.message);
      }
    } catch (error) {
      console.warn('[FunS] 초기화:', error.message);
    }
  }

  // Onboarding screen
  showOnboarding() {
    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.innerHTML = `
      <div class="onboarding-container">
        <div class="onboarding-logo">
          <img src="../../funs-nugi.png" alt="FunS" style="width:72px;height:72px;border-radius:50%;margin-bottom:16px;">
        </div>
        <div class="onboarding-header">
          <h1>FunS Wallet</h1>
          <p>블록체인 자산을 안전하게 관리하세요</p>
        </div>
        <div class="onboarding-options">
          <button class="onboarding-btn demo-wallet-btn" style="background:linear-gradient(135deg, var(--primary,#FF6B35) 0%, #FF8C52 100%); border:none; color:white; justify-content:center;">
            <span class="text">🚀 테스트 버전으로 둘러보기</span>
          </button>
          <div class="onboarding-divider" style="display:flex;align-items:center;gap:12px;margin:8px 0;"><span style="flex:1;height:1px;background:rgba(255,255,255,0.08);"></span><span style="color:rgba(255,255,255,0.3);font-size:12px;">또는</span><span style="flex:1;height:1px;background:rgba(255,255,255,0.08);"></span></div>
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

    // Demo mode - skip wallet creation, show dashboard directly
    overlay.querySelector('.demo-wallet-btn').addEventListener('click', () => {
      overlay.remove();
      this.isLocked = false;
      this.showToast('테스트 모드로 실행 중', 'success');
    });

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
    let pin = '';
    let confirmPin = '';
    let confirmingPin = false;

    const container = overlay.querySelector('.onboarding-container');
    container.innerHTML = `
      <div class="onboarding-header">
        <h1>PIN 설정</h1>
        <p>6자리 PIN 번호를 설정하세요</p>
      </div>
      <div class="pin-display">
        <input type="password" class="pin-input" readonly maxlength="6">
      </div>
      <div class="pin-numpad">
        ${Array(10).fill(0).map((_, i) => `
          <button class="numpad-btn" data-num="${i}">
            <span class="num-text">${i}</span>
          </button>
        `).join('')}
        <button class="numpad-btn delete-btn" data-delete>
          <span class="num-text">⌫</span>
        </button>
        <button class="numpad-btn clear-btn" data-clear>
          <span class="num-text">C</span>
        </button>
      </div>
      <button class="onboarding-btn pin-confirm-btn" disabled>확인</button>
    `;

    const input = container.querySelector('.pin-input');
    const numpadBtns = container.querySelectorAll('[data-num]');
    const deleteBtn = container.querySelector('[data-delete]');
    const clearBtn = container.querySelector('[data-clear]');
    const confirmBtn = container.querySelector('.pin-confirm-btn');

    const updateDisplay = () => {
      input.value = '●'.repeat(pin.length);
      confirmBtn.disabled = pin.length !== 6;
    };

    numpadBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (pin.length < 6) {
          pin += btn.dataset.num;
          updateDisplay();
        }
      });
    });

    deleteBtn.addEventListener('click', () => {
      pin = pin.slice(0, -1);
      updateDisplay();
    });

    clearBtn.addEventListener('click', () => {
      pin = '';
      updateDisplay();
    });

    confirmBtn.addEventListener('click', () => {
      if (!confirmingPin) {
        confirmPin = pin;
        pin = '';
        updateDisplay();
        container.querySelector('.onboarding-header h1').textContent = 'PIN 확인';
        container.querySelector('.onboarding-header p').textContent = 'PIN을 다시 입력하세요';
        confirmingPin = true;
      } else {
        if (pin === confirmPin) {
          this.createWallet(mnemonic, confirmPin, flow, overlay);
        } else {
          this.showToast('PIN이 일치하지 않습니다', 'error');
          pin = '';
          confirmPin = '';
          confirmingPin = false;
          updateDisplay();
          container.querySelector('.onboarding-header h1').textContent = 'PIN 설정';
          container.querySelector('.onboarding-header p').textContent = '6자리 PIN 번호를 설정하세요';
        }
      }
    });
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
          <h1>PIN 입력</h1>
          <p>지갑을 열기 위해 PIN을 입력하세요</p>
        </div>
        <div class="pin-display">
          <input type="password" class="pin-input" readonly maxlength="6">
        </div>
        <div class="pin-numpad">
          ${Array(10).fill(0).map((_, i) => `
            <button class="numpad-btn" data-num="${i}">
              <span class="num-text">${i}</span>
            </button>
          `).join('')}
          <button class="numpad-btn delete-btn" data-delete>
            <span class="num-text">⌫</span>
          </button>
          <button class="numpad-btn clear-btn" data-clear>
            <span class="num-text">C</span>
          </button>
        </div>
        <button class="onboarding-btn demo-skip-btn" style="margin-top:16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);justify-content:center;font-size:14px;padding:14px;">
          테스트 모드로 건너뛰기
        </button>
        <div class="pin-error" style="display: none;"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('.pin-input');
    const numpadBtns = overlay.querySelectorAll('[data-num]');
    const deleteBtn = overlay.querySelector('[data-delete]');
    const clearBtn = overlay.querySelector('[data-clear]');
    const errorDiv = overlay.querySelector('.pin-error');
    let pin = '';

    const updateDisplay = () => {
      input.value = '●'.repeat(pin.length);
    };

    const tryUnlock = () => {
      try {
        this.walletCore.unlockWallet(pin);
        this.pinAttempts = 0;
        overlay.remove();
        this.isLocked = false;
        this.loadDashboard();
        window.dispatchEvent(new CustomEvent('walletUnlocked'));
      } catch (error) {
        this.pinAttempts++;
        errorDiv.textContent = `PIN이 잘못되었습니다 (${this.pinAttempts}/${this.maxPinAttempts})`;
        errorDiv.style.display = 'block';
        input.parentElement.classList.add('shake');
        setTimeout(() => {
          input.parentElement.classList.remove('shake');
        }, 500);
        pin = '';
        updateDisplay();

        if (this.pinAttempts >= this.maxPinAttempts) {
          errorDiv.textContent = '시도 횟수 초과. 앱을 다시 시작하세요.';
          overlay.querySelectorAll('button').forEach(btn => btn.disabled = true);
        }
      }
    };

    numpadBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (pin.length < 6) {
          pin += btn.dataset.num;
          updateDisplay();
          if (pin.length === 6) {
            setTimeout(tryUnlock, 300);
          }
        }
      });
    });

    deleteBtn.addEventListener('click', () => {
      pin = pin.slice(0, -1);
      updateDisplay();
      errorDiv.style.display = 'none';
    });

    clearBtn.addEventListener('click', () => {
      pin = '';
      updateDisplay();
      errorDiv.style.display = 'none';
    });

    // Demo skip button
    const demoBtn = overlay.querySelector('.demo-skip-btn');
    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        overlay.remove();
        this.isLocked = false;
        this.showToast('테스트 모드로 실행 중', 'success');
      });
    }
  }

  // PIN confirmation for transactions
  showPinConfirmation(callback) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'pin-confirmation-overlay';
      overlay.innerHTML = `
        <div class="pin-confirmation-container">
          <div class="pin-confirmation-header">
            <h1>거래 확인</h1>
            <p>PIN을 입력하여 거래를 확인하세요</p>
          </div>
          <div class="pin-display">
            <input type="password" class="pin-input" readonly maxlength="6">
          </div>
          <div class="pin-numpad">
            ${Array(10).fill(0).map((_, i) => `
              <button class="numpad-btn" data-num="${i}">
                <span class="num-text">${i}</span>
              </button>
            `).join('')}
            <button class="numpad-btn delete-btn" data-delete>
              <span class="num-text">⌫</span>
            </button>
            <button class="numpad-btn clear-btn" data-clear>
              <span class="num-text">C</span>
            </button>
          </div>
          <div class="pin-error" style="display: none;"></div>
        </div>
      `;

      document.body.appendChild(overlay);

      const input = overlay.querySelector('.pin-input');
      const numpadBtns = overlay.querySelectorAll('[data-num]');
      const deleteBtn = overlay.querySelector('[data-delete]');
      const clearBtn = overlay.querySelector('[data-clear]');
      const errorDiv = overlay.querySelector('.pin-error');
      let pin = '';
      let attempts = 0;

      const updateDisplay = () => {
        input.value = '●'.repeat(pin.length);
      };

      const tryConfirm = () => {
        try {
          this.walletCore.verifyPin(pin);
          overlay.remove();
          if (callback) callback();
          resolve(true);
        } catch (error) {
          attempts++;
          errorDiv.textContent = `PIN이 잘못되었습니다 (${attempts}/3)`;
          errorDiv.style.display = 'block';
          input.parentElement.classList.add('shake');
          setTimeout(() => {
            input.parentElement.classList.remove('shake');
          }, 500);
          pin = '';
          updateDisplay();

          if (attempts >= 3) {
            overlay.remove();
            resolve(false);
          }
        }
      };

      numpadBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (pin.length < 6) {
            pin += btn.dataset.num;
            updateDisplay();
            if (pin.length === 6) {
              setTimeout(tryConfirm, 300);
            }
          }
        });
      });

      deleteBtn.addEventListener('click', () => {
        pin = pin.slice(0, -1);
        updateDisplay();
        errorDiv.style.display = 'none';
      });

      clearBtn.addEventListener('click', () => {
        pin = '';
        updateDisplay();
        errorDiv.style.display = 'none';
      });

      // Close on ESC
      const closeOnEsc = (e) => {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', closeOnEsc);
          overlay.remove();
          resolve(false);
        }
      };
      document.addEventListener('keydown', closeOnEsc);
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
            <div class="tx-type">${this.getTransactionTypeText(tx.type)}</div>
            <div class="tx-time">${relativeTime}</div>
          </div>
          <div class="tx-amount">
            <div class="tx-value">${tx.type === 'send' ? '-' : '+'}${tx.amount} ${tx.token}</div>
            <div class="tx-status ${statusClass}">${statusText}</div>
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
      this.showToast(`거래 실패: ${e.detail.error}`, 'error');
    });
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
      'ethereum': 'Ethereum'
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
    // Bind the modal trigger button from settings panel
    const addCustomTokenBtn = document.getElementById('addCustomTokenBtn');
    const closeAddTokenModal = document.getElementById('closeAddTokenModal');
    const cancelAddToken = document.getElementById('cancelAddToken');
    const confirmAddToken = document.getElementById('confirmAddToken');

    if (addCustomTokenBtn) {
      addCustomTokenBtn.addEventListener('click', () => this.showAddCustomTokenModal());
    }

    if (closeAddTokenModal) {
      closeAddTokenModal.addEventListener('click', () => {
        const modal = document.querySelector('.custom-token-modal');
        if (modal) modal.remove();
      });
    }

    if (cancelAddToken) {
      cancelAddToken.addEventListener('click', () => {
        const modal = document.querySelector('.custom-token-modal');
        if (modal) modal.remove();
      });
    }

    if (confirmAddToken) {
      confirmAddToken.addEventListener('click', () => this.handleConfirmAddToken());
    }

    // Listen for token address input to fetch info
    this.setupTokenAddressInput();
  }

  /**
   * Setup event listener for token address input with auto-fetch capability
   */
  setupTokenAddressInput() {
    const observer = new MutationObserver(() => {
      const addressInput = document.getElementById('customTokenAddress');
      if (addressInput && !addressInput.hasTokenInputListener) {
        addressInput.addEventListener('input', (e) => this.handleTokenAddressInput(e));
        addressInput.hasTokenInputListener = true;
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Handle token address input with validation and auto-fetch
   * @param {Event} event - Input change event
   */
  async handleTokenAddressInput(event) {
    const address = event.target.value.trim();
    const symbolInput = document.getElementById('customTokenSymbol');
    const nameInput = document.getElementById('customTokenName');
    const decimalsInput = document.getElementById('customTokenDecimals');
    const confirmBtn = document.getElementById('confirmAddToken');
    const loadingDiv = document.querySelector('.token-loading');

    // Validate 42-character hex address (0x + 40 hex chars)
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      if (symbolInput) symbolInput.value = '';
      if (nameInput) nameInput.value = '';
      if (decimalsInput) decimalsInput.value = '';
      if (confirmBtn) confirmBtn.disabled = true;
      return;
    }

    // Show loading state
    if (loadingDiv) loadingDiv.style.display = 'block';

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

      if (symbolInput) symbolInput.value = symbol;
      if (nameInput) nameInput.value = name;
      if (decimalsInput) decimalsInput.value = decimals.toString();
      if (confirmBtn) confirmBtn.disabled = false;

      // Store for later use
      event.target.tokenData = { address, symbol, name, decimals: Number(decimals) };

      if (loadingDiv) loadingDiv.style.display = 'none';
    } catch (error) {
      if (symbolInput) symbolInput.value = '';
      if (nameInput) nameInput.value = '';
      if (decimalsInput) decimalsInput.value = '';
      if (confirmBtn) confirmBtn.disabled = true;
      if (loadingDiv) loadingDiv.style.display = 'none';
      this.showToast('유효하지 않은 토큰 컨트랙트 주소입니다', 'error');
    }
  }

  /**
   * Handle confirm button for adding custom token
   */
  handleConfirmAddToken() {
    const addressInput = document.getElementById('customTokenAddress');
    if (!addressInput || !addressInput.tokenData) return;

    const tokenData = addressInput.tokenData;
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
      const modal = document.querySelector('.custom-token-modal');
      if (modal) modal.remove();

      // Refresh balances
      if (!this.isLocked) {
        this.loadDashboard();
      }
    } else {
      this.showToast('토큰 추가에 실패했습니다', 'error');
    }
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
            <strong>${this.getTransactionTypeText(tx.type)}</strong>
          </div>
          <div class="detail-row">
            <span>금액:</span>
            <strong>${tx.amount} ${tx.token}</strong>
          </div>
          <div class="detail-row">
            <span>상태:</span>
            <strong>${this.getTransactionStatusText(tx.status)}</strong>
          </div>
          <div class="detail-row">
            <span>해시:</span>
            <code>${tx.hash}</code>
          </div>
          <div class="detail-row">
            <span>시간:</span>
            <strong>${new Date(tx.timestamp * 1000).toLocaleString('ko-KR')}</strong>
          </div>
          ${tx.to ? `
            <div class="detail-row">
              <span>수신자:</span>
              <code>${tx.to}</code>
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
