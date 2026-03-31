const { getAuth } = require('@clerk/express');
const { GoogleGenAI } = require("@google/genai");
const log = require("../utils/logger");
require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Creates an ephemeral token for the Gemini Live API.
 * The client uses this token to connect directly to Gemini via WebSocket
 * without exposing the API key.
 */
const getLiveToken = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    log.info("TOKEN", `🔑 Generating ephemeral Gemini Live API token...`);

    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: expireTime,
        newSessionExpireTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Kore'
                }
              }
            }
          }
        },
        httpOptions: { apiVersion: 'v1alpha' }
      }
    });

    log.success("TOKEN", `✅ Token generated — expires: ${expireTime}`);
    res.json({ token: token.name });
  } catch (err) {
    log.error("TOKEN", `Failed to create ephemeral token: ${err.message}`, err);
    res.status(500).json({ error: "Failed to create live token", details: err.message });
  }
};

module.exports = { getLiveToken };
