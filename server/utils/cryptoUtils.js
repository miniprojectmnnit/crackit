const crypto = require("crypto");
require("dotenv").config();

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
const ALGORITHM = "aes-256-gcm";

if (!ENCRYPTION_SECRET || ENCRYPTION_SECRET.length !== 64) {
  console.warn("WARNING: ENCRYPTION_SECRET is not set correctly or not 64 hex characters (32 bytes). Keys encryption may fail.");
}

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  // Key must be exactly 32 bytes for aes-256-gcm. Parse from hex.
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_SECRET, "hex"), iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

function decrypt(encryptedData, ivHex, authTagHex) {
  if (!encryptedData || !ivHex || !authTagHex) return null;
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_SECRET, "hex"),
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error.message);
    return null;
  }
}

module.exports = { encrypt, decrypt };
