/**
 * FunS Wallet i18n (Internationalization) System
 * Supports 10 languages with dynamic switching and localStorage persistence
 */

class I18n {
    constructor() {
        // Load language from localStorage, default to English
        this.currentLang = localStorage.getItem('funs_language') || 'en';

        // Fall back to English if language not supported
        if (!this.translations[this.currentLang]) {
            this.currentLang = 'en';
        }

        // Apply translations to DOM on initialization
        this.applyToDOM();
    }

    /**
     * Detect browser language from navigator
     */
    detectBrowserLanguage() {
        const browserLang = navigator.language?.split('-')[0];
        const supportedLangs = ['ko', 'en', 'ja', 'zh', 'vi', 'th', 'id', 'es', 'fr', 'ar'];
        return supportedLangs.includes(browserLang) ? browserLang : null;
    }

    /**
     * Get translated text for a given key
     * @param {string} key - Translation key
     * @param {object} params - Parameters for placeholder replacement
     * @returns {string} Translated text
     */
    t(key, params = {}) {
        const translation = this.translations[this.currentLang]?.[key] ||
                           this.translations['ko'][key] || key;

        // Replace {{param}} placeholders with provided values
        return translation.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] || '');
    }

    /**
     * Set the current language and persist to localStorage
     * @param {string} lang - Language code
     * @returns {boolean} Success status
     */
    setLanguage(lang) {
        if (!this.translations[lang]) {
            console.warn(`Language ${lang} not supported`);
            return false;
        }

        this.currentLang = lang;
        localStorage.setItem('funs_language', lang);
        this.applyToDOM();

        // Dispatch custom event for other components to react to language change
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { lang, i18n: this }
        }));

        return true;
    }

    /**
     * Get the current language code
     */
    getLanguage() {
        return this.currentLang;
    }

    /**
     * Get all supported languages with metadata
     */
    getSupportedLanguages() {
        const nativeNames = { ko: '한국어', en: 'English', zh: '中文', ja: '日本語', id: 'Bahasa Indonesia', vi: 'Tiếng Việt', th: 'ไทย', ar: 'العربية', es: 'Español', fr: 'Français' };
        return Object.keys(this.translations).map(code => ({
            code,
            name: this.t('lang.' + code),
            nativeName: nativeNames[code] || this.t('lang.' + code)
        }));
    }

    /**
     * Apply translations to all DOM elements with i18n attributes
     */
    applyToDOM() {
        // Translate elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const params = this.extractParamsFromElement(el);
            const translatedText = this.t(key, params);

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translatedText;
            } else if (el.tagName === 'BUTTON' || el.tagName === 'A') {
                el.textContent = translatedText;
            } else {
                el.textContent = translatedText;
            }
        });

        // Translate title attributes with data-i18n-title
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.t(key);
        });

        // Translate aria-label attributes with data-i18n-aria
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            el.setAttribute('aria-label', this.t(key));
        });

        // Update HTML language attribute
        document.documentElement.lang = this.currentLang;

        // Update text direction for RTL languages
        document.documentElement.dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';

        // Add language class to body for CSS styling hooks
        document.body.classList.remove('lang-ko', 'lang-en', 'lang-ja', 'lang-zh',
                                        'lang-vi', 'lang-th', 'lang-id', 'lang-es',
                                        'lang-fr', 'lang-ar');
        document.body.classList.add('lang-' + this.currentLang);
    }

    /**
     * Extract parameters from element attributes
     */
    extractParamsFromElement(el) {
        const params = {};
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('data-param-')) {
                const paramName = attr.name.replace('data-param-', '');
                params[paramName] = attr.value;
            }
        });
        return params;
    }

    /**
     * Get all translations for current language
     */
    getCurrentTranslations() {
        return this.translations[this.currentLang] || {};
    }

    /**
     * Check if a translation key exists
     */
    hasKey(key) {
        return this.translations[this.currentLang] && key in this.translations[this.currentLang];
    }

    /**
     * Get translations for a specific language
     */
    getTranslations(lang) {
        return this.translations[lang] || this.translations['ko'];
    }

    /**
     * Apply translations to dynamically inserted content
     */
    applyToElement(element) {
        if (!element) return;
        const els = element.querySelectorAll('[data-i18n]');
        els.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.t(key);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = text;
            } else {
                el.textContent = text;
            }
        });
    }

    /**
     * Get the translations object
     */
    get translations() {
        return I18n.TRANSLATIONS;
    }
}

/**
 * Complete translations for all 10 supported languages
 */
