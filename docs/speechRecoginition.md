This documentation covers the **Speech-to-Text (STT) & Voice Interface Layer**. It explains how your custom useSpeechToText hook transforms raw audio into real-time transcriptions while managing the complexities of browser microphone behavior.

🎙️ The Voice Intelligence Layer (useSpeechToText)
--------------------------------------------------

The application uses the **Web Speech API** to provide a hands-free interview experience. This layer is designed to be "resilient," meaning it can recover from silence or network flickers without losing the candidate's progress.

### 1\. Initializer & Configuration

Before the microphone opens, the system performs a compatibility check and configures the **SpeechRecognition** instance:

*   **Browser Support:** Optimized for **Chromium-based browsers** (Chrome, Edge). Safari is restricted due to non-standard Web Speech implementations.
    
*   **Continuous Listening (continuous = true):** The browser stays "open" even after the user pauses. It won't stop until the stopListening master switch is triggered.
    
*   **Real-time Feedback (interimResults = true):** Allows the UI to show words _as they are being spoken_, making the AI feel like it is "listening" in real-time.
    
*   **Localization (lang = 'en-IN'):** Specifically tuned for Indian English accents and mixed-language (Hinglish) speech patterns.
    
*   **Confidence Filtering (maxAlternatives = 1):** The engine ignores second-guesses and only returns the transcription it is most confident in, reducing data noise.
    

### 2\. The Event Lifecycle (The "Brain")

The hook manages three critical events that handle the "flow" of speech:

#### **A. The onresult Event (Processing Words)**

This is where audio becomes text. The code uses a **Buffer Logic** to manage the transcript:

*   **Last Index Selection:** Instead of re-processing the whole conversation, it only looks at the results.length - 1 to save CPU cycles.
    
*   **Smart Spacing:** Uses the logic (finalTranscript ? ' ' : '') to ensure the first word of a sentence doesn't have a leading space, while subsequent words are properly separated.
    
*   **Heuristic Sync:** It constantly syncs the accumulatedRef with the finalTranscript, ensuring that if the user stops and starts, their previous words are preserved.
    

#### **B. The onend Event (The Auto-Restart Guard)**

Web Speech often "times out" if the user is silent for too long. Your hook includes a **Resilience Loop**:

*   **Manual Stop:** If the user clicked "Stop," \_shouldListen is false, and the mic stays off.
    
*   **Accidental Stop:** If the mic dies due to silence or a flicker but \_shouldListen is still true, the hook **instantly restarts** the engine. This prevents the "silent failure" where a user keeps talking but the AI has stopped listening.
    

### 3\. Engine Controls (The "Cockpit")

**FunctionTechnical ActionUser ExperiencestartListening**Requests getUserMedia & starts SpeechRecognition.The "Recording" light turns on; the **Audio Visualizer** starts moving.**stopListening**Sets \_shouldListen = false & kills the Audio Engine.Stops the words and powers down the visualizer to save battery.**toggleListening**Flips the state between Start and Stop.The single button the user clicks to talk or pause.**resetTranscript**Clears accumulatedRef and finalTranscript.Clears the text box so the user can "start over" on a question.

### 4\. The Audio Visualization System

When startListening is triggered, it doesn't just process text; it also initializes an **Audio Context Pipeline**:

1.  **Permission:** Asks for raw microphone data.
    
2.  **Analysis:** Uses an AnalyserNode to convert sound frequencies into a stream of numbers.
    
3.  **Visualization:** These numbers are sent to the UI to create the "pulsing" wave effect, giving the user visual confirmation that their voice is being captured.
    

### 5\. Summary of the STT Logic Flow

1.  **User Clicks Start:** Engine initializes $\\rightarrow$ Visualizer starts $\\rightarrow$ \_shouldListen becomes true.
    
2.  **User Speaks:** onresult catches audio $\\rightarrow$ converts to text $\\rightarrow$ appends to accumulatedRef $\\rightarrow$ UI updates.
    
3.  **Silence/Flicker:** onend triggers $\\rightarrow$ check \_shouldListen $\\rightarrow$ Restart Engine.
    
4.  **User Clicks Stop:** Kill Speech Engine $\\rightarrow$ Kill Audio Context $\\rightarrow$ UI stops moving.