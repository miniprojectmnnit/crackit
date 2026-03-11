/**
 * GeminiLiveClient — WebSocket client for Gemini Live API.
 * 
 * Connects directly to Gemini using an ephemeral token,
 * sends text, and receives audio/transcription responses.
 */

const MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

export class GeminiLiveClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.setupComplete = false;

    // Callbacks
    this.onAudio = null;         // (base64PcmData) => void
    this.onTurnComplete = null;  // () => void
    this.onOutputTranscription = null; // (text) => void
    this.onReady = null;         // () => void
    this.onError = null;         // (error) => void

    // Queue of texts to send once setup is complete
    this._pendingTexts = [];
  }

  /**
   * Connect to Gemini Live API with an ephemeral token.
   */
  connect(token, systemInstruction = '') {
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${token}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[GeminiLive] WebSocket connected');
      this.connected = true;

      // Send setup message
      const setupMessage = {
        setup: {
          model: `models/${MODEL}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Kore'
                }
              }
            }
          },
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          outputAudioTranscription: {}
        }
      };

      this.ws.send(JSON.stringify(setupMessage));
      console.log('[GeminiLive] Setup message sent');
    };

    this.ws.onmessage = async (event) => {
      let jsonData;
      if (event.data instanceof Blob) {
        jsonData = await event.data.text();
      } else {
        jsonData = event.data;
      }

      try {
        const data = JSON.parse(jsonData);
        this._handleMessage(data);
      } catch (err) {
        console.error('[GeminiLive] Parse error:', err);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[GeminiLive] WebSocket error:', err);
      this.connected = false;
      this.onError?.(err);
    };

    this.ws.onclose = () => {
      console.log('[GeminiLive] WebSocket closed');
      this.connected = false;
      this.setupComplete = false;
    };
  }

  _handleMessage(data) {
    // Setup complete
    if (data.setupComplete) {
      console.log('[GeminiLive] Setup complete');
      this.setupComplete = true;
      this.onReady?.();

      // Flush any pending text
      for (const text of this._pendingTexts) {
        this._sendTextImmediate(text);
      }
      this._pendingTexts = [];
      return;
    }

    const serverContent = data.serverContent;
    if (!serverContent) return;

    // Turn complete
    if (serverContent.turnComplete) {
      this.onTurnComplete?.();
      return;
    }

    // Audio data
    if (serverContent.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.onAudio?.(part.inlineData.data);
        }
      }
    }

    // Output transcription
    if (serverContent.outputTranscription?.text) {
      this.onOutputTranscription?.(serverContent.outputTranscription.text);
    }
  }

  /**
   * Send text for Gemini to speak aloud.
   * If setup isn't complete yet, the text is queued.
   * Any previously queued texts are cleared (only latest matters).
   */
  sendText(text) {
    if (!this.connected) {
      console.warn('[GeminiLive] Not connected, cannot send text');
      return false;
    }

    if (!this.setupComplete) {
      // Only keep the latest text — discard any stale queued texts
      this._pendingTexts = [text];
      return true;
    }

    this._sendTextImmediate(text);
    return true;
  }

  _sendTextImmediate(text) {
    const message = {
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text }]
        }],
        turnComplete: true
      }
    };
    this.ws.send(JSON.stringify(message));
    console.log('[GeminiLive] Text sent:', text.substring(0, 100));
  }

  /**
   * Disconnect and clean up.
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.setupComplete = false;
    this._pendingTexts = [];
  }
}