I18n.TRANSLATIONS = {
    en: {
        // App general
        'app.name': 'FunS Wallet',
        'app.tagline': 'Secure Multi-Chain Wallet',

        // Header
        'header.scan': 'QR Scan',
        'header.notifications': 'Notifications',

        // Onboarding
        'onboarding.welcome': 'Welcome to FunS Wallet',
        'onboarding.subtitle': 'Safe and Easy Multi-Chain Wallet',
        'onboarding.demo': 'Try Demo',
        'onboarding.create': 'Create New Wallet',
        'onboarding.import': 'Import Wallet',
        'onboarding.or': 'Or',

        // PIN
        'pin.setup': 'Set Password',
        'pin.setupDesc': 'Set a password of at least 8 characters',
        'pin.confirm': 'Confirm PIN',
        'pin.confirmDesc': 'Re-enter your PIN',
        'pin.enter': 'Enter PIN',
        'pin.enterDesc': 'Unlock your wallet',
        'pin.mismatch': 'PIN does not match',
        'pin.wrong': 'Wrong PIN',
        'pin.locked': 'seconds. Please try again later',
        'pin.attempts': 'failed attempts. Try again in 30 seconds',
        'pin.unlock': 'Unlock',

        // Mnemonic
        'mnemonic.title': 'Seed Phrase',
        'mnemonic.warning': 'Write down these 12 words in a safe place',
        'mnemonic.warningDetail': 'The seed phrase is the only way to recover your wallet. Never share it with anyone.',
        'mnemonic.confirm': 'Confirm Seed Phrase',
        'mnemonic.import': 'Import Seed Phrase',
        'mnemonic.importDesc': 'Enter your 12-word seed phrase',
        'mnemonic.paste': 'Paste',
        'mnemonic.invalid': 'Invalid seed phrase',
        'mnemonic.keepSafe': 'Keep this seed phrase in a safe place. You cannot recover your wallet if lost.',
        'mnemonic.securityTitle': 'Never share with anyone',
        'mnemonic.tapToReveal': 'Tap to reveal seed phrase',
        'mnemonic.revealHint': 'Make sure no one is watching',
        'mnemonic.copy': 'Copy',
        'mnemonic.copied': 'Copied',
        'mnemonic.hide': 'Hide',
        'mnemonic.show': 'Show',
        'mnemonic.check1': 'I wrote down my seed phrase on paper',
        'mnemonic.check2': 'I stored it in a safe place',
        'mnemonic.check3': 'I did not take a screenshot',
        'mnemonic.verifyTitle': 'Verify Seed Phrase',
        'mnemonic.selectWord': 'Select word',

        // Home tab
        'home.portfolio': 'Portfolio',
        'home.createWallet': 'Create a Wallet',
        'home.tokens': 'Tokens',
        'home.manageTokens': 'Manage',
        'home.recentTx': 'Recent Transactions',
        'home.allTx': 'All',
        'home.noTokens': 'Connect your wallet to see tokens',
        'home.noTokensDesc': 'Create or import a wallet to view your token balances',
        'home.noTx': 'No transaction history',
        'home.noTxDesc': 'Your transaction history will appear here',

        // Actions
        'action.send': 'Send',
        'action.receive': 'Receive',
        'action.swap': 'Swap',
        'action.buy': 'Buy',
        'action.faucet': 'Faucet',

        // Send modal
        'send.title': 'Send',
        'send.to': 'Recipient Address',
        'send.token': 'Token',
        'send.amount': 'Amount',
        'send.confirm': 'Confirm Send',
        'send.success': 'Transaction sent successfully',
        'send.fail': 'Transaction failed',

        // Receive modal
        'receive.title': 'Receive',
        'receive.copy': 'Copy Address',
        'receive.copied': 'Copied',
        'receive.share': 'Share',

        // Swap modal
        'swap.title': 'Swap',
        'swap.sell': 'Sell',
        'swap.buy': 'Buy',
        'swap.amount': 'Amount',
        'swap.estimated': 'Estimated Amount',
        'swap.confirm': 'Confirm Swap',
        'swap.comingSoon': 'COMING SOON',
        'swap.comingSoonDesc': 'FunSwap DEX integration is coming soon.\nGet ready for faster and safer on-chain swaps!',

        // Buy modal
        'buy.title': 'Buy',
        'buy.token': 'Token',
        'buy.amount': 'Purchase Amount (USD)',
        'buy.method': 'Payment Method',
        'buy.creditCard': 'Credit Card',
        'buy.bankTransfer': 'Bank Transfer',
        'buy.paypal': 'PayPal',
        'buy.confirm': 'Confirm Purchase',

        // Tx filters
        'tx.all': 'All',
        'tx.send': 'Send',
        'tx.receive': 'Receive',
        'tx.swap': 'Swap',
        'tx.pending': 'Pending',
        'tx.confirmed': 'Confirmed',
        'tx.failed': 'Failed',
        'tx.approve': 'Approve',
        'time.justNow': 'just now',
        'time.minAgo': 'min ago',
        'time.hrAgo': 'hr ago',
        'time.daysAgo': 'days ago',

        // Browser tab
        'browser.search': 'Enter URL or search...',
        'browser.bookmarks': 'Bookmarks',
        'browser.dapps': 'Popular DApps',
        'browser.defi': 'DeFi',
        'browser.nft': 'NFT',

        // NFT tab
        'nft.title': 'NFT Collection',
        'nft.founder': 'FunS Founder',
        'nft.membership': 'Premium Membership',
        'nft.memberSince': 'Member Since',
        'nft.benefits': 'Membership Benefits',
        'nft.benefit1': '50% discount on trading fees',
        'nft.benefit2': 'Priority allocation for new token airdrops',
        'nft.benefit3': 'DAO governance voting rights',
        'nft.benefit4': 'Access to exclusive community channels',

        // Settings tab
        'settings.title': 'Settings',
        'settings.network': 'Network',
        'settings.bsc': 'BSC (BNB Smart Chain)',
        'settings.eth': 'Ethereum',
        'settings.customTokens': 'Custom Tokens',
        'settings.addToken': 'Add Token',
        'settings.security': 'Security',
        'settings.biometric': 'Biometric Authentication',
        'settings.connectedApps': 'Connected Apps',
        'settings.connectedCount': 'DApps connected',
        'settings.general': 'General',
        'settings.language': 'Language',
        'settings.theme': 'Dark Mode',
        'settings.txAlerts': 'Transaction Alerts',
        'settings.priceAlerts': 'Price Alerts',
        'settings.about': 'About',
        'settings.version': 'Version',
        'settings.help': 'Help & Support',
        'settings.privacy': 'Privacy Policy',
        'settings.terms': 'Terms of Service',
        'settings.resetWallet': 'Reset Wallet',
        'settings.resetConfirm': 'Are you sure you want to reset your wallet? All data will be deleted.',
        'settings.exportKey': 'Export Private Key',
        'settings.exportMnemonic': 'Export Seed Phrase',
        'settings.backup': 'Backup',

        // Add token modal
        'addToken.title': 'Add Token',
        'addToken.address': 'Contract Address',
        'addToken.symbol': 'Symbol',
        'addToken.name': 'Name',
        'addToken.decimals': 'Decimals',
        'addToken.loading': 'Loading token info...',
        'addToken.auto': 'Auto-Fill',
        'addToken.cancel': 'Cancel',
        'addToken.add': 'Add',

        // Tab navigation
        'tab.home': 'Home',
        'tab.browser': 'Browser',
        'tab.swap': 'Swap',
        'tab.nft': 'NFT',
        'tab.settings': 'Settings',

        // Testnet
        'testnet.banner': '⚠ Testnet Mode',
        'testnet.faucet': 'Get Free Test Coins →',

        // Network
        'network.select': 'Select Network',
        'network.connected': 'Blockchain Connected',
        'network.disconnected': 'Disconnected',

        // Toast messages
        'toast.addressCopied': 'Address copied',
        'toast.copyFail': 'Failed to copy address',
        'toast.walletCreated': 'Wallet created successfully',
        'toast.walletImported': 'Wallet imported successfully',
        'toast.error': 'An error occurred',

        // Language names
        'lang.ko': '한국어',
        'lang.en': 'English',
        'lang.ja': '日本語',
        'lang.zh': '中文',
        'lang.vi': 'Tiếng Việt',
        'lang.th': 'ไทย',
        'lang.id': 'Bahasa Indonesia',
        'lang.es': 'Español',
        'lang.fr': 'Français',
        'lang.ar': 'العربية',

        // QR scanner
        'qr.scan': 'QR Scanner is available on mobile app',
        'qr.manualInput': 'QR scan is only available on the app.\nEnter the address manually:',
        'qr.scanTitle': 'Scan QR Code',
        'qr.scanStatus': 'Align QR code within the frame',
        'qr.permDenied': 'Camera permission denied',
        'qr.camError': 'Camera unavailable',
        'qr.notSupported': 'QR scanning not supported in this browser',

        // Misc
        'misc.noNotifications': 'No notifications',
        'misc.loading': 'Loading...',
        'misc.confirm': 'Confirm',
        'misc.cancel': 'Cancel',
        'misc.comingSoon': 'English version coming soon!',

        // Common
        'common.confirm': 'Confirm',
        'common.cancel': 'Cancel',
        'common.next': 'Next',
        'common.back': 'Back',

        // Settings (additional)
        'settings.defaultNetwork': 'Default Network',
        'settings.optional': 'Optional',
        'settings.networkManagement': 'Network Management',
        'settings.customTokensDesc': 'You can add tokens directly by contract address.',
        'settings.ethSepolia': 'Ethereum Sepolia',
        'settings.testnet': 'Testnet',
        'settings.seedBackup': 'Seed Phrase Backup',
        'settings.seedBackupDesc': 'Protect your wallet securely',
        'settings.biometricDesc': 'Fingerprint or Face Recognition',
        'settings.connectedSites': 'Connected Sites',
        'settings.connectedSitesDesc': '3 DApps Connected',
        'settings.transaction': 'Transaction Settings',
        'settings.languageDesc': 'Language',
        'settings.currency': 'Currency',
        'settings.currencyDesc': 'Currency',
        'settings.themeDesc': 'Theme',
        'settings.notifications': 'Notifications',
        'settings.txAlertsDesc': 'Transaction Alerts',
        'settings.priceAlertsDesc': 'Price Alerts',
        'settings.other': 'Other',
        'settings.backupDesc': 'Backup/Export Wallet',
        'settings.termsDesc': 'Terms of Service',
        'settings.privacyDesc': 'Privacy Policy',
        'settings.gasLimit': 'Gas Limit',
        'settings.gasLimitDesc': 'Gas Limit',
        'settings.slippage': 'Slippage Tolerance',
        'settings.slippageDesc': 'Slippage Tolerance',
        'settings.gas': 'Default Gas',
        'settings.gasDesc': 'Default Gas',
        'settings.gasSlow': 'Slow',
        'settings.gasNormal': 'Normal',
        'settings.gasFast': 'Fast',
        'settings.autoLock': 'Auto-Lock',
        'settings.autoLockDesc': 'Auto-Lock',
        'settings.time1m': '1 min',
        'settings.time5m': '5 min',
        'settings.time15m': '15 min',
        'settings.time30m': '30 min',

        // Toast (additional)
        'toast.demoMode': 'Running in test mode',
        'toast.balanceFetchFail': 'Balance fetch failed - check your network connection',
        'toast.chartNoData': 'Unable to load chart data',
        'toast.chartFail': 'Chart update failed',
        'toast.networkEnabled': 'Ethereum network enabled',
        'toast.networkEnableFail': 'Failed to enable network',
        'toast.networkDisabled': 'Ethereum network disabled',
        'toast.tokenExists': '{{symbol}} token already exists',
        'toast.tokenAdded': '{{symbol}} token added',
        'toast.tokenAddFail': 'Failed to add token',

        // Error
        'error.mnemonicGenFail': 'Failed to generate seed phrase',
        'error.pinMismatch': 'PIN does not match',
        'error.verifyFail': 'An error occurred',
        'error.common': 'An error occurred',
        'send.sending': 'Sending...',
        'swap.swapping': 'Swapping...',
        'settings.copyKey': 'Copy Private Key',
        'settings.copiedKey': 'Copied ✓',
        'home.searchTokens': 'Search tokens...'
    },

    ja: {
        // App general
        'app.name': 'FunS Wallet',
        'app.tagline': '安全なマルチチェーンウォレット',

        // Header
        'header.scan': 'QRスキャン',
        'header.notifications': '通知',

        // Onboarding
        'onboarding.welcome': 'FunS Walletへようこそ',
        'onboarding.subtitle': '安全で簡単なマルチチェーンウォレット',
        'onboarding.demo': 'デモを試す',
        'onboarding.create': '新しいウォレットを作成',
        'onboarding.import': 'ウォレットをインポート',
        'onboarding.or': 'または',

        // PIN
        'pin.setup': 'パスワードを設定',
        'pin.setupDesc': '8文字以上のパスワードを設定してください',
        'pin.confirm': 'PIN確認',
        'pin.confirmDesc': 'PINを再入力してください',
        'pin.enter': 'PINを入力',
        'pin.enterDesc': 'ウォレットのロックを解除',
        'pin.mismatch': 'PINが一致しません',
        'pin.wrong': '間違ったPIN',
        'pin.locked': '秒後に再度お試しください',
        'pin.attempts': '回失敗しました。30秒後に再度お試しください',
        'pin.unlock': 'ロック解除',

        // Mnemonic
        'mnemonic.title': 'シードフレーズ',
        'mnemonic.warning': 'この12単語を安全な場所に書き留めてください',
        'mnemonic.warningDetail': 'シードフレーズはウォレットを復旧する唯一の方法です。誰とも共有しないでください。',
        'mnemonic.confirm': 'シードフレーズを確認',
        'mnemonic.import': 'シードフレーズをインポート',
        'mnemonic.importDesc': '12単語のシードフレーズを入力してください',
        'mnemonic.paste': '貼り付け',
        'mnemonic.invalid': '無効なシードフレーズ',
        'mnemonic.keepSafe': 'シードフレーズを安全な場所に保管してください。紛失すると復元できません。',
        'mnemonic.securityTitle': '絶対に共有しないでください',
        'mnemonic.tapToReveal': 'タップしてシードフレーズを表示',
        'mnemonic.revealHint': '周りに誰もいないことを確認してください',
        'mnemonic.copy': 'コピー',
        'mnemonic.copied': 'コピー済み',
        'mnemonic.hide': '隠す',
        'mnemonic.show': '表示',
        'mnemonic.check1': 'シードフレーズを紙に書きました',
        'mnemonic.check2': '安全な場所に保管しました',
        'mnemonic.check3': 'スクリーンショットは撮りませんでした',
        'mnemonic.verifyTitle': 'シードフレーズの確認',
        'mnemonic.selectWord': '単語を選択してください',

        // Home tab
        'home.portfolio': 'ポートフォリオ',
        'home.createWallet': 'ウォレットを作成',
        'home.tokens': 'トークン',
        'home.manageTokens': '管理',
        'home.recentTx': '最近のトランザクション',
        'home.allTx': 'すべて',
        'home.noTokens': 'ウォレットを接続するとトークンが表示されます',
        'home.noTokensDesc': 'ウォレットを作成またはインポートしてトークン残高を確認してください',
        'home.noTx': 'トランザクション履歴がありません',
        'home.noTxDesc': 'ここに取引履歴が表示されます',

        // Actions
        'action.send': '送信',
        'action.receive': '受け取り',
        'action.swap': 'スワップ',
        'action.buy': '購入',
        'action.faucet': 'フォーセット',

        // Send modal
        'send.title': '送信',
        'send.to': '受取人アドレス',
        'send.token': 'トークン',
        'send.amount': '金額',
        'send.confirm': '送信を確認',
        'send.success': 'トランザクションが正常に送信されました',
        'send.fail': 'トランザクションが失敗しました',

        // Receive modal
        'receive.title': '受け取り',
        'receive.copy': 'アドレスをコピー',
        'receive.copied': 'コピーしました',
        'receive.share': '共有',

        // Swap modal
        'swap.title': 'スワップ',
        'swap.sell': '売却',
        'swap.buy': '購入',
        'swap.amount': '金額',
        'swap.estimated': '予想金額',
        'swap.confirm': 'スワップを確認',
        'swap.comingSoon': 'COMING SOON',
        'swap.comingSoonDesc': 'FunSwap DEX統合がまもなく利用可能になります。\nより速く安全なオンチェーンスワップをお楽しみに！',

        // Buy modal
        'buy.title': '購入',
        'buy.token': 'トークン',
        'buy.amount': '購入額 (USD)',
        'buy.method': '支払い方法',
        'buy.creditCard': 'クレジットカード',
        'buy.bankTransfer': '銀行振込',
        'buy.paypal': 'PayPal',
        'buy.confirm': '購入を確認',

        // Tx filters
        'tx.all': 'すべて',
        'tx.send': '送信',
        'tx.receive': '受け取り',
        'tx.swap': 'スワップ',
        'tx.pending': '保留中',
        'tx.confirmed': '確認済み',
        'tx.failed': '失敗',
        'tx.approve': '承認',
        'time.justNow': 'たった今',
        'time.minAgo': '分前',
        'time.hrAgo': '時間前',
        'time.daysAgo': '日前',

        // Browser tab
        'browser.search': 'URLを入力または検索...',
        'browser.bookmarks': 'ブックマーク',
        'browser.dapps': '人気のDApps',
        'browser.defi': 'DeFi',
        'browser.nft': 'NFT',

        // NFT tab
        'nft.title': 'NFTコレクション',
        'nft.founder': 'FunS Founder',
        'nft.membership': 'プレミアムメンバーシップ',
        'nft.memberSince': 'メンバー開始日',
        'nft.benefits': 'メンバーシップ特典',
        'nft.benefit1': '取引手数料50%割引',
        'nft.benefit2': '新しいトークンエアドロップの優先配分',
        'nft.benefit3': 'DAO ガバナンス投票権',
        'nft.benefit4': '限定コミュニティチャネルへのアクセス',

        // Settings tab
        'settings.title': '設定',
        'settings.network': 'ネットワーク',
        'settings.bsc': 'BSC (BNB Smart Chain)',
        'settings.eth': 'Ethereum',
        'settings.customTokens': 'カスタムトークン',
        'settings.addToken': 'トークンを追加',
        'settings.security': 'セキュリティ',
        'settings.biometric': 'バイオメトリクス認証',
        'settings.connectedApps': '接続されたアプリ',
        'settings.connectedCount': '個のDAppが接続されています',
        'settings.general': '一般',
        'settings.language': '言語',
        'settings.theme': 'ダークモード',
        'settings.txAlerts': 'トランザクション通知',
        'settings.priceAlerts': '価格アラート',
        'settings.about': 'について',
        'settings.version': 'バージョン',
        'settings.help': 'ヘルプ & サポート',
        'settings.privacy': 'プライバシーポリシー',
        'settings.terms': '利用規約',
        'settings.resetWallet': 'ウォレットをリセット',
        'settings.resetConfirm': 'ウォレットをリセットしますか？すべてのデータが削除されます。',
        'settings.exportKey': 'プライベートキーをエクスポート',
        'settings.exportMnemonic': 'シードフレーズをエクスポート',
        'settings.backup': 'バックアップ',

        // Add token modal
        'addToken.title': 'トークンを追加',
        'addToken.address': 'コントラクトアドレス',
        'addToken.symbol': 'シンボル',
        'addToken.name': '名前',
        'addToken.decimals': '小数点',
        'addToken.loading': 'トークン情報を読み込み中...',
        'addToken.auto': '自動入力',
        'addToken.cancel': 'キャンセル',
        'addToken.add': '追加',

        // Tab navigation
        'tab.home': 'ホーム',
        'tab.browser': 'ブラウザ',
        'tab.swap': 'スワップ',
        'tab.nft': 'NFT',
        'tab.settings': '設定',

        // Testnet
        'testnet.banner': '⚠ テストネットモード',
        'testnet.faucet': '無料テストコインを取得 →',

        // Network
        'network.select': 'ネットワークを選択',
        'network.connected': 'ブロックチェーン接続済み',
        'network.disconnected': '切断',

        // Toast messages
        'toast.addressCopied': 'アドレスがコピーされました',
        'toast.copyFail': 'アドレスのコピーに失敗しました',
        'toast.walletCreated': 'ウォレットが作成されました',
        'toast.walletImported': 'ウォレットがインポートされました',
        'toast.error': 'エラーが発生しました',

        // Language names
        'lang.ko': '한국어',
        'lang.en': 'English',
        'lang.ja': '日本語',
        'lang.zh': '中文',
        'lang.vi': 'Tiếng Việt',
        'lang.th': 'ไทย',
        'lang.id': 'Bahasa Indonesia',
        'lang.es': 'Español',
        'lang.fr': 'Français',
        'lang.ar': 'العربية',

        // QR scanner
        'qr.scan': 'QRスキャナーはモバイルアプリで利用できます',
        'qr.manualInput': 'QRスキャンはアプリでのみ利用可能です。\nアドレスを手動で入力してください:',
        'qr.scanTitle': 'QRコードをスキャン',
        'qr.scanStatus': 'QRコードをフレーム内に合わせてください',
        'qr.permDenied': 'カメラの許可が拒否されました',
        'qr.camError': 'カメラが利用できません',
        'qr.notSupported': 'このブラウザではQRスキャンに対応していません',

        // Misc
        'misc.noNotifications': '通知がありません',
        'misc.loading': '読み込み中...',
        'misc.confirm': '確認',
        'misc.cancel': 'キャンセル',
        'misc.comingSoon': 'English version coming soon!',

        // Common
        'common.confirm': '確認',
        'common.cancel': 'キャンセル',
        'common.next': '次へ',
        'common.back': '戻る',

        // Settings (additional)
        'settings.defaultNetwork': 'デフォルトネットワーク',
        'settings.optional': 'オプション',
        'settings.networkManagement': 'ネットワーク管理',
        'settings.customTokensDesc': 'コントラクトアドレスでトークンを直接追加できます。',
        'settings.ethSepolia': 'Ethereum Sepolia',
        'settings.testnet': 'テストネット',
        'settings.seedBackup': 'シードフレーズバックアップ',
        'settings.seedBackupDesc': 'ウォレットを安全に保護',
        'settings.biometricDesc': '指紋または顔認識',
        'settings.connectedSites': '接続済みサイト',
        'settings.connectedSitesDesc': '3つのDApp接続済み',
        'settings.transaction': 'トランザクション設定',
        'settings.languageDesc': '言語',
        'settings.currency': '通貨',
        'settings.currencyDesc': '通貨',
        'settings.themeDesc': 'テーマ',
        'settings.notifications': '通知設定',
        'settings.txAlertsDesc': 'トランザクションアラート',
        'settings.priceAlertsDesc': '価格アラート',
        'settings.other': 'その他',
        'settings.backupDesc': 'バックアップ/ウォレットのエクスポート',
        'settings.termsDesc': '利用規約',
        'settings.privacyDesc': 'プライバシーポリシー',
        'settings.gasLimit': 'ガスリミット',
        'settings.gasLimitDesc': 'ガスリミット',
        'settings.slippage': 'スリッページ許容量',
        'settings.slippageDesc': 'スリッページ許容量',
        'settings.gas': 'デフォルトガス',
        'settings.gasDesc': 'デフォルトガス',
        'settings.gasSlow': '遅い',
        'settings.gasNormal': '標準',
        'settings.gasFast': '速い',
        'settings.autoLock': '自動ロック',
        'settings.autoLockDesc': '自動ロック',
        'settings.time1m': '1分',
        'settings.time5m': '5分',
        'settings.time15m': '15分',
        'settings.time30m': '30分',

        // Toast (additional)
        'toast.demoMode': 'テストモードで実行中',
        'toast.balanceFetchFail': '残高取得失敗 - ネットワーク接続を確認してください',
        'toast.chartNoData': 'チャートデータを読み込めません',
        'toast.chartFail': 'チャートの更新に失敗しました',
        'toast.networkEnabled': 'イーサリアムネットワークが有効になりました',
        'toast.networkEnableFail': 'ネットワークの有効化に失敗しました',
        'toast.networkDisabled': 'イーサリアムネットワークが無効になりました',
        'toast.tokenExists': '{{symbol}}トークンはすでに存在します',
        'toast.tokenAdded': '{{symbol}}トークンが追加されました',
        'toast.tokenAddFail': 'トークンの追加に失敗しました',

        // Error
        'error.mnemonicGenFail': 'シードフレーズを生成できません',
        'error.pinMismatch': 'PINが一致しません',
        'error.verifyFail': 'エラーが発生しました',
        'error.common': 'エラーが発生しました',
        'send.sending': '送信中...',
        'swap.swapping': 'スワップ中...',
        'settings.copyKey': 'プライベートキーをコピー',
        'settings.copiedKey': 'コピー済み ✓',
        'home.searchTokens': 'トークンを検索...'
    },

    zh: {
        // App general
        'app.name': 'FunS Wallet',
        'app.tagline': '安全的多链钱包',

        // Header
        'header.scan': '扫描二维码',
        'header.notifications': '通知',

        // Onboarding
        'onboarding.welcome': '欢迎使用 FunS Wallet',
        'onboarding.subtitle': '安全便捷的多链钱包',
        'onboarding.demo': '尝试演示',
        'onboarding.create': '创建新钱包',
        'onboarding.import': '导入钱包',
        'onboarding.or': '或者',

        // PIN
        'pin.setup': '设置密码',
        'pin.setupDesc': '请设置至少 8 位密码',
        'pin.confirm': '确认 PIN',
        'pin.confirmDesc': '请重新输入 PIN',
        'pin.enter': '输入 PIN',
        'pin.enterDesc': '解锁您的钱包',
        'pin.mismatch': 'PIN 不匹配',
        'pin.wrong': '错误的 PIN',
        'pin.locked': '秒后请重试',
        'pin.attempts': '次失败。30 秒后重试',
        'pin.unlock': '解锁',

        // Mnemonic
        'mnemonic.title': '助记词',
        'mnemonic.warning': '请将这 12 个单词记录在安全的地方',
        'mnemonic.warningDetail': '助记词是恢复钱包的唯一方法。不要与任何人分享。',
        'mnemonic.confirm': '确认助记词',
        'mnemonic.import': '导入助记词',
        'mnemonic.importDesc': '输入 12 个单词的助记词',
        'mnemonic.paste': '粘贴',
        'mnemonic.invalid': '无效的助记词',
        'mnemonic.keepSafe': '请将助记词保存在安全的地方。丢失后无法恢复钱包。',
        'mnemonic.securityTitle': '绝对不要分享',
        'mnemonic.tapToReveal': '点击查看助记词',
        'mnemonic.revealHint': '请确保周围没有人',
        'mnemonic.copy': '复制',
        'mnemonic.copied': '已复制',
        'mnemonic.hide': '隐藏',
        'mnemonic.show': '显示',
        'mnemonic.check1': '我已将助记词写在纸上',
        'mnemonic.check2': '我已将其存放在安全的地方',
        'mnemonic.check3': '我没有截图',
        'mnemonic.verifyTitle': '验证助记词',
        'mnemonic.selectWord': '请选择单词',

        // Home tab
        'home.portfolio': '资产组合',
        'home.createWallet': '创建钱包',
        'home.tokens': '代币',
        'home.manageTokens': '管理',
        'home.recentTx': '最近的交易',
        'home.allTx': '全部',
        'home.noTokens': '连接钱包以查看代币',
        'home.noTokensDesc': '创建或导入钱包以查看您的代币余额',
        'home.noTx': '没有交易历史',
        'home.noTxDesc': '您的交易记录将显示在这里',

        // Actions
        'action.send': '发送',
        'action.receive': '接收',
        'action.swap': '兑换',
        'action.buy': '购买',
        'action.faucet': '领取',

        // Send modal
        'send.title': '发送',
        'send.to': '收款地址',
        'send.token': '代币',
        'send.amount': '数量',
        'send.confirm': '确认发送',
        'send.success': '交易发送成功',
        'send.fail': '交易失败',

        // Receive modal
        'receive.title': '接收',
        'receive.copy': '复制地址',
        'receive.copied': '已复制',
        'receive.share': '分享',

        // Swap modal
        'swap.title': '兑换',
        'swap.sell': '卖出',
        'swap.buy': '买入',
        'swap.amount': '数量',
        'swap.estimated': '预计数量',
        'swap.confirm': '确认兑换',
        'swap.comingSoon': 'COMING SOON',
        'swap.comingSoonDesc': 'FunSwap DEX 集成即将推出。\n敬请期待更快更安全的链上兑换！',

        // Buy modal
        'buy.title': '购买',
        'buy.token': '代币',
        'buy.amount': '购买金额 (USD)',
        'buy.method': '支付方式',
        'buy.creditCard': '信用卡',
        'buy.bankTransfer': '银行转账',
        'buy.paypal': 'PayPal',
        'buy.confirm': '确认购买',

        // Tx filters
        'tx.all': '全部',
        'tx.send': '发送',
        'tx.receive': '接收',
        'tx.swap': '兑换',
        'tx.pending': '待处理',
        'tx.confirmed': '已确认',
        'tx.failed': '失败',
        'tx.approve': '批准',
        'time.justNow': '刚刚',
        'time.minAgo': '分钟前',
        'time.hrAgo': '小时前',
        'time.daysAgo': '天前',

        // Browser tab
        'browser.search': '输入网址或搜索...',
        'browser.bookmarks': '书签',
        'browser.dapps': '热门 DApps',
        'browser.defi': 'DeFi',
        'browser.nft': 'NFT',

        // NFT tab
        'nft.title': 'NFT 收藏',
        'nft.founder': 'FunS Founder',
        'nft.membership': '高级会员',
        'nft.memberSince': '会员加入日期',
        'nft.benefits': '会员权益',
        'nft.benefit1': '交易费用 50% 折扣',
        'nft.benefit2': '新代币空投优先分配',
        'nft.benefit3': 'DAO 治理投票权',
        'nft.benefit4': '专享社区频道访问权限',

        // Settings tab
        'settings.title': '设置',
        'settings.network': '网络',
        'settings.bsc': 'BSC (BNB Smart Chain)',
        'settings.eth': 'Ethereum',
        'settings.customTokens': '自定义代币',
        'settings.addToken': '添加代币',
        'settings.security': '安全',
        'settings.biometric': '生物识别认证',
        'settings.connectedApps': '已连接应用',
        'settings.connectedCount': '个 DApp 已连接',
        'settings.general': '常规',
        'settings.language': '语言',
        'settings.theme': '深色模式',
        'settings.txAlerts': '交易提醒',
        'settings.priceAlerts': '价格提醒',
        'settings.about': '关于',
        'settings.version': '版本',
        'settings.help': '帮助和支持',
        'settings.privacy': '隐私政策',
        'settings.terms': '服务条款',
        'settings.resetWallet': '重置钱包',
        'settings.resetConfirm': '确定要重置钱包吗？所有数据都将被删除。',
        'settings.exportKey': '导出私钥',
        'settings.exportMnemonic': '导出助记词',
        'settings.backup': '备份',

        // Add token modal
        'addToken.title': '添加代币',
        'addToken.address': '合约地址',
        'addToken.symbol': '代码',
        'addToken.name': '名称',
        'addToken.decimals': '小数位数',
        'addToken.loading': '正在加载代币信息...',
        'addToken.auto': '自动填充',
        'addToken.cancel': '取消',
        'addToken.add': '添加',

        // Tab navigation
        'tab.home': '首页',
        'tab.browser': '浏览器',
        'tab.swap': '兑换',
        'tab.nft': 'NFT',
        'tab.settings': '设置',

        // Testnet
        'testnet.banner': '⚠ 测试网模式',
        'testnet.faucet': '获取免费测试币 →',

        // Network
        'network.select': '选择网络',
        'network.connected': '区块链已连接',
        'network.disconnected': '已断开',

        // Toast messages
        'toast.addressCopied': '地址已复制',
        'toast.copyFail': '复制地址失败',
        'toast.walletCreated': '钱包创建成功',
        'toast.walletImported': '钱包导入成功',
        'toast.error': '发生错误',

        // Language names
        'lang.ko': '한국어',
        'lang.en': 'English',
        'lang.ja': '日本語',
        'lang.zh': '中文',
        'lang.vi': 'Tiếng Việt',
        'lang.th': 'ไทย',
        'lang.id': 'Bahasa Indonesia',
        'lang.es': 'Español',
        'lang.fr': 'Français',
        'lang.ar': 'العربية',

        // QR scanner
        'qr.scan': 'QR 扫描仪在移动应用中可用',
        'qr.manualInput': 'QR 扫描仅在应用中可用。\n请手动输入地址:',
        'qr.scanTitle': '扫描二维码',
        'qr.scanStatus': '将二维码对准框内',
        'qr.permDenied': '相机权限被拒绝',
        'qr.camError': '相机不可用',
        'qr.notSupported': '此浏览器不支持二维码扫描',

        // Misc
        'misc.noNotifications': '没有通知',
        'misc.loading': '正在加载...',
        'misc.confirm': '确认',
        'misc.cancel': '取消',
        'misc.comingSoon': 'English version coming soon!',

        // Common
        'common.confirm': '确认',
        'common.cancel': '取消',
        'common.next': '下一步',
        'common.back': '返回',

        // Settings (additional)
        'settings.defaultNetwork': '默认网络',
        'settings.optional': '可选',
        'settings.networkManagement': '网络管理',
        'settings.customTokensDesc': '您可以通过合约地址直接添加代币。',
        'settings.ethSepolia': 'Ethereum Sepolia',
        'settings.testnet': '测试网',
        'settings.seedBackup': '助记词备份',
        'settings.seedBackupDesc': '安全保护您的钱包',
        'settings.biometricDesc': '指纹或面部识别',
        'settings.connectedSites': '已连接站点',
        'settings.connectedSitesDesc': '3个DApp已连接',
        'settings.transaction': '交易设置',
        'settings.languageDesc': '语言',
        'settings.currency': '货币',
        'settings.currencyDesc': '货币',
        'settings.themeDesc': '主题',
        'settings.notifications': '通知设置',
        'settings.txAlertsDesc': '交易提醒',
        'settings.priceAlertsDesc': '价格提醒',
        'settings.other': '其他',
        'settings.backupDesc': '备份/导出钱包',
        'settings.termsDesc': '服务条款',
        'settings.privacyDesc': '隐私政策',
        'settings.gasLimit': 'Gas限额',
        'settings.gasLimitDesc': 'Gas限额',
        'settings.slippage': '滑点容差',
        'settings.slippageDesc': '滑点容差',
        'settings.gas': '默认Gas费',
        'settings.gasDesc': '默认Gas费',
        'settings.gasSlow': '慢',
        'settings.gasNormal': '正常',
        'settings.gasFast': '快',
        'settings.autoLock': '自动锁定',
        'settings.autoLockDesc': '自动锁定',
        'settings.time1m': '1分钟',
        'settings.time5m': '5分钟',
        'settings.time15m': '15分钟',
        'settings.time30m': '30分钟',

        // Toast (additional)
        'toast.demoMode': '以测试模式运行',
        'toast.balanceFetchFail': '余额获取失败 - 请检查网络连接',
        'toast.chartNoData': '无法加载图表数据',
        'toast.chartFail': '图表更新失败',
        'toast.networkEnabled': '以太坊网络已启用',
        'toast.networkEnableFail': '启用网络失败',
        'toast.networkDisabled': '以太坊网络已禁用',
        'toast.tokenExists': '{{symbol}}代币已存在',
        'toast.tokenAdded': '{{symbol}}代币已添加',
        'toast.tokenAddFail': '添加代币失败',

        // Error
        'error.mnemonicGenFail': '无法生成助记词',
        'error.pinMismatch': 'PIN不匹配',
        'error.verifyFail': '发生错误',
        'error.common': '发生错误',
        'send.sending': '发送中...',
        'swap.swapping': '兑换中...',
        'settings.copyKey': '复制私钥',
        'settings.copiedKey': '已复制 ✓',
        'home.searchTokens': '搜索代币...'
    },

    ko: {
        // App general
        'app.name': 'FunS Wallet',
        'app.tagline': '안전한 멀티체인 지갑',

        // Header
        'header.scan': 'QR 스캔',
        'header.notifications': '알림',

        // Onboarding
        'onboarding.welcome': 'FunS Wallet에 오신 것을 환영합니다',
        'onboarding.subtitle': '안전하고 간편한 멀티체인 지갑',
        'onboarding.demo': '체험하기',
        'onboarding.create': '새 지갑 만들기',
        'onboarding.import': '지갑 가져오기',
        'onboarding.or': '또는',

        // PIN
        'pin.setup': '비밀번호 설정',
        'pin.setupDesc': '최소 8자리 이상의 비밀번호를 설정하세요',
        'pin.confirm': 'PIN 확인',
        'pin.confirmDesc': 'PIN을 다시 입력하세요',
        'pin.enter': 'PIN 입력',
        'pin.enterDesc': '지갑 잠금을 해제하세요',
        'pin.mismatch': 'PIN이 일치하지 않습니다',
        'pin.wrong': '잘못된 PIN입니다',
        'pin.locked': '초 후에 다시 시도해주세요',
        'pin.attempts': '회 실패. 30초 후 다시 시도해주세요',
        'pin.unlock': '잠금 해제',

        // Mnemonic
        'mnemonic.title': '시드 구문',
        'mnemonic.warning': '이 12단어를 안전한 곳에 기록하세요',
        'mnemonic.warningDetail': '시드 구문은 지갑을 복구하는 유일한 방법입니다. 절대 다른 사람과 공유하지 마세요.',
        'mnemonic.confirm': '시드 구문 확인',
        'mnemonic.import': '시드 구문 입력',
        'mnemonic.importDesc': '12단어 시드 구문을 입력하세요',
        'mnemonic.paste': '붙여넣기',
        'mnemonic.invalid': '올바른 시드 구문이 아닙니다',
        'mnemonic.keepSafe': '이 시드 구문을 안전한 곳에 보관하세요. 분실 시 지갑을 복구할 수 없습니다.',
        'mnemonic.securityTitle': '절대 공유하지 마세요',
        'mnemonic.tapToReveal': '탭하여 시드 구문 보기',
        'mnemonic.revealHint': '주변에 아무도 없는지 확인하세요',
        'mnemonic.copy': '복사하기',
        'mnemonic.copied': '복사됨',
        'mnemonic.hide': '숨기기',
        'mnemonic.show': '보기',
        'mnemonic.check1': '시드 구문을 종이에 적었습니다',
        'mnemonic.check2': '안전한 장소에 보관했습니다',
        'mnemonic.check3': '스크린샷을 찍지 않았습니다',
        'mnemonic.verifyTitle': '시드 구문 확인',
        'mnemonic.selectWord': '단어를 선택하세요',

        // Home tab
        'home.portfolio': '포트폴리오',
        'home.createWallet': '지갑을 생성하세요',
        'home.tokens': '토큰',
        'home.manageTokens': '관리',
        'home.recentTx': '최근 거래',
        'home.allTx': '전체',
        'home.noTokens': '지갑을 연결하면 토큰이 표시됩니다',
        'home.noTokensDesc': '지갑을 생성하거나 가져오면 토큰 잔액이 표시됩니다',
        'home.noTx': '트랜잭션 내역이 없습니다',
        'home.noTxDesc': '거래 내역이 여기에 표시됩니다',

        // Actions
        'action.send': '보내기',
        'action.receive': '받기',
        'action.swap': '스왑',
        'action.buy': '구매',
        'action.faucet': '무료받기',

        // Send modal
        'send.title': '전송',
        'send.to': '받는 주소',
        'send.token': '토큰',
        'send.amount': '수량',
        'send.confirm': '전송 확인',
        'send.success': '전송이 완료되었습니다',
        'send.fail': '전송에 실패했습니다',

        // Receive modal
        'receive.title': '수신',
        'receive.copy': '주소 복사',
        'receive.copied': '복사됨',
        'receive.share': '공유',

        // Swap modal
        'swap.title': '스왑',
        'swap.sell': '판매',
        'swap.buy': '구매',
        'swap.amount': '수량',
        'swap.estimated': '예상 수량',
        'swap.confirm': '스왑 확인',
        'swap.comingSoon': 'COMING SOON',
        'swap.comingSoonDesc': 'FunSwap DEX 통합이 곧 출시됩니다.\n더 빠르고 안전한 온체인 스왑을 기대해주세요!',

        // Buy modal
        'buy.title': '구매',
        'buy.token': '토큰',
        'buy.amount': '구매 금액 (USD)',
        'buy.method': '결제 방법',
        'buy.creditCard': '신용카드',
        'buy.bankTransfer': '은행 이체',
        'buy.paypal': '페이팔',
        'buy.confirm': '구매 확인',

        // Tx filters
        'tx.all': '전체',
        'tx.send': '보내기',
        'tx.receive': '받기',
        'tx.swap': '스왑',
        'tx.pending': '처리중',
        'tx.confirmed': '완료',
        'tx.failed': '실패',
        'tx.approve': '승인',
        'time.justNow': '방금',
        'time.minAgo': '분 전',
        'time.hrAgo': '시간 전',
        'time.daysAgo': '일 전',

        // Browser tab
        'browser.search': 'URL 입력 또는 검색...',
        'browser.bookmarks': '즐겨찾기',
        'browser.dapps': '인기 DApps',
        'browser.defi': 'DeFi',
        'browser.nft': 'NFT',

        // NFT tab
        'nft.title': 'NFT 컬렉션',
        'nft.founder': 'FunS Founder',
        'nft.membership': '프리미엄 멤버십',
        'nft.memberSince': '멤버 가입일',
        'nft.benefits': '멤버십 혜택',
        'nft.benefit1': '거래 수수료 50% 할인',
        'nft.benefit2': '신규 토큰 에어드롭 우선 배정',
        'nft.benefit3': 'DAO 거버넌스 투표권',
        'nft.benefit4': '전용 커뮤니티 채널 접근',

        // Settings tab
        'settings.title': '설정',
        'settings.network': '네트워크',
        'settings.bsc': 'BSC (BNB Smart Chain)',
        'settings.eth': 'Ethereum',
        'settings.customTokens': '커스텀 토큰',
        'settings.addToken': '토큰 추가',
        'settings.security': '보안',
        'settings.biometric': '생체 인증',
        'settings.connectedApps': '연결된 앱',
        'settings.connectedCount': '개의 DApp 연결됨',
        'settings.general': '일반',
        'settings.language': '언어',
        'settings.theme': '다크 모드',
        'settings.txAlerts': '거래 알림',
        'settings.priceAlerts': '가격 알림',
        'settings.about': '정보',
        'settings.version': '버전',
        'settings.help': '도움말 & 지원',
        'settings.privacy': '개인정보 처리방침',
        'settings.terms': '이용약관',
        'settings.resetWallet': '지갑 초기화',
        'settings.resetConfirm': '정말로 지갑을 초기화하시겠습니까? 모든 데이터가 삭제됩니다.',
        'settings.exportKey': '프라이빗 키 내보내기',
        'settings.exportMnemonic': '시드 구문 내보내기',
        'settings.backup': '백업',

        // Add token modal
        'addToken.title': '토큰 추가',
        'addToken.address': '컨트랙트 주소',
        'addToken.symbol': '심볼',
        'addToken.name': '이름',
        'addToken.decimals': '소수점',
        'addToken.loading': '토큰 정보 조회 중...',
        'addToken.auto': '자동 입력',
        'addToken.cancel': '취소',
        'addToken.add': '추가',

        // Tab navigation
        'tab.home': '홈',
        'tab.browser': '브라우저',
        'tab.swap': '스왑',
        'tab.nft': 'NFT',
        'tab.settings': '설정',

        // Testnet
        'testnet.banner': '⚠ 테스트넷 모드',
        'testnet.faucet': '무료 테스트 코인 받기 →',

        // Network
        'network.select': '네트워크 선택',
        'network.connected': '블록체인 연결됨',
        'network.disconnected': '연결 끊김',

        // Toast messages
        'toast.addressCopied': '주소가 복사되었습니다',
        'toast.copyFail': '주소 복사에 실패했습니다',
        'toast.walletCreated': '지갑이 생성되었습니다',
        'toast.walletImported': '지갑을 가져왔습니다',
        'toast.error': '오류가 발생했습니다',

        // Language names
        'lang.ko': '한국어',
        'lang.en': 'English',
        'lang.ja': '日本語',
        'lang.zh': '中文',
        'lang.vi': 'Tiếng Việt',
        'lang.th': 'ไทย',
        'lang.id': 'Bahasa Indonesia',
        'lang.es': 'Español',
        'lang.fr': 'Français',
        'lang.ar': 'العربية',

        // QR scanner
        'qr.scan': 'QR 스캐너는 모바일 앱에서 사용 가능합니다',
        'qr.manualInput': 'QR 스캔은 앱에서만 가능합니다.\n주소를 직접 입력하세요:',
        'qr.scanTitle': 'QR 코드 스캔',
        'qr.scanStatus': 'QR 코드를 프레임 안에 맞춰주세요',
        'qr.permDenied': '카메라 권한이 거부되었습니다',
        'qr.camError': '카메라를 사용할 수 없습니다',
        'qr.notSupported': '이 브라우저에서는 QR 스캔을 지원하지 않습니다',

        // Misc
        'misc.noNotifications': '알림이 없습니다',
        'misc.loading': '로딩 중...',
        'misc.confirm': '확인',
        'misc.cancel': '취소',
        'misc.comingSoon': 'English version coming soon!',

        // Common
        'common.confirm': '확인',
        'common.cancel': '취소',
        'common.next': '다음',
        'common.back': '뒤로',

        // Settings (additional)
        'settings.defaultNetwork': '기본 네트워크',
        'settings.optional': '선택 사항',
        'settings.networkManagement': '네트워크 관리',
        'settings.customTokensDesc': '컨트랙트 주소로 직접 토큰을 추가할 수 있습니다.',
        'settings.ethSepolia': 'Ethereum Sepolia',
        'settings.testnet': '테스트넷',
        'settings.seedBackup': '시드 구문 백업',
        'settings.seedBackupDesc': '지갑을 안전하게 보호하세요',
        'settings.biometricDesc': '지문 또는 얼굴 인식',
        'settings.connectedSites': '연결된 사이트',
        'settings.connectedSitesDesc': '3개의 DApp 연결됨',
        'settings.transaction': '거래 설정',
        'settings.languageDesc': '언어',
        'settings.currency': '통화',
        'settings.currencyDesc': '통화',
        'settings.themeDesc': '테마',
        'settings.notifications': '알림 설정',
        'settings.txAlertsDesc': '거래 알림',
        'settings.priceAlertsDesc': '가격 알림',
        'settings.other': '기타',
        'settings.backupDesc': '백업/지갑 내보내기',
        'settings.termsDesc': '이용약관',
        'settings.privacyDesc': '개인정보처리방침',
        'settings.gasLimit': '가스 한도',
        'settings.gasLimitDesc': '가스 한도',
        'settings.slippage': '슬리피지 허용량',
        'settings.slippageDesc': '슬리피지 허용량',
        'settings.gas': '기본 가스비',
        'settings.gasDesc': '기본 가스비',
        'settings.gasSlow': '느림',
        'settings.gasNormal': '보통',
        'settings.gasFast': '빠름',
        'settings.autoLock': '자동 잠금',
        'settings.autoLockDesc': '자동 잠금',
        'settings.time1m': '1분',
        'settings.time5m': '5분',
        'settings.time15m': '15분',
        'settings.time30m': '30분',

        // Toast (additional)
        'toast.demoMode': '테스트 모드로 실행 중',
        'toast.balanceFetchFail': '잔액 조회 실패 - 네트워크 연결을 확인하세요',
        'toast.chartNoData': '차트 데이터를 불러올 수 없습니다',
        'toast.chartFail': '차트 업데이트에 실패했습니다',
        'toast.networkEnabled': '이더리움 네트워크가 활성화되었습니다',
        'toast.networkEnableFail': '네트워크 활성화에 실패했습니다',
        'toast.networkDisabled': '이더리움 네트워크가 비활성화되었습니다',
        'toast.tokenExists': '{{symbol}} 토큰이 이미 존재합니다',
        'toast.tokenAdded': '{{symbol}} 토큰이 추가되었습니다',
        'toast.tokenAddFail': '토큰 추가에 실패했습니다',

        // Error
        'error.mnemonicGenFail': '시드 구문을 생성할 수 없습니다',
        'error.pinMismatch': 'PIN이 일치하지 않습니다',
        'error.verifyFail': '오류가 발생했습니다',
        'error.common': '오류가 발생했습니다',
        'send.sending': '전송 중...',
        'swap.swapping': '스왑 중...',
        'settings.copyKey': '프라이빗 키 복사',
        'settings.copiedKey': '복사됨 ✓',
        'home.searchTokens': '토큰 검색...'
    },

    vi: {
        // App general
        'app.name': 'FunS Wallet',
        'app.tagline': 'Ví Đa chuỗi An toàn',

        // Header
        'header.scan': 'Quét QR',
        'header.notifications': 'Thông báo',

        // Onboarding
        'onboarding.welcome': 'Chào mừng đến FunS Wallet',
        'onboarding.subtitle': 'Ví đa chuỗi an toàn và dễ sử dụng',
        'onboarding.demo': 'Dùng thử',
        'onboarding.create': 'Tạo ví mới',
        'onboarding.import': 'Nhập ví',
        'onboarding.or': 'Hoặc',

        // PIN
        'pin.setup': 'Đặt mật khẩu',
        'pin.setupDesc': 'Đặt mật khẩu ít nhất 8 ký tự',
        'pin.confirm': 'Xác nhận PIN',
        'pin.confirmDesc': 'Nhập lại PIN của bạn',
        'pin.enter': 'Nhập PIN',
        'pin.enterDesc': 'Mở khóa ví của bạn',
        'pin.mismatch': 'PIN không khớp',
        'pin.wrong': 'PIN sai',
        'pin.locked': 'giây. Vui lòng thử lại sau',
        'pin.attempts': 'lần thất bại. Hãy thử lại sau 30 giây',
        'pin.unlock': 'Mở khóa',

        // Mnemonic
        'mnemonic.title': 'Cụm từ hạt giống',
        'mnemonic.warning': 'Viết lại 12 từ này ở nơi an toàn',
        'mnemonic.warningDetail': 'Cụm từ hạt giống là cách duy nhất để khôi phục ví. Không bao giờ chia sẻ với bất kỳ ai.',
        'mnemonic.confirm': 'Xác nhận cụm từ hạt giống',
        'mnemonic.import': 'Nhập cụm từ hạt giống',
        'mnemonic.importDesc': 'Nhập cụm từ hạt giống 12 từ',
        'mnemonic.paste': 'Dán',
        'mnemonic.invalid': 'Cụm từ hạt giống không hợp lệ',
        'mnemonic.keepSafe': 'Giữ cụm từ khôi phục ở nơi an toàn. Không thể khôi phục ví nếu mất.',
        'mnemonic.securityTitle': 'Không bao giờ chia sẻ',
        'mnemonic.tapToReveal': 'Chạm để xem cụm từ khôi phục',
        'mnemonic.revealHint': 'Đảm bảo không ai nhìn thấy',
        'mnemonic.copy': 'Sao chép',
        'mnemonic.copied': 'Đã sao chép',
        'mnemonic.hide': 'Ẩn',
        'mnemonic.show': 'Hiện',
        'mnemonic.check1': 'Tôi đã ghi cụm từ ra giấy',
        'mnemonic.check2': 'Tôi đã lưu ở nơi an toàn',
        'mnemonic.check3': 'Tôi không chụp ảnh màn hình',
        'mnemonic.verifyTitle': 'Xác minh cụm từ khôi phục',
        'mnemonic.selectWord': 'Chọn từ',

        // Home tab
        'home.portfolio': 'Danh mục đầu tư',
        'home.createWallet': 'Tạo ví',
        'home.tokens': 'Token',
        'home.manageTokens': 'Quản lý',
        'home.recentTx': 'Giao dịch gần đây',
        'home.allTx': 'Tất cả',
        'home.noTokens': 'Kết nối ví của bạn để xem token',
        'home.noTokensDesc': 'Tạo hoặc nhập ví để xem số dư token của bạn',
        'home.noTx': 'Không có lịch sử giao dịch',
        'home.noTxDesc': 'Lịch sử giao dịch của bạn sẽ xuất hiện ở đây',

        // Actions
        'action.send': 'Gửi',
        'action.receive': 'Nhận',
        'action.swap': 'Hoán đổi',
        'action.buy': 'Mua',
        'action.faucet': 'Vòi',

        // Send modal
        'send.title': 'Gửi',
        'send.to': 'Địa chỉ người nhận',
        'send.token': 'Token',
        'send.amount': 'Số lượng',
        'send.confirm': 'Xác nhận gửi',
        'send.success': 'Giao dịch được gửi thành công',
        'send.fail': 'Giao dịch thất bại',

        // Receive modal
        'receive.title': 'Nhận',
        'receive.copy': 'Sao chép địa chỉ',
        'receive.copied': 'Đã sao chép',
        'receive.share': 'Chia sẻ',

        // Swap modal
        'swap.title': 'Hoán đổi',
        'swap.sell': 'Bán',
        'swap.buy': 'Mua',
        'swap.amount': 'Số lượng',
        'swap.estimated': 'Số lượng ước tính',
        'swap.confirm': 'Xác nhận hoán đổi',
        'swap.comingSoon': 'COMING SOON',
        'swap.comingSoonDesc': 'Tích hợp FunSwap DEX sắp ra mắt.\nHãy chờ đợi hoán đổi trên chuỗi nhanh hơn và an toàn hơn!',

        // Buy modal
        'buy.title': 'Mua',
        'buy.token': 'Token',
        'buy.amount': 'Số tiền mua (USD)',
        'buy.method': 'Phương thức thanh toán',
        'buy.creditCard': 'Thẻ tín dụng',
        'buy.bankTransfer': 'Chuyển khoản ngân hàng',
        'buy.paypal': 'PayPal',
        'buy.confirm': 'Xác nhận mua',

        // Tx filters
        'tx.all': 'Tất cả',
        'tx.send': 'Gửi',
        'tx.receive': 'Nhận',
        'tx.swap': 'Hoán đổi',
        'tx.pending': 'Đang xử lý',
        'tx.confirmed': 'Đã xác nhận',
        'tx.failed': 'Thất bại',
        'tx.approve': 'Chấp thuận',
        'time.justNow': 'vừa xong',
        'time.minAgo': 'phút trước',
        'time.hrAgo': 'giờ trước',
        'time.daysAgo': 'ngày trước',

        // Browser tab
        'browser.search': 'Nhập URL hoặc tìm kiếm...',
        'browser.bookmarks': 'Dấu trang',
        'browser.dapps': 'DApps phổ biến',
        'browser.defi': 'DeFi',
        'browser.nft': 'NFT',

        // NFT tab
        'nft.title': 'Bộ sưu tập NFT',
        'nft.founder': 'FunS Founder',
        'nft.membership': 'Thành viên cao cấp',
        'nft.memberSince': 'Từ khi là thành viên',
        'nft.benefits': 'Quyền lợi thành viên',
        'nft.benefit1': 'Giảm 50% phí giao dịch',
        'nft.benefit2': 'Phân bổ ưu tiên token airdrop mới',
        'nft.benefit3': 'Quyền bỏ phiếu quản trị DAO',
        'nft.benefit4': 'Truy cập kênh cộng đồng độc quyền',

        // Settings tab
        'settings.title': 'Cài đặt',
        'settings.network': 'Mạng',
        'settings.bsc': 'BSC (BNB Smart Chain)',
        'settings.eth': 'Ethereum',
        'settings.customTokens': 'Token tùy chỉnh',
        'settings.addToken': 'Thêm token',
        'settings.security': 'Bảo mật',
        'settings.biometric': 'Xác thực sinh trắc học',
        'settings.connectedApps': 'Ứng dụng đã kết nối',
        'settings.connectedCount': 'DApp đã kết nối',
        'settings.general': 'Chung',
        'settings.language': 'Ngôn ngữ',
        'settings.theme': 'Chế độ tối',
        'settings.txAlerts': 'Cảnh báo giao dịch',
        'settings.priceAlerts': 'Cảnh báo giá',
        'settings.about': 'Về',
        'settings.version': 'Phiên bản',
        'settings.help': 'Trợ giúp & Hỗ trợ',
        'settings.privacy': 'Chính sách bảo mật',
        'settings.terms': 'Điều khoản dịch vụ',
        'settings.resetWallet': 'Đặt lại ví',
        'settings.resetConfirm': 'Bạn có chắc chắn muốn đặt lại ví không? Tất cả dữ liệu sẽ bị xóa.',
        'settings.exportKey': 'Xuất khóa riêng tư',
        'settings.exportMnemonic': 'Xuất cụm từ hạt giống',
        'settings.backup': 'Sao lưu',

        // Add token modal
        'addToken.title': 'Thêm token',
        'addToken.address': 'Địa chỉ hợp đồng',
        'addToken.symbol': 'Ký hiệu',
        'addToken.name': 'Tên',
        'addToken.decimals': 'Số thập phân',
        'addToken.loading': 'Đang tải thông tin token...',
        'addToken.auto': 'Tự động điền',
        'addToken.cancel': 'Hủy',
        'addToken.add': 'Thêm',

        // Tab navigation
        'tab.home': 'Trang chủ',
        'tab.browser': 'Trình duyệt',
        'tab.swap': 'Hoán đổi',
        'tab.nft': 'NFT',
        'tab.settings': 'Cài đặt',

        // Testnet
        'testnet.banner': '⚠ Chế độ Testnet',
        'testnet.faucet': 'Nhận coin kiểm thử miễn phí →',

        // Network
        'network.select': 'Chọn mạng',
        'network.connected': 'Blockchain đã kết nối',
        'network.disconnected': 'Đã ngắt kết nối',

        // Toast messages
        'toast.addressCopied': 'Địa chỉ đã được sao chép',
        'toast.copyFail': 'Sao chép địa chỉ thất bại',
        'toast.walletCreated': 'Ví được tạo thành công',
        'toast.walletImported': 'Ví được nhập thành công',
        'toast.error': 'Đã xảy ra lỗi',

        // Language names
        'lang.ko': '한국어',
        'lang.en': 'English',
        'lang.ja': '日本語',
        'lang.zh': '中文',
        'lang.vi': 'Tiếng Việt',
        'lang.th': 'ไทย',
        'lang.id': 'Bahasa Indonesia',
        'lang.es': 'Español',
        'lang.fr': 'Français',
        'lang.ar': 'العربية',

        // QR scanner
        'qr.scan': 'Máy quét QR có sẵn trên ứng dụng di động',
        'qr.manualInput': 'Quét QR chỉ khả dụng trên ứng dụng.\nVui lòng nhập địa chỉ thủ công:',
        'qr.scanTitle': 'Quét mã QR',
        'qr.scanStatus': 'Căn chỉnh mã QR trong khung hình',
        'qr.permDenied': 'Quyền truy cập camera bị từ chối',
        'qr.camError': 'Camera không khả dụng',
        'qr.notSupported': 'Trình duyệt này không hỗ trợ quét QR',

        // Misc
        'misc.noNotifications': 'Không có thông báo',
        'misc.loading': 'Đang tải...',
        'misc.confirm': 'Xác nhận',
        'misc.cancel': 'Hủy',
        'misc.comingSoon': 'English version coming soon!',

        // Common
        'common.confirm': 'Xác nhận',
        'common.cancel': 'Hủy',
        'common.next': 'Tiếp',
        'common.back': 'Quay lại',

        // Settings (additional)
        'settings.defaultNetwork': 'Mạng mặc định',
        'settings.optional': 'Tùy chọn',
        'settings.networkManagement': 'Quản lý mạng',
        'settings.customTokensDesc': 'Bạn có thể thêm token trực tiếp bằng địa chỉ hợp đồng.',
        'settings.ethSepolia': 'Ethereum Sepolia',
        'settings.testnet': 'Mạng thử nghiệm',
        'settings.seedBackup': 'Sao lưu cụm từ khôi phục',
        'settings.seedBackupDesc': 'Bảo vệ ví của bạn an toàn',
        'settings.biometricDesc': 'Vân tay hoặc nhận diện khuôn mặt',
        'settings.connectedSites': 'Trang đã kết nối',
        'settings.connectedSitesDesc': '3 DApp đã kết nối',
        'settings.transaction': 'Cài đặt giao dịch',
        'settings.languageDesc': 'Ngôn ngữ',
        'settings.currency': 'Tiền tệ',
        'settings.currencyDesc': 'Tiền tệ',
        'settings.themeDesc': 'Giao diện',
        'settings.notifications': 'Thông báo',
        'settings.txAlertsDesc': 'Cảnh báo giao dịch',
        'settings.priceAlertsDesc': 'Cảnh báo giá',
        'settings.other': 'Khác',
        'settings.backupDesc': 'Sao lưu/Xuất ví',
        'settings.termsDesc': 'Điều khoản dịch vụ',
        'settings.privacyDesc': 'Chính sách bảo mật',
        'settings.gasLimit': 'Giới hạn Gas',
        'settings.gasLimitDesc': 'Giới hạn Gas',
        'settings.slippage': 'Dung sai trượt giá',
        'settings.slippageDesc': 'Dung sai trượt giá',
        'settings.gas': 'Gas mặc định',
        'settings.gasDesc': 'Gas mặc định',
        'settings.gasSlow': 'Chậm',
        'settings.gasNormal': 'Bình thường',
        'settings.gasFast': 'Nhanh',
        'settings.autoLock': 'Tự động khóa',
        'settings.autoLockDesc': 'Tự động khóa',
        'settings.time1m': '1 phút',
        'settings.time5m': '5 phút',
        'settings.time15m': '15 phút',
        'settings.time30m': '30 phút',

        // Toast (additional)
        'toast.demoMode': 'Đang chạy chế độ thử nghiệm',
        'toast.balanceFetchFail': 'Lấy số dư thất bại - kiểm tra kết nối mạng',
        'toast.chartNoData': 'Không thể tải dữ liệu biểu đồ',
        'toast.chartFail': 'Cập nhật biểu đồ thất bại',
        'toast.networkEnabled': 'Mạng Ethereum đã được bật',
        'toast.networkEnableFail': 'Không thể bật mạng',
        'toast.networkDisabled': 'Mạng Ethereum đã bị tắt',
        'toast.tokenExists': 'Token {{symbol}} đã tồn tại',
        'toast.tokenAdded': 'Token {{symbol}} đã được thêm',
        'toast.tokenAddFail': 'Không thể thêm token',

        // Error
        'error.mnemonicGenFail': 'Không thể tạo cụm từ khôi phục',
        'error.pinMismatch': 'PIN không khớp',
        'error.verifyFail': 'Đã xảy ra lỗi',
        'error.common': 'Đã xảy ra lỗi',
        'send.sending': 'Đang gửi...',
        'swap.swapping': 'Đang hoán đổi...',
        'settings.copyKey': 'Sao chép khóa riêng tư',
        'settings.copiedKey': 'Đã sao chép ✓',
        'home.searchTokens': 'Tìm kiếm token...'
    },

    th: {
        // App general
        'app.name': 'FunS Wallet',
        'app.tagline': 'กระเป๋าเงินมัลติเชนที่ปลอดภัย',

        // Header
        'header.scan': 'สแกน QR',
        'header.notifications': 'การแจ้งเตือน',

        // Onboarding
        'onboarding.welcome': 'ยินดีต้อนรับสู่ FunS Wallet',
        'onboarding.subtitle': 'กระเป๋าเงินมัลติเชนที่ปลอดภัยและง่ายต่อการใช้',
        'onboarding.demo': 'ลองใช้เวอร์ชันทดลอง',
        'onboarding.create': 'สร้างกระเป๋าเงินใหม่',
        'onboarding.import': 'นำเข้ากระเป๋าเงิน',
        'onboarding.or': 'หรือ',

        // PIN
        'pin.setup': 'ตั้งค่ารหัสผ่าน',
        'pin.setupDesc': 'ตั้งค่ารหัสผ่านอย่างน้อย 8 ตัวอักษร',
        'pin.confirm': 'ยืนยัน PIN',
        'pin.confirmDesc': 'กรุณาป้อน PIN ของคุณอีกครั้ง',
        'pin.enter': 'ป้อน PIN',
        'pin.enterDesc': 'ปลดล็อกกระเป๋าเงินของคุณ',
        'pin.mismatch': 'PIN ไม่ตรงกัน',
        'pin.wrong': 'PIN ไม่ถูกต้อง',
        'pin.locked': 'วินาที กรุณาลองใหม่อีกครั้ง',
        'pin.attempts': 'ครั้งล้มเหลว ลองใหม่ใน 30 วินาที',
        'pin.unlock': 'ปลดล็อก',

        // Mnemonic
        'mnemonic.title': 'วลีเมล็ด',
        'mnemonic.warning': 'จดบันทึกคำ 12 คำนี้ในที่ที่ปลอดภัย',
        'mnemonic.warningDetail': 'วลีเมล็ดคือวิธีเดียวในการกู้คืนกระเป๋าเงินของคุณ อย่าแบ่งปันกับใครเลย',
        'mnemonic.confirm': 'ยืนยันวลีเมล็ด',
        'mnemonic.import': 'นำเข้าวลีเมล็ด',
        'mnemonic.importDesc': 'ป้อนวลีเมล็ด 12 คำ',
        'mnemonic.paste': 'วาง',
        'mnemonic.invalid': 'วลีเมล็ดไม่ถูกต้อง',
        'mnemonic.keepSafe': 'เก็บ Seed Phrase ไว้ในที่ปลอดภัย ไม่สามารถกู้คืนกระเป๋าได้หากสูญหาย',
        'mnemonic.securityTitle': 'อย่าแชร์กับใคร',
        'mnemonic.tapToReveal': 'แตะเพื่อดู Seed Phrase',
        'mnemonic.revealHint': 'ตรวจสอบว่าไม่มีใครดูอยู่',
        'mnemonic.copy': 'คัดลอก',
        'mnemonic.copied': 'คัดลอกแล้ว',
        'mnemonic.hide': 'ซ่อน',
        'mnemonic.show': 'แสดง',
        'mnemonic.check1': 'ฉันจด Seed Phrase ลงกระดาษแล้ว',
        'mnemonic.check2': 'ฉันเก็บไว้ในที่ปลอดภัยแล้ว',
        'mnemonic.check3': 'ฉันไม่ได้จับภาพหน้าจอ',
        'mnemonic.verifyTitle': 'ยืนยัน Seed Phrase',
        'mnemonic.selectWord': 'เลือกคำ',

        // Home tab
        'home.portfolio': 'พอร์ตโฟลิโอ',
        'home.createWallet': 'สร้างกระเป๋าเงิน',
        'home.tokens': 'โทเคน',
        'home.manageTokens': 'จัดการ',
        'home.recentTx': 'ธุรกรรมล่าสุด',
        'home.allTx': 'ทั้งหมด',
        'home.noTokens': 'เชื่อมต่อกระเป๋าเงินของคุณเพื่อดูโทเคน',
        'home.noTokensDesc': 'สร้างหรือนำเข้ากระเป๋าเงินเพื่อดูยอดโทเคนของคุณ',
        'home.noTx': 'ไม่มีประวัติการทำธุรกรรม',
        'home.noTxDesc': 'ประวัติการทำธุรกรรมของคุณจะปรากฏที่นี่',

        // Actions
        'action.send': 'ส่ง',
        'action.receive': 'รับ',
        'action.swap': 'สลับ',
        'action.buy': 'ซื้อ',
        'action.faucet': 'ก๊อก',

        // Send modal
        'send.title': 'ส่ง',
        'send.to': 'ที่อยู่ผู้รับ',
        'send.token': 'โทเคน',
        'send.amount': 'จำนวน',
        'send.confirm': 'ยืนยันการส่ง',
        'send.success': 'ส่งธุรกรรมสำเร็จ',
        'send.fail': 'ธุรกรรมล้มเหลว',

        // Receive modal
        'receive.title': 'รับ',
        'receive.copy': 'คัดลอกที่อยู่',
        'receive.copied': 'คัดลอกแล้ว',
        'receive.share': 'แบ่งปัน',

        // Swap modal
        'swap.title': 'สลับ',
        'swap.sell': 'ขาย',
        'swap.buy': 'ซื้อ',
        'swap.amount': 'จำนวน',
        'swap.estimated': 'จำนวนโดยประมาณ',
        'swap.confirm': 'ยืนยันการสลับ',
        'swap.comingSoon': 'COMING SOON',
        'swap.comingSoonDesc': 'FunSwap DEX integration กำลังจะเปิดตัวเร็ว ๆ นี้\nรอการสลับออนเชนที่เร็วและปลอดภัยยิ่งขึ้น!',

        // Buy modal
        'buy.title': 'ซื้อ',
        'buy.token': 'โทเคน',
        'buy.amount': 'จำนวนการซื้อ (USD)',
        'buy.method': 'วิธีการชำระเงิน',
        'buy.creditCard': 'บัตรเครดิต',
        'buy.bankTransfer': 'โอนเงินธนาคาร',
        'buy.paypal': 'PayPal',
        'buy.confirm': 'ยืนยันการซื้อ',

        // Tx filters
        'tx.all': 'ทั้งหมด',
        'tx.send': 'ส่ง',
        'tx.receive': 'รับ',
        'tx.swap': 'สลับ',
        'tx.pending': 'รอดำเนินการ',
        'tx.confirmed': 'ยืนยันแล้ว',
        'tx.failed': 'ล้มเหลว',
        'tx.approve': 'อนุมัติ',
        'time.justNow': 'เมื่อกี้',
        'time.minAgo': 'นาทีที่แล้ว',
        'time.hrAgo': 'ชั่วโมงที่แล้ว',
        'time.daysAgo': 'วันที่แล้ว',

        // Browser tab
        'browser.search': 'ป้อน URL หรือค้นหา...',
        'browser.bookmarks': 'ที่คั่นหน้า',
        'browser.dapps': 'DApps ยอดนิยม',
        'browser.defi': 'DeFi',
        'browser.nft': 'NFT',

        // NFT tab
        'nft.title': 'คอลเลกชัน NFT',
        'nft.founder': 'FunS Founder',
        'nft.membership': 'การเป็นสมาชิกพรีเมียม',
        'nft.memberSince': 'สมาชิกตั้งแต่',
        'nft.benefits': 'สิทธิประโยชน์สมาชิก',
        'nft.benefit1': 'ลดค่าธรรมเนียมการซื้อขาย 50%',
        'nft.benefit2': 'การจัดสรรอากาศยานโทเคนใหม่ที่มีลำดับความสำคัญ',
        'nft.benefit3': 'สิทธิการลงคะแนนการกำหนดอำนาจของ DAO',
        'nft.benefit4': 'การเข้าถึงช่องชุมชนพิเศษ',

        // Settings tab
        'settings.title': 'การตั้งค่า',
        'settings.network': 'เครือข่าย',
        'settings.bsc': 'BSC (BNB Smart Chain)',
        'settings.eth': 'Ethereum',
        'settings.customTokens': 'โทเคนที่กำหนดเอง',
        'settings.addToken': 'เพิ่มโทเคน',
        'settings.security': 'ความปลอดภัย',
        'settings.biometric': 'การรับรองความเป็นตัวตนของชีววิทยา',
        'settings.connectedApps': 'แอปที่เชื่อมต่อ',
        'settings.connectedCount': 'DApps ที่เชื่อมต่อ',
        'settings.general': 'ทั่วไป',
        'settings.language': 'ภาษา',
        'settings.theme': 'โหมดมืด',
        'settings.txAlerts': 'การแจ้งเตือนธุรกรรม',
        'settings.priceAlerts': 'การแจ้งเตือนราคา',
        'settings.about': 'เกี่ยวกับ',
        'settings.version': 'เวอร์ชัน',
        'settings.help': 'วิธีใช้และการสนับสนุน',
        'settings.privacy': 'นโยบายความเป็นส่วนตัว',
        'settings.terms': 'เงื่อนไขการให้บริการ',
        'settings.resetWallet': 'รีเซ็ตกระเป๋าเงิน',
        'settings.resetConfirm': 'คุณแน่ใจหรือว่าต้องการรีเซ็ตกระเป๋าเงินของคุณ ข้อมูลทั้งหมดจะถูกลบ',
        'settings.exportKey': 'ส่งออกคีย์ส่วนตัว',
        'settings.exportMnemonic': 'ส่งออกวลีเมล็ด',
        'settings.backup': 'การสำรองข้อมูล',

        // Add token modal
        'addToken.title': 'เพิ่มโทเคน',
        'addToken.address': 'ที่อยู่สัญญา',
        'addToken.symbol': 'สัญลักษณ์',
        'addToken.name': 'ชื่อ',
        'addToken.decimals': 'ทศนิยม',
        'addToken.loading': 'กำลังโหลดข้อมูลโทเคน...',
        'addToken.auto': 'เติมอัตโนมัติ',
        'addToken.cancel': 'ยกเลิก',
        'addToken.add': 'เพิ่ม',

        // Tab navigation
        'tab.home': 'หน้าแรก',
        'tab.browser': 'เบราว์เซอร์',
        'tab.swap': 'สลับ',
        'tab.nft': 'NFT',
        'tab.settings': 'การตั้งค่า',

        // Testnet
        'testnet.banner': '⚠ โหมด Testnet',
        'testnet.faucet': 'รับเหรียญทดสอบฟรี →',

        // Network
        'network.select': 'เลือกเครือข่าย',
        'network.connected': 'เชื่อมต่อบล็อกเชนแล้ว',
        'network.disconnected': 'ตัดการเชื่อมต่อ',

        // Toast messages
        'toast.addressCopied': 'คัดลอกที่อยู่แล้ว',
        'toast.copyFail': 'ล้มเหลวในการคัดลอกที่อยู่',
        'toast.walletCreated': 'สร้างกระเป๋าเงินสำเร็จ',
        'toast.walletImported': 'นำเข้ากระเป๋าเงินสำเร็จ',
        'toast.error': 'เกิดข้อผิดพลาด',

        // Language names
        'lang.ko': '한국어',
        'lang.en': 'English',
        'lang.ja': '日本語',
        'lang.zh': '中文',
        'lang.vi': 'Tiếng Việt',
        'lang.th': 'ไทย',
        'lang.id': 'Bahasa Indonesia',
        'lang.es': 'Español',
        'lang.fr': 'Français',
        'lang.ar': 'العربية',

        // QR scanner
        'qr.scan': 'เครื่องสแกน QR พร้อมใช้งานในแอปมือถือ',
        'qr.manualInput': 'การสแกน QR พร้อมใช้งานเฉพาะในแอป\nกรุณาป้อนที่อยู่ด้วยตนเอง:',
        'qr.scanTitle': 'สแกน QR โค้ด',
        'qr.scanStatus': 'จัดวาง QR โค้ดภายในกรอบ',
        'qr.permDenied': 'ถูกปฏิเสธการเข้าถึงกล้อง',
        'qr.camError': 'ไม่สามารถใช้กล้องได้',
        'qr.notSupported': 'เบราว์เซอร์นี้ไม่รองรับการสแกน QR',

        // Misc
        'misc.noNotifications': 'ไม่มีการแจ้งเตือน',
        'misc.loading': 'กำลังโหลด...',
        'misc.confirm': 'ยืนยัน',
        'misc.cancel': 'ยกเลิก',
        'misc.comingSoon': 'English version coming soon!',

        // Common
        'common.confirm': 'ยืนยัน',
        'common.cancel': 'ยกเลิก',
        'common.next': 'ถัดไป',
        'common.back': 'ย้อนกลับ',

        // Settings (additional)
        'settings.defaultNetwork': 'เครือข่ายเริ่มต้น',
        'settings.optional': 'ตัวเลือก',
        'settings.networkManagement': 'การจัดการเครือข่าย',
        'settings.customTokensDesc': 'คุณสามารถเพิ่มโทเคนโดยตรงด้วยที่อยู่สัญญา',
        'settings.ethSepolia': 'Ethereum Sepolia',
        'settings.testnet': 'เครือข่ายทดสอบ',
        'settings.seedBackup': 'สำรองวลีกู้คืน',
        'settings.seedBackupDesc': 'ปกป้องกระเป๋าเงินอย่างปลอดภัย',
        'settings.biometricDesc': 'ลายนิ้วมือหรือใบหน้า',
        'settings.connectedSites': 'เว็บที่เชื่อมต่อ',
        'settings.connectedSitesDesc': '3 DApp เชื่อมต่อแล้ว',
        'settings.transaction': 'การตั้งค่าธุรกรรม',
        'settings.languageDesc': 'ภาษา',
        'settings.currency': 'สกุลเงิน',
        'settings.currencyDesc': 'สกุลเงิน',
        'settings.themeDesc': 'ธีม',
        'settings.notifications': 'การแจ้งเตือน',
        'settings.txAlertsDesc': 'การแจ้งเตือนธุรกรรม',
        'settings.priceAlertsDesc': 'การแจ้งเตือนราคา',
        'settings.other': 'อื่นๆ',
        'settings.backupDesc': 'สำรองข้อมูล/ส่งออกวอลเล็ต',
        'settings.termsDesc': 'ข้อกำหนดการใช้งาน',
        'settings.privacyDesc': 'นโยบายความเป็นส่วนตัว',
        'settings.gasLimit': 'ขีดจำกัดแก๊ส',
        'settings.gasLimitDesc': 'ขีดจำกัดแก๊ส',
        'settings.slippage': 'ความคลาดเคลื่อนราคา',
        'settings.slippageDesc': 'ความคลาดเคลื่อนราคา',
        'settings.gas': 'ค่าแก๊สเริ่มต้น',
        'settings.gasDesc': 'ค่าแก๊สเริ่มต้น',
        'settings.gasSlow': 'ช้า',
        'settings.gasNormal': 'ปกติ',
        'settings.gasFast': 'เร็ว',
        'settings.autoLock': 'ล็อกอัตโนมัติ',
        'settings.autoLockDesc': 'ล็อกอัตโนมัติ',
        'settings.time1m': '1 นาที',
        'settings.time5m': '5 นาที',
        'settings.time15m': '15 นาที',
        'settings.time30m': '30 นาที',

        // Toast (additional)
        'toast.demoMode': 'กำลังทำงานในโหมดทดสอบ',
        'toast.balanceFetchFail': 'ดึงยอดคงเหลือล้มเหลว - ตรวจสอบการเชื่อมต่อเครือข่าย',
        'toast.chartNoData': 'ไม่สามารถโหลดข้อมูลแผนภูมิ',
        'toast.chartFail': 'อัปเดตแผนภูมิล้มเหลว',
        'toast.networkEnabled': 'เปิดใช้งานเครือข่าย Ethereum แล้ว',
        'toast.networkEnableFail': 'ไม่สามารถเปิดใช้งานเครือข่ายได้',
        'toast.networkDisabled': 'ปิดใช้งานเครือข่าย Ethereum แล้ว',
        'toast.tokenExists': 'โทเคน {{symbol}} มีอยู่แล้ว',
        'toast.tokenAdded': 'เพิ่มโทเคน {{symbol}} แล้ว',
        'toast.tokenAddFail': 'ไม่สามารถเพิ่มโทเคนได้',

        // Error
        'error.mnemonicGenFail': 'ไม่สามารถสร้างวลีกู้คืน',
        'error.pinMismatch': 'PIN ไม่ตรงกัน',
        'error.verifyFail': 'เกิดข้อผิดพลาด',
        'error.common': 'เกิดข้อผิดพลาด',
        'send.sending': 'กำลังส่ง...',
        'swap.swapping': 'กำลังสลับ...',
        'settings.copyKey': 'คัดลอกคีย์ส่วนตัว',
        'settings.copiedKey': 'คัดลอกแล้ว ✓',
        'home.searchTokens': 'ค้นหาโทเค็น...'
    },

    id: {
        // App general
        'app.name': 'FunS Wallet',
        'app.tagline': 'Dompet Multi-Chain yang Aman',

        // Header
        'header.scan': 'Pindai QR',
        'header.notifications': 'Notifikasi',

        // Onboarding
        'onboarding.welcome': 'Selamat datang di FunS Wallet',
        'onboarding.subtitle': 'Dompet multi-chain yang aman dan mudah digunakan',
        'onboarding.demo': 'Coba Demo',
        'onboarding.create': 'Buat Dompet Baru',
        'onboarding.import': 'Impor Dompet',
        'onboarding.or': 'Atau',

        // PIN
        'pin.setup': 'Atur Kata Sandi',
        'pin.setupDesc': 'Atur kata sandi minimal 8 karakter',
        'pin.confirm': 'Konfirmasi PIN',
        'pin.confirmDesc': 'Masukkan kembali PIN Anda',
        'pin.enter': 'Masukkan PIN',
        'pin.enterDesc': 'Buka kunci dompet Anda',
        'pin.mismatch': 'PIN tidak cocok',
        'pin.wrong': 'PIN salah',
        'pin.locked': 'detik. Silakan coba lagi nanti',
        'pin.attempts': 'kali gagal. Coba lagi dalam 30 detik',
        'pin.unlock': 'Buka Kunci',

        // Mnemonic
        'mnemonic.title': 'Frasa Benih',
        'mnemonic.warning': 'Tuliskan 12 kata ini di tempat yang aman',
        'mnemonic.warningDetail': 'Frasa benih adalah satu-satunya cara untuk memulihkan dompet Anda. Jangan pernah bagikan dengan siapa pun.',
        'mnemonic.confirm': 'Konfirmasi Frasa Benih',
        'mnemonic.import': 'Impor Frasa Benih',
        'mnemonic.importDesc': 'Masukkan frasa benih 12 kata',
        'mnemonic.paste': 'Tempel',
        'mnemonic.invalid': 'Frasa benih tidak valid',
        'mnemonic.keepSafe': 'Simpan seed phrase di tempat yang aman. Dompet tidak dapat dipulihkan jika hilang.',
        'mnemonic.securityTitle': 'Jangan pernah bagikan',
        'mnemonic.tapToReveal': 'Ketuk untuk melihat seed phrase',
        'mnemonic.revealHint': 'Pastikan tidak ada yang melihat',
        'mnemonic.copy': 'Salin',
        'mnemonic.copied': 'Tersalin',
        'mnemonic.hide': 'Sembunyikan',
        'mnemonic.show': 'Tampilkan',
        'mnemonic.check1': 'Saya sudah menulis seed phrase di kertas',
        'mnemonic.check2': 'Saya sudah menyimpannya di tempat aman',
        'mnemonic.check3': 'Saya tidak mengambil tangkapan layar',
        'mnemonic.verifyTitle': 'Verifikasi Seed Phrase',
        'mnemonic.selectWord': 'Pilih kata',

        // Home tab
        'home.portfolio': 'Portofolio',
        'home.createWallet': 'Buat Dompet',
        'home.tokens': 'Token',
        'home.manageTokens': 'Kelola',
        'home.recentTx': 'Transaksi Terbaru',
        'home.allTx': 'Semua',
        'home.noTokens': 'Hubungkan dompet Anda untuk melihat token',
        'home.noTokensDesc': 'Buat atau impor dompet untuk melihat saldo token Anda',
        'home.noTx': 'Tidak ada riwayat transaksi',
        'home.noTxDesc': 'Riwayat transaksi Anda akan muncul di sini',

        // Actions
        'action.send': 'Kirim',
        'action.receive': 'Terima',
        'action.swap': 'Tukar',
        'action.buy': 'Beli',
        'action.faucet': 'Faucet',

        // Send modal
        'send.title': 'Kirim',
        'send.to': 'Alamat Penerima',
        'send.token': 'Token',
        'send.amount': 'Jumlah',
        'send.confirm': 'Konfirmasi Pengiriman',
        'send.success': 'Transaksi terkirim berhasil',
        'send.fail': 'Transaksi gagal',

        // Receive modal
        'receive.title': 'Terima',
        'receive.copy': 'Salin Alamat',
        'receive.copied': 'Disalin',
        'receive.share': 'Bagikan',

        // Swap modal
        'swap.title': 'Tukar',
        'swap.sell': 'Jual',
        'swap.buy': 'Beli',
        'swap.amount': 'Jumlah',
        'swap.estimated': 'Jumlah Estimasi',
        'swap.confirm': 'Konfirmasi Penukaran',
        'swap.comingSoon': 'COMING SOON',
        'swap.comingSoonDesc': 'Integrasi FunSwap DEX akan segera diluncurkan.\nTantikan penukaran on-chain yang lebih cepat dan aman!',

        // Buy modal
        'buy.title': 'Beli',
        'buy.token': 'Token',
        'buy.amount': 'Jumlah Pembelian (USD)',
        'buy.method': 'Metode Pembayaran',
        'buy.creditCard': 'Kartu Kredit',
        'buy.bankTransfer': 'Transfer Bank',
        'buy.paypal': 'PayPal',
        'buy.confirm': 'Konfirmasi Pembelian',

        // Tx filters
        'tx.all': 'Semua',
        'tx.send': 'Kirim',
        'tx.receive': 'Terima',
        'tx.swap': 'Tukar',
        'tx.pending': 'Menunggu',
        'tx.confirmed': 'Dikonfirmasi',
        'tx.failed': 'Gagal',
        'tx.approve': 'Setujui',
        'time.justNow': 'baru saja',
        'time.minAgo': 'menit lalu',
        'time.hrAgo': 'jam lalu',
        'time.daysAgo': 'hari lalu',

        // Browser tab
        'browser.search': 'Masukkan URL atau cari...',
        'browser.bookmarks': 'Penanda Halaman',
        'browser.dapps': 'DApps Populer',
        'browser.defi': 'DeFi',
        'browser.nft': 'NFT',

        // NFT tab
        'nft.title': 'Koleksi NFT',
        'nft.founder': 'FunS Founder',
        'nft.membership': 'Keanggotaan Premium',
        'nft.memberSince': 'Anggota Sejak',
        'nft.benefits': 'Manfaat Keanggotaan',
        'nft.benefit1': 'Diskon 50% biaya trading',
        'nft.benefit2': 'Alokasi prioritas airdrop token baru',
        'nft.benefit3': 'Hak suara tata kelola DAO',
        'nft.benefit4': 'Akses ke saluran komunitas eksklusif',

        // Settings tab
        'settings.title': 'Pengaturan',
        'settings.network': 'Jaringan',
        'settings.bsc': 'BSC (BNB Smart Chain)',
        'settings.eth': 'Ethereum',
        'settings.customTokens': 'Token Khusus',
        'settings.addToken': 'Tambah Token',
        'settings.security': 'Keamanan',
        'settings.biometric': 'Autentikasi Biometrik',
        'settings.connectedApps': 'Aplikasi Terhubung',
        'settings.connectedCount': 'DApp terhubung',
        'settings.general': 'Umum',
        'settings.language': 'Bahasa',
        'settings.theme': 'Mode Gelap',
        'settings.txAlerts': 'Pemberitahuan Transaksi',
        'settings.priceAlerts': 'Pemberitahuan Harga',
        'settings.about': 'Tentang',
        'settings.version': 'Versi',
        'settings.help': 'Bantuan & Dukungan',
        'settings.privacy': 'Kebijakan Privasi',
        'settings.terms': 'Ketentuan Layanan',
        'settings.resetWallet': 'Reset Dompet',
        'settings.resetConfirm': 'Apakah Anda yakin ingin mereset dompet Anda? Semua data akan dihapus.',
        'settings.exportKey': 'Ekspor Kunci Pribadi',
        'settings.exportMnemonic': 'Ekspor Frasa Benih',
        'settings.backup': 'Cadangkan',

        // Add token modal
        'addToken.title': 'Tambah Token',
        'addToken.address': 'Alamat Kontrak',
        'addToken.symbol': 'Simbol',
        'addToken.name': 'Nama',
        'addToken.decimals': 'Desimal',
        'addToken.loading': 'Memuat informasi token...',
        'addToken.auto': 'Isi Otomatis',
        'addToken.cancel': 'Batal',
        'addToken.add': 'Tambah',

        // Tab navigation
        'tab.home': 'Beranda',
        'tab.browser': 'Peramban',
        'tab.swap': 'Tukar',
        'tab.nft': 'NFT',
        'tab.settings': 'Pengaturan',

        // Testnet
        'testnet.banner': '⚠ Mode Testnet',
        'testnet.faucet': 'Dapatkan Koin Uji Gratis →',

        // Network
        'network.select': 'Pilih Jaringan',
        'network.connected': 'Blockchain Terhubung',
        'network.disconnected': 'Terputus',

        // Toast messages
        'toast.addressCopied': 'Alamat disalin',
        'toast.copyFail': 'Gagal menyalin alamat',
        'toast.walletCreated': 'Dompet berhasil dibuat',
        'toast.walletImported': 'Dompet berhasil diimpor',
        'toast.error': 'Terjadi kesalahan',

        // Language names
        'lang.ko': '한국어',
        'lang.en': 'English',
        'lang.ja': '日本語',
        'lang.zh': '中文',
        'lang.vi': 'Tiếng Việt',
        'lang.th': 'ไทย',
        'lang.id': 'Bahasa Indonesia',
        'lang.es': 'Español',
        'lang.fr': 'Français',
        'lang.ar': 'العربية',

        // QR scanner
        'qr.scan': 'Pemindai QR tersedia di aplikasi seluler',
        'qr.manualInput': 'Pemindaian QR hanya tersedia di aplikasi.\nMasukkan alamat secara manual:',
        'qr.scanTitle': 'Pindai Kode QR',
        'qr.scanStatus': 'Sejajarkan kode QR di dalam bingkai',
        'qr.permDenied': 'Izin kamera ditolak',
        'qr.camError': 'Kamera tidak tersedia',
        'qr.notSupported': 'Browser ini tidak mendukung pemindaian QR',

        // Misc
        'misc.noNotifications': 'Tidak ada notifikasi',
        'misc.loading': 'Memuat...',
        'misc.confirm': 'Konfirmasi',
        'misc.cancel': 'Batal',
        'misc.comingSoon': 'English version coming soon!',

        // Common
        'common.confirm': 'Konfirmasi',
        'common.cancel': 'Batal',
        'common.next': 'Lanjut',
        'common.back': 'Kembali',

        // Settings (additional)
        'settings.defaultNetwork': 'Jaringan Default',
        'settings.optional': 'Opsional',
        'settings.networkManagement': 'Manajemen Jaringan',
        'settings.customTokensDesc': 'Anda dapat menambahkan token langsung dengan alamat kontrak.',
        'settings.ethSepolia': 'Ethereum Sepolia',
        'settings.testnet': 'Testnet',
        'settings.seedBackup': 'Cadangan Frasa Pemulihan',
        'settings.seedBackupDesc': 'Lindungi dompet Anda dengan aman',
        'settings.biometricDesc': 'Sidik jari atau pengenalan wajah',
        'settings.connectedSites': 'Situs Terhubung',
        'settings.connectedSitesDesc': '3 DApp Terhubung',
        'settings.transaction': 'Pengaturan Transaksi',
        'settings.languageDesc': 'Bahasa',
        'settings.currency': 'Mata Uang',
        'settings.currencyDesc': 'Mata Uang',
        'settings.themeDesc': 'Tema',
        'settings.notifications': 'Notifikasi',
        'settings.txAlertsDesc': 'Peringatan Transaksi',
        'settings.priceAlertsDesc': 'Peringatan Harga',
        'settings.other': 'Lainnya',
        'settings.backupDesc': 'Cadangkan/Ekspor Dompet',
        'settings.termsDesc': 'Syarat Layanan',
        'settings.privacyDesc': 'Kebijakan Privasi',
        'settings.gasLimit': 'Batas Gas',
        'settings.gasLimitDesc': 'Batas Gas',
        'settings.slippage': 'Toleransi Selisih',
        'settings.slippageDesc': 'Toleransi Selisih',
        'settings.gas': 'Gas Default',
        'settings.gasDesc': 'Gas Default',
        'settings.gasSlow': 'Lambat',
        'settings.gasNormal': 'Normal',
        'settings.gasFast': 'Cepat',
        'settings.autoLock': 'Kunci Otomatis',
        'settings.autoLockDesc': 'Kunci Otomatis',
        'settings.time1m': '1 menit',
        'settings.time5m': '5 menit',
        'settings.time15m': '15 menit',
        'settings.time30m': '30 menit',

        // Toast (additional)
        'toast.demoMode': 'Berjalan dalam mode uji coba',
        'toast.balanceFetchFail': 'Gagal mengambil saldo - periksa koneksi jaringan Anda',
        'toast.chartNoData': 'Tidak dapat memuat data grafik',
        'toast.chartFail': 'Pembaruan grafik gagal',
        'toast.networkEnabled': 'Jaringan Ethereum diaktifkan',
        'toast.networkEnableFail': 'Gagal mengaktifkan jaringan',
        'toast.networkDisabled': 'Jaringan Ethereum dinonaktifkan',
        'toast.tokenExists': 'Token {{symbol}} sudah ada',
        'toast.tokenAdded': 'Token {{symbol}} ditambahkan',
        'toast.tokenAddFail': 'Gagal menambahkan token',

        // Error
        'error.mnemonicGenFail': 'Gagal membuat frasa pemulihan',
        'error.pinMismatch': 'PIN tidak cocok',
        'error.verifyFail': 'Terjadi kesalahan',
        'error.common': 'Terjadi kesalahan',
        'send.sending': 'Mengirim...',
        'swap.swapping': 'Menukar...',
        'settings.copyKey': 'Salin Kunci Pribadi',
        'settings.copiedKey': 'Tersalin ✓',
        'home.searchTokens': 'Cari token...'
    },

    es: {
        // App general
        'app.name': 'FunS Wallet',
        'app.tagline': 'Billetera Multichain Segura',

        // Header
        'header.scan': 'Escanear QR',
        'header.notifications': 'Notificaciones',

        // Onboarding
        'onboarding.welcome': 'Bienvenido a FunS Wallet',
        'onboarding.subtitle': 'Billetera multichain segura y fácil de usar',
        'onboarding.demo': 'Probar Demo',
        'onboarding.create': 'Crear Nueva Billetera',
        'onboarding.import': 'Importar Billetera',
        'onboarding.or': 'O',

        // PIN
        'pin.setup': 'Establecer contraseña',
        'pin.setupDesc': 'Establezca una contraseña de al menos 8 caracteres',
        'pin.confirm': 'Confirmar PIN',
        'pin.confirmDesc': 'Reingrese su PIN',
        'pin.enter': 'Ingresar PIN',
        'pin.enterDesc': 'Desbloquee su billetera',
        'pin.mismatch': 'El PIN no coincide',
        'pin.wrong': 'PIN incorrecto',
        'pin.locked': 'segundos. Por favor, intente más tarde',
        'pin.attempts': 'intentos fallidos. Intente de nuevo en 30 segundos',
        'pin.unlock': 'Desbloquear',

        // Mnemonic
        'mnemonic.title': 'Frase de Semilla',
        'mnemonic.warning': 'Anote estas 12 palabras en un lugar seguro',
        'mnemonic.warningDetail': 'La frase de semilla es la única forma de recuperar su billetera. Nunca la comparta con nadie.',
        'mnemonic.confirm': 'Confirmar Frase de Semilla',
        'mnemonic.import': 'Importar Frase de Semilla',
        'mnemonic.importDesc': 'Ingrese su frase de semilla de 12 palabras',
        'mnemonic.paste': 'Pegar',
        'mnemonic.invalid': 'Frase de semilla inválida',
        'mnemonic.keepSafe': 'Guarda la frase semilla en un lugar seguro. No podrás recuperar tu billetera si la pierdes.',
        'mnemonic.securityTitle': 'Nunca la compartas',
        'mnemonic.tapToReveal': 'Toca para ver la frase semilla',
        'mnemonic.revealHint': 'Asegúrate de que nadie esté mirando',
        'mnemonic.copy': 'Copiar',
        'mnemonic.copied': 'Copiado',
        'mnemonic.hide': 'Ocultar',
        'mnemonic.show': 'Mostrar',
        'mnemonic.check1': 'He escrito mi frase semilla en papel',
        'mnemonic.check2': 'La he guardado en un lugar seguro',
        'mnemonic.check3': 'No tomé una captura de pantalla',
        'mnemonic.verifyTitle': 'Verificar frase semilla',
        'mnemonic.selectWord': 'Selecciona la palabra',

        // Home tab
        'home.portfolio': 'Portafolio',
        'home.createWallet': 'Crear Billetera',
        'home.tokens': 'Tokens',
        'home.manageTokens': 'Gestionar',
        'home.recentTx': 'Transacciones Recientes',
        'home.allTx': 'Todas',
        'home.noTokens': 'Conecte su billetera para ver tokens',
        'home.noTokensDesc': 'Cree o importe una billetera para ver sus saldos de tokens',
        'home.noTx': 'Sin historial de transacciones',
        'home.noTxDesc': 'Su historial de transacciones aparecerá aquí',

        // Actions
        'action.send': 'Enviar',
        'action.receive': 'Recibir',
        'action.swap': 'Intercambiar',
        'action.buy': 'Comprar',
        'action.faucet': 'Grifo',

        // Send modal
        'send.title': 'Enviar',
        'send.to': 'Dirección del Destinatario',
        'send.token': 'Token',
        'send.amount': 'Cantidad',
        'send.confirm': 'Confirmar Envío',
        'send.success': 'Transacción enviada exitosamente',
        'send.fail': 'Error en la transacción',

        // Receive modal
        'receive.title': 'Recibir',
        'receive.copy': 'Copiar Dirección',
        'receive.copied': 'Copiado',
        'receive.share': 'Compartir',

        // Swap modal
        'swap.title': 'Intercambiar',
        'swap.sell': 'Vender',
        'swap.buy': 'Comprar',
        'swap.amount': 'Cantidad',
        'swap.estimated': 'Cantidad Estimada',
        'swap.confirm': 'Confirmar Intercambio',
        'swap.comingSoon': 'COMING SOON',
        'swap.comingSoonDesc': 'La integración de FunSwap DEX llegará pronto.\n¡Espere intercambios en cadena más rápidos y seguros!',

        // Buy modal
        'buy.title': 'Comprar',
        'buy.token': 'Token',
        'buy.amount': 'Monto de Compra (USD)',
        'buy.method': 'Método de Pago',
        'buy.creditCard': 'Tarjeta de Crédito',
        'buy.bankTransfer': 'Transferencia Bancaria',
        'buy.paypal': 'PayPal',
        'buy.confirm': 'Confirmar Compra',

        // Tx filters
        'tx.all': 'Todas',
        'tx.send': 'Enviar',
        'tx.receive': 'Recibir',
        'tx.swap': 'Intercambiar',
        'tx.pending': 'Pendiente',
        'tx.confirmed': 'Confirmado',
        'tx.failed': 'Fallido',
        'tx.approve': 'Aprobar',
        'time.justNow': 'ahora mismo',
        'time.minAgo': 'min atrás',
        'time.hrAgo': 'h atrás',
        'time.daysAgo': 'días atrás',

        // Browser tab
        'browser.search': 'Ingrese URL o busque...',
        'browser.bookmarks': 'Marcadores',
        'browser.dapps': 'DApps Populares',
        'browser.defi': 'DeFi',
        'browser.nft': 'NFT',

        // NFT tab
        'nft.title': 'Colección NFT',
        'nft.founder': 'FunS Founder',
        'nft.membership': 'Membresía Premium',
        'nft.memberSince': 'Miembro Desde',
        'nft.benefits': 'Beneficios de Membresía',
        'nft.benefit1': 'Descuento del 50% en comisiones comerciales',
        'nft.benefit2': 'Asignación prioritaria de airdrop de token nuevo',
        'nft.benefit3': 'Derechos de voto de gobernanza DAO',
        'nft.benefit4': 'Acceso a canales de comunidad exclusivos',

        // Settings tab
        'settings.title': 'Configuración',
        'settings.network': 'Red',
        'settings.bsc': 'BSC (BNB Smart Chain)',
        'settings.eth': 'Ethereum',
        'settings.customTokens': 'Tokens Personalizados',
        'settings.addToken': 'Agregar Token',
        'settings.security': 'Seguridad',
        'settings.biometric': 'Autenticación Biométrica',
        'settings.connectedApps': 'Aplicaciones Conectadas',
        'settings.connectedCount': 'DApps conectadas',
        'settings.general': 'General',
        'settings.language': 'Idioma',
        'settings.theme': 'Modo Oscuro',
        'settings.txAlerts': 'Alertas de Transacción',
        'settings.priceAlerts': 'Alertas de Precio',
        'settings.about': 'Acerca de',
        'settings.version': 'Versión',
        'settings.help': 'Ayuda y Soporte',
        'settings.privacy': 'Política de Privacidad',
        'settings.terms': 'Términos de Servicio',
        'settings.resetWallet': 'Restablecer Billetera',
        'settings.resetConfirm': '¿Está seguro de que desea restablecer su billetera? Se eliminarán todos los datos.',
        'settings.exportKey': 'Exportar Clave Privada',
        'settings.exportMnemonic': 'Exportar Frase de Semilla',
        'settings.backup': 'Copia de Seguridad',

        // Add token modal
        'addToken.title': 'Agregar Token',
        'addToken.address': 'Dirección del Contrato',
        'addToken.symbol': 'Símbolo',
        'addToken.name': 'Nombre',
        'addToken.decimals': 'Decimales',
        'addToken.loading': 'Cargando información del token...',
        'addToken.auto': 'Autocompletar',
        'addToken.cancel': 'Cancelar',
        'addToken.add': 'Agregar',

        // Tab navigation
        'tab.home': 'Inicio',
        'tab.browser': 'Navegador',
        'tab.swap': 'Intercambiar',
        'tab.nft': 'NFT',
        'tab.settings': 'Configuración',

        // Testnet
        'testnet.banner': '⚠ Modo Testnet',
        'testnet.faucet': 'Obtener Monedas de Prueba Gratis →',

        // Network
        'network.select': 'Seleccionar Red',
        'network.connected': 'Blockchain Conectada',
        'network.disconnected': 'Desconectada',

        // Toast messages
        'toast.addressCopied': 'Dirección copiada',
        'toast.copyFail': 'Error al copiar dirección',
        'toast.walletCreated': 'Billetera creada exitosamente',
        'toast.walletImported': 'Billetera importada exitosamente',
        'toast.error': 'Ocurrió un error',

        // Language names
        'lang.ko': '한국어',
        'lang.en': 'English',
        'lang.ja': '日本語',
        'lang.zh': '中文',
        'lang.vi': 'Tiếng Việt',
        'lang.th': 'ไทย',
        'lang.id': 'Bahasa Indonesia',
        'lang.es': 'Español',
        'lang.fr': 'Français',
        'lang.ar': 'العربية',

        // QR scanner
        'qr.scan': 'El escáner QR está disponible en la aplicación móvil',
        'qr.manualInput': 'El escaneo QR solo está disponible en la aplicación.\nIngrese la dirección manualmente:',
        'qr.scanTitle': 'Escanear código QR',
        'qr.scanStatus': 'Alinee el código QR dentro del marco',
        'qr.permDenied': 'Permiso de cámara denegado',
        'qr.camError': 'Cámara no disponible',
        'qr.notSupported': 'Este navegador no soporta escaneo QR',

        // Misc
        'misc.noNotifications': 'Sin notificaciones',
        'misc.loading': 'Cargando...',
        'misc.confirm': 'Confirmar',
        'misc.cancel': 'Cancelar',
        'misc.comingSoon': 'English version coming soon!',

        // Common
        'common.confirm': 'Confirmar',
        'common.cancel': 'Cancelar',
        'common.next': 'Siguiente',
        'common.back': 'Atrás',

        // Settings (additional)
        'settings.defaultNetwork': 'Red predeterminada',
        'settings.optional': 'Opcional',
        'settings.networkManagement': 'Gestión de Redes',
        'settings.customTokensDesc': 'Puede agregar tokens directamente con la dirección del contrato.',
        'settings.ethSepolia': 'Ethereum Sepolia',
        'settings.testnet': 'Testnet',
        'settings.seedBackup': 'Respaldo de frase semilla',
        'settings.seedBackupDesc': 'Protege tu billetera de forma segura',
        'settings.biometricDesc': 'Huella digital o reconocimiento facial',
        'settings.connectedSites': 'Sitios conectados',
        'settings.connectedSitesDesc': '3 DApps conectadas',
        'settings.transaction': 'Configuración de transacciones',
        'settings.languageDesc': 'Idioma',
        'settings.currency': 'Moneda',
        'settings.currencyDesc': 'Moneda',
        'settings.themeDesc': 'Tema',
        'settings.notifications': 'Notificaciones',
        'settings.txAlertsDesc': 'Alertas de transacciones',
        'settings.priceAlertsDesc': 'Alertas de precio',
        'settings.other': 'Otros',
        'settings.backupDesc': 'Respaldar/Exportar billetera',
        'settings.termsDesc': 'Términos de servicio',
        'settings.privacyDesc': 'Política de privacidad',
        'settings.gasLimit': 'Límite de Gas',
        'settings.gasLimitDesc': 'Límite de Gas',
        'settings.slippage': 'Tolerancia de deslizamiento',
        'settings.slippageDesc': 'Tolerancia de deslizamiento',
        'settings.gas': 'Gas predeterminado',
        'settings.gasDesc': 'Gas predeterminado',
        'settings.gasSlow': 'Lento',
        'settings.gasNormal': 'Normal',
        'settings.gasFast': 'Rápido',
        'settings.autoLock': 'Bloqueo automático',
        'settings.autoLockDesc': 'Bloqueo automático',
        'settings.time1m': '1 min',
        'settings.time5m': '5 min',
        'settings.time15m': '15 min',
        'settings.time30m': '30 min',

        // Toast (additional)
        'toast.demoMode': 'Ejecutando en modo de prueba',
        'toast.balanceFetchFail': 'Error al obtener saldo - verifique su conexión de red',
        'toast.chartNoData': 'No se pueden cargar los datos del gráfico',
        'toast.chartFail': 'Error al actualizar el gráfico',
        'toast.networkEnabled': 'Red Ethereum habilitada',
        'toast.networkEnableFail': 'Error al habilitar la red',
        'toast.networkDisabled': 'Red Ethereum deshabilitada',
        'toast.tokenExists': 'El token {{symbol}} ya existe',
        'toast.tokenAdded': 'Token {{symbol}} agregado',
        'toast.tokenAddFail': 'Error al agregar el token',

        // Error
        'error.mnemonicGenFail': 'No se pudo generar la frase semilla',
        'error.pinMismatch': 'El PIN no coincide',
        'error.verifyFail': 'Se produjo un error',
        'error.common': 'Se produjo un error',
        'send.sending': 'Enviando...',
        'swap.swapping': 'Intercambiando...',
        'settings.copyKey': 'Copiar Clave Privada',
        'settings.copiedKey': 'Copiado ✓',
        'home.searchTokens': 'Buscar tokens...'
    },

    fr: {
        // App general
        'app.name': 'FunS Wallet',
        'app.tagline': 'Portefeuille Multi-Chaîne Sécurisé',

        // Header
        'header.scan': 'Scanner QR',
        'header.notifications': 'Notifications',

        // Onboarding
        'onboarding.welcome': 'Bienvenue dans FunS Wallet',
        'onboarding.subtitle': 'Portefeuille multi-chaîne sécurisé et facile à utiliser',
        'onboarding.demo': 'Essayer la démo',
        'onboarding.create': 'Créer un nouveau portefeuille',
        'onboarding.import': 'Importer un portefeuille',
        'onboarding.or': 'Ou',

        // PIN
        'pin.setup': 'Définir le mot de passe',
        'pin.setupDesc': 'Définissez un mot de passe d\'au moins 8 caractères',
        'pin.confirm': 'Confirmer le PIN',
        'pin.confirmDesc': 'Réentrez votre PIN',
        'pin.enter': 'Entrer le PIN',
        'pin.enterDesc': 'Déverrouiller votre portefeuille',
        'pin.mismatch': 'Le PIN ne correspond pas',
        'pin.wrong': 'PIN incorrect',
        'pin.locked': 'secondes. Veuillez réessayer plus tard',
        'pin.attempts': 'tentatives échouées. Réessayez dans 30 secondes',
        'pin.unlock': 'Déverrouiller',

        // Mnemonic
        'mnemonic.title': 'Phrase Secrète',
        'mnemonic.warning': 'Notez ces 12 mots dans un endroit sûr',
        'mnemonic.warningDetail': 'La phrase secrète est le seul moyen de récupérer votre portefeuille. Ne la partagez jamais avec quiconque.',
        'mnemonic.confirm': 'Confirmer la Phrase Secrète',
        'mnemonic.import': 'Importer la Phrase Secrète',
        'mnemonic.importDesc': 'Entrez votre phrase secrète de 12 mots',
        'mnemonic.paste': 'Coller',
        'mnemonic.invalid': 'Phrase secrète invalide',
        'mnemonic.keepSafe': 'Gardez la phrase de récupération en lieu sûr. Vous ne pourrez pas récupérer votre portefeuille si vous la perdez.',
        'mnemonic.securityTitle': 'Ne la partagez jamais',
        'mnemonic.tapToReveal': 'Appuyez pour révéler la phrase',
        'mnemonic.revealHint': 'Assurez-vous que personne ne regarde',
        'mnemonic.copy': 'Copier',
        'mnemonic.copied': 'Copié',
        'mnemonic.hide': 'Masquer',
        'mnemonic.show': 'Afficher',
        'mnemonic.check1': 'J\'ai noté ma phrase sur papier',
        'mnemonic.check2': 'Je l\'ai rangée en lieu sûr',
        'mnemonic.check3': 'Je n\'ai pas fait de capture d\'écran',
        'mnemonic.verifyTitle': 'Vérifier la phrase de récupération',
        'mnemonic.selectWord': 'Sélectionnez le mot',

        // Home tab
        'home.portfolio': 'Portefeuille',
        'home.createWallet': 'Créer un Portefeuille',
        'home.tokens': 'Jetons',
        'home.manageTokens': 'Gérer',
        'home.recentTx': 'Transactions Récentes',
        'home.allTx': 'Tous',
        'home.noTokens': 'Connectez votre portefeuille pour voir les jetons',
        'home.noTokensDesc': 'Créez ou importez un portefeuille pour voir vos soldes de jetons',
        'home.noTx': 'Aucun historique de transactions',
        'home.noTxDesc': 'Votre historique de transactions apparaîtra ici',

        // Actions
        'action.send': 'Envoyer',
        'action.receive': 'Recevoir',
        'action.swap': 'Échanger',
        'action.buy': 'Acheter',
        'action.faucet': 'Robinet',

        // Send modal
        'send.title': 'Envoyer',
        'send.to': 'Adresse du Destinataire',
        'send.token': 'Jeton',
        'send.amount': 'Montant',
        'send.confirm': 'Confirmer l\'envoi',
        'send.success': 'Transaction envoyée avec succès',
        'send.fail': 'Échec de la transaction',

        // Receive modal
        'receive.title': 'Recevoir',
        'receive.copy': 'Copier l\'adresse',
        'receive.copied': 'Copié',
        'receive.share': 'Partager',

        // Swap modal
        'swap.title': 'Échanger',
        'swap.sell': 'Vendre',
        'swap.buy': 'Acheter',
        'swap.amount': 'Montant',
        'swap.estimated': 'Montant Estimé',
        'swap.confirm': 'Confirmer l\'échange',
        'swap.comingSoon': 'COMING SOON',
        'swap.comingSoonDesc': 'L\'intégration FunSwap DEX arrive bientôt.\nAttendez-vous à des échanges en chaîne plus rapides et plus sûrs!',

        // Buy modal
        'buy.title': 'Acheter',
        'buy.token': 'Jeton',
        'buy.amount': 'Montant d\'achat (USD)',
        'buy.method': 'Méthode de Paiement',
        'buy.creditCard': 'Carte de Crédit',
        'buy.bankTransfer': 'Virement Bancaire',
        'buy.paypal': 'PayPal',
        'buy.confirm': 'Confirmer l\'achat',

        // Tx filters
        'tx.all': 'Tous',
        'tx.send': 'Envoyer',
        'tx.receive': 'Recevoir',
        'tx.swap': 'Échanger',
        'tx.pending': 'En attente',
        'tx.confirmed': 'Confirmé',
        'tx.failed': 'Échoué',
        'tx.approve': 'Approuver',
        'time.justNow': "à l'instant",
        'time.minAgo': 'min ago',
        'time.hrAgo': 'h ago',
        'time.daysAgo': 'jours ago',

        // Browser tab
        'browser.search': 'Entrez l\'URL ou recherchez...',
        'browser.bookmarks': 'Signets',
        'browser.dapps': 'DApps Populaires',
        'browser.defi': 'DeFi',
        'browser.nft': 'NFT',

        // NFT tab
        'nft.title': 'Collection NFT',
        'nft.founder': 'FunS Founder',
        'nft.membership': 'Adhésion Premium',
        'nft.memberSince': 'Membre Depuis',
        'nft.benefits': 'Avantages de l\'Adhésion',
        'nft.benefit1': 'Réduction de 50% sur les frais de transaction',
        'nft.benefit2': 'Allocation prioritaire pour les nouveaux airdrops de tokens',
        'nft.benefit3': 'Droits de vote de gouvernance DAO',
        'nft.benefit4': 'Accès aux canaux de communauté exclusifs',

        // Settings tab
        'settings.title': 'Paramètres',
        'settings.network': 'Réseau',
        'settings.bsc': 'BSC (BNB Smart Chain)',
        'settings.eth': 'Ethereum',
        'settings.customTokens': 'Jetons Personnalisés',
        'settings.addToken': 'Ajouter un Jeton',
        'settings.security': 'Sécurité',
        'settings.biometric': 'Authentification Biométrique',
        'settings.connectedApps': 'Applications Connectées',
        'settings.connectedCount': 'DApps connectées',
        'settings.general': 'Général',
        'settings.language': 'Langue',
        'settings.theme': 'Mode Sombre',
        'settings.txAlerts': 'Alertes de Transaction',
        'settings.priceAlerts': 'Alertes de Prix',
        'settings.about': 'À Propos',
        'settings.version': 'Version',
        'settings.help': 'Aide et Support',
        'settings.privacy': 'Politique de Confidentialité',
        'settings.terms': 'Conditions d\'Utilisation',
        'settings.resetWallet': 'Réinitialiser le Portefeuille',
        'settings.resetConfirm': 'Êtes-vous sûr de vouloir réinitialiser votre portefeuille? Toutes les données seront supprimées.',
        'settings.exportKey': 'Exporter la Clé Privée',
        'settings.exportMnemonic': 'Exporter la Phrase Secrète',
        'settings.backup': 'Sauvegarde',

        // Add token modal
        'addToken.title': 'Ajouter un Jeton',
        'addToken.address': 'Adresse du Contrat',
        'addToken.symbol': 'Symbole',
        'addToken.name': 'Nom',
        'addToken.decimals': 'Décimales',
        'addToken.loading': 'Chargement des informations du jeton...',
        'addToken.auto': 'Remplissage Automatique',
        'addToken.cancel': 'Annuler',
        'addToken.add': 'Ajouter',

        // Tab navigation
        'tab.home': 'Accueil',
        'tab.browser': 'Navigateur',
        'tab.swap': 'Échanger',
        'tab.nft': 'NFT',
        'tab.settings': 'Paramètres',

        // Testnet
        'testnet.banner': '⚠ Mode Testnet',
        'testnet.faucet': 'Obtenir des Pièces de Test Gratuites →',

        // Network
        'network.select': 'Sélectionner le Réseau',
        'network.connected': 'Blockchain Connectée',
        'network.disconnected': 'Déconnectée',

        // Toast messages
        'toast.addressCopied': 'Adresse copiée',
        'toast.copyFail': 'Échec de la copie de l\'adresse',
        'toast.walletCreated': 'Portefeuille créé avec succès',
        'toast.walletImported': 'Portefeuille importé avec succès',
        'toast.error': 'Une erreur s\'est produite',

        // Language names
        'lang.ko': '한국어',
        'lang.en': 'English',
        'lang.ja': '日本語',
        'lang.zh': '中文',
        'lang.vi': 'Tiếng Việt',
        'lang.th': 'ไทย',
        'lang.id': 'Bahasa Indonesia',
        'lang.es': 'Español',
        'lang.fr': 'Français',
        'lang.ar': 'العربية',

        // QR scanner
        'qr.scan': 'Le scanner QR est disponible dans l\'application mobile',
        'qr.manualInput': 'L\'analyse QR n\'est disponible que dans l\'application.\nVeuillez entrer l\'adresse manuellement:',
        'qr.scanTitle': 'Scanner le code QR',
        'qr.scanStatus': 'Alignez le code QR dans le cadre',
        'qr.permDenied': 'Permission caméra refusée',
        'qr.camError': 'Caméra indisponible',
        'qr.notSupported': 'Ce navigateur ne supporte pas le scan QR',

        // Misc
        'misc.noNotifications': 'Aucune notification',
        'misc.loading': 'Chargement...',
        'misc.confirm': 'Confirmer',
        'misc.cancel': 'Annuler',
        'misc.comingSoon': 'English version coming soon!',

        // Common
        'common.confirm': 'Confirmer',
        'common.cancel': 'Annuler',
        'common.next': 'Suivant',
        'common.back': 'Retour',

        // Settings (additional)
        'settings.defaultNetwork': 'Réseau par défaut',
        'settings.optional': 'Optionnel',
        'settings.networkManagement': 'Gestion du Réseau',
        'settings.customTokensDesc': "Vous pouvez ajouter des tokens directement avec l'adresse du contrat.",
        'settings.ethSepolia': 'Ethereum Sepolia',
        'settings.testnet': 'Réseau de test',
        'settings.seedBackup': 'Sauvegarde de la phrase de récupération',
        'settings.seedBackupDesc': 'Protégez votre portefeuille en toute sécurité',
        'settings.biometricDesc': 'Empreinte digitale ou reconnaissance faciale',
        'settings.connectedSites': 'Sites connectés',
        'settings.connectedSitesDesc': '3 DApps connectées',
        'settings.transaction': 'Paramètres de transaction',
        'settings.languageDesc': 'Langue',
        'settings.currency': 'Devise',
        'settings.currencyDesc': 'Devise',
        'settings.themeDesc': 'Thème',
        'settings.notifications': 'Notifications',
        'settings.txAlertsDesc': 'Alertes de transaction',
        'settings.priceAlertsDesc': 'Alertes de prix',
        'settings.other': 'Autres',
        'settings.backupDesc': "Sauvegarder/Exporter le portefeuille",
        'settings.termsDesc': "Conditions d'utilisation",
        'settings.privacyDesc': 'Politique de confidentialité',
        'settings.gasLimit': 'Limite de Gas',
        'settings.gasLimitDesc': 'Limite de Gas',
        'settings.slippage': 'Tolérance de glissement',
        'settings.slippageDesc': 'Tolérance de glissement',
        'settings.gas': 'Gas par défaut',
        'settings.gasDesc': 'Gas par défaut',
        'settings.gasSlow': 'Lent',
        'settings.gasNormal': 'Normal',
        'settings.gasFast': 'Rapide',
        'settings.autoLock': 'Verrouillage auto',
        'settings.autoLockDesc': 'Verrouillage auto',
        'settings.time1m': '1 min',
        'settings.time5m': '5 min',
        'settings.time15m': '15 min',
        'settings.time30m': '30 min',

        // Toast (additional)
        'toast.demoMode': 'Mode test en cours',
        'toast.balanceFetchFail': 'Échec de récupération du solde - vérifiez votre connexion réseau',
        'toast.chartNoData': 'Impossible de charger les données du graphique',
        'toast.chartFail': 'Échec de la mise à jour du graphique',
        'toast.networkEnabled': 'Réseau Ethereum activé',
        'toast.networkEnableFail': "Échec de l'activation du réseau",
        'toast.networkDisabled': 'Réseau Ethereum désactivé',
        'toast.tokenExists': 'Le token {{symbol}} existe déjà',
        'toast.tokenAdded': 'Token {{symbol}} ajouté',
        'toast.tokenAddFail': "Échec de l'ajout du token",

        // Error
        'error.mnemonicGenFail': 'Impossible de générer la phrase de récupération',
        'error.pinMismatch': 'Le PIN ne correspond pas',
        'error.verifyFail': 'Une erreur est survenue',
        'error.common': 'Une erreur est survenue',
        'send.sending': 'Envoi en cours...',
        'swap.swapping': 'Échange en cours...',
        'settings.copyKey': 'Copier la Clé Privée',
        'settings.copiedKey': 'Copié ✓',
        'home.searchTokens': 'Rechercher des tokens...'
    },

    ar: {
        // App general
        'app.name': 'FunS Wallet',
        'app.tagline': 'محفظة متعددة السلاسل آمنة',

        // Header
        'header.scan': 'مسح QR',
        'header.notifications': 'الإخطارات',

        // Onboarding
        'onboarding.welcome': 'مرحبا بك في FunS Wallet',
        'onboarding.subtitle': 'محفظة متعددة السلاسل آمنة وسهلة الاستخدام',
        'onboarding.demo': 'جرب العرض التوضيحي',
        'onboarding.create': 'إنشاء محفظة جديدة',
        'onboarding.import': 'استيراد محفظة',
        'onboarding.or': 'أو',

        // PIN
        'pin.setup': 'تعيين كلمة المرور',
        'pin.setupDesc': 'اضبط كلمة مرور من 8 أحرف على الأقل',
        'pin.confirm': 'تأكيد PIN',
        'pin.confirmDesc': 'أعد إدخال PIN الخاص بك',
        'pin.enter': 'إدخال PIN',
        'pin.enterDesc': 'فتح قفل محفظتك',
        'pin.mismatch': 'PIN غير متطابق',
        'pin.wrong': 'PIN خاطئ',
        'pin.locked': 'ثانية. يرجى المحاولة لاحقا',
        'pin.attempts': 'محاولات فاشلة. حاول مرة أخرى في 30 ثانية',
        'pin.unlock': 'إلغاء القفل',

        // Mnemonic
        'mnemonic.title': 'عبارة البذور',
        'mnemonic.warning': 'اكتب هذه 12 كلمة في مكان آمن',
        'mnemonic.warningDetail': 'عبارة البذور هي الطريقة الوحيدة لاستعادة محفظتك. لا تشاركها أبدا مع أي شخص.',
        'mnemonic.confirm': 'تأكيد عبارة البذور',
        'mnemonic.import': 'استيراد عبارة البذور',
        'mnemonic.importDesc': 'أدخل عبارة البذور المكونة من 12 كلمة',
        'mnemonic.paste': 'لصق',
        'mnemonic.invalid': 'عبارة بذور غير صحيحة',
        'mnemonic.keepSafe': 'احتفظ بعبارة الاسترداد في مكان آمن. لا يمكن استرداد المحفظة في حالة فقدانها.',
        'mnemonic.securityTitle': 'لا تشاركها أبداً',
        'mnemonic.tapToReveal': 'اضغط لعرض عبارة الاسترداد',
        'mnemonic.revealHint': 'تأكد من عدم وجود أحد يراقب',
        'mnemonic.copy': 'نسخ',
        'mnemonic.copied': 'تم النسخ',
        'mnemonic.hide': 'إخفاء',
        'mnemonic.show': 'عرض',
        'mnemonic.check1': 'كتبت عبارة الاسترداد على ورقة',
        'mnemonic.check2': 'قمت بتخزينها في مكان آمن',
        'mnemonic.check3': 'لم ألتقط لقطة شاشة',
        'mnemonic.verifyTitle': 'تحقق من عبارة الاسترداد',
        'mnemonic.selectWord': 'اختر الكلمة',

        // Home tab
        'home.portfolio': 'المحفظة',
        'home.createWallet': 'إنشاء محفظة',
        'home.tokens': 'الرموز',
        'home.manageTokens': 'إدارة',
        'home.recentTx': 'المعاملات الأخيرة',
        'home.allTx': 'الكل',
        'home.noTokens': 'قم بتوصيل محفظتك لمشاهدة الرموز',
        'home.noTokensDesc': 'أنشئ أو استورد محفظة لعرض أرصدة الرموز الخاصة بك',
        'home.noTx': 'لا يوجد سجل معاملات',
        'home.noTxDesc': 'سيظهر سجل معاملاتك هنا',

        // Actions
        'action.send': 'إرسال',
        'action.receive': 'استقبال',
        'action.swap': 'تبديل',
        'action.buy': 'شراء',
        'action.faucet': 'صنبور',

        // Send modal
        'send.title': 'إرسال',
        'send.to': 'عنوان المستقبل',
        'send.token': 'الرمز',
        'send.amount': 'الكمية',
        'send.confirm': 'تأكيد الإرسال',
        'send.success': 'تم إرسال المعاملة بنجاح',
        'send.fail': 'فشلت المعاملة',

        // Receive modal
        'receive.title': 'استقبال',
        'receive.copy': 'نسخ العنوان',
        'receive.copied': 'تم النسخ',
        'receive.share': 'مشاركة',

        // Swap modal
        'swap.title': 'تبديل',
        'swap.sell': 'بيع',
        'swap.buy': 'شراء',
        'swap.amount': 'الكمية',
        'swap.estimated': 'الكمية المقدرة',
        'swap.confirm': 'تأكيد التبديل',
        'swap.comingSoon': 'COMING SOON',
        'swap.comingSoonDesc': 'قريبا سيتم إطلاق تكامل FunSwap DEX.\nتوقع تبديلات على السلسلة أسرع وأكثر أمانا!',

        // Buy modal
        'buy.title': 'شراء',
        'buy.token': 'الرمز',
        'buy.amount': 'مبلغ الشراء (USD)',
        'buy.method': 'طريقة الدفع',
        'buy.creditCard': 'بطاقة ائتمان',
        'buy.bankTransfer': 'التحويل البنكي',
        'buy.paypal': 'PayPal',
        'buy.confirm': 'تأكيد الشراء',

        // Tx filters
        'tx.all': 'الكل',
        'tx.send': 'إرسال',
        'tx.receive': 'استقبال',
        'tx.swap': 'تبديل',
        'tx.pending': 'قيد الانتظار',
        'tx.confirmed': 'مؤكد',
        'tx.failed': 'فشل',
        'tx.approve': 'موافقة',
        'time.justNow': 'الآن',
        'time.minAgo': 'دقيقة مضت',
        'time.hrAgo': 'ساعة مضت',
        'time.daysAgo': 'أيام مضت',

        // Browser tab
        'browser.search': 'أدخل عنوان URL أو ابحث...',
        'browser.bookmarks': 'المرشحات',
        'browser.dapps': 'DApps الشهيرة',
        'browser.defi': 'DeFi',
        'browser.nft': 'NFT',

        // NFT tab
        'nft.title': 'مجموعة NFT',
        'nft.founder': 'FunS Founder',
        'nft.membership': 'عضوية برميوم',
        'nft.memberSince': 'عضو منذ',
        'nft.benefits': 'مزايا العضوية',
        'nft.benefit1': 'خصم 50% على رسوم التداول',
        'nft.benefit2': 'تخصيص ذو أولوية لأحدث عمليات الإسقاط الجوي للرموز',
        'nft.benefit3': 'حقوق التصويت على حوكمة DAO',
        'nft.benefit4': 'الوصول إلى قنوات المجتمع الحصرية',

        // Settings tab
        'settings.title': 'الإعدادات',
        'settings.network': 'الشبكة',
        'settings.bsc': 'BSC (BNB Smart Chain)',
        'settings.eth': 'Ethereum',
        'settings.customTokens': 'رموز مخصصة',
        'settings.addToken': 'إضافة رمز',
        'settings.security': 'الأمان',
        'settings.biometric': 'المصادقة البيومترية',
        'settings.connectedApps': 'التطبيقات المتصلة',
        'settings.connectedCount': 'DApps متصل',
        'settings.general': 'عام',
        'settings.language': 'اللغة',
        'settings.theme': 'الوضع الداكن',
        'settings.txAlerts': 'تنبيهات المعاملة',
        'settings.priceAlerts': 'تنبيهات الأسعار',
        'settings.about': 'عن',
        'settings.version': 'الإصدار',
        'settings.help': 'مساعدة وإجابات',
        'settings.privacy': 'سياسة الخصوصية',
        'settings.terms': 'شروط الخدمة',
        'settings.resetWallet': 'إعادة تعيين المحفظة',
        'settings.resetConfirm': 'هل أنت متأكد من أنك تريد إعادة تعيين محفظتك؟ سيتم حذف جميع البيانات.',
        'settings.exportKey': 'تصدير المفتاح الخاص',
        'settings.exportMnemonic': 'تصدير عبارة البذور',
        'settings.backup': 'احتياطي',

        // Add token modal
        'addToken.title': 'إضافة رمز',
        'addToken.address': 'عنوان العقد',
        'addToken.symbol': 'الرمز',
        'addToken.name': 'الاسم',
        'addToken.decimals': 'العشرية',
        'addToken.loading': 'جاري تحميل معلومات الرمز...',
        'addToken.auto': 'ملء تلقائي',
        'addToken.cancel': 'إلغاء',
        'addToken.add': 'إضافة',

        // Tab navigation
        'tab.home': 'الرئيسية',
        'tab.browser': 'المتصفح',
        'tab.swap': 'تبديل',
        'tab.nft': 'NFT',
        'tab.settings': 'الإعدادات',

        // Testnet
        'testnet.banner': '⚠ وضع Testnet',
        'testnet.faucet': 'احصل على عملات اختبار مجانية →',

        // Network
        'network.select': 'حدد الشبكة',
        'network.connected': 'تم توصيل Blockchain',
        'network.disconnected': 'قطع الاتصال',

        // Toast messages
        'toast.addressCopied': 'تم نسخ العنوان',
        'toast.copyFail': 'فشل نسخ العنوان',
        'toast.walletCreated': 'تم إنشاء المحفظة بنجاح',
        'toast.walletImported': 'تم استيراد المحفظة بنجاح',
        'toast.error': 'حدث خطأ',

        // Language names
        'lang.ko': '한국어',
        'lang.en': 'English',
        'lang.ja': '日本語',
        'lang.zh': '中文',
        'lang.vi': 'Tiếng Việt',
        'lang.th': 'ไทย',
        'lang.id': 'Bahasa Indonesia',
        'lang.es': 'Español',
        'lang.fr': 'Français',
        'lang.ar': 'العربية',

        // QR scanner
        'qr.scan': 'ماسح QR متاح في تطبيق الجوال',
        'qr.manualInput': 'مسح QR متاح فقط في التطبيق.\nيرجى إدخال العنوان يدويا:',
        'qr.scanTitle': 'مسح رمز QR',
        'qr.scanStatus': 'ضع رمز QR داخل الإطار',
        'qr.permDenied': 'تم رفض إذن الكاميرا',
        'qr.camError': 'الكاميرا غير متاحة',
        'qr.notSupported': 'هذا المتصفح لا يدعم مسح QR',

        // Misc
        'misc.noNotifications': 'لا توجد إخطارات',
        'misc.loading': 'جاري التحميل...',
        'misc.confirm': 'تأكيد',
        'misc.cancel': 'إلغاء',
        'misc.comingSoon': 'English version coming soon!',

        // Common
        'common.confirm': 'تأكيد',
        'common.cancel': 'إلغاء',
        'common.next': 'التالي',
        'common.back': 'رجوع',

        // Settings (additional)
        'settings.defaultNetwork': 'الشبكة الافتراضية',
        'settings.optional': 'اختياري',
        'settings.networkManagement': 'إدارة الشبكة',
        'settings.customTokensDesc': 'يمكنك إضافة الرموز المميزة مباشرة بعنوان العقد.',
        'settings.ethSepolia': 'Ethereum Sepolia',
        'settings.testnet': 'شبكة الاختبار',
        'settings.seedBackup': 'نسخة احتياطية لعبارة الاسترداد',
        'settings.seedBackupDesc': 'احمِ محفظتك بأمان',
        'settings.biometricDesc': 'بصمة الإصبع أو التعرف على الوجه',
        'settings.connectedSites': 'المواقع المتصلة',
        'settings.connectedSitesDesc': '3 تطبيقات متصلة',
        'settings.transaction': 'إعدادات المعاملات',
        'settings.languageDesc': 'اللغة',
        'settings.currency': 'العملة',
        'settings.currencyDesc': 'العملة',
        'settings.themeDesc': 'المظهر',
        'settings.notifications': 'الإشعارات',
        'settings.txAlertsDesc': 'تنبيهات المعاملات',
        'settings.priceAlertsDesc': 'تنبيهات الأسعار',
        'settings.other': 'أخرى',
        'settings.backupDesc': 'نسخ احتياطي/تصدير المحفظة',
        'settings.termsDesc': 'شروط الخدمة',
        'settings.privacyDesc': 'سياسة الخصوصية',
        'settings.gasLimit': 'حد الغاز',
        'settings.gasLimitDesc': 'حد الغاز',
        'settings.slippage': 'تحمل الانزلاق',
        'settings.slippageDesc': 'تحمل الانزلاق',
        'settings.gas': 'الغاز الافتراضي',
        'settings.gasDesc': 'الغاز الافتراضي',
        'settings.gasSlow': 'بطيء',
        'settings.gasNormal': 'عادي',
        'settings.gasFast': 'سريع',
        'settings.autoLock': 'القفل التلقائي',
        'settings.autoLockDesc': 'القفل التلقائي',
        'settings.time1m': '1 دقيقة',
        'settings.time5m': '5 دقائق',
        'settings.time15m': '15 دقيقة',
        'settings.time30m': '30 دقيقة',

        // Toast (additional)
        'toast.demoMode': 'تشغيل في وضع الاختبار',
        'toast.balanceFetchFail': 'فشل جلب الرصيد - تحقق من اتصالك بالشبكة',
        'toast.chartNoData': 'تعذر تحميل بيانات المخطط',
        'toast.chartFail': 'فشل تحديث المخطط',
        'toast.networkEnabled': 'تم تفعيل شبكة إيثريوم',
        'toast.networkEnableFail': 'فشل تفعيل الشبكة',
        'toast.networkDisabled': 'تم تعطيل شبكة إيثريوم',
        'toast.tokenExists': 'الرمز {{symbol}} موجود بالفعل',
        'toast.tokenAdded': 'تمت إضافة الرمز {{symbol}}',
        'toast.tokenAddFail': 'فشل إضافة الرمز',

        // Error
        'error.mnemonicGenFail': 'فشل في إنشاء عبارة الاسترداد',
        'error.pinMismatch': 'رمز PIN غير متطابق',
        'error.verifyFail': 'حدث خطأ',
        'error.common': 'حدث خطأ',
        'send.sending': 'جارٍ الإرسال...',
        'swap.swapping': 'جارٍ التبادل...',
        'settings.copyKey': 'نسخ المفتاح الخاص',
        'settings.copiedKey': 'تم النسخ ✓',
        'home.searchTokens': 'البحث عن الرموز...'
    }
};

// Global instantiation
window.i18n = new I18n();

// Export for use in Node.js/modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18n;
}
