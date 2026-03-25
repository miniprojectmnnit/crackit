import React from 'react';
import Editor from '@monaco-editor/react';
import { Play, Send } from 'lucide-react';

const CodeEditor = ({ code, language, onLanguageChange, onCodeChange, onRunCode, onSubmit, isEvaluating, execResult }) => {
  return (
    <>
      <div className="flex justify-between items-center p-2 bg-neutral-900 border-b border-neutral-800">
        <select 
          value={language} 
          onChange={(e) => onLanguageChange(e.target.value)}
          className="bg-neutral-800 text-neutral-300 text-sm rounded outline-none px-3 py-1.5 border border-neutral-700 cursor-pointer"
        >
          <option value="JavaScript">JavaScript</option>
          <option value="Python">Python</option>
          <option value="Java">Java</option>
          <option value="C++">C++</option>
        </select>
        <div className="text-xs text-neutral-500 font-mono">Powered by Judge0</div>
      </div>
      <div className="flex-1 w-full bg-[#1e1e1e]">
        <Editor
          height="100%"
          language={language === 'C++' ? 'cpp' : language.toLowerCase()}
          theme="vs-dark"
          value={code}
          onChange={(val) => onCodeChange(val)}
          options={{ minimap: { enabled: false }, fontSize: 14 }}
        />
      </div>
      {execResult && execResult.results && execResult.results.length > 0 && (
        <div className="h-48 border-t border-neutral-800 bg-neutral-900 overflow-y-auto p-4 flex flex-col gap-3">
          <h3 className="text-sm font-medium text-neutral-400 mb-1">Test Results:</h3>
          {execResult.results.map((r, i) => (
            <div key={i} className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-sm font-mono">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs ${r.status === 'Passed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  Test {i + 1}: {r.status}
                </span>
              </div>
              <div className="text-neutral-500 mb-1">Input: <span className="text-neutral-300 break-words">{r.input}</span></div>
              <div className="text-neutral-500 mb-1">Expected: <span className="text-emerald-400 break-words">{r.expected}</span></div>
              <div className="text-neutral-500">Actual: <span className={r.status === 'Passed' ? 'text-emerald-400 break-words' : 'text-red-400 break-words'}>{typeof r.actual === 'object' ? JSON.stringify(r.actual) : String(r.actual)}</span></div>
            </div>
          ))}
        </div>
      )}
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
            {execResult.passed} / {execResult.passed + execResult.failed} Test Cases Passed
          </div>
        )}
      </div>
    </>
  );
};

export default CodeEditor;
