const mongoose = require("mongoose");

const UserSettingsSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, unique: true },
  encryptedKeys: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
});

module.exports = mongoose.model("UserSettings", UserSettingsSchema);
