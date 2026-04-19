import React from 'react';

export function SlideShell({ qnum, total, question, sub, children }: {
  qnum: number;
  total: number;
  question: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-xl mx-auto">
      <div className="text-tiny uppercase tracking-wider text-ink-3 mb-1">
        Question {qnum} <span className="text-ink-4">/ {total}</span>
      </div>
      <h2 className="text-h1 font-bold text-ink mb-1">{question}</h2>
      {sub && <p className="text-body text-ink-2 mb-5">{sub}</p>}
      <div>{children}</div>
    </div>
  );
}
