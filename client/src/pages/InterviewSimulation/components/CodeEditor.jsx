import React from 'react';
import Editor from '@monaco-editor/react';
import { Play, Send, Loader2, CheckCircle, XCircle } from 'lucide-react';

const LANGUAGES = [
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'Python', label: 'Python' },
  { value: 'Java', label: 'Java' },
  { value: 'C++', label: 'C++' },
];

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

      {/* Header — Language selector + Action Buttons (always visible, static) */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#1a1a2e]/90 backdrop-blur-md border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Custom dark dropdown */}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="appearance-none bg-[#1e2035] text-slate-200 text-sm rounded-lg pl-3 pr-8 py-1.5 border border-white/[0.1] outline-none cursor-pointer
                hover:border-cyan-500/30 focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20
                transition-all duration-200"
              style={{
                colorScheme: 'dark',
              }}
            >
              {LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value} className="bg-[#1e2035] text-slate-200">
                  {lang.label}
                </option>
              ))}
            </select>
            {/* Custom dropdown arrow */}
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>

          <span className="text-[11px] text-slate-500 font-mono tracking-wide hidden sm:inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
            Judge0 Engine
          </span>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex items-center gap-2">
          {/* Result badge */}
          {execResult && (
            <div
              className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md font-semibold border ${execResult.failed === 0
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
            >
              {execResult.failed === 0 ? <CheckCircle size={11} /> : <XCircle size={11} />}
              {execResult.passed}/{execResult.passed + execResult.failed}
            </div>
          )}

          <button
            onClick={onRunCode}
            disabled={isEvaluating}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-white/[0.05] border border-white/[0.08] text-slate-300
              hover:bg-emerald-500/10 hover:border-emerald-500/25 hover:text-emerald-300
              transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isEvaluating ? (
              <Loader2 size={13} className="animate-spin text-emerald-400" />
            ) : (
              <Play size={13} className="text-emerald-400" />
            )}
            Run
          </button>

          <button
            onClick={onSubmit}
            disabled={isEvaluating}
            className="group relative flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold overflow-hidden
              bg-gradient-to-r from-emerald-500 to-cyan-500 text-black
              hover:from-emerald-400 hover:to-cyan-400 hover:shadow-[0_0_16px_rgba(16,185,129,0.25)]
              transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-[400%] transition-transform duration-700 ease-in-out" />
            <Send size={12} className="relative z-10" />
            <span className="relative z-10">Submit</span>
          </button>
        </div>
      </div>

      {/* Editor — fills remaining space, scrolls internally via Monaco */}
      <div className="flex-1 min-h-0">
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
            padding: { top: 10 },
            scrollBeyondLastLine: false,
          }}
        />
      </div>

      {/* Test Results (scrollable within its own area) */}
      {execResult?.results?.length > 0 && (
        <div className="max-h-44 overflow-y-auto bg-[#111]/95 backdrop-blur-md border-t border-white/[0.06] px-4 py-3 space-y-2 flex-shrink-0 custom-scrollbar">
          <h3 className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-2 mb-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${execResult.failed === 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
            Test Results
          </h3>

          {execResult.results.map((r, i) => (
            <div
              key={i}
              className={`p-2.5 rounded-lg border text-xs font-mono ${
                r.status === 'Passed'
                  ? 'bg-emerald-950/20 border-emerald-500/15'
                  : 'bg-red-950/20 border-red-500/15'
              }`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-slate-500">Test #{i + 1}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${r.status === 'Passed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {r.status}
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="text-slate-500">Input: <span className="text-slate-300">{r.input}</span></div>
                <div className="text-slate-500">Expected: <span className="text-emerald-400">{r.expected}</span></div>
                <div className="text-slate-500">Actual: <span className={r.status === 'Passed' ? 'text-emerald-400' : 'text-red-400'}>
                  {typeof r.actual === 'object' ? JSON.stringify(r.actual) : String(r.actual)}
                </span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CodeEditor;