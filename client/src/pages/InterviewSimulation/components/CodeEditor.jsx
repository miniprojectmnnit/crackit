import React from 'react';
import Editor from '@monaco-editor/react';
import { Play, Send } from 'lucide-react';

const CodeEditor = ({
  code,
  language,
  onLanguageChange,
  onCodeChange,
  onRunCode,
  onSubmit,
  isEvaluating,
  execResult
}) => {
  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] text-neutral-200 overflow-hidden">

      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 bg-neutral-900/80 backdrop-blur border-b border-neutral-800">
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="bg-neutral-800 hover:bg-neutral-700 transition text-sm rounded-md px-3 py-1.5 border border-neutral-700 outline-none"
        >
          <option value="JavaScript">JavaScript</option>
          <option value="Python">Python</option>
          <option value="Java">Java</option>
          <option value="C++">C++</option>
        </select>

        <span className="text-xs text-neutral-500 font-mono tracking-wide">
          ⚡ Judge0 Engine
        </span>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-[#1e1e1e]">
        <Editor
          height="100%"
          language={language === 'C++' ? 'cpp' : language.toLowerCase()}
          theme="vs-dark"
          value={code}
          onChange={(val) => onCodeChange(val)}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            smoothScrolling: true,
            padding: { top: 10 }
          }}
        />
      </div>

      {/* Results */}
      {execResult?.results?.length > 0 && (
        <div className="max-h-52 overflow-y-auto bg-neutral-900 border-t border-neutral-800 p-4 space-y-3">
          <h3 className="text-sm text-neutral-400 font-semibold">
            Test Results
          </h3>

          {execResult.results.map((r, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-neutral-500">
                  Test #{i + 1}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-md ${r.status === 'Passed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                    }`}
                >
                  {r.status}
                </span>
              </div>

              <div className="text-xs text-neutral-400">
                Input: <span className="text-neutral-200">{r.input}</span>
              </div>
              <div className="text-xs text-neutral-400">
                Expected:{' '}
                <span className="text-emerald-400">{r.expected}</span>
              </div>
              <div className="text-xs text-neutral-400">
                Actual:{' '}
                <span
                  className={
                    r.status === 'Passed'
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }
                >
                  {typeof r.actual === 'object'
                    ? JSON.stringify(r.actual)
                    : String(r.actual)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center px-4 py-3 bg-neutral-950 border-t border-neutral-800">

        <div className="flex gap-3">
          <button
            onClick={onRunCode}
            disabled={isEvaluating}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 transition disabled:opacity-50"
          >
            <Play size={16} className="text-emerald-400" />
            Run
          </button>

          <button
            onClick={onSubmit}
            disabled={isEvaluating}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition disabled:opacity-50"
          >
            <Send size={16} />
            Submit
          </button>
        </div>

        {execResult && (
          <div
            className={`text-xs px-3 py-1 rounded-md font-semibold ${execResult.failed === 0
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
              }`}
          >
            {execResult.passed} / {execResult.passed + execResult.failed}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;