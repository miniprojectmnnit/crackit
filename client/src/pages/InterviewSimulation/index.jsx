import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useInterview from './hooks/useInterview';

import InterviewHeader from './components/InterviewHeader';
import MediaPipeline from './components/MediaPipeline';
import QuestionPanel from './components/QuestionPanel';
import CodeEditor from './components/CodeEditor';
import TextAnswer from './components/TextAnswer';
import FeedbackOverlay from './components/FeedbackOverlay';

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
    answer,
    feedback,
    execResult,
    isEvaluating,
    isListening,
    isSpeechSupported,
    toggleListening,
    setCode,
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

      <div className={`flex-1 p-4 flex ${isCoding ? 'flex-row gap-4' : 'flex-col gap-6'} overflow-hidden`}>

        <MediaPipeline isCoding={isCoding} />

        <div className={`flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden shadow-2xl ${isCoding ? 'w-2/3 h-full' : 'w-full max-w-4xl mx-auto flex-1'}`}>

          <QuestionPanel question={currentQuestion} />

          <div className="flex-1 flex flex-col">
            {isCoding ? (
              <CodeEditor
                code={code}
                onCodeChange={setCode}
                onRunCode={runCode}
                onSubmit={submitAnswer}
                isEvaluating={isEvaluating}
                execResult={execResult}
              />
            ) : (
              <TextAnswer
                answer={answer}
                onAnswerChange={setAnswer}
                onSubmit={submitAnswer}
                isEvaluating={isEvaluating}
                isListening={isListening}
                isSpeechSupported={isSpeechSupported}
                onToggleListening={toggleListening}
              />
            )}
          </div>

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
