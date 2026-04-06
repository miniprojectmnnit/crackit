import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { WS_BASE_URL } from '../config';

/**
 * useInterviewSocket — manages the WebSocket connection to the Interview LangGraph conductor.
 * 
 * @param {string} sessionId - the MongoDB session ID
 * @param {function} onAiMessage - callback when AI sends a spoken message (text)
 * @param {function} onInterviewComplete - callback when session reaches "report" phase
 */
const useInterviewSocket = (sessionId, onAiMessage, onInterviewComplete, onAnswerCorrected, onSessionRestored) => {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [progress, setProgress] = useState({ current: 0, total: 10 });
  const [retryCount, setRetryCount] = useState(0);
  const { getToken } = useAuth();
  const wsRef = useRef(null);

  const startConnection = useCallback(async () => {
    if (!sessionId) return;

    setConnectionState('connecting');

    try {
      const token = await getToken();
      const wsUrl = `${WS_BASE_URL}/ws/interview/${sessionId}?token=${token}`;
      console.log('[WS] Connecting to:', wsUrl.split('?')[0]);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        setConnectionState('connected');
        setRetryCount(0); // Reset on success
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WS] Received:', data.type);

          switch (data.type) {
            case 'session_ready':
              break;

            case 'session_restored':
              if (data.progress) setProgress(data.progress);
              if (onSessionRestored) onSessionRestored(data.transcript, data.phase, data.question);
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
        setConnectionState(prev => prev === 'error' ? 'error' : 'disconnected');

        // Auto-reconnect logic (max 5 times)
        if (retryCount < 5) {
          const nextRetry = retryCount + 1;
          setRetryCount(nextRetry);
          const delay = Math.min(1000 * Math.pow(2, nextRetry - 1), 10000); // 1s, 2s, 4s, 8s, 10s
          console.log(`[WS] Attempting reconnect ${nextRetry}/5 in ${delay}ms...`);
          setTimeout(() => {
            startConnection();
          }, delay);
        }
      };
    } catch (err) {
      console.error('[WS] Token/Init Error:', err);
      setConnectionState('error');
    }
  }, [sessionId, getToken, onAiMessage, onInterviewComplete, onAnswerCorrected, onSessionRestored, retryCount]);

  useEffect(() => {
    startConnection();
    return () => {
      wsRef.current?.close();
    };
  }, [sessionId]); // Initial connection only, useCallBack handles retries

  const sendAnswer = useCallback((answerText, codeContent = null, isFinalSubmission = false, language = null) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'user_answer',
        text: answerText,
        code: codeContent,
        language: language,
        isFinalSubmission: !!isFinalSubmission
      }));
    }
  }, []);

  const signalSpeechDone = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WS] Sending speech_done signal');
      wsRef.current.send(JSON.stringify({ type: 'speech_done' }));
    }
  }, []);

  const reconnect = useCallback(() => {
    setRetryCount(0);
    startConnection();
  }, [startConnection]);

  const disconnect = useCallback(() => wsRef.current?.close(), []);

  return { connectionState, progress, sendAnswer, signalSpeechDone, disconnect, reconnect };
};

export default useInterviewSocket;
