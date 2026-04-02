import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthFetch } from '../../../auth/useAuthFetch';
import { GeminiLiveClient } from '../../../lib/geminiLiveClient';
import { AudioPlayer } from '../../../lib/audioPlayer';
import { API_BASE_URL } from '../../../config';

const SYSTEM_INSTRUCTION = `You are a TEXT-TO-SPEECH READER. You are NOT an assistant and do NOT answer questions.

RULES (NEVER VIOLATE):
1. Read the given text EXACTLY as written — word for word.
2. Do NOT add any words before or after the text.
3. Do NOT answer questions in the text. Just READ them aloud.
4. Stop immediately after reading. Say NOTHING more.

Use a professional, calm, clear interviewer voice.`;

/**
 * useGeminiVoice — TTS hook using Gemini Live API.
 *
 * Design: Text is ALWAYS queued until Gemini is fully connected and ready.
 * The browser TTS fallback is a LAST resort (8s timeout, not immediate).
 * This prevents the dual-voice bug where browser TTS fires before Gemini connects.
 *
 * @param {function} onSpeechDone - called when the current speech turn completes
 */
const useGeminiVoice = (onSpeechDone) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const clientRef = useRef(null);
  const playerRef = useRef(null);
  const onSpeechDoneRef = useRef(onSpeechDone);
  const pendingTextRef = useRef(null);   // text waiting for Gemini to be ready
  const readyRef = useRef(false);        // true once Gemini setupComplete fires
  const fallbackTimerRef = useRef(null); // browser TTS timeout handle
  const authFetch = useAuthFetch();

  useEffect(() => {
    onSpeechDoneRef.current = onSpeechDone;
  }, [onSpeechDone]);

  // Speak using browser TTS (last resort only)
  const browserSpeak = useCallback((text) => {
    console.warn('[VOICE] ⚠️ Using browser TTS fallback');
    if (!('speechSynthesis' in window)) {
      setIsSpeaking(false);
      onSpeechDoneRef.current?.();
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.92;
    utt.pitch = 1.0;
    // Try to pick a female voice if available to avoid jarring male default
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
      || voices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('male'))
      || voices[0];
    if (preferred) utt.voice = preferred;
    utt.onend = () => {
      setIsSpeaking(false);
      onSpeechDoneRef.current?.();
    };
    utt.onerror = () => {
      setIsSpeaking(false);
      onSpeechDoneRef.current?.();
    };
    window.speechSynthesis.speak(utt);
  }, []);

  // Send text to Gemini (only called when Gemini is ready)
  const geminiSpeak = useCallback((text) => {
    const wrappedText = `READ THE FOLLOWING TEXT EXACTLY AS WRITTEN. DO NOT ANSWER. DO NOT ADD ANYTHING:\n\n"${text}"`;
    console.log(`[VOICE] 🔊 Sending to Gemini: "${text.substring(0, 60)}..."`);
    clientRef.current?.sendText(wrappedText);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        console.log('[VOICE] Fetching ephemeral token...');
        const res = await authFetch(`${API_BASE_URL}/api/interviews/live-token`);
        if (!res.ok) throw new Error(`Token fetch: ${res.status}`);
        const { token } = await res.json();
        if (cancelled) return;

        const player = new AudioPlayer(24000);
        playerRef.current = player;

        const client = new GeminiLiveClient();

        client.onAudio = (base64Pcm) => {
          // Audio is arriving — Gemini is speaking, cancel any fallback timer
          clearTimeout(fallbackTimerRef.current);
          player.playChunk(base64Pcm);
          setIsSpeaking(true);
        };

        client.onTurnComplete = () => {
          console.log('[VOICE] Turn complete');
          setTimeout(() => {
            setIsSpeaking(false);
            pendingTextRef.current = null;
            onSpeechDoneRef.current?.();
          }, 400);
        };

        client.onReady = () => {
          console.log('[VOICE] ✅ Gemini Live ready');
          readyRef.current = true;

          // If text was queued before Gemini was ready, speak it now
          if (pendingTextRef.current) {
            const text = pendingTextRef.current;
            clearTimeout(fallbackTimerRef.current); // Cancel browser TTS timer
            geminiSpeak(text);
          }
        };

        client.onError = (err) => {
          console.error('[VOICE] Error:', err);
          readyRef.current = false;
          setIsSpeaking(false);
        };

        client.connect(token, SYSTEM_INSTRUCTION);
        clientRef.current = client;
        console.log('[VOICE] Connecting to Gemini Live...');

      } catch (err) {
        console.error('[VOICE] Init failed:', err.message);
      }
    };

    init();

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimerRef.current);
      clientRef.current?.disconnect();
      playerRef.current?.destroy();
    };
  }, [geminiSpeak, authFetch]);

  /**
   * Speak the given text.
   * - If Gemini is ready: sends immediately.
   * - If Gemini is still connecting: queues text and starts an 8-second
   *   fallback timer. If Gemini connects within 8s, cancels the timer
   *   and uses Gemini. After 8s, falls back to browser TTS.
   */
  const speak = useCallback((text) => {
    if (!text?.trim()) return;
    setIsSpeaking(true);
    pendingTextRef.current = text;

    // Clear any previous fallback timer
    clearTimeout(fallbackTimerRef.current);

    if (readyRef.current) {
      // Gemini is ready — send directly
      geminiSpeak(text);
    } else {
      // Gemini still connecting — wait up to 8 seconds before falling back
      console.log('[VOICE] Gemini not ready yet, queuing text and waiting...');
      fallbackTimerRef.current = setTimeout(() => {
        // If Gemini still hasn't fired onReady, fall back to browser TTS
        if (pendingTextRef.current === text && !readyRef.current) {
          console.warn('[VOICE] Gemini timeout — falling back to browser TTS');
          pendingTextRef.current = null;
          browserSpeak(text);
        }
      }, 8000);
    }
  }, [geminiSpeak, browserSpeak]);

  const stop = useCallback(() => {
    clearTimeout(fallbackTimerRef.current);
    pendingTextRef.current = null;
    playerRef.current?.stop();
    setIsSpeaking(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  return { speak, stop, isSpeaking };
};

export default useGeminiVoice;
