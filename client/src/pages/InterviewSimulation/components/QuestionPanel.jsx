import React from 'react';
import { ExternalLink, BookOpen, FlaskConical, AlertTriangle } from 'lucide-react';

const QuestionPanel = ({ question }) => {
  // LeetCode scraping sometimes leaves excessive newlines (\n\n\n\n)
  // We normalize to a maximum of 2 newlines (a standard paragraph break)
  const cleanDescription = question.description 
    ? question.description.replace(/\n{3,}/g, '\n\n').trim()
    : '';

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] overflow-hidden">

      {/* Header — sticky */}
      <div className="sticky top-0 z-10 px-5 py-3 border-b border-white/[0.06] bg-[#1a1a2e]/90 backdrop-blur-md flex-shrink-0">
        <h2 className="text-base font-bold text-white leading-snug tracking-tight">
          {question.question_text}
        </h2>
      </div>

      {/* Scrollable Content — compact spacing */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-4 custom-scrollbar">

        {/* Description */}
        {cleanDescription && (
          <div 
             className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words
               [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>code]:bg-white/[0.08] [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded-md [&>code]:text-cyan-300 [&>code]:font-mono [&>code]:text-[13px] [&>strong]:text-white"
             dangerouslySetInnerHTML={{ __html: cleanDescription }}
          />
        )}

        {/* Problem Link */}
        {question.problem_link && (
          <a
            href={question.problem_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors break-words"
          >
            <ExternalLink size={11} className="flex-shrink-0" />
            <span className="break-all">Problem Link: {question.problem_link}</span>
          </a>
        )}

        {/* Test Cases */}
        {question.examples && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <FlaskConical size={12} className="text-emerald-400" />
              Test Cases
            </div>

            {question.examples.map((ex, i) => (
              <div
                key={i}
                className="bg-[#111827]/60 border border-white/[0.06] rounded-lg p-3 font-mono text-sm space-y-1 overflow-hidden"
              >
                <div className="text-slate-500 text-xs break-words">
                  Input: <span className="text-slate-200 font-medium break-all">{ex.input}</span>
                </div>
                <div className="text-slate-500 text-xs break-words">
                  Output: <span className="text-emerald-400 font-medium break-all">{ex.output}</span>
                </div>
                {ex.explanation && (
                  <div className="text-slate-500 text-[11px] mt-1.5 pt-1.5 border-t border-white/[0.04] break-words whitespace-pre-wrap">
                    {ex.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Constraints */}
        {question.constraints && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <AlertTriangle size={12} className="text-amber-400" />
              Constraints
            </div>
            <ul className="space-y-1 pl-1">
              {question.constraints.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-400 break-words">
                  <span className="w-1 h-1 rounded-full bg-amber-400/60 mt-1.5 flex-shrink-0" />
                  <span className="flex-1 min-w-0">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionPanel;