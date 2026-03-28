import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useInterviewSocket — manages the WebSocket connection to the Interview LangGraph conductor.
 * 
 * @param {string} sessionId - the MongoDB session ID
 * @param {function} onAiMessage - callback when AI sends a spoken message (text)
 * @param {function} onInterviewComplete - callback when session reaches "report" phase
 */
const useInterviewSocket = (sessionId, onAiMessage, onInterviewComplete, onAnswerCorrected) => {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [progress, setProgress] = useState({ current: 0, total: 10 });
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    if (!sessionId) return;
    setConnectionState('connecting');

    const wsUrl = `ws://localhost:5000/ws/interview/${sessionId}`;
    console.log('[WS] Connecting to:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
      setConnectionState('connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WS] Received:', data.type);

        switch (data.type) {
          case 'session_ready':
            console.log('[WS] Session ready');
            break;

          case 'ai_message':
            if (data.progress) setProgress(data.progress);
            if (onAiMessage) onAiMessage(data.text, data.phase, data.question);
            break;

          case 'interview_complete':
            if (onInterviewComplete) onInterviewComplete(data.session_id, data.final_report);
            break;

          case 'answer_corrected':
            if (onAnswerCorrected) onAnswerCorrected(data.original, data.corrected);
            break;

          case 'error':
            console.error('[WS] Server error:', data.message);
            break;

          default:
            break;
        }
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      setConnectionState('error');
    };

    ws.onclose = () => {
      console.log('[WS] Closed');
      setConnectionState('disconnected');
    };
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) connect();
    return () => wsRef.current?.close();
  }, [sessionId, connect]);

  const sendAnswer = useCallback((answerText) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'user_answer', text: answerText }));
    }
  }, []);

  // Signal to server that Gemini has finished speaking
  const signalSpeechDone = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WS] Sending speech_done signal');
      wsRef.current.send(JSON.stringify({ type: 'speech_done' }));
    }
  }, []);

  const disconnect = useCallback(() => wsRef.current?.close(), []);

  return { connectionState, progress, sendAnswer, signalSpeechDone, disconnect };
};

export default useInterviewSocket;
