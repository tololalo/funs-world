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
  async generateMnemonic() {
    try {
      // Generate 16 random bytes (128 bits) for 12-word mnemonic
      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);

      // Convert to hex string
      const hexString = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Use ethers to generate mnemonic from entropy
      const mnemonic = ethers.Mnemonic.entropyToMnemonic("0x" + hexString);

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
      // Validate mnemonic
      if (!ethers.Mnemonic.isValidMnemonic(mnemonic)) {
        throw new Error("Invalid mnemonic phrase");
      }

      if (!pin || pin.length < 4) {
        throw new Error("PIN must be at least 4 characters");
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

      // Set wallet state
      this.wallet = hdNode;
      this.address = address;
      this.isLocked = false;
      this.pin = pin;
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
      // Validate mnemonic
      if (!ethers.Mnemonic.isValidMnemonic(mnemonic)) {
        throw new Error("Invalid mnemonic phrase");
      }

      if (!pin || pin.length < 4) {
        throw new Error("PIN must be at least 4 characters");
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

      // Set wallet state
      this.wallet = hdNode;
      this.address = address;
      this.isLocked = false;
      this.pin = pin;
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

      // Set state
      this.address = address;
      this.isLocked = false;
      this.pin = pin;
      this.encryptedData = encryptedData;

      // Start session timer
      this._startSessionTimer();

      // Dispatch event
      window.dispatchEvent(
        new CustomEvent("walletUnlocked", { detail: { address } })
      );

      return true;
    } catch (error) {
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

    // Reset timer on user activity
    const resetTimer = () => this._resetSessionTimer();
    window.addEventListener("mousemove", resetTimer, { once: true });
    window.addEventListener("keypress", resetTimer, { once: true });
    window.addEventListener("click", resetTimer, { once: true });
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
