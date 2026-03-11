import React from 'react';
import Editor from '@monaco-editor/react';
import { Play, Send } from 'lucide-react';

const CodeEditor = ({ code, onCodeChange, onRunCode, onSubmit, isEvaluating, execResult }) => {
  return (
    <>
      <div className="flex-1 w-full bg-[#1e1e1e]">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={code}
          onChange={(val) => onCodeChange(val)}
          options={{ minimap: { enabled: false }, fontSize: 14 }}
        />
      </div>
      <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-between items-center">
        <div className="flex gap-2">
          <button onClick={onRunCode} disabled={isEvaluating} className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
            <Play size={16} className="text-emerald-400" /> Run Code
          </button>
          <button onClick={onSubmit} disabled={isEvaluating} className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
            <Send size={16} /> Submit
          </button>
        </div>
        {execResult && (
          <div className={`text-sm font-medium px-3 py-1 rounded ${execResult.failed === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {execResult.passed} / {execResult.total} Test Cases Passed
          </div>
        )}
      </div>
    </>
  );
};

export default CodeEditor;
