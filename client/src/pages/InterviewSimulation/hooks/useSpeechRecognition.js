import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useSpeechRecognition — React hook for browser-native speech-to-text.
 *
 * Uses the Web Speech API (SpeechRecognition) to transcribe the user's
 * microphone input into text in real-time.
 *
 * @param {function} onTranscript - Called with the latest transcript text whenever speech is recognized
 */
const useSpeechRecognition = (onTranscript) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const accumulatedRef = useRef('');

  // Check browser support
  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) {
      console.warn('[SPEECH] ⚠️ SpeechRecognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = accumulatedRef.current;
      let interimTranscript = '';

      // Process only new results (from the latest resultIndex)
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) {
            finalTranscript += (finalTranscript ? ' ' : '') + text;
            accumulatedRef.current = finalTranscript;
            console.log(`[SPEECH] ✅ Final: "${text}"`);
          }
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Send accumulated final + current interim to the callback
      const fullText = interimTranscript
        ? finalTranscript + (finalTranscript ? ' ' : '') + interimTranscript
        : finalTranscript;

      onTranscript?.(fullText);
    };

    recognition.onerror = (event) => {
      console.error('[SPEECH] ❌ Error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
      }
      // Auto-restart on network errors
      if (event.error === 'network') {
        console.log('[SPEECH] 🔄 Network error, will auto-restart...');
      }
    };

    recognition.onend = () => {
      console.log('[SPEECH] 🔇 Recognition ended');
      // Auto-restart if still supposed to be listening
      if (recognitionRef.current?._shouldListen) {
        console.log('[SPEECH] 🔄 Auto-restarting...');
        try {
          recognition.start();
        } catch (e) {
          // Ignore — may already be starting
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognitionRef.current._shouldListen = false;

    return () => {
      recognitionRef.current._shouldListen = false;
      try {
        recognition.stop();
      } catch (e) {
        // Ignore
      }
    };
  }, [isSupported]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    console.log('[SPEECH] 🎤 Starting speech recognition...');
    accumulatedRef.current = '';
    recognitionRef.current._shouldListen = true;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.error('[SPEECH] ❌ Failed to start:', e);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    console.log('[SPEECH] ⏹️ Stopping speech recognition');
    recognitionRef.current._shouldListen = false;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // Ignore
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    accumulatedRef.current = '';
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
  };
};

export default useSpeechRecognition;
