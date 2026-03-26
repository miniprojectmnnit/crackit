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
  const [volume, setVolume] = useState(0); // Added volume state
  const recognitionRef = useRef(null);
  const accumulatedRef = useRef('');
  const audioContextRef = useRef(null);

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
    recognition.lang = 'en-IN'; // Better for Indian English + Hindi mixed speech
    recognition.maxAlternatives = 1;

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
      console.warn('[SPEECH] ⚠️ Error:', event.error);

      // Fatal errors — stop completely
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        console.error('[SPEECH] ❌ Microphone permission denied');
        recognitionRef.current._shouldListen = false;
        setIsListening(false);
        return;
      }

      // Non-fatal errors — let onend handle the restart
      // no-speech: user was quiet, just restart (handled by onend auto-restart)
      // network: transient network issue, restart
      // audio-capture: device issue, try to restart
      if (event.error === 'no-speech' || event.error === 'network' || event.error === 'audio-capture') {
        console.log(`[SPEECH] 🔄 Non-fatal error (${event.error}), will auto-restart via onend...`);
        // Don't change _shouldListen — onend will fire and restart
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

  const startListening = useCallback((initialText = '') => {
    if (!recognitionRef.current) return;
    console.log('[SPEECH] 🎤 Starting speech recognition...');
    
    let baseText = '';
    if (typeof initialText === 'string' && initialText.trim()) {
      baseText = initialText + (initialText.endsWith(' ') ? '' : ' ');
    }
    accumulatedRef.current = baseText;
    
    recognitionRef.current._shouldListen = true;
    try {
      recognitionRef.current.start();
      setIsListening(true);
      
      // Start audio volume analysis
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          const microphone = audioContext.createMediaStreamSource(stream);
          const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
          
          analyser.smoothingTimeConstant = 0.8;
          analyser.fftSize = 1024;
          
          microphone.connect(analyser);
          analyser.connect(javascriptNode);
          javascriptNode.connect(audioContext.destination);
          
          javascriptNode.onaudioprocess = () => {
            if (!recognitionRef.current?._shouldListen) return;
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            let values = 0;
            const length = array.length;
            for (let i = 0; i < length; i++) {
              values += (array[i]);
            }
            const average = values / length;
            setVolume(Math.min(100, average * 1.5)); // Boost slightly
          };
          
          audioContextRef.current = { stream, audioContext, javascriptNode };
        })
        .catch(e => console.error("Microphone access denied for visualizer", e));
        
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
    setVolume(0);
    
    // Stop audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.javascriptNode.disconnect();
        audioContextRef.current.audioContext.close();
        audioContextRef.current.stream.getAudioTracks().forEach(track => track.stop());
      } catch (e) {}
      audioContextRef.current = null;
    }
  }, []);

  const toggleListening = useCallback((initialText = '') => {
    if (isListening) {
      stopListening();
    } else {
      startListening(initialText);
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
    volume,
  };
};

export default useSpeechRecognition;
