import React, { useState } from 'react';
import { Clock, GitCommit, ChevronLeft, ChevronRight, BookmarkCheck, RotateCcw, Eye, ArrowDown, User, Calendar } from 'lucide-react';

export default function TimeMachineScrubber({
  revisions = [],
  selectedRevision,
  onSelectRevision,
  onRollback,
  onMarkBaseline
}) {
  if (!revisions || revisions.length === 0) {
    return (
      <div className="p-12 text-center bg-archival-surface rounded-xl border border-archival-border">
        <Clock className="w-10 h-10 text-archival-muted mx-auto mb-3 opacity-50" />
        <h3 className="text-base font-medium text-archival-text">Empty Configuration Timeline</h3>
        <p className="text-xs text-archival-muted mt-1 max-w-sm mx-auto">
          No check-ins detected in Fossil SCM yet. Add configuration items to establish evolutionary milestones.
        </p>
      </div>
    );
  }

  const currentIndex = revisions.findIndex(r => r.revision === selectedRevision?.revision);
  const activeRev = selectedRevision || revisions[0];

  const handlePrevious = () => {
    if (currentIndex < revisions.length - 1) {
      onSelectRevision(revisions[currentIndex + 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex > 0) {
      onSelectRevision(revisions[currentIndex - 1]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Time Machine Interactive Scrubber Header */}
      <div className="p-4 rounded-xl bg-archival-surface border border-archival-border shadow-md flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-archival-accent/15 border border-archival-accent/30 flex items-center justify-center text-archival-accent">
            <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '12s' }} />
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-archival-accent font-semibold flex items-center gap-2">
              <span>Configuration Time Scrubber</span>
              <span className="w-1.5 h-1.5 rounded-full bg-archival-accent animate-ping" />
            </div>
            <div className="text-xs text-archival-muted mt-0.5">
              Stepping through {revisions.length} chronological Fossil check-ins
            </div>
          </div>
        </div>

        {/* Stepper Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevious}
            disabled={currentIndex >= revisions.length - 1}
            className="px-3 py-1.5 rounded-lg border border-archival-border bg-archival-elevated text-xs font-mono text-archival-text hover:border-archival-accent disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Older State</span>
          </button>

          <span className="text-xs font-mono text-archival-accent font-semibold px-2">
            #{revisions.length - currentIndex} of {revisions.length}
          </span>

          <button
            onClick={handleNext}
            disabled={currentIndex <= 0}
            className="px-3 py-1.5 rounded-lg border border-archival-border bg-archival-elevated text-xs font-mono text-archival-text hover:border-archival-accent disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 transition-all"
          >
            <span>Newer State</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visual Timeline Ribbon */}
      <div className="relative overflow-x-auto pb-4 pt-2">
        <div className="flex items-center min-w-max px-4 gap-6">
          {revisions.map((rev, idx) => {
            const isSelected = activeRev.revision === rev.revision;
            const isBaseline = Boolean(rev.baseline);

            return (
              <div
                key={rev.revision}
                onClick={() => onSelectRevision(rev)}
                className={`group relative flex flex-col items-center cursor-pointer transition-all duration-200 select-none ${
                  isSelected ? 'scale-105' : 'hover:scale-102 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Baseline Tag Badge */}
                {isBaseline && (
                  <div className="mb-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-archival-warning/20 text-archival-warning border border-archival-warning/40 shadow flex items-center gap-1">
                    <BookmarkCheck className="w-3 h-3" />
                    <span>{rev.baseline.code}</span>
                  </div>
                )}

                {/* Node Circle */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    isSelected
                      ? 'bg-archival-accent text-archival-bg border-archival-accent shadow-lg shadow-archival-accent/25 ring-4 ring-archival-accent/20'
                      : isBaseline
                      ? 'bg-archival-elevated border-archival-warning text-archival-warning'
                      : 'bg-archival-elevated border-archival-border text-archival-muted group-hover:border-archival-teal group-hover:text-archival-teal'
                  }`}
                >
                  <GitCommit className="w-5 h-5" />
                </div>

                {/* Revision Metadata */}
                <div className="mt-2 text-center flex flex-col items-center">
                  <span className={`text-xs font-mono font-medium ${isSelected ? 'text-archival-accent font-bold' : 'text-archival-text'}`}>
                    [{rev.revision.substring(0, 8)}]
                  </span>
                  <span className="text-[10px] text-archival-muted font-mono mt-0.5">
                    {rev.time || rev.date}
                  </span>
                </div>

                {/* Evolution Arrow Line to next revision */}
                {idx < revisions.length - 1 && (
                  <div className="absolute top-4 -right-5 w-4 h-0.5 bg-archival-border" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Snapshot Inspector Card */}
      {activeRev && (
        <div className="rounded-xl bg-archival-surface border border-archival-border p-6 shadow-xl relative overflow-hidden animate-in fade-in-50">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-archival-border">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded bg-archival-accent/20 border border-archival-accent/40 text-archival-accent font-mono text-xs font-semibold">
                  Revision {activeRev.revision}
                </span>
                {activeRev.isCurrent && (
                  <span className="px-2 py-0.5 rounded bg-archival-success/20 border border-archival-success/40 text-archival-success font-mono text-xs font-semibold">
                    Current Head
                  </span>
                )}
                {activeRev.baseline && (
                  <span className="px-2 py-0.5 rounded bg-archival-warning/20 border border-archival-warning/40 text-archival-warning font-mono text-xs font-semibold flex items-center gap-1">
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    {activeRev.baseline.code}: {activeRev.baseline.name}
                  </span>
                )}
              </div>

              <h2 className="text-base font-semibold text-archival-text mt-3">
                {activeRev.message}
              </h2>
            </div>

            {/* Revision Actions */}
            <div className="flex items-center gap-2">
              {onMarkBaseline && !activeRev.baseline && (
                <button
                  onClick={() => onMarkBaseline(activeRev)}
                  className="px-3 py-1.5 rounded-lg border border-archival-border bg-archival-elevated hover:border-archival-warning text-archival-text hover:text-archival-warning text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>Mark as Baseline</span>
                </button>
              )}

              {onRollback && (
                <button
                  onClick={() => onRollback(activeRev)}
                  className="px-3 py-1.5 rounded-lg border border-archival-danger/50 bg-archival-danger/10 hover:bg-archival-danger/20 text-archival-danger text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore This State</span>
                </button>
              )}
            </div>
          </div>

          {/* Author & Timestamp Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-archival-border/60 text-xs">
            <div>
              <div className="text-archival-muted flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-archival-teal" /> Author
              </div>
              <div className="font-mono text-archival-text mt-1 font-medium">{activeRev.author}</div>
            </div>
            <div>
              <div className="text-archival-muted flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-archival-accent" /> Date & Time
              </div>
              <div className="font-mono text-archival-text mt-1">{activeRev.date} {activeRev.time}</div>
            </div>
            <div>
              <div className="text-archival-muted">Branch</div>
              <div className="font-mono text-archival-text mt-1">{activeRev.branch || 'trunk'}</div>
            </div>
            <div>
              <div className="text-archival-muted">Files Affected</div>
              <div className="font-mono text-archival-text mt-1 font-semibold">
                {activeRev.changedFiles?.length || 0} items
              </div>
            </div>
          </div>

          {/* Changed Files List in this Revision */}
          {activeRev.changedFiles?.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] font-mono text-archival-muted uppercase tracking-wider mb-2">
                Modified Configuration Files:
              </div>
              <div className="flex flex-wrap gap-2">
                {activeRev.changedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2.5 py-1 rounded bg-archival-elevated border border-archival-border font-mono text-xs text-archival-text"
                  >
                    <span
                      className={`text-[10px] font-bold ${
                        f.status === 'ADDED'
                          ? 'text-archival-success'
                          : f.status === 'DELETED'
                          ? 'text-archival-danger'
                          : 'text-archival-accent'
                      }`}
                    >
                      {f.status}
                    </span>
                    <span>{f.file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
