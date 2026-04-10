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
    this._dashboardLoading = false;
  }

  // Main initialization
  async init() {
    // Validate required window dependencies
    if (!window.WalletCore) { console.error('[FunS] WalletCore not loaded'); return; }
    if (!window.WalletConfig) { console.error('[FunS] WalletConfig not loaded'); return; }

    try {
      // Initialize i18n if available
      if (window.i18n && typeof window.i18n.init === 'function') {
        await window.i18n.init();
      }

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
        console.warn('[FunS] Blockchain network connection pending:', networkError.message);
      }

      // Listen to balancesUpdated from the blockchain layer's built-in refresh timer
      // This is the single source of UI refresh — no duplicate setInterval in loadDashboard
      this.walletBlockchain.addEventListener('balancesUpdated', (e) => {
        const result = e.detail?.balances;
        if (!result || !result.tokens) return;
        const balancesMap = {};
        for (const token of result.tokens) {
          balancesMap[token.symbol] = {
            balance: token.balance,
            usdValue: token.balanceUSD ? parseFloat(token.balanceUSD.replace('$', '')) : 0,
            change24h: token.change ? parseFloat(token.change) : 0,
            name: token.name,
            icon: token.icon,
            decimals: token.decimals,
            address: token.address
          };
        }
        this.updateBalanceDisplay(result.totalUSD);
        this.updateTokenList(balancesMap);
      });
    } catch (error) {
      console.warn('[FunS] Initialization:', error.message);
    }
  }

  // Onboarding screen
  showOnboarding() {
    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.innerHTML = `
      <div class="onboarding-container">
        <div class="onboarding-logo">
          <img src="./icons/funs-nugi.png" alt="FunS" style="width:72px;height:72px;border-radius:50%;margin-bottom:16px;">
        </div>
        <div class="onboarding-header">
          <h1>FunS Wallet</h1>
          <p>${window.i18n?.t('onboarding.subtitle') || 'Manage your blockchain assets securely'}</p>
        </div>
        <div class="onboarding-options">
          <button class="onboarding-btn demo-wallet-btn" style="background:linear-gradient(135deg, var(--primary,#FF6B35) 0%, #FF8C52 100%); border:none; color:white; justify-content:center;">
            <span class="text">${window.i18n?.t('onboarding.demo') || 'Explore demo version'}</span>
          </button>
          <div class="onboarding-divider" style="display:flex;align-items:center;gap:12px;margin:8px 0;"><span style="flex:1;height:1px;background:rgba(255,255,255,0.08);"></span><span style="color:rgba(255,255,255,0.3);font-size:12px;">${window.i18n?.t('onboarding.or') || 'or'}</span><span style="flex:1;height:1px;background:rgba(255,255,255,0.08);"></span></div>
          <button class="onboarding-btn create-wallet-btn">
            <span class="icon">+</span>
            <span class="text">${window.i18n?.t('onboarding.create') || 'Create New Wallet'}</span>
          </button>
          <button class="onboarding-btn import-wallet-btn">
            <span class="icon">⇄</span>
            <span class="text">${window.i18n?.t('onboarding.import') || 'Restore Existing Wallet'}</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Demo mode - skip wallet creation, show dashboard directly
    overlay.querySelector('.demo-wallet-btn').addEventListener('click', () => {
      overlay.remove();
      this.isLocked = false;
      this.showToast(window.i18n?.t('toast.demoMode') || 'Running in demo mode', 'success');
    });

    overlay.querySelector('.create-wallet-btn').addEventListener('click', () => {
      this.showCreateWalletFlow(overlay);
    });

    overlay.querySelector('.import-wallet-btn').addEventListener('click', () => {
      this.showImportWalletFlow(overlay);
    });
  }

  // Create wallet flow
  async showCreateWalletFlow(overlay) {
    try {
      const mnemonic = await this.walletCore.generateMnemonic();
      if (!mnemonic) {
        throw new Error(window.i18n?.t('error.mnemonicGenFail') || 'Unable to generate seed phrase');
      }
      const words = mnemonic.split(' ');
      this.tempMnemonic = mnemonic;

      const t = (key, fallback) => window.i18n?.t(key) || fallback;

      const container = overlay.querySelector('.onboarding-container');
      if (!container) return;

      container.innerHTML = `
        <div class="onboarding-content" style="padding-top: 10px;">
          <div class="seed-step-indicator">
            <div class="seed-step active"></div>
            <div class="seed-step"></div>
            <div class="seed-step"></div>
          </div>

          <div class="onboarding-header">
            <h1>${t('mnemonic.title', 'Seed Phrase')}</h1>
            <p>${t('mnemonic.warning', 'Write down these 12 words in a safe place')}</p>
          </div>

          <div class="seed-security-banner">
            <div class="security-icon">🔐</div>
            <div class="security-text">
              <h4>${t('mnemonic.securityTitle', 'Never share this')}</h4>
              <p>${t('mnemonic.keepSafe', 'Keep this seed phrase in a safe place. If lost, your wallet cannot be recovered.')}</p>
            </div>
          </div>

          <div class="mnemonic-reveal-container">
            <div class="mnemonic-blur-overlay" id="mnemonicBlurOverlay">
              <div class="reveal-icon">👁</div>
              <div class="reveal-text">${t('mnemonic.tapToReveal', 'Tap to reveal seed phrase')}</div>
              <div class="reveal-hint">${t('mnemonic.revealHint', 'Make sure no one is watching')}</div>
            </div>
            <div class="mnemonic-grid">
              ${words.map((word, index) => `
                <div class="mnemonic-item">
                  <span class="word-number">${String(index + 1).padStart(2, '0')}</span>
                  <span class="word-text">${word}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="seed-actions">
            <button class="seed-action-btn" id="copySeedBtn">
              <span class="action-icon">📋</span>
              ${t('mnemonic.copy', 'Copy')}
            </button>
            <button class="seed-action-btn" id="hideSeedBtn">
              <span class="action-icon">🙈</span>
              ${t('mnemonic.hide', 'Hide')}
            </button>
          </div>

          <div class="seed-checklist">
            <div class="seed-check-item" data-check="1">
              <div class="check-box">✓</div>
              <span class="check-label">${t('mnemonic.check1', 'I have written down the seed phrase on paper')}</span>
            </div>
            <div class="seed-check-item" data-check="2">
              <div class="check-box">✓</div>
              <span class="check-label">${t('mnemonic.check2', 'I have stored it in a safe place')}</span>
            </div>
            <div class="seed-check-item" data-check="3">
              <div class="check-box">✓</div>
              <span class="check-label">${t('mnemonic.check3', 'I have not taken a screenshot')}</span>
            </div>
          </div>

          <button class="onboarding-btn confirm-mnemonic-btn" disabled>${t('mnemonic.confirm', 'Verify Seed Phrase')}</button>
        </div>
      `;

      // Blur overlay reveal
      const overlay_el = container.querySelector('#mnemonicBlurOverlay');
      if (overlay_el) {
        overlay_el.addEventListener('click', () => {
          overlay_el.classList.add('revealed');
        });
      }

      // Copy button
      const copyBtn = container.querySelector('#copySeedBtn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(mnemonic).then(() => {
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = '<span class="action-icon">✅</span> ' + t('mnemonic.copied', 'Copied');
            setTimeout(() => {
              copyBtn.classList.remove('copied');
              copyBtn.innerHTML = '<span class="action-icon">📋</span> ' + t('mnemonic.copy', 'Copy');
            }, 3000);
          }).catch(() => {
            // Fallback copy
            const ta = document.createElement('textarea');
            ta.value = mnemonic;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = '<span class="action-icon">✅</span> ' + t('mnemonic.copied', 'Copied');
            setTimeout(() => {
              copyBtn.classList.remove('copied');
              copyBtn.innerHTML = '<span class="action-icon">📋</span> ' + t('mnemonic.copy', 'Copy');
            }, 3000);
          });
        });
      }

      // Hide/show toggle
      const hideBtn = container.querySelector('#hideSeedBtn');
      if (hideBtn) {
        hideBtn.addEventListener('click', () => {
          if (overlay_el.classList.contains('revealed')) {
            overlay_el.classList.remove('revealed');
            hideBtn.innerHTML = '<span class="action-icon">🙈</span> ' + t('mnemonic.hide', 'Hide');
          } else {
            overlay_el.classList.add('revealed');
            hideBtn.innerHTML = '<span class="action-icon">👁</span> ' + t('mnemonic.show', 'Show');
          }
        });
      }

      // Security checklist
      const checkItems = container.querySelectorAll('.seed-check-item');
      const confirmBtn = container.querySelector('.confirm-mnemonic-btn');
      checkItems.forEach(item => {
        item.addEventListener('click', () => {
          item.classList.toggle('checked');
          const allChecked = container.querySelectorAll('.seed-check-item.checked').length === 3;
          if (confirmBtn) confirmBtn.disabled = !allChecked;
        });
      });

      // Confirm button → verification
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => this.showMnemonicVerification(overlay, words));
      }

    } catch (error) {
      console.error('[FunS] Create wallet flow error:', error);
      this.showToast(error.message || (window.i18n?.t('error.mnemonicGenFail') || 'Unable to generate seed phrase'), 'error');
      overlay.remove();
      this.showOnboarding();
    }
  }

  // Verify mnemonic words by selecting correct options
  showMnemonicVerification(overlay, words) {
    try {
      const t = (key, fallback) => window.i18n?.t(key) || fallback;
      const container = overlay.querySelector('.onboarding-container');
      if (!container) return;

      // Pick 3 random positions to verify
      const allIndices = Array.from({length: 12}, (_, i) => i);
      const verifyIndices = [];
      while (verifyIndices.length < 3) {
        const rand = allIndices.splice(Math.floor(Math.random() * allIndices.length), 1)[0];
        verifyIndices.push(rand);
      }
      verifyIndices.sort((a, b) => a - b);

      let currentStep = 0;
      const mnemonic = this.tempMnemonic;

      const renderStep = () => {
        const targetIndex = verifyIndices[currentStep];
        const correctWord = words[targetIndex];

        // Create 5 random wrong options + correct one
        const options = [correctWord];
        const otherWords = words.filter((_, i) => i !== targetIndex);
        while (options.length < 6) {
          const rand = otherWords[Math.floor(Math.random() * otherWords.length)];
          if (!options.includes(rand)) options.push(rand);
        }
        // Shuffle
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }

        container.innerHTML = `
          <div class="onboarding-content" style="padding-top: 10px;">
            <div class="seed-step-indicator">
              <div class="seed-step completed"></div>
              <div class="seed-step active"></div>
              <div class="seed-step"></div>
            </div>

            <div class="verify-progress">
              ${verifyIndices.map((_, i) => `
                <div class="verify-dot ${i < currentStep ? 'correct' : ''} ${i === currentStep ? 'current' : ''}"></div>
              `).join('')}
            </div>

            <div class="verify-prompt">
              <h3>${t('mnemonic.verifyTitle', 'Verify Seed Phrase')}</h3>
              <p>${t('mnemonic.selectWord', 'Select a word')} <span class="verify-word-number">${targetIndex + 1}</span></p>
            </div>

            <div class="verify-word-grid">
              ${options.map(word => `
                <button class="verify-word-option" data-word="${word}">${word}</button>
              `).join('')}
            </div>
          </div>
        `;

        // Handle word selection
        container.querySelectorAll('.verify-word-option').forEach(btn => {
          btn.addEventListener('click', () => {
            const selected = btn.dataset.word;
            if (selected === correctWord) {
              btn.classList.add('correct');
              currentStep++;
              if (currentStep >= 3) {
                // All verified! Show PIN setup
                setTimeout(() => this.showPinSetup(overlay, mnemonic, 'create'), 600);
              } else {
                setTimeout(() => renderStep(), 500);
              }
            } else {
              btn.classList.add('wrong');
              setTimeout(() => btn.classList.remove('wrong'), 600);
            }
          });
        });
      };

      renderStep();
    } catch (error) {
      console.error('Failed to display seed phrase verification screen:', error);
      this.showToast(error.message || (window.i18n?.t('error.verifyFail') || 'An error occurred'), 'error');
      overlay.remove();
      this.showOnboarding();
    }
  }

  // Import wallet flow
  showImportWalletFlow(overlay) {
    try {
      const container = overlay.querySelector('.onboarding-container');
      const t = (key, fallback) => window.i18n?.t(key) || fallback;
      container.innerHTML = `
        <div class="onboarding-header">
          <h1>${t('onboarding.import', 'Restore Wallet')}</h1>
          <p>${t('mnemonic.importDesc', 'Enter your seed phrase or private key')}</p>
        </div>
        <div class="import-options">
          <button class="import-option-btn active" data-option="mnemonic">Seed Phrase</button>
          <button class="import-option-btn" data-option="textarea">Paste Text</button>
        </div>
        <div class="import-mnemonic-container">
          <div class="mnemonic-inputs">
            ${Array(12).fill(0).map((_, i) => `
              <input type="text" class="mnemonic-input" placeholder="${i + 1}" data-index="${i}">
            `).join('')}
          </div>
        </div>
        <div class="import-textarea-container" style="display: none;">
          <textarea class="import-textarea" placeholder="Enter seed phrase separated by spaces"></textarea>
        </div>
        <button class="onboarding-btn import-wallet-confirm-btn" disabled>Continue</button>
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
        try {
          const option = container.querySelector('.import-option-btn.active').dataset.option;
          let words = [];

          if (option === 'mnemonic') {
            words = Array.from(container.querySelectorAll('.mnemonic-input'))
              .map(input => input.value.trim());
          } else {
            words = container.querySelector('.import-textarea').value.trim().split(/\s+/);
          }

          if (words.length !== 12) {
            this.showToast(window.i18n?.t('mnemonic.invalid') || 'Please enter 12 words', 'error');
            return;
          }

          const mnemonic = words.join(' ');
          this.showPinSetup(overlay, mnemonic, 'import');
        } catch (error) {
          console.error('Wallet recovery validation error:', error);
          this.showToast(error.message || 'An error occurred while restoring the wallet', 'error');
        }
      });
    } catch (error) {
      console.error('Failed to display wallet recovery screen:', error);
      this.showToast(error.message || 'An error occurred', 'error');
      overlay.remove();
      this.showOnboarding();
    }
  }

  // PIN setup
  showPinSetup(overlay, mnemonic, flow) {
    try {
      let confirmPin = '';
      let confirmingPin = false;

      const container = overlay.querySelector('.onboarding-container');
      container.innerHTML = `
        <div class="onboarding-header">
          <h1>${window.i18n?.t('pin.setup') || 'PIN Setup'}</h1>
          <p>${window.i18n?.t('pin.setupDesc') || 'Set a password of at least 8 characters'}</p>
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
        <button class="onboarding-btn pin-confirm-btn" disabled>${window.i18n?.t('common.confirm') || 'Confirm'}</button>
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
        try {
          const pin = input.value;
          if (pin.length < 8) return;
          if (!confirmingPin) {
            confirmPin = pin;
            input.value = '';
            confirmBtn.disabled = true;
            container.querySelector('.onboarding-header h1').textContent = window.i18n?.t('pin.confirm') || 'Confirm PIN';
            container.querySelector('.onboarding-header p').textContent = window.i18n?.t('pin.confirmDesc') || 'Enter PIN again';
            confirmingPin = true;
            input.focus();
          } else {
            if (pin === confirmPin) {
              this.createWallet(mnemonic, confirmPin, flow, overlay);
            } else {
              this.showToast(window.i18n?.t('error.pinMismatch') || 'PINs do not match', 'error');
              input.value = '';
              confirmPin = '';
              confirmingPin = false;
              confirmBtn.disabled = true;
              container.querySelector('.onboarding-header h1').textContent = window.i18n?.t('pin.setup') || 'PIN Setup';
              container.querySelector('.onboarding-header p').textContent = window.i18n?.t('pin.setupDesc') || 'Set a password of at least 8 characters';
              input.focus();
            }
          }
        } catch (error) {
          console.error('PIN verification error:', error);
          this.showToast(error.message || (window.i18n?.t('error.common') || 'An error occurred'), 'error');
        }
      };

      confirmBtn.addEventListener('click', doConfirm);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doConfirm(); });
      setTimeout(() => input.focus(), 100);
    } catch (error) {
      console.error('Failed to display PIN setup screen:', error);
      this.showToast(error.message || (window.i18n?.t('error.common') || 'An error occurred'), 'error');
      overlay.remove();
      this.showOnboarding();
    }
  }

  // Create or import wallet
  async createWallet(mnemonic, pin, flow, overlay) {
    try {
      const stopLoading = this.showLoading(overlay, 'Creating wallet...');

      try {
        if (flow === 'create') {
          await this.walletCore.createWallet(mnemonic, pin);
        } else {
          await this.walletCore.importWallet(mnemonic, pin);
        }
      } catch (walletError) {
        stopLoading();
        throw new Error(walletError.message || 'Failed to create wallet');
      }

      stopLoading();
      overlay.remove();

      this.isLocked = false;
      this.loadDashboard();
      this.showToast(window.i18n?.t('toast.walletCreated') || 'Wallet created successfully', 'success');

      window.dispatchEvent(new CustomEvent('walletCreated'));
    } catch (error) {
      console.error('Wallet creation failed:', error);
      this.showToast(error.message || 'Wallet creation failed', 'error');
    }
  }

  // PIN entry
  showPinEntry() {
    const overlay = document.createElement('div');
    overlay.className = 'pin-entry-overlay';
    overlay.innerHTML = `
      <div class="pin-entry-container">
        <div class="pin-entry-header">
          <h1>${window.i18n?.t('pin.enter') || 'Enter PIN'}</h1>
          <p>${window.i18n?.t('pin.enterDesc') || 'Unlock your wallet'}</p>
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
        <button class="onboarding-btn pin-unlock-btn" disabled style="margin-top:8px;">
          ${window.i18n?.t('pin.unlock') || 'Unlock'}
        </button>
        <button class="onboarding-btn demo-skip-btn" style="margin-top:16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);justify-content:center;font-size:14px;padding:14px;">
          ${window.i18n?.t('toast.demoMode') || 'Skip to demo mode'}
        </button>
        <div class="pin-error" style="display: none;"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('.pin-input');
    const unlockBtn = overlay.querySelector('.pin-unlock-btn');
    const toggleBtn = overlay.querySelector('.pin-toggle-btn');
    const errorDiv = overlay.querySelector('.pin-error');

    // Restore lockout state on open so reopening the modal doesn't bypass the lockout
    try {
      const stored = JSON.parse(localStorage.getItem('funs_pin_lock') || '{}');
      if (stored.lockUntil && Date.now() < stored.lockUntil) {
        const remaining = Math.ceil((stored.lockUntil - Date.now()) / 1000);
        errorDiv.textContent = `${remaining}s remaining, please try again`;
        errorDiv.style.display = 'block';
        input.disabled = true;
        unlockBtn.disabled = true;
      }
    } catch (_) { /* ignore */ }

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

    // Load PIN lockout state from localStorage so it persists across page refreshes
    const loadPinLockState = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('funs_pin_lock') || '{}');
        this._pinAttempts = stored.attempts || 0;
        this._pinLockUntil = stored.lockUntil || null;
      } catch (_) {
        this._pinAttempts = 0;
        this._pinLockUntil = null;
      }
    };
    const savePinLockState = () => {
      localStorage.setItem('funs_pin_lock', JSON.stringify({
        attempts: this._pinAttempts,
        lockUntil: this._pinLockUntil
      }));
    };
    loadPinLockState();

    const tryUnlock = async () => {
      const pin = input.value;
      if (pin.length < 1) return;

      // PIN rate limiting — state persisted in localStorage to survive page refresh
      if (this._pinLockUntil && Date.now() < this._pinLockUntil) {
        const remaining = Math.ceil((this._pinLockUntil - Date.now()) / 1000);
        errorDiv.textContent = `${remaining}s remaining, please try again`;
        errorDiv.style.display = 'block';
        input.disabled = true;
        unlockBtn.disabled = true;
        return;
      }
      // Clear expired lockout
      if (this._pinLockUntil && Date.now() >= this._pinLockUntil) {
        this._pinLockUntil = null;
        this._pinAttempts = 0;
        savePinLockState();
        input.disabled = false;
        unlockBtn.disabled = false;
      }

      try {
        await this.walletCore.unlockWallet(pin);
        this._pinAttempts = 0;
        this._pinLockUntil = null;
        savePinLockState();
        overlay.remove();
        this.isLocked = false;
        window.dispatchEvent(new CustomEvent('walletUnlocked'));
      } catch (error) {
        this._pinAttempts++;
        errorDiv.textContent = `Incorrect PIN (${this._pinAttempts}/${this.maxPinAttempts})`;
        errorDiv.style.display = 'block';
        input.parentElement.classList.add('shake');
        setTimeout(() => input.parentElement.classList.remove('shake'), 500);
        input.value = '';
        unlockBtn.disabled = true;

        if (this._pinAttempts >= this.maxPinAttempts) {
          this._pinLockUntil = Date.now() + 30000; // 30 second lockout
          this._pinAttempts = 0;
          errorDiv.textContent = `${this.maxPinAttempts} failed attempts. Please try again in 30 seconds`;
          input.disabled = true;
          unlockBtn.disabled = true;
        }
        savePinLockState();
      }
    };

    unlockBtn.addEventListener('click', tryUnlock);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });

    // Demo skip button
    const demoBtn = overlay.querySelector('.demo-skip-btn');
    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        overlay.remove();
        this.isLocked = false;
        this.showToast('Running in demo mode', 'success');
      });
    }

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
            <p>Enter PIN to confirm transaction</p>
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

      const tryConfirm = async () => {
        const pin = input.value;
        if (pin.length < 1) return;
        const valid = await this.walletCore.validatePin(pin);
        if (valid) {
          overlay.remove();
          document.removeEventListener('keydown', closeOnEsc);
          if (callback) callback();
          resolve(true);
        } else {
          attempts++;
          errorDiv.textContent = `Incorrect PIN (${attempts}/3)`;
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
    // Fix 2: Debounce - ignore calls within 2000ms of each other
    const now = Date.now();
    if (this._lastDashboardCall && (now - this._lastDashboardCall) < 2000) return;
    this._lastDashboardCall = now;

    if (this._dashboardLoading) return;
    this._dashboardLoading = true;
    try {
      const address = this.walletCore.getAddress();

      // Update portfolio address display
      const portfolioAddress = document.getElementById('portfolioAddress');
      if (portfolioAddress) {
        if (address) {
          portfolioAddress.textContent = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
          portfolioAddress.removeAttribute('data-i18n'); // Prevent i18n from overwriting the address
        } else {
          portfolioAddress.textContent = window.i18n?.t('home.createWallet') || 'Create a wallet';
        }
      }

      // Update network indicator
      const networkInfo = this.walletBlockchain.getNetworkInfo?.();
      if (networkInfo) {
        // After setupNetworkSelector(), the structure is .network-current button
        const networkCurrentBtn = document.querySelector('#networkSelector .network-current');
        if (networkCurrentBtn) {
          networkCurrentBtn.textContent = networkInfo.name;
        }
      }

      // Check connection
      const connected = await this.walletBlockchain.isConnected?.();
      const statusDot = document.getElementById('connection-status');
      if (statusDot) {
        statusDot.className = connected ? 'connection-dot connected' : 'connection-dot disconnected';
      }

      if (!address) {
        // Demo mode - show sample data
        console.log('[FunS] Demo mode - no wallet address');
        return;
      }

      // Show skeleton while fetching balances
      this.showSkeletonTokenList();

      // Fetch real balances
      try {
        const balancesResult = await this.walletBlockchain.fetchAllBalances(address);
        // Fix 1: Bridge data structure - fetchAllBalances returns {tokens: [...], totalUSD}
        // But updateBalanceDisplay and updateTokenList expect symbol-keyed map
        const balancesMap = {};
        if (balancesResult.tokens && Array.isArray(balancesResult.tokens)) {
          for (const token of balancesResult.tokens) {
            balancesMap[token.symbol] = {
              balance: token.balance,
              usdValue: token.balanceUSD ? parseFloat(token.balanceUSD.replace('$', '')) : 0,
              change24h: token.change ? parseFloat(token.change) : 0,
              name: token.name,
              icon: token.icon,
              decimals: token.decimals,
              address: token.address
            };
          }
        }
        this.updateBalanceDisplay(balancesResult.totalUSD);
        this.updateTokenList(balancesMap);
      } catch (balanceError) {
        console.warn('[FunS] Balance fetch failed:', balanceError.message);
        this.showToast(window.i18n?.t('toast.balanceFetchFail') || 'Balance fetch failed - check your network connection', 'warning');
      }

      // Fetch transaction history
      try {
        await this.updateTransactionHistory();
      } catch (txError) {
        console.warn('[FunS] Transaction history fetch failed:', txError.message);
      }

      // Setup chart
      this.setupChartTimeButtons?.();
      this.setupTransactionFilters?.();

      // Auto-refresh is handled by walletBlockchain's built-in timer via 'balancesUpdated' event.
      // Do NOT add a second setInterval here — that causes duplicate RPC calls and main thread overload.

    } catch (error) {
      console.error('Dashboard load failed:', error);
    } finally {
      this._dashboardLoading = false;
    }
  }

  // Format token balance with smart precision (OKX-style)
  // - 0 → '0'
  // - >= 1000 → no decimals
  // - >= 1 → 4 decimal places
  // - < 1 → enough decimals to show at least 4 significant figures (max 8)
  formatBalance(balance) {
    const val = parseFloat(balance);
    if (!val || val === 0) return '0';
    if (val >= 1000) return val.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (val >= 1) return val.toFixed(4).replace(/\.?0+$/, '') || '0';
    // For values < 1: find first significant digit then show 4-6 sig figs
    const str = val.toPrecision(6);
    const num = parseFloat(str);
    // Remove unnecessary trailing zeros
    return num.toString();
  }

  // Update balance display from blockchain data
  // Fix 1: Now accepts totalUSD directly (number) instead of balances object
  updateBalanceDisplay(totalUSD) {
    if (totalUSD === null || totalUSD === undefined) return;

    // Fix 7: Use specific ID selector instead of broad selectors
    const balEl = document.getElementById('portfolioBalance');
    if (balEl) {
      balEl.textContent = '$' + totalUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    // portfolioBalance is the only balance display element; skip broad DOM traversal
  }

  // Update balances from event
  // Fix 1: Handle both event format (with .balances property) and direct result format
  updateBalances(data) {
    try {
      if (!data) return;

      // Event detail contains { balances: {tokens: [...], totalUSD: number} }
      const balancesResult = data.balances || data;

      if (balancesResult.tokens && Array.isArray(balancesResult.tokens)) {
        // Convert token array to symbol-keyed map
        const balancesMap = {};
        for (const token of balancesResult.tokens) {
          balancesMap[token.symbol] = {
            balance: token.balance,
            usdValue: token.balanceUSD ? parseFloat(token.balanceUSD.replace('$', '')) : 0,
            change24h: token.change ? parseFloat(token.change) : 0,
            name: token.name,
            icon: token.icon,
            decimals: token.decimals,
            address: token.address
          };
        }
        this.updateBalanceDisplay(balancesResult.totalUSD);
        this.updateTokenList(balancesMap);
      }
    } catch(e) {
      console.warn('[FunS] updateBalances error:', e.message);
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

  // Update token list from blockchain data
  showSkeletonTokenList(count = 3) {
    const tokenList = document.querySelector('.token-list');
    if (!tokenList) return;
    tokenList.innerHTML = Array.from({ length: count }, () => `
      <div class="skeleton-item">
        <div class="skeleton-icon skeleton-pulse"></div>
        <div class="skeleton-info">
          <div class="skeleton-name skeleton-pulse"></div>
          <div class="skeleton-balance skeleton-pulse"></div>
        </div>
        <div class="skeleton-value">
          <div class="skeleton-usd skeleton-pulse"></div>
          <div class="skeleton-change skeleton-pulse"></div>
        </div>
      </div>
    `).join('');
  }

  async updateTokenList(balances) {
    try {
    const tokenList = document.querySelector('.token-list');
    if (!tokenList || !balances) return;

    // Set up event delegation once so token clicks don't require per-item listeners
    if (!tokenList._delegated) {
      tokenList._delegated = true;
      tokenList.addEventListener('click', (e) => {
        const item = e.target.closest('.token-item');
        if (!item) return;
        this.currentToken = item.dataset.symbol;
        tokenList.querySelectorAll('.token-item').forEach(t => t.classList.remove('active'));
        item.classList.add('active');
      });
    }

    const networkTokens = window.WalletConfig?.getAllTokens?.(this.walletBlockchain.currentNetwork) || {};
    const entries = Object.entries(balances);

    if (entries.length === 0) {
      requestAnimationFrame(() => {
        tokenList.innerHTML = '<div style="text-align:center;padding:24px;color:rgba(255,255,255,0.4);font-size:14px;">No tokens</div>';
      });
      return;
    }

    // Build DOM nodes off-screen in a DocumentFragment to avoid mid-loop reflows
    const fragment = document.createDocumentFragment();
    for (const [symbol, data] of entries) {
      const balance = parseFloat(data.balance) || 0;
      const usdValue = parseFloat(data.usdValue) || 0;
      const change24h = data.change24h || 0;

      const tokenConfig = networkTokens[symbol] || {};
      const icon = tokenConfig.icon || '';

      const item = document.createElement('div');
      item.className = 'token-item';
      item.dataset.symbol = symbol;
      const eSym = escapeHtml(symbol);
      const eName = escapeHtml(tokenConfig.name || symbol);
      const iconHtml = icon
        ? `<img src="${escapeHtml(icon)}" alt="${eSym}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="token-icon-fallback">${eSym.charAt(0)}</span>`
        : `<span class="token-icon-fallback" style="display:flex">${eSym.charAt(0)}</span>`;
      item.innerHTML = `
        <div class="token-info">
          <div class="token-icon">${iconHtml}</div>
          <div class="token-details">
            <div class="token-name">${eName}</div>
            <div class="token-subtitle">${eSym}</div>
          </div>
        </div>
        <div class="token-values">
          <div class="token-balance">${this.formatBalance(balance)} ${eSym}</div>
          <div class="token-usd">$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="token-change-badge ${change24h >= 0 ? 'up' : 'down'}">
            ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%
          </div>
        </div>
      `;
      fragment.appendChild(item);
    }

    // Cancel any pending DOM update and schedule a single batched swap
    if (this._tokenListRaf) cancelAnimationFrame(this._tokenListRaf);
    this._tokenListRaf = requestAnimationFrame(() => {
      this._tokenListRaf = null;
      tokenList.innerHTML = '';
      tokenList.appendChild(fragment);
    });
    } catch (error) {
      console.warn('[FunS] updateTokenList error:', error.message);
    }
  }

  // Update chart
  async updateChart(tokenSymbol, timeRange) {
    try {
      const chartToken = document.querySelector('#chartToken');
      if (chartToken) chartToken.textContent = tokenSymbol;

      // Get coingeckoId from config for this token
      const network = this.walletBlockchain.currentNetwork || WalletConfig.defaultNetwork;
      const tokenConfig = WalletConfig.getToken(tokenSymbol, network);
      const coingeckoId = tokenConfig?.coingeckoId || tokenSymbol.toLowerCase();

      // fetchPriceHistory accepts string like '1h','1d','1w','1m','1y'
      const priceHistory = await this.walletBlockchain.fetchPriceHistory(coingeckoId, timeRange);
      if (!priceHistory || priceHistory.length === 0) {
        this.showToast(window.i18n?.t('toast.chartNoData') || 'Unable to load chart data', 'warning');
        return;
      }

      // CoinGecko returns [[timestamp, price], ...] format
      const prices = priceHistory.map(p => Array.isArray(p) ? p[1] : p.price);
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
      console.error('Chart update failed:', error);
      this.showToast(window.i18n?.t('toast.chartFail') || 'Chart update failed', 'error');
    }
  }

  // Update transaction history
  async updateTransactionHistory() {
    try {
      const address = this.walletCore.getAddress();
      const network = this.walletBlockchain.currentNetwork || WalletConfig.defaultNetwork;
      const transactions = await this.walletBlockchain.getTransactionHistory(address, network);
      const txList = document.querySelector('.tx-list');

      if (!txList) return;

      txList.innerHTML = '';

      if (transactions.length === 0) {
        txList.innerHTML = '<div class="no-transactions">No transaction history</div>';
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
      console.error('Transaction history load failed:', error);
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Fix 5: Guard against double-calling setupEventListeners
    if (this._listenersAttached) return;
    this._listenersAttached = true;

    // Language change listener
    window.addEventListener('languageChanged', () => {
      if (window.i18n) window.i18n.applyToDOM();
    });

    // Address copy button
    const copyBtn = document.querySelector('#copyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const address = this.walletCore.getAddress();
        navigator.clipboard.writeText(address).then(() => {
          this.showToast(window.i18n?.t('toast.addressCopied') || 'Address copied', 'success');
        }).catch(() => {
          this.showToast('Failed to copy address', 'error');
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
    window.addEventListener('walletLocked', () => {
      this.showPinEntry();
    });
    window.addEventListener('networkChanged', () => this.loadDashboard());
    window.addEventListener('transactionSent', (e) => {
      this.showToast(`Transaction sent: ${e.detail.hash}`, 'info');
    });
    window.addEventListener('transactionConfirmed', () => {
      this.showToast('Transaction completed', 'success');
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
    const tosBtn = document.getElementById('tosBtn');
    if (tosBtn) {
      tosBtn.addEventListener('click', () => this.showLegalModal('terms'));
    }
    const privacyBtn = document.getElementById('privacyBtn');
    if (privacyBtn) {
      privacyBtn.addEventListener('click', () => this.showLegalModal('privacy'));
    }

    // Settings tab - Ethereum network toggle (static settings page #page-settings)
    const ethToggleStatic = document.getElementById('ethToggle');
    if (ethToggleStatic) {
      // Initialize checked state from saved config
      const savedNetworks = window.WalletConfig.getEnabledNetworks?.() || ['bsc'];
      ethToggleStatic.checked = savedNetworks.includes('ethereum');

      ethToggleStatic.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        window.WalletConfig.toggleNetwork('ethereum', enabled);

        if (enabled) {
          try {
            await this.walletBlockchain.enableNetwork('ethereum');
            this.showToast('Ethereum network enabled', 'success');
          } catch (err) {
            e.target.checked = false;
            window.WalletConfig.toggleNetwork('ethereum', false);
            this.showToast(err.message || 'Failed to enable network', 'error');
          }
        } else {
          try {
            this.walletBlockchain.disableNetwork('ethereum');
            this.showToast('Ethereum network disabled', 'info');
          } catch (err) {
            e.target.checked = true;
            window.WalletConfig.toggleNetwork('ethereum', true);
            this.showToast(err.message, 'error');
          }
        }

        // Refresh network selector
        this.setupNetworkSelector();
      });
    }

    // Settings tab - Ethereum Sepolia testnet toggle
    const ethSepoliaToggle = document.getElementById('ethSepoliaToggle');
    if (ethSepoliaToggle) {
      const savedNetworks = window.WalletConfig.getEnabledNetworks?.() || ['bsc'];
      ethSepoliaToggle.checked = savedNetworks.includes('ethereumSepolia');

      ethSepoliaToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        window.WalletConfig.toggleNetwork('ethereumSepolia', enabled);

        if (enabled) {
          try {
            await this.walletBlockchain.enableNetwork('ethereumSepolia');
            this.showToast('Ethereum Sepolia testnet enabled', 'success');
          } catch (err) {
            e.target.checked = false;
            window.WalletConfig.toggleNetwork('ethereumSepolia', false);
            this.showToast(err.message || 'Failed to enable network', 'error');
          }
        } else {
          try {
            this.walletBlockchain.disableNetwork('ethereumSepolia');
            this.showToast('Ethereum Sepolia testnet disabled', 'info');
          } catch (err) {
            e.target.checked = true;
            window.WalletConfig.toggleNetwork('ethereumSepolia', true);
            this.showToast(err.message, 'error');
          }
        }

        // Refresh network selector
        this.setupNetworkSelector();
      });
    }
  }

  // Setup modals
  setupModals() {
    this.setupSendModal();
    this.setupReceiveModal();
    this.setupSwapModal();
    this.setupBuyModal();
  }

  // Populate the send token picker with logos + balances
  populateSendTokenPicker(selectedSymbol) {
    const picker = document.getElementById('sendTokenPicker');
    const hiddenInput = document.getElementById('sendTokenValue');
    if (!picker) return;

    const network = this.walletBlockchain?.currentNetwork || 'bsc';
    const networkTokens = window.WalletConfig?.getAllTokens?.(network) || {};
    const balances = this.walletBlockchain?.balances || {};

    // Determine which tokens to show: prefer cached balance keys, fallback to config
    const symbols = Object.keys(balances).length
      ? Object.keys(balances)
      : Object.keys(networkTokens);

    const selected = selectedSymbol || hiddenInput?.value || 'BNB';
    picker.innerHTML = '';

    for (const sym of symbols) {
      const tokenConfig = networkTokens[sym] || {};
      const bal = balances[sym];
      const rawBalance = bal ? parseFloat(bal.balance) : 0;
      const usdValue = bal ? (bal.usdValue || 0) : 0;
      const icon = tokenConfig.icon || '';
      const name = tokenConfig.name || sym;
      const eSym = escapeHtml(sym);
      const eName = escapeHtml(name);

      const balText = rawBalance === 0 ? '0' : rawBalance.toFixed(6).replace(/\.?0+$/, '') || '0';
      const usdValue_num = parseFloat(usdValue) || 0;
      const usdText = usdValue_num > 0
        ? '$' + usdValue_num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '';

      const iconHtml = icon
        ? `<img src="${escapeHtml(icon)}" alt="${eSym}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="stc-icon-fallback" style="display:none">${eSym.charAt(0)}</span>`
        : `<span class="stc-icon-fallback">${eSym.charAt(0)}</span>`;

      const card = document.createElement('div');
      card.className = 'send-token-card' + (sym === selected ? ' selected' : '');
      card.dataset.symbol = sym;
      card.innerHTML = `
        <div class="stc-icon">${iconHtml}</div>
        <div class="stc-info">
          <div class="stc-symbol">${eSym}</div>
          <div class="stc-name">${eName}</div>
        </div>
        <div class="stc-balance">
          <div class="stc-bal-amount">${balText} ${eSym}</div>
          ${usdText ? `<div class="stc-bal-usd">${usdText}</div>` : ''}
        </div>
        <div class="stc-check">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <polyline points="2,6 5,9 10,3" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>`;

      card.addEventListener('click', () => {
        picker.querySelectorAll('.send-token-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        if (hiddenInput) hiddenInput.value = sym;
      });

      picker.appendChild(card);
    }
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

        try {
          const token = tokenSelect?.value || this.selectedTokenForSend;
          const address = addressInput?.value?.trim();
          const amount = parseFloat(amountInput?.value);

          // Validate inputs
          if (!address || !amount || amount <= 0) {
            this.showToast('Please fill in all fields correctly', 'error');
            return;
          }

          if (!this.isValidAddress(address)) {
            this.showToast('Invalid address (must be 42 characters starting with 0x)', 'error');
            return;
          }

          // Use cached balances for validation (avoid triggering another full RPC fetch on button click)
          const cachedBalances = this.walletBlockchain.balances || {};
          if (!cachedBalances[token]) {
            this.showToast(`${token} token balance could not be fetched`, 'error');
            return;
          }

          const balance = parseFloat(cachedBalances[token].balance);
          if (amount > balance) {
            this.showToast(`${token} balance is insufficient (available: ${this.formatBalance(balance)} ${token})`, 'error');
            return;
          }

          // Get gas estimate
          let gasEstimate = 0;
          try {
            gasEstimate = await this.walletBlockchain.estimateGas('transfer', {
              to: address,
              amount: amount,
              token: token
            });
          } catch (gasError) {
            console.warn('Gas estimation failed:', gasError);
            gasEstimate = 0.001; // Default estimate
          }

          // Show confirmation
          const confirmed = await this.showSendConfirmation(token, address, amount, gasEstimate);
          if (!confirmed) return;

          // Get PIN confirmation
          const pinConfirmed = await this.showPinConfirmation(() => {
            this.showToast('Processing transaction...', 'info');
          });

          if (!pinConfirmed) {
            this.showToast('Transaction cancelled', 'warning');
            return;
          }

          // Show loading state
          submitBtn.disabled = true;
          const originalText = submitBtn.textContent;
          submitBtn.textContent = window.i18n?.t('send.sending') || 'Sending...';

          try {
            // Determine token type and send accordingly
            let txHash;
            const currentNetwork = this.walletBlockchain.currentNetwork;
            const tokenConfig = window.WalletConfig?.getAllTokens?.(currentNetwork)?.[token];

            if (tokenConfig?.native || token === 'BNB' || !tokenConfig) {
              // Native token
              txHash = await this.walletTransactions.sendNativeToken(address, amount, currentNetwork);
            } else {
              // ERC20 token
              txHash = await this.walletTransactions.sendERC20Token(token, address, amount, currentNetwork);
            }

            const txHashStr = typeof txHash === 'string' ? txHash : txHash?.hash || '';
            this.showToast(`Sent: ${txHashStr.substring(0, 10)}...`, 'success');

            // Clear form before closing so state is reset for next send
            if (addressInput) addressInput.value = '';
            if (amountInput) amountInput.value = '';

            this._closeBottomSheet(sendForm);

            // Refresh transaction history after send (balances will auto-refresh via blockchain timer)
            setTimeout(() => {
              this.updateTransactionHistory();
            }, 2000);

          } catch (txError) {
            console.error('Transaction send failed:', txError);
            this.showToast(txError.message || 'Failed to send transaction', 'error');
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
          }

        } catch (error) {
          console.error('Transaction send error:', error);
          this.showToast(error.message || 'An error occurred while sending the transaction', 'error');
        }
      });
    }

    // Populate token picker each time the send modal opens so balances are fresh
    document.getElementById('sendBtn')?.addEventListener('click', () => {
      this.populateSendTokenPicker();
    });
  }

  // Receive modal
  setupReceiveModal() {
    const receiveModal = document.querySelector('#receiveModal');
    if (!receiveModal) return;

    // Copy button: resolve address at click time (wallet may not be unlocked at setup)
    const copyBtn = receiveModal.querySelector('[data-copy-address]');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        try {
          const addr = this.walletCore.getAddress();
          if (!addr) return;
          navigator.clipboard.writeText(addr).then(() => {
            this.showToast(window.i18n?.t('toast.addressCopied') || 'Address copied', 'success');
          }).catch(() => {
            this.showToast('Failed to copy address', 'error');
          });
        } catch (error) {
          console.error('Clipboard copy failed:', error);
          this.showToast('Failed to copy address', 'error');
        }
      });
    }

    // Generate QR + show address when the receive modal opens
    const receiveBtn = document.querySelector('#receiveBtn');
    const renderReceiveModal = () => {
      try {
        const address = this.walletCore.getAddress();
        if (!address) return;

        const addressDisplay = receiveModal.querySelector('[data-address]');
        if (addressDisplay) addressDisplay.textContent = address;

        const qrContainer = receiveModal.querySelector('[data-qr]');
        if (qrContainer && window.QRCode) {
          QRCode.toCanvas(qrContainer, address, {
            width: 200,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' }
          }, function (error) {
            if (error) console.error('QR code generation failed:', error);
          });
        }
      } catch (error) {
        console.error('Receive modal render failed:', error);
      }
    };

    if (receiveBtn) {
      receiveBtn.addEventListener('click', renderReceiveModal);
    }
  }

  // Swap modal
  setupSwapModal() {
    const swapForm = document.querySelector('#swapForm');
    if (!swapForm) return;

    const fromToken = swapForm.querySelector('[name="fromToken"]');
    const toToken = swapForm.querySelector('[name="toToken"]');
    const fromAmount = swapForm.querySelector('[name="amount"]');
    const toAmount = swapForm.querySelector('[name="toAmount"]');
    const submitBtn = swapForm.querySelector('button[type="submit"]');

    const fetchSwapQuote = async () => {
      if (!fromAmount.value || parseFloat(fromAmount.value) <= 0) return;

      try {
        clearTimeout(this.swapQuoteTimer);
        this.swapQuoteTimer = setTimeout(async () => {
          try {
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
              impactElement.textContent = `Price impact: ${priceImpact.toFixed(2)}%`;
              impactElement.className = priceImpact > 5 ? 'warning' : '';
            }
          } catch (quoteError) {
            console.error('Swap quote retrieval failed:', quoteError);
          }
        }, 500);
      } catch (error) {
        console.error('Swap quote fetch error:', error);
      }
    };

    fromAmount.addEventListener('input', fetchSwapQuote);
    fromToken.addEventListener('change', fetchSwapQuote);
    toToken.addEventListener('change', fetchSwapQuote);

    if (submitBtn) {
      submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
          const amount = parseFloat(fromAmount.value);
          if (!amount || amount <= 0) {
            this.showToast('Please enter a valid amount', 'error');
            return;
          }

          // Show confirmation
          const confirmed = await this.showSwapConfirmation(
            fromToken.value,
            toToken.value,
            amount,
            parseFloat(toAmount.value)
          );

          if (!confirmed) return;

          // Check allowance and approve if needed
          const routerAddress = WalletConfig.getRouter(this.walletBlockchain.currentNetwork || WalletConfig.defaultNetwork);
          try {
            const needsApproval = await this.walletBlockchain.checkAllowance(
              fromToken.value,
              routerAddress.address,
              this.walletCore.getAddress()
            );

            if (needsApproval) {
              this.showToast('Approving token...', 'info');
              await this.walletTransactions.approveToken(fromToken.value);
              this.showToast('Token approved', 'success');
            }
          } catch (approvalError) {
            console.warn('Token approval check failed:', approvalError);
          }

          // Get PIN confirmation
          const pinConfirmed = await this.showPinConfirmation();
          if (!pinConfirmed) {
            this.showToast('Swap cancelled', 'warning');
            return;
          }

          submitBtn.disabled = true;
          const originalText = submitBtn.textContent;
          submitBtn.textContent = window.i18n?.t('swap.swapping') || 'Swapping...';

          try {
            // Execute swap
            const slippagePref = parseFloat(localStorage.getItem('funs_slippage') || '0.5');
            const txHash = await this.walletTransactions.swapTokens(
              fromToken.value,
              toToken.value,
              amount,
              slippagePref,
              this.walletBlockchain.currentNetwork || WalletConfig.defaultNetwork
            );

            this.showToast(`Swap complete: ${txHash.substring(0, 10)}...`, 'success');

            // Clear swap quote timer on modal close
            if (this.swapQuoteTimer) {
              clearTimeout(this.swapQuoteTimer);
              this.swapQuoteTimer = null;
            }
            this._closeBottomSheet(swapForm);

            fromAmount.value = '';
            toAmount.value = '';
            setTimeout(() => this.updateTransactionHistory(), 2000);
          } catch (txError) {
            console.error('Swap execution failed:', txError);
            this.showToast(txError.message || 'Failed to execute swap', 'error');
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
          }

        } catch (error) {
          console.error('Swap error:', error);
          this.showToast(error.message || 'An error occurred during swap', 'error');
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

        try {
          const selectedToken = token?.value || 'BNB';
          const selectedAmount = parseFloat(amount?.value);

          if (!selectedAmount || selectedAmount <= 0) {
            this.showToast('Please enter a valid amount', 'error');
            return;
          }

          // Redirect to payment gateway
          const paymentUrl = this.walletConfig.getPaymentGatewayUrl(selectedToken, selectedAmount);
          window.open(paymentUrl, '_blank');

          this._closeBottomSheet(buyForm);
        } catch (error) {
          console.error('Purchase failed:', error);
          this.showToast('Unable to open purchase page', 'error');
        }
      });
    }
  }

  // Setup network selector
  setupNetworkSelector() {
    const networkSelector = document.querySelector('#networkSelector');
    if (!networkSelector) return;

    // Fix 2: Remove previous click handler to prevent accumulation
    if (this._networkSelectorClickHandler) {
      document.removeEventListener('click', this._networkSelectorClickHandler);
    }

    const enabledNetworks = window.WalletConfig.getEnabledNetworks?.() || ['bsc'];
    const networkNames = {
      'bsc': 'BNB Chain',
      'bscTestnet': 'BSC Testnet',
      'ethereum': 'Ethereum',
      'ethereumSepolia': 'Ethereum Sepolia'
    };

    const currentNetwork = this.walletBlockchain.currentNetwork || 'bsc';

    // Preserve connection-status dot, only update current button and dropdown
    const existingDot = networkSelector.querySelector('#connection-status');
    networkSelector.innerHTML = `
      <span id="connection-status" class="${existingDot?.className || 'connection-dot'}"></span>
      <span class="network-chip-sep"></span>
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
        const stopLoading = this.showLoading(networkSelector, 'Changing network...');
        try {
          await this.walletBlockchain.switchNetwork(network);
          currentBtn.textContent = option.textContent;
          networkSelector.classList.remove('open');
          options.forEach(o => o.classList.remove('active'));
          option.classList.add('active');
          this.loadDashboard();
          this.showToast('Network changed', 'success');
        } catch (error) {
          console.error('Network switch failed:', error);
          this.showToast('Network change failed', 'error');
        } finally {
          stopLoading();
        }
      });
    });

    // Fix 2: Store handler and remove old one before adding new
    if (this._networkSelectorClickHandler) {
      document.removeEventListener('click', this._networkSelectorClickHandler);
    }
    this._networkSelectorClickHandler = (e) => {
      if (!networkSelector.contains(e.target)) {
        networkSelector.classList.remove('open');
      }
    };
    document.addEventListener('click', this._networkSelectorClickHandler);
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
    const t = (key) => window.i18n ? window.i18n.t(key) : key;

    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.innerHTML = `
      <div class="settings-panel">
        <div class="settings-header">
          <h2>${t('settings.title')}</h2>
          <button class="settings-close-btn">X</button>
        </div>
        <div class="settings-content">
          <div class="settings-section">
            <h3>${t('settings.networkManagement')}</h3>
            <div class="network-toggle-list">
              <div class="network-toggle-item">
                <div class="network-toggle-info">
                  <span class="network-toggle-name">${t('settings.bsc')}</span>
                  <span class="network-toggle-desc">${t('settings.defaultNetwork')}</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" checked disabled>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="network-toggle-item">
                <div class="network-toggle-info">
                  <span class="network-toggle-name">${t('settings.eth')}</span>
                  <span class="network-toggle-desc">${t('settings.optional')}</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="ethToggle" ${isEthEnabled ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
          <div class="settings-section">
            <h3>${t('settings.customTokens')}</h3>
            <p class="settings-desc">${t('settings.customTokensDesc')}</p>
            <div class="custom-token-list" id="customTokenList"></div>
            <button class="add-custom-token-btn" id="addCustomTokenBtn">+ ${t('settings.addToken')}</button>
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

        const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
        if (enabled) {
          try {
            await this.walletBlockchain.enableNetwork('ethereum');
            this.showToast(t('toast.networkEnabled'), 'success');
          } catch (err) {
            e.target.checked = false;
            window.WalletConfig.toggleNetwork('ethereum', false);
            this.showToast(err.message || t('toast.networkEnableFail'), 'error');
          }
        } else {
          try {
            this.walletBlockchain.disableNetwork('ethereum');
            this.showToast(t('toast.networkDisabled'), 'info');
          } catch(err) {
            e.target.checked = true;
            window.WalletConfig.toggleNetwork('ethereum', true);
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
      listEl.innerHTML = '<p class="no-custom-tokens">No custom tokens added</p>';
      return;
    }

    listEl.innerHTML = Object.entries(customTokens).map(([symbol, token]) => {
      const eSym = escapeHtml(symbol);
      const eName = escapeHtml(token.name);
      const eAddr = escapeHtml(token.address);
      return `
      <div class="custom-token-item" data-symbol="${eSym}">
        <div class="custom-token-info">
          <span class="custom-token-symbol">${eSym}</span>
          <span class="custom-token-name">${eName}</span>
          <span class="custom-token-address">${eAddr.substring(0, 6)}...${eAddr.substring(eAddr.length - 4)}</span>
        </div>
        <button class="remove-custom-token-btn" data-symbol="${eSym}">X</button>
      </div>`;
    }).join('');

    // Remove buttons
    listEl.querySelectorAll('.remove-custom-token-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sym = e.target.dataset.symbol;
        if (confirm(`${sym} token? This will remove it.`)) {
          window.WalletConfig.removeCustomToken(currentNetwork, sym);
          this.refreshCustomTokenList();
          this.showToast(`${sym} token removed`, 'success');
        }
      });
    });
  }

  async showLegalModal(type) {
    const isTerms = type === 'terms';
    const title = isTerms ? 'Terms of Service' : 'Privacy Policy';
    const url = isTerms ? './legal/terms-of-service.html' : './legal/privacy-policy.html';

    const overlay = document.createElement('div');
    overlay.className = 'legal-modal-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,0.85);
      display: flex; align-items: flex-end; justify-content: center;
    `;
    overlay.innerHTML = `
      <div class="legal-modal-sheet" style="
        background: #0B0E17;
        width: 100%; max-width: 480px;
        height: 90vh;
        border-radius: 20px 20px 0 0;
        display: flex; flex-direction: column;
        overflow: hidden;
      ">
        <div style="
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,107,53,0.2);
          flex-shrink: 0;
        ">
          <span style="font-size:16px; font-weight:700; color:#FF6B35;">${escapeHtml(title)}</span>
          <button id="legalModalClose" style="
            background: rgba(255,255,255,0.08); border: none; color: #E8E9EB;
            width: 32px; height: 32px; border-radius: 50%; font-size: 16px;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
          ">×</button>
        </div>
        <div id="legalModalBody" style="flex: 1; overflow-y: auto; padding: 4px 0;">
          <div style="display:flex; align-items:center; justify-content:center; height:100%; color:#666;">Loading…</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#legalModalClose').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Failed to load');
      const html = await resp.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract just the English content section and style
      const enSection = doc.getElementById('en');
      const styleEl = doc.querySelector('style');

      const body = overlay.querySelector('#legalModalBody');
      body.innerHTML = '';

      if (styleEl) {
        const scopedStyle = document.createElement('style');
        scopedStyle.textContent = styleEl.textContent.replace(/body\s*\{[^}]*\}/g, '');
        body.appendChild(scopedStyle);
      }

      if (enSection) {
        const wrapper = document.createElement('div');
        wrapper.className = 'container';
        wrapper.style.cssText = 'padding: 20px; color: #E8E9EB;';
        wrapper.appendChild(enSection.cloneNode(true));
        body.appendChild(wrapper);
      } else {
        body.innerHTML = '<div style="padding:20px;color:#C4C7CC;">Content unavailable.</div>';
      }
    } catch (err) {
      const body = overlay.querySelector('#legalModalBody');
      body.innerHTML = `<div style="padding:20px;color:#C4C7CC;">${escapeHtml(title)} content could not be loaded.</div>`;
    }
  }

  // Custom token modal
  setupCustomTokenModal() {
    // Fix 4: Listeners for #addCustomTokenBtn, #closeAddTokenModal, #cancelAddToken
    // are already set up in index.html (lines 1632-1634) using openSheet/closeSheet.
    // Those use the sheet system which is the proper approach.
    // Only keep setupTokenAddressInput for the auto-fetch functionality.

    // Listen for token address input to fetch info
    this.setupTokenAddressInput();
  }

  /**
   * Setup event listener for token address input with auto-fetch capability
   */
  setupTokenAddressInput() {
    // Disconnect any previously active observer before creating a new one
    if (this._tokenInputObserver) {
      this._tokenInputObserver.disconnect();
      this._tokenInputObserver = null;
    }

    // If the element already exists in the DOM, attach directly without an observer
    const existingInput = document.getElementById('customTokenAddress');
    if (existingInput) {
      if (!existingInput.hasTokenInputListener) {
        existingInput.addEventListener('input', (e) => this.handleTokenAddressInput(e));
        existingInput.hasTokenInputListener = true;
      }
      return;
    }

    // Element not yet in DOM — watch for it, but only on the modal container subtree
    // and only for direct childList changes, not the entire document body.
    const observer = new MutationObserver(() => {
      const addressInput = document.getElementById('customTokenAddress');
      if (addressInput && !addressInput.hasTokenInputListener) {
        addressInput.addEventListener('input', (e) => this.handleTokenAddressInput(e));
        addressInput.hasTokenInputListener = true;
        observer.disconnect();
        this._tokenInputObserver = null;
      }
    });

    this._tokenInputObserver = observer;
    observer.observe(document.body, { childList: true, subtree: true });

    // Auto-disconnect after 5 s if the element never appears (prevents indefinite observation)
    setTimeout(() => {
      if (this._tokenInputObserver) {
        this._tokenInputObserver.disconnect();
        this._tokenInputObserver = null;
      }
    }, 5000);
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

      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Token info fetch timed out')), 10000));
      const [symbol, name, decimals] = await Promise.race([
        Promise.all([contract.symbol(), contract.name(), contract.decimals()]),
        timeout
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
      this.showToast('Invalid token contract address', 'error');
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

    const t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;
    // Check if already exists
    const existing = window.WalletConfig.getAllTokens(currentNetwork);
    if (existing[tokenData.symbol]) {
      this.showToast(t('toast.tokenExists', { symbol: tokenData.symbol }), 'warning');
      return;
    }

    const success = window.WalletConfig.addCustomToken(currentNetwork, tokenData);
    if (success) {
      this.showToast(t('toast.tokenAdded', { symbol: tokenData.symbol }), 'success');
      this.refreshCustomTokenList();
      const modal = document.querySelector('.custom-token-modal');
      if (modal) modal.remove();

      // Refresh balances
      if (!this.isLocked) {
        this.loadDashboard();
      }
    } else {
      this.showToast(t('toast.tokenAddFail'), 'error');
    }
  }

  showAddCustomTokenModal() {
    const modal = document.createElement('div');
    modal.className = 'custom-token-modal';
    modal.innerHTML = `
      <div class="custom-token-modal-content">
        <h2>Add Custom Token</h2>
        <div class="custom-token-form">
          <div class="form-group">
            <label>Contract Address</label>
            <input type="text" id="customTokenAddress" placeholder="0x..." class="form-input">
            <div class="token-loading" style="display:none;">Loading token info...</div>
          </div>
          <div class="form-group">
            <label>Token Symbol</label>
            <input type="text" id="customTokenSymbol" placeholder="Auto-filled" class="form-input" readonly>
          </div>
          <div class="form-group">
            <label>Token Name</label>
            <input type="text" id="customTokenName" placeholder="Auto-filled" class="form-input" readonly>
          </div>
          <div class="form-group">
            <label>Decimals</label>
            <input type="number" id="customTokenDecimals" placeholder="Auto-filled" class="form-input" readonly>
          </div>
        </div>
        <div class="custom-token-buttons">
          <button class="btn-cancel" id="cancelCustomToken">Cancel</button>
          <button class="btn-confirm" id="confirmCustomToken" disabled>Add</button>
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

          const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Token info fetch timed out')), 10000));
          const [symbol, name, decimals] = await Promise.race([
            Promise.all([contract.symbol(), contract.name(), contract.decimals()]),
            timeout
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
          this.showToast('Invalid token contract address', 'error');
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
        this.showToast(`${tokenData.symbol} token already exists`, 'warning');
        return;
      }

      const success = window.WalletConfig.addCustomToken(currentNetwork, tokenData);
      if (success) {
        this.showToast(`${tokenData.symbol} token added`, 'success');
        this.refreshCustomTokenList();
        modal.remove();

        // Refresh balances
        if (!this.isLocked) {
          this.loadDashboard();
        }
      } else {
        this.showToast('Failed to add token', 'error');
      }
    });
  }

  // Setup chart time buttons
  setupChartTimeButtons() {
    const timeButtons = document.querySelectorAll('.time-btn');
    timeButtons.forEach(btn => {
      // Guard: skip buttons that already have this listener attached
      if (btn._chartClickAdded) return;
      btn._chartClickAdded = true;
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
      // Guard: skip buttons that already have this listener attached
      if (btn._filterClickAdded) return;
      btn._filterClickAdded = true;
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
      const currentNetwork = this.walletBlockchain?.currentNetwork || 'bsc';
      const nativeSymbol = window.WalletConfig?.NETWORKS?.[currentNetwork]?.symbol || 'BNB';
      const modal = document.createElement('div');
      modal.className = 'confirmation-modal';
      modal.innerHTML = `
        <div class="confirmation-content">
          <h2>Transaction Confirmation</h2>
          <div class="confirmation-details">
            <div class="detail-row">
              <span>Token:</span>
              <strong>${token}</strong>
            </div>
            <div class="detail-row">
              <span>Recipient Address:</span>
              <strong>${address.substring(0, 10)}...${address.substring(address.length - 8)}</strong>
            </div>
            <div class="detail-row">
              <span>Amount:</span>
              <strong>${amount} ${token}</strong>
            </div>
            <div class="detail-row">
              <span>Gas Fee:</span>
              <strong>${gasEstimate.toFixed(6)} ${nativeSymbol}</strong>
            </div>
          </div>
          <div class="confirmation-buttons">
            <button class="btn-cancel">Cancel</button>
            <button class="btn-confirm">Confirm</button>
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
          <h2>Swap Confirmation</h2>
          <div class="swap-flow">
            <div class="token-amount">
              <span class="amount">${fromAmount}</span>
              <span class="token">${fromToken}</span>
            </div>
            <div class="swap-arrow">SWAP</div>
            <div class="token-amount">
              <span class="amount">${toAmount.toFixed(6)}</span>
              <span class="token">${toToken}</span>
            </div>
          </div>
          <div class="confirmation-buttons">
            <button class="btn-cancel">Cancel</button>
            <button class="btn-confirm">Confirm</button>
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
        <h2>Transaction Details</h2>
        <div class="tx-detail">
          <div class="detail-row">
            <span>Type:</span>
            <strong>${escapeHtml(this.getTransactionTypeText(tx.type))}</strong>
          </div>
          <div class="detail-row">
            <span>Amount:</span>
            <strong>${escapeHtml(tx.amount)} ${escapeHtml(tx.token)}</strong>
          </div>
          <div class="detail-row">
            <span>Status:</span>
            <strong>${escapeHtml(this.getTransactionStatusText(tx.status))}</strong>
          </div>
          <div class="detail-row">
            <span>Hash:</span>
            <code>${escapeHtml(tx.hash)}</code>
          </div>
          <div class="detail-row">
            <span>Time:</span>
            <strong>${escapeHtml(new Date(tx.timestamp * 1000).toLocaleString('en-US'))}</strong>
          </div>
          ${tx.to ? `
            <div class="detail-row">
              <span>Recipient:</span>
              <code>${escapeHtml(tx.to)}</code>
            </div>
          ` : ''}
        </div>
        <div class="tx-detail-buttons">
          <button class="btn-close">Close</button>
          <button class="btn-explorer">View on Block Explorer</button>
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
    // Fix 2: Remove previous account menu click handler
    if (this._accountMenuClickHandler) {
      document.removeEventListener('click', this._accountMenuClickHandler);
    }

    const menu = document.createElement('div');
    menu.className = 'account-menu';
    menu.innerHTML = `
      <button class="menu-item settings-btn">Settings</button>
      <button class="menu-item lock-wallet-btn">Lock Wallet</button>
      <button class="menu-item export-wallet-btn">Export Private Key</button>
      <button class="menu-item disconnect-btn">Disconnect</button>
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
      window.dispatchEvent(new CustomEvent('walletLocked'));
    });

    menu.querySelector('.export-wallet-btn').addEventListener('click', () => {
      this.showToast('Private key export is disabled for security', 'warning');
    });

    menu.querySelector('.disconnect-btn').addEventListener('click', () => {
      if (confirm('Are you sure you want to disconnect the wallet?')) {
        this.walletCore.lockWallet();
        this.isLocked = true;
        menu.remove();
        window.location.reload();
      }
    });

    // Fix 2: Store handler and remove old one before adding new
    this._accountMenuClickHandler = (e) => {
      if (!menu.contains(e.target) && e.target !== document.querySelector('#walletBtn')) {
        menu.remove();
      }
    };
    document.addEventListener('click', this._accountMenuClickHandler);
  }

  // Close a bottom-sheet overlay with slide-down animation
  _closeBottomSheet(formOrElement) {
    const overlay = formOrElement.closest('.bottom-sheet-overlay');
    if (!overlay) return;
    const sheet = overlay.querySelector('.bottom-sheet');
    overlay.classList.add('closing');
    if (sheet) sheet.classList.add('closing');
    setTimeout(() => {
      overlay.classList.remove('active', 'closing');
      if (sheet) sheet.classList.remove('closing');
    }, 240);
  }

  // Toast notification
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = this.getToastIcon(type);

    const msgSpan = document.createElement('span');
    msgSpan.className = 'toast-message';
    msgSpan.textContent = message;

    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  // Show loading state
  showLoading(element, message = 'Loading...') {
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
    const t = (key, fallback) => window.i18n?.t(key) || fallback;
    const localeMap = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', vi: 'vi-VN', th: 'th-TH', id: 'id-ID', es: 'es-ES', fr: 'fr-FR', ar: 'ar-SA' };
    const locale = localeMap[window.i18n?.currentLang] || 'en-US';

    if (diff < 60) return t('time.justNow', 'just now');
    if (diff < 3600) return `${Math.floor(diff / 60)} ${t('time.minAgo', 'min ago')}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('time.hrAgo', 'hr ago')}`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ${t('time.daysAgo', 'days ago')}`;

    return new Date(timestamp * 1000).toLocaleDateString(locale);
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
      'send': 'UP',
      'receive': 'DOWN',
      'swap': 'SWAP',
      'approve': 'OK'
    };
    return icons[type] || 'ARROW';
  }

  getTransactionTypeText(type) {
    const t = (key, fallback) => window.i18n?.t(key) || fallback;
    const texts = {
      'send': t('tx.send', 'Send'),
      'receive': t('tx.receive', 'Receive'),
      'swap': t('tx.swap', 'Swap'),
      'approve': t('tx.approve', 'Approve')
    };
    return texts[type] || type;
  }

  getTransactionStatusText(status) {
    const t = (key, fallback) => window.i18n?.t(key) || fallback;
    const texts = {
      'pending': t('tx.pending', 'Pending'),
      'confirmed': t('tx.confirmed', 'Confirmed'),
      'failed': t('tx.failed', 'Failed')
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
      this.showToast(window.i18n?.t('toast.error') || 'Unlock wallet first', 'warning');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'pin-confirmation-overlay';
    overlay.innerHTML = `
      <div class="pin-confirmation-container" style="max-width:380px;width:90%;">
        <div class="pin-confirmation-header">
          <h1>🔐 ${window.i18n?.t('settings.backup') || 'Wallet Backup'}</h1>
          <p>${window.i18n?.t('pin.enterDesc') || 'Enter PIN to view backup'}</p>
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
        <button class="onboarding-btn pin-backup-confirm-btn" disabled style="margin-top:8px;">${window.i18n?.t('common.confirm') || 'Confirm'}</button>
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
        errorDiv.textContent = `${window.i18n?.t('pin.wrong') || 'Incorrect PIN'} (${attempts}/3)`;
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
          <h2 style="font-size:18px;font-weight:700;">🔐 ${window.i18n?.t('settings.backup') || 'Wallet Backup'}</h2>
          <button id="backupCloseBtn" style="background:none;border:none;color:rgba(255,255,255,0.5);font-size:22px;cursor:pointer;padding:4px;">✕</button>
        </div>
        <div style="background:rgba(255,100,50,0.12);border:1px solid rgba(255,100,50,0.3);border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#FF6B35;">
          ⚠️ ${window.i18n?.t('mnemonic.securityTitle') || 'Never share this with anyone. Anyone with this info has full access to your wallet.'}
        </div>
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <button class="backup-tab-btn" data-tab="seed" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:${initialTab === 'seed' ? 'var(--primary)' : 'rgba(255,255,255,0.05)'};color:white;font-size:13px;cursor:pointer;">${window.i18n?.t('mnemonic.title') || 'Seed Phrase'}</button>
          <button class="backup-tab-btn" data-tab="key" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:${initialTab !== 'seed' ? 'var(--primary)' : 'rgba(255,255,255,0.05)'};color:white;font-size:13px;cursor:pointer;">${window.i18n?.t('settings.exportKey') || 'Private Key'}</button>
        </div>
        <div id="backupSeedPanel" style="display:${initialTab === 'seed' ? 'block' : 'none'};">
          ${mnemonic ? `
            <p style="font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:12px;">${window.i18n?.t('mnemonic.keepSafe') || 'Write down these 12 words in a safe place.'}</p>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
              ${mnemonic.split(' ').map((w, i) => `<div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:8px 10px;font-size:13px;"><span style="color:rgba(255,255,255,0.4);font-size:11px;display:block;">${i + 1}</span>${w}</div>`).join('')}
            </div>
            <button id="copySeedBtn" style="width:100%;padding:12px;background:var(--primary);border:none;border-radius:12px;color:white;font-size:14px;font-weight:600;cursor:pointer;">${window.i18n?.t('mnemonic.copy') || 'Copy Seed Phrase'}</button>
          ` : `<p style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">No seed phrase backup available.</p>`}
        </div>
        <div id="backupKeyPanel" style="display:${initialTab !== 'seed' ? 'block' : 'none'};">
          ${privateKey ? `
            <p style="font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:12px;">${window.i18n?.t('mnemonic.keepSafe') || 'Store your private key in a safe place.'}</p>
            <div id="privateKeyDisplay" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:14px;word-break:break-all;font-size:12px;font-family:monospace;margin-bottom:14px;"></div>
            <button id="copyKeyBtn" style="width:100%;padding:12px;background:var(--primary);border:none;border-radius:12px;color:white;font-size:14px;font-weight:600;cursor:pointer;">${window.i18n?.t('settings.copyKey') || 'Copy Private Key'}</button>
          ` : `<p style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">Unable to load private key.</p>`}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Set private key via textContent to avoid XSS via raw key injection into innerHTML
    const privateKeyDisplay = overlay.querySelector('#privateKeyDisplay');
    if (privateKeyDisplay && privateKey) {
      privateKeyDisplay.textContent = privateKey;
    }

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
          copySeedBtn.textContent = window.i18n?.t('mnemonic.copied') || 'Copied ✓';
          setTimeout(() => { copySeedBtn.textContent = window.i18n?.t('mnemonic.copy') || 'Copy Seed Phrase'; }, 2000);
        });
      });
    }

    const copyKeyBtn = overlay.querySelector('#copyKeyBtn');
    if (copyKeyBtn) {
      copyKeyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(privateKey).then(() => {
          copyKeyBtn.textContent = window.i18n?.t('settings.copiedKey') || 'Copied ✓';
          setTimeout(() => { copyKeyBtn.textContent = window.i18n?.t('settings.copyKey') || 'Copy Private Key'; }, 2000);
        });
      });
    }
  }

  isValidAddress(address) {
    // Simple validation for BSC/Ethereum addresses
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

// Auto-initialize WalletUI when DOM is ready
(function() {
  async function startWallet() {
    try {
      // Initialize native bridge first if available
      if (window.NativeBridge) {
        await window.NativeBridge.init();
      }

      const ui = new WalletUI();
      window.walletUI = ui;
      await ui.init();
      console.log('[FunS] Wallet initialized successfully');
    } catch(e) {
      console.error('[FunS] Wallet init failed:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWallet);
  } else {
    startWallet();
  }
})();
