import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useInterview from './hooks/useInterview';

import InterviewHeader from './components/InterviewHeader';
import MediaPipeline from './components/MediaPipeline';
import QuestionPanel from './components/QuestionPanel';
import CodeEditor from './components/CodeEditor';
import UnifiedInput from '../../components/UnifiedInput';
import FeedbackOverlay from './components/FeedbackOverlay';
import TranscriptPanel from './components/TranscriptPanel';

const InterviewSimulation = () => {
  const navigate = useNavigate();
  const {
    loading,
    interviewFinished,
    currentQuestion,
    currentIndex,
    questions,
    session,
    code,
    language,
    answer,
    feedback,
    execResult,
    isEvaluating,
    conversationHistory,
    isListening,
    isSpeechSupported,
    toggleListening,
    volume,
    isSpeaking,
    setCode,
    setLanguage,
    setAnswer,
    handleNext,
    submitAnswer,
    runCode,
    handleAnswerFollowUp,
  } = useInterview();

  useEffect(() => {
    if (interviewFinished && session?._id) {
      navigate(`/interview-report/${session._id}`);
    }
  }, [interviewFinished, session, navigate]);

  if (loading) return <div className="p-10 text-center text-white text-xl">Loading Interview...</div>;

  if (interviewFinished) return <div className="p-10 text-center text-white">Redirecting to report...</div>;

  if (!currentQuestion) return <div className="p-10 text-center text-white">No questions found.</div>;

  const isCoding = currentQuestion.type === 'Coding';

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-200 w-full font-sans overflow-hidden">

      <InterviewHeader
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        questionType={currentQuestion.type}
        onNext={handleNext}
        isLast={currentIndex === questions.length - 1}
      />

      <div className="flex-1 p-4 flex flex-row gap-6 overflow-hidden">

        {/* Left Side: Media + Transcript */}
        <div className={`flex flex-col gap-4 ${isCoding ? 'w-1/5' : 'w-1/3'}`}>
          <MediaPipeline isCoding={isCoding} isListening={isListening} volume={volume} />
          <div className="flex-1 overflow-hidden border border-neutral-800 rounded-xl relative">
            <TranscriptPanel transcript={conversationHistory} />
          </div>
        </div>

        {/* Right Side: Questions and Editor  */}
        <div className={`flex ${isCoding ? 'flex-row w-4/5' : 'flex-col w-2/3 flex-1'} gap-4 rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden shadow-2xl h-full`}>

          {isCoding ? (
            <>
              {/* Split layout for Coding */}
              <div className="w-[40%] h-full border-r border-neutral-800">
                <QuestionPanel question={currentQuestion} />
              </div>
              <div className="w-[60%] h-full flex flex-col">
                <CodeEditor
                  code={code}
                  language={language}
                  onLanguageChange={(newLang) => {
                    setLanguage(newLang);
                  }}
                  onCodeChange={setCode}
                  onRunCode={runCode}
                  onSubmit={submitAnswer}
                  isEvaluating={isEvaluating}
                  execResult={execResult}
                />
              </div>
            </>
          ) : (
            <>
              {/* Stacked layout for General */}
              <QuestionPanel question={currentQuestion} />
              <div className="flex-1 flex flex-col">
                <UnifiedInput
                  answer={answer}
                  onAnswerChange={setAnswer}
                  onSubmit={submitAnswer}
                  isEvaluating={isEvaluating}
                  isListening={isListening}
                  isSpeechSupported={isSpeechSupported}
                  onToggleListening={toggleListening}
                  volume={volume}
                  isSpeaking={isSpeaking}
                />
              </div>
            </>
          )}

          <FeedbackOverlay
            feedback={feedback}
            onAnswerFollowUp={handleAnswerFollowUp}
            onNext={handleNext}
          />

        </div>
      </div>
    </div>
  );
};

export default InterviewSimulation;
