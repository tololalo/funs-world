/**
 * WalletCore - Web3 Crypto Wallet Engine
 *
 * Security Model:
 * - Private key NEVER leaves the browser
 * - PIN is used for AES-GCM encryption only
 * - PBKDF2 with 100k iterations for key derivation
 * - Encrypted data stored in localStorage
 * - All crypto operations use Web Crypto API
 */

class WalletCore {
  constructor() {
    this.wallet = null;
    this.address = null;
    this.isLocked = true;
    this.encryptedData = null;
    this.pin = null;
    this.sessionTimer = null;

    // Crypto constants
    this.PBKDF2_ITERATIONS = 100000;
    this.AES_KEY_SIZE = 256;
    this.IV_SIZE = 12; // 12 bytes for GCM mode
    this.SALT_SIZE = 16;
    this.TAG_SIZE = 16; // GCM tag size
  }

  /**
   * Generate a new 12-word mnemonic phrase
   * @returns {string} The generated mnemonic phrase
   */
  generateMnemonic() {
    try {
      // Generate 16 random bytes (128 bits) for 12-word mnemonic
      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);

      // Convert to hex string
      const hexString = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Use ethers v6 to generate mnemonic from entropy
      const mnemonicObj = ethers.Mnemonic.fromEntropy("0x" + hexString);
      const mnemonic = mnemonicObj.phrase;

      return mnemonic;
    } catch (error) {
      throw new Error(`Failed to generate mnemonic: ${error.message}`);
    }
  }

  /**
   * Create a new wallet from a mnemonic phrase
   * @param {string} mnemonic - The 12-word mnemonic phrase
   * @param {string} pin - The PIN for encryption
   * @returns {Promise<{address: string, mnemonic: string}>}
   */
  async createWallet(mnemonic, pin) {
    try {
      // Validate mnemonic using ethers v6 approach
      try {
        ethers.Mnemonic.fromPhrase(mnemonic);
      } catch {
        throw new Error("Invalid mnemonic phrase");
      }

      if (!pin || pin.length < 6) {
        throw new Error("PIN must be at least 6 characters");
      }

      // Create HD wallet from mnemonic using BIP44 path
      const hdNode = ethers.HDNodeWallet.fromMnemonic(
        ethers.Mnemonic.fromPhrase(mnemonic),
        "m/44'/60'/0'/0/0"
      );

      const privateKey = hdNode.privateKey;
      const address = hdNode.address;

      // Encrypt private key with PIN
      const encryptedData = await this._encryptPrivateKey(privateKey, pin);

      // Store encrypted data in localStorage
      localStorage.setItem("funs_wallet_data", JSON.stringify(encryptedData));
      localStorage.setItem("funs_wallet_address", address);

      // Store encrypted mnemonic for backup
      const encryptedMnemonic = await this._encryptPrivateKey(mnemonic, pin);
      localStorage.setItem("funs_wallet_mnemonic_enc", JSON.stringify(encryptedMnemonic));

      // Store creation timestamp
      localStorage.setItem("funs_wallet_created", new Date().toISOString());

      // Set wallet state
      this.wallet = hdNode;
      this.address = address;
      this.isLocked = false;
      this.encryptedData = encryptedData;

      // Start session timer
      this._startSessionTimer();

      // Dispatch event
      window.dispatchEvent(
        new CustomEvent("walletCreated", { detail: { address } })
      );

      return { address, mnemonic };
    } catch (error) {
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  }

  /**
   * Import an existing wallet from a mnemonic phrase
   * @param {string} mnemonic - The 12-word mnemonic phrase
   * @param {string} pin - The PIN for encryption
   * @returns {Promise<{address: string, mnemonic: string}>}
   */
  async importWallet(mnemonic, pin) {
    try {
      // Validate mnemonic using ethers v6 approach
      try {
        ethers.Mnemonic.fromPhrase(mnemonic);
      } catch {
        throw new Error("Invalid mnemonic phrase");
      }

      if (!pin || pin.length < 6) {
        throw new Error("PIN must be at least 6 characters");
      }

      // Check if wallet already exists
      if (this.isWalletExists()) {
        throw new Error(
          "Wallet already exists. Please delete it first to import a new one."
        );
      }

      // Create HD wallet from mnemonic using BIP44 path
      const hdNode = ethers.HDNodeWallet.fromMnemonic(
        ethers.Mnemonic.fromPhrase(mnemonic),
        "m/44'/60'/0'/0/0"
      );

      const privateKey = hdNode.privateKey;
      const address = hdNode.address;

      // Encrypt private key with PIN
      const encryptedData = await this._encryptPrivateKey(privateKey, pin);

      // Store encrypted data in localStorage
      localStorage.setItem("funs_wallet_data", JSON.stringify(encryptedData));
      localStorage.setItem("funs_wallet_address", address);

      // Store encrypted mnemonic for backup
      const encryptedMnemonic = await this._encryptPrivateKey(mnemonic, pin);
      localStorage.setItem("funs_wallet_mnemonic_enc", JSON.stringify(encryptedMnemonic));

      // Store creation timestamp
      localStorage.setItem("funs_wallet_created", new Date().toISOString());

      // Set wallet state
      this.wallet = hdNode;
      this.address = address;
      this.isLocked = false;
      this.encryptedData = encryptedData;

      // Start session timer
      this._startSessionTimer();

      // Dispatch event
      window.dispatchEvent(
        new CustomEvent("walletCreated", { detail: { address } })
      );

      return { address, mnemonic };
    } catch (error) {
      throw new Error(`Failed to import wallet: ${error.message}`);
    }
  }

  /**
   * Unlock the wallet with PIN
   * @param {string} pin - The PIN for decryption
   * @returns {Promise<boolean>}
   */
  async unlockWallet(pin) {
    try {
      // Enforce rate limiting at the core layer (cannot be bypassed by clearing localStorage)
      const now = Date.now();
      if (this._unlockLockUntil && now < this._unlockLockUntil) {
        const remaining = Math.ceil((this._unlockLockUntil - now) / 1000);
        throw new Error(`Too many attempts. Wait ${remaining}s`);
      }
      if (!this._unlockAttempts) this._unlockAttempts = 0;

      // Load encrypted data from localStorage
      const encryptedDataStr = localStorage.getItem("funs_wallet_data");
      const address = localStorage.getItem("funs_wallet_address");

      if (!encryptedDataStr || !address) {
        throw new Error("No wallet data found. Please create or import a wallet first.");
      }

      const encryptedData = JSON.parse(encryptedDataStr);

      // Decrypt private key
      const privateKey = await this._decryptPrivateKey(encryptedData, pin);

      // Recreate wallet from private key
      this.wallet = new ethers.Wallet(privateKey);

      if (this.wallet.address !== address) {
        throw new Error("Decrypted address does not match stored address");
      }

      // Reset rate limiting on success
      this._unlockAttempts = 0;
      this._unlockLockUntil = null;

      // Set state
      this.address = address;
      this.isLocked = false;
      this.encryptedData = encryptedData;

      // Start session timer
      this._startSessionTimer();

      // Dispatch event
      window.dispatchEvent(
        new CustomEvent("walletUnlocked", { detail: { address } })
      );

      return true;
    } catch (error) {
      // Track failed attempts at core layer; exponential backoff (30s, 60s, 120s …)
      if (!error.message.startsWith('Too many attempts')) {
        this._unlockAttempts = (this._unlockAttempts || 0) + 1;
        if (this._unlockAttempts >= 5) {
          const lockSeconds = Math.min(30 * Math.pow(2, this._unlockAttempts - 5), 3600);
          this._unlockLockUntil = Date.now() + lockSeconds * 1000;
        }
      }
      throw new Error(`Failed to unlock wallet: ${error.message}`);
    }
  }

  /**
   * Lock the wallet and clear sensitive data from memory
   */
  lockWallet() {
    this.wallet = null;
    this.pin = null;
    this.isLocked = true;

    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }

    // Remove activity listeners when locked to avoid unnecessary background resets
    if (this._activityHandler) {
      window.removeEventListener("mousemove", this._activityHandler);
      window.removeEventListener("keypress", this._activityHandler);
      window.removeEventListener("click", this._activityHandler);
      this._activityHandler = null;
    }

    // Dispatch event
    window.dispatchEvent(new CustomEvent("walletLocked", { detail: {} }));
  }

  /**
   * Check if a wallet exists in localStorage
   * @returns {boolean}
   */
  isWalletExists() {
    return localStorage.getItem("funs_wallet_data") !== null;
  }

  /**
   * Get the current wallet address
   * @returns {string|null}
   */
  getAddress() {
    return this.address || localStorage.getItem("funs_wallet_address");
  }

  /**
   * Get a signer connected to a provider
   * @param {ethers.Provider} provider - The ethers provider
   * @returns {ethers.Signer}
   */
  getSigner(provider) {
    if (!this.wallet) {
      throw new Error("Wallet is not unlocked");
    }

    return this.wallet.connect(provider);
  }

  /**
   * Delete all wallet data from localStorage
   */
  deleteWallet() {
    try {
      localStorage.removeItem("funs_wallet_data");
      localStorage.removeItem("funs_wallet_address");
      localStorage.removeItem("funs_wallet_mnemonic_enc");
      localStorage.removeItem("funs_wallet_created");

      this.wallet = null;
      this.address = null;
      this.isLocked = true;
      this.pin = null;
      this.encryptedData = null;

      if (this.sessionTimer) {
        clearTimeout(this.sessionTimer);
        this.sessionTimer = null;
      }
    } catch (error) {
      throw new Error(`Failed to delete wallet: ${error.message}`);
    }
  }

  /**
   * Export encrypted mnemonic (requires PIN verification)
   * @param {string} pin - Current PIN
   * @returns {Promise<string>} Mnemonic phrase
   */
  async exportMnemonic(pin) {
    try {
      const mnemonicData = localStorage.getItem('funs_wallet_mnemonic_enc');
      if (!mnemonicData) {
        throw new Error('Mnemonic backup not available. Only available for wallets created through this app.');
      }

      const encryptedMnemonic = JSON.parse(mnemonicData);
      const mnemonic = await this._decryptPrivateKey(encryptedMnemonic, pin);
      return mnemonic;
    } catch (error) {
      throw new Error(`Failed to export mnemonic: ${error.message}`);
    }
  }

  /**
   * Change the wallet PIN
   * @param {string} currentPin - Current PIN
   * @param {string} newPin - New PIN
   * @returns {Promise<boolean>}
   */
  async changePin(currentPin, newPin) {
    try {
      if (!newPin || newPin.length < 6) {
        throw new Error('New PIN must be at least 6 characters');
      }

      // Verify current PIN by decrypting
      const encryptedDataStr = localStorage.getItem("funs_wallet_data");
      if (!encryptedDataStr) {
        throw new Error('No wallet data found');
      }

      const encryptedData = JSON.parse(encryptedDataStr);
      const privateKey = await this._decryptPrivateKey(encryptedData, currentPin);

      // Re-encrypt with new PIN
      const newEncryptedData = await this._encryptPrivateKey(privateKey, newPin);
      localStorage.setItem("funs_wallet_data", JSON.stringify(newEncryptedData));

      // Re-encrypt mnemonic if exists
      const mnemonicEnc = localStorage.getItem("funs_wallet_mnemonic_enc");
      if (mnemonicEnc) {
        const mnemonic = await this._decryptPrivateKey(JSON.parse(mnemonicEnc), currentPin);
        const newMnemonicEnc = await this._encryptPrivateKey(mnemonic, newPin);
        localStorage.setItem("funs_wallet_mnemonic_enc", JSON.stringify(newMnemonicEnc));
      }

      // Update current state
      this.pin = newPin;
      this.encryptedData = newEncryptedData;

      window.dispatchEvent(new CustomEvent('pinChanged', { detail: {} }));

      return true;
    } catch (error) {
      throw new Error(`Failed to change PIN: ${error.message}`);
    }
  }

  /**
   * Validate PIN without unlocking wallet
   * @param {string} pin - PIN to validate
   * @returns {Promise<boolean>}
   */
  async validatePin(pin) {
    try {
      const encryptedDataStr = localStorage.getItem("funs_wallet_data");
      if (!encryptedDataStr) return false;

      const encryptedData = JSON.parse(encryptedDataStr);
      await this._decryptPrivateKey(encryptedData, pin);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get wallet summary info (non-sensitive)
   * @returns {Object} Wallet info
   */
  getWalletInfo() {
    return {
      exists: this.isWalletExists(),
      address: this.getAddress(),
      isLocked: this.isLocked,
      hasMnemonicBackup: localStorage.getItem('funs_wallet_mnemonic_enc') !== null,
      createdAt: localStorage.getItem('funs_wallet_created') || null
    };
  }

  /**
   * Encrypt private key using PIN with AES-GCM
   * @private
   * @param {string} privateKey - The private key to encrypt (0x format)
   * @param {string} pin - The PIN for encryption
   * @returns {Promise<{iv: string, salt: string, encrypted: string}>}
   */
  async _encryptPrivateKey(privateKey, pin) {
    try {
      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_SIZE));
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_SIZE));

      // Derive key from PIN using PBKDF2
      const baseKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(pin),
        "PBKDF2",
        false,
        ["deriveBits"]
      );

      const derivedKeyBits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: salt,
          iterations: this.PBKDF2_ITERATIONS,
        },
        baseKey,
        this.AES_KEY_SIZE
      );

      // Import derived key for AES-GCM
      const encryptionKey = await crypto.subtle.importKey(
        "raw",
        derivedKeyBits,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
      );

      // Encrypt private key
      const privateKeyBytes = new TextEncoder().encode(privateKey);
      const encryptedData = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        encryptionKey,
        privateKeyBytes
      );

      // Encode to base64 for storage
      const encryptedBase64 = this._arrayBufferToBase64(encryptedData);
      const saltBase64 = this._arrayBufferToBase64(salt);
      const ivBase64 = this._arrayBufferToBase64(iv);

      return {
        iv: ivBase64,
        salt: saltBase64,
        encrypted: encryptedBase64,
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt private key using PIN with AES-GCM
   * @private
   * @param {Object} encryptedData - Object with iv, salt, encrypted
   * @param {string} pin - The PIN for decryption
   * @returns {Promise<string>} The decrypted private key
   */
  async _decryptPrivateKey(encryptedData, pin) {
    try {
      // Decode from base64
      const iv = this._base64ToArrayBuffer(encryptedData.iv);
      const salt = this._base64ToArrayBuffer(encryptedData.salt);
      const encrypted = this._base64ToArrayBuffer(encryptedData.encrypted);

      // Derive key from PIN using PBKDF2
      const baseKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(pin),
        "PBKDF2",
        false,
        ["deriveBits"]
      );

      const derivedKeyBits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: salt,
          iterations: this.PBKDF2_ITERATIONS,
        },
        baseKey,
        this.AES_KEY_SIZE
      );

      // Import derived key for AES-GCM
      const decryptionKey = await crypto.subtle.importKey(
        "raw",
        derivedKeyBits,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );

      // Decrypt
      const decryptedData = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        decryptionKey,
        encrypted
      );

      // Convert back to string
      const privateKey = new TextDecoder().decode(decryptedData);

      return privateKey;
    } catch (error) {
      throw new Error(`Decryption failed. Invalid PIN or corrupted data.`);
    }
  }

  /**
   * Start session timer for auto-lock
   * @private
   */
  _startSessionTimer() {
    // Clear existing timer
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    const timeout =
      window.WalletConfig?.WALLET_CONFIG?.sessionTimeout || 15 * 60 * 1000; // Default 15 minutes

    this.sessionTimer = setTimeout(() => {
      this.lockWallet();
    }, timeout);

    // Register persistent activity listeners once; _resetSessionTimer re-arms the timeout
    if (!this._activityHandler) {
      this._activityHandler = () => this._resetSessionTimer();
      window.addEventListener("mousemove", this._activityHandler);
      window.addEventListener("keypress", this._activityHandler);
      window.addEventListener("click", this._activityHandler);
    }

    // Clean up listeners on page unload to prevent memory leaks
    if (!this._unloadHandler) {
      this._unloadHandler = () => this.lockWallet();
      window.addEventListener("beforeunload", this._unloadHandler);
    }
  }

  /**
   * Reset the session timer on user activity
   * @private
   */
  _resetSessionTimer() {
    if (!this.isLocked) {
      this._startSessionTimer();
    }
  }

  /**
   * Convert ArrayBuffer to base64 string
   * @private
   * @param {ArrayBuffer} buffer
   * @returns {string}
   */
  _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   * @private
   * @param {string} base64
   * @returns {ArrayBuffer}
   */
  _base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Assign to global window object
window.WalletCore = WalletCore;
