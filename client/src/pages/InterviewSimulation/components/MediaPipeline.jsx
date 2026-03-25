import React from 'react';
import Webcam from 'react-webcam';

const MediaPipeline = ({ isCoding, isListening, volume }) => {
  // calculate scale based on volume 0-100
  const scale = isListening ? 1 + (volume / 100) * 0.8 : 1;
  const opacity = isListening ? Math.min(1, 0.3 + (volume / 100)) : 0;

  return (
    <div className={`flex flex-col gap-4 w-full ${isCoding ? 'h-2/5 min-h-[300px]' : 'h-1/2 min-h-[400px]'}`}>

      {/* AI INTERVIEWER */}
      <div className="relative rounded-xl overflow-hidden bg-neutral-800 border-2 border-cyan-900/50 flex-1 flex flex-col shadow-lg">
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-xs z-10 font-medium text-cyan-300">
          AI Interviewer
        </div>
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-cyan-500/30 flex items-center justify-center bg-neutral-950">
            <span className="text-3xl sm:text-4xl text-cyan-500">🤖</span>
          </div>
        </div>
      </div>

      {/* CANDIDATE WEBCAM */}
      <div className="relative rounded-xl overflow-hidden bg-neutral-800 flex-1 flex flex-col shadow-lg">
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-xs z-10 font-medium text-emerald-400">
          You (Candidate)
        </div>
        
        {/* VOICE VISUALIZER OVERLAY */}
        {isListening && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
             <div 
               className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-emerald-500/50 absolute transition-transform duration-75 ease-out"
               style={{ transform: `scale(${scale})`, opacity: opacity }}
             />
             <div 
               className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-emerald-400/30 absolute transition-transform duration-150 ease-out"
               style={{ transform: `scale(${scale * 1.3})`, opacity: opacity * 0.6 }}
             />
             <div 
               className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-emerald-300/20 absolute transition-transform duration-300 ease-out"
               style={{ transform: `scale(${scale * 1.6})`, opacity: opacity * 0.3 }}
             />
          </div>
        )}

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
