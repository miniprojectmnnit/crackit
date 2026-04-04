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
  //modern browser uses speechrecodintion with prefix "WEBKIT" earlier it was prefxied with webkit thats why we are just checking whether it is present or not
  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) {
      console.warn('[SPEECH] ⚠️ SpeechRecognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    //actual instance of speech recogintion
    const recognition = new SpeechRecognition();

    //bydefault broswer stops listenting if user stops speaking this tells the browser keep listening until it is explicitly terminitaed
    recognition.continuous = true;
    //it gives real time feedback of what is being said
    //if false ,u only see text when user has finished saying 
    //if true,u can see as he is speaking
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Better for Indian English + Hindi mixed speech

    //By setting it to 1, you are telling the browser: "Don't give me a list of options. Just pick the one you are most confident in and send me that single string."
    recognition.maxAlternatives = 1;

    //you have to realize that the browser doesn't send the whole paragraph at once; it sends a "list" of results that is constantly growing and changing as you speak.
    recognition.onresult = (event) => {
      //It starts by grabbing everything the user has already finished saying from a "Ref
      let finalTranscript = accumulatedRef.current;
      //This creates a temporary "scratchpad" for words the user is currently saying but hasn't finished yet.
      let interimTranscript = '';

      // Process only new results (from the latest resultIndex)
      //event.results is dynamic
      //we give last index of event.results to get the save time
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        //Ai guesses if it is final word ,The code trims the text, adds it to our permanent finalTranscript, and saves it back into accumulatedRef.current.
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
      //if user is speaking then take those words which he has already spoken and add the current words he is speaking else just take the final words
      //(finalTranscript ? ' ' : '') ->this tells if the finalTranscript is not empty then add a space else add nothing(means first word should not be prefixed with a space)
      const fullText = interimTranscript
        ? finalTranscript + (finalTranscript ? ' ' : '') + interimTranscript
        : finalTranscript;
      //This is the function you passed into the hook from your useInterview logic.
      onTranscript?.(fullText);
    };

    //if any error occurs
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

    //Browsers have a very annoying habit: they will automatically shut down the SpeechRecognition engine if they don't hear anything for a while (usually after about 10–60 seconds of silence). Without this onend logic, your user would be mid-interview, think for a minute, and find that the microphone had silently turned itself off.

    //This event fires every single time the microphone stops—whether the user clicked "Stop," the browser timed out, or the internet flickered.
    recognition.onend = () => {
      console.log('[SPEECH] 🔇 Recognition ended');
      // Auto-restart if still supposed to be listening
      //if user clicked stop button function would have set _shouldListen to false,in this case code does nothing ,mic is off and we set isListening to false
      //if user did not clicked stop button but mic stopped due to silence or network issue then _shouldListen is true,so it restarts
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

  //This function is the "Engine Start" button. It doesn't just turn on the speech-to-text; it also kicks off a sophisticated Audio Visualizer system so the user can see their voice "moving" on the screen.
  const startListening = useCallback((initialText = '') => {
    if (!recognitionRef.current) return;
    console.log('[SPEECH] 🎤 Starting speech recognition...');

    //if there is any initial text then add it to the accumulatedRef
    //this is used when we want to continue the speech from where we left off
    let baseText = '';
    if (typeof initialText === 'string' && initialText.trim()) {
      baseText = initialText + (initialText.endsWith(' ') ? '' : ' ');
    }
    accumulatedRef.current = baseText;
    //set _shouldListen to true so that onend event can restart the recognition
    recognitionRef.current._shouldListen = true;
    try {
      //start the recognition
      recognitionRef.current.start();
      setIsListening(true);

      // Start audio volume analysis
      //Asks the user: "Can I use your raw microphone data for analysis?"
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

  //This function is the "Master Kill Switch." Its job is to completely shut down every system we started in the startListening function. It doesn't just stop the words; it also powers down the "Audio Engine" to save the user's battery and turn off that "Recording" privacy light in the browser.
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
      } catch (e) { }
      audioContextRef.current = null;
    }
  }, []);

  //This is the "Smart Switch." It checks if the mic is already on. If it is, it turns it off. If it's off, it turns it on.
  const toggleListening = useCallback((initialText = '') => {
    if (isListening) {
      stopListening();
    } else {
      startListening(initialText);
    }
  }, [isListening, startListening, stopListening]);
  //This function is the "Reset Button." It clears the buffer and tells the AI, "Forget everything we just said; start fresh."
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
