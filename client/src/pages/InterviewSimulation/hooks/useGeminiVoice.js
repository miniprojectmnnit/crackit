import { useState, useEffect, useRef, useCallback } from 'react';
import { GeminiLiveClient } from '../utils/geminiLiveClient';
import { AudioPlayer } from '../utils/audioPlayer';

/**
 * Strict system instruction for the Gemini Live API.
 * This ensures Gemini ONLY reads the provided text and does NOT improvise.
 */
const SYSTEM_INSTRUCTION = `You are a TEXT-TO-SPEECH READER. You are NOT an assistant. You are NOT an AI chatbot. You do NOT answer questions. You do NOT have conversations.

You are a VOICE READER embedded in an interview simulator app. The app sends you text, and your ONLY purpose is to read that text out loud — word for word, exactly as written.

ABSOLUTE RULES — VIOLATING ANY OF THESE IS A CRITICAL FAILURE:

1. NEVER answer a question. Even if the text IS a question, you just READ IT ALOUD. You do NOT provide the answer.
2. NEVER add ANY words before or after the text. No "Sure!", "Of course!", "Great question!", "Here's the text", "Let me read that" — NOTHING.
3. NEVER paraphrase, summarize, reword, explain, or elaborate on the text.
4. NEVER give opinions, commentary, or meta-talk about what you're reading.
5. NEVER ask any questions of your own.
6. After reading the text, STOP IMMEDIATELY. Say NOTHING more.

YOUR BEHAVIOR:
- You receive text → You read it aloud exactly as written → You stop.
- Use a professional, calm, clear voice.
- Use natural intonation (questioning tone for questions, declarative for statements).
- Pronounce code terms (function names, variable names) clearly.

CRITICAL EXAMPLE:
- Text received: "What is the time complexity of binary search?"
- CORRECT: You say "What is the time complexity of binary search?" and STOP.
- WRONG: You say "The time complexity of binary search is O(log n)..." — THIS IS FORBIDDEN.

- Text received: "Explain the difference between a stack and a queue."  
- CORRECT: You say "Explain the difference between a stack and a queue." and STOP.
- WRONG: You say "A stack is a LIFO data structure..." — THIS IS FORBIDDEN.

Remember: You are a READER, not a RESPONDER. NEVER answer. Just read.`;

/**
 * useGeminiVoice — React hook for Gemini Live API voice.
 *
 * Fetches an ephemeral token, connects to Gemini via WebSocket,
 * and provides speak/stop methods for AI voice output.
 */
const useGeminiVoice = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef(null);
  const playerRef = useRef(null);

  // Initialize: fetch token and connect
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // 1. Get ephemeral token from our server
        console.log('[VOICE] 🔑 Fetching ephemeral token from server...');
        const res = await fetch('http://localhost:5000/api/interviews/live-token');
        if (!res.ok) throw new Error('Failed to fetch live token');
        const { token } = await res.json();
        console.log('[VOICE] ✅ Token received');

        if (cancelled) return;

        // 2. Create audio player
        console.log('[VOICE] 🔊 Creating audio player (24kHz)');
        const player = new AudioPlayer(24000);
        playerRef.current = player;

        // 3. Create and configure Gemini Live client
        console.log('[VOICE] 🔌 Creating Gemini Live WebSocket client...');
        const client = new GeminiLiveClient();

        client.onAudio = (base64Pcm) => {
          player.playChunk(base64Pcm);
          setIsSpeaking(true);
        };

        client.onTurnComplete = () => {
          console.log('[VOICE] 🔇 Turn complete — audio finished');
          // Allow a short delay for buffered audio to finish playing
          setTimeout(() => {
            if (playerRef.current && !playerRef.current.isPlaying) {
              setIsSpeaking(false);
            }
          }, 500);
        };

        client.onOutputTranscription = (text) => {
          // Could be used for subtitles in the future
        };

        client.onReady = () => {
          console.log('[VOICE] ✅ Connected and ready for speech');
          setIsConnected(true);
        };

        client.onError = (err) => {
          console.error('[VOICE] ❌ WebSocket error:', err);
          setIsConnected(false);
        };

        // Connect with strict interviewer TTS prompt
        client.connect(token, SYSTEM_INSTRUCTION);
        clientRef.current = client;
        console.log('[VOICE] 🔌 WebSocket connection initiated');

      } catch (err) {
        console.error('[VOICE] ❌ Init error:', err);
      }
    };

    init();

    return () => {
      cancelled = true;
      console.log('[VOICE] 🔌 Disconnecting and cleaning up...');
      clientRef.current?.disconnect();
      playerRef.current?.destroy();
    };
  }, []);

  /**
   * Speak the given text using Gemini Live API.
   * Falls back to browser SpeechSynthesis if not connected.
   */
  const speak = useCallback((text) => {
    if (!text) return;

    console.log(`[VOICE] 🗣️ Speaking: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);

    // Stop any ongoing speech first
    playerRef.current?.stop();
    setIsSpeaking(true);

    // Wrap the text with a strong TTS directive so Gemini reads verbatim, not answers
    const wrappedText = `READ THE FOLLOWING TEXT OUT LOUD EXACTLY AS WRITTEN. DO NOT ANSWER IT. DO NOT ADD ANYTHING. JUST READ IT:\n\n"${text}"`;

    const sent = clientRef.current?.sendText(wrappedText);

    if (!sent) {
      // Fallback to browser TTS if Gemini is not available
      console.warn('[VOICE] ⚠️ Not connected to Gemini — falling back to browser SpeechSynthesis');
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        console.warn('[VOICE] ❌ Browser SpeechSynthesis not available');
        setIsSpeaking(false);
      }
    } else {
      console.log('[VOICE] ✅ Text sent to Gemini Live API');
    }
  }, []);

  /**
   * Stop any ongoing speech immediately.
   */
  const stop = useCallback(() => {
    console.log('[VOICE] ⏹️ Stopping speech');
    playerRef.current?.stop();
    setIsSpeaking(false);

    // Also stop browser TTS fallback if it was used
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, stop, isSpeaking, isConnected };
};

export default useGeminiVoice;
