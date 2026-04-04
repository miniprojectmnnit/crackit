🔒 Security Architecture: AES-256-GCM Encryption
------------------------------------------------

The application utilizes **AES-256-GCM** (Advanced Encryption Standard with Galois/Counter Mode) to protect sensitive User API Keys. This is a "Symmetric" authenticated encryption prepared for high-performance and high-security environments.

### 1\. The Triple-Layer Defense (GCM Mode)

Standard AES only hides data; **GCM (Galois/Counter Mode)** adds an extra layer of "Authenticated Encryption." When you execute decrypt(settings.encryptedKeys, settings.iv, settings.authTag), the system handles three distinct components:

*   **The Ciphertext (encryptedKeys)**: The "Payload." This is the user's API key scrambled into a non-human-readable hexadecimal or base64 string.
    
*   **The IV (iv - Initialization Vector)**: The "Randomizer." Even if two users provide the exact same OpenAI key, the random IV ensures their stored strings in MongoDB are mathematically unique. This prevents **Rainbow Table** attacks and pattern recognition.
    
*   **The Auth Tag (authTag)**: The "Integrity Seal." GCM produces this tag during encryption. If a single bit of the encryptedKeys or iv is modified in the database (bit-flipping attack), the decryption will fail instantly. This provides **AEAD** (Authenticated Encryption with Associated Data).
    

### 2\. The Encryption Lifecycle (The "Locking" Phase)

Before any sensitive string hits the UserSettings collection, the cryptoUtils library executes a multi-step sequence:

1.  **IV Generation**: A cryptographically secure random 12-byte IV is generated using crypto.randomBytes(12).
    
2.  **Cipher Initialization**: A cipher object is created using the 32-byte process.env.ENCRYPTION\_KEY (The Master Key).
    
3.  **Transformation**: The Plain Text is combined with the IV and Master Key.
    
4.  **Tag Finalization**: The encryption is finalized, and a 16-byte authTag is extracted from the cipher.
    
5.  **Storage**: The Ciphertext, IV, and Auth Tag are saved into the UserSettings model as strings.
    

### 3\. The Decryption Lifecycle (The "Unlocking" Phase)

When the webSocketService or settingsRouter needs to use a key, the process is reversed with strict validation:

1.  **Retrieval**: The encryptedKeys, iv, and authTag are pulled from the MongoDB document.
    
2.  **Verification**: The decipher object is initialized with the Master Key and the IV from the database.
    
3.  **Integrity Check**: The authTag is set on the decipher object.
    
4.  **Decryption**: If the Master Key, IV, and Auth Tag all align, the algorithm mathematically reconstructs the original string.
    
5.  **JSON Re-hydration**: Since the data is stored as a stringified array, JSON.parse() is used to restore the original JavaScript Object.
    

> \[!IMPORTANT\]**Tamper Protection:** If the authTag check fails, Node.js will throw an Unsupported state or unable to authenticate data error. This prevents the application from ever processing corrupted or maliciously altered keys.

### 4\. Key Management & Environment Security

*   **Master Key Storage**: The ENCRYPTION\_KEY is never committed to GitHub. It exists only as an environment variable on your production host (e.g., Render, Railway, or AWS).
    
*   **Separation of Concerns**: Even if a hacker gains "Read-Only" access to your MongoDB, they cannot decrypt the keys because the Master Key is stored in a completely different environment.
    
*   **Zero-Knowledge Principle**: As the developer, you cannot read user keys directly in the database. Only the running server instance has the "Secret" required to unlock them.