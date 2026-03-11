import React from 'react';
import Webcam from 'react-webcam';

const MediaPipeline = ({ isCoding }) => {
  return (
    <div className={`flex flex-col gap-4 ${isCoding ? 'w-1/3 min-w-[300px]' : 'w-full max-w-4xl mx-auto h-full'}`}>

      {/* AI INTERVIEWER */}
      <div className="relative rounded-xl overflow-hidden bg-neutral-800 border-2 border-cyan-900/50 flex-1 flex flex-col shadow-2xl">
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-xs z-10 font-medium text-cyan-300">
          AI Interviewer
        </div>
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
          <div className="w-32 h-32 rounded-full border-4 border-cyan-500/30 flex items-center justify-center bg-neutral-950">
            <span className="text-4xl text-cyan-500">🤖</span>
          </div>
        </div>
      </div>

      {/* CANDIDATE WEBCAM */}
      <div className="relative rounded-xl overflow-hidden bg-neutral-800 flex-1 flex flex-col shadow-2xl">
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-xs z-10 font-medium text-emerald-400">
          You (Candidate)
        </div>
        <Webcam
          audio={true}
          mirrored={true}
          className="w-full h-full object-cover"
        />
      </div>

    </div>
  );
};

export default MediaPipeline;
