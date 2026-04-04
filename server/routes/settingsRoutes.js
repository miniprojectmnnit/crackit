const express = require("express");
const router = express.Router();
const UserSettings = require("../models/UserSettings");
const { encrypt, decrypt } = require("../utils/cryptoUtils");
const { getAuth } = require('@clerk/express');

// Helper to decrypt keys robustly
const getDecryptedKeys = async (userId) => {
  const settings = await UserSettings.findOne({ clerkUserId: userId });
  if (!settings) return [];
  const decryptedStr = decrypt(settings.encryptedKeys, settings.iv, settings.authTag);
  if (!decryptedStr) return [];
  try {
    return JSON.parse(decryptedStr);
  } catch (e) { return []; }
};

// Helper to encrypt and save keys
const saveEncryptedKeys = async (userId, keysArray) => {
  if (!keysArray || keysArray.length === 0) {
    await UserSettings.findOneAndDelete({ clerkUserId: userId });
    return;
  }
  const { encryptedData, iv, authTag } = encrypt(JSON.stringify(keysArray));
  await UserSettings.findOneAndUpdate(
    { clerkUserId: userId },
    { clerkUserId: userId, encryptedKeys: encryptedData, iv, authTag },
    { upsert: true, new: true }
  );
};

// GET /api/settings/keys
// Returns the list of keys with masked values for frontend rendering
router.get("/keys", async (req, res) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    let keys = await getDecryptedKeys(userId);

    // Fallback: If existing keys are just strings, convert them to objects
    keys = keys.map((k, i) => typeof k === 'string' ? { name: `Legacy Key ${i + 1}`, value: k } : k);

    const maskedKeys = keys.map(k => {
      const v = k.value || "";
      const masked = v.length > 8 ? `${v.substring(0, 4)}${'*'.repeat(16)}${v.slice(-4)}` : '***';
      return { name: k.name, value: masked };
    });

    res.json({ keys: maskedKeys });
  } catch (error) {
    console.error("Error fetching keys:", error);
    res.status(500).json({ error: "Failed to fetch keys" });
  }
});

// POST /api/settings/keys
// Appends a new key-value pair, overwriting if the name already exists
router.post("/keys", async (req, res) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, value } = req.body;
    if (!name || !value) {
      return res.status(400).json({ error: "Name and value are required" });
    }

    let keys = await getDecryptedKeys(userId);
    keys = keys.map((k, i) => typeof k === 'string' ? { name: `Legacy Key ${i + 1}`, value: k } : k);

    const existingIndex = keys.findIndex(k => k.name === name);
    if (existingIndex >= 0) {
      keys[existingIndex].value = value;
    } else {
      keys.push({ name, value });
    }

    await saveEncryptedKeys(userId, keys);
    res.json({ success: true, message: "Key saved successfully" });
  } catch (error) {
    console.error("Error saving settings:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// DELETE /api/settings/keys/:name
// Removes a key by its name
router.delete("/keys/:name", async (req, res) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const keyName = req.params.name;
    let keys = await getDecryptedKeys(userId);
    keys = keys.map((k, i) => typeof k === 'string' ? { name: `Legacy Key ${i + 1}`, value: k } : k);

    const updatedKeys = keys.filter(k => k.name !== keyName);

    await saveEncryptedKeys(userId, updatedKeys);
    res.json({ success: true, message: "Key deleted successfully" });
  } catch (error) {
    console.error("Error deleting key:", error);
    res.status(500).json({ error: "Failed to delete key" });
  }
});

module.exports = router;
