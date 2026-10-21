import React, { useState } from 'react';
import { Columns, AlignJustify, FileCode, Check, Copy } from 'lucide-react';

export default function DiffViewer({ files = [], rawUnified = '', title = 'Diff Inspection' }) {
  const [viewMode, setViewMode] = useState('unified'); // 'unified' | 'side-by-side' | 'raw'
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!files || files.length === 0) {
    if (rawUnified) {
      return (
        <div className="rounded-lg bg-archival-surface border border-archival-border overflow-hidden">
          <div className="bg-archival-elevated px-4 py-2 text-xs font-mono border-b border-archival-border text-archival-muted">
            Raw Unified Diff Output
          </div>
          <pre className="p-4 text-xs font-mono text-archival-text overflow-x-auto whitespace-pre">
            {rawUnified}
          </pre>
        </div>
      );
    }

    return (
      <div className="p-8 text-center bg-archival-surface rounded-lg border border-archival-border">
        <FileCode className="w-8 h-8 text-archival-muted mx-auto mb-2 opacity-50" />
        <div className="text-sm font-medium text-archival-text">Identical Configurations</div>
        <div className="text-xs text-archival-muted mt-1 font-mono">
          No line-level changes detected between selected states.
        </div>
      </div>
    );
  }

  const currentFile = files[selectedFileIndex] || files[0];

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(rawUnified);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl bg-archival-surface border border-archival-border shadow-lg overflow-hidden flex flex-col">
      {/* Top Header & View Controls */}
      <div className="bg-archival-elevated/80 px-4 py-3 border-b border-archival-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-semibold uppercase text-archival-accent tracking-wider">
            {title}
          </span>
          <span className="text-xs text-archival-muted font-mono">
            {files.length} {files.length === 1 ? 'file' : 'files'} changed
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex rounded-md bg-archival-surface p-0.5 border border-archival-border text-xs font-mono">
            <button
              onClick={() => setViewMode('unified')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                viewMode === 'unified'
                  ? 'bg-archival-accent text-archival-bg font-semibold'
                  : 'text-archival-muted hover:text-archival-text'
              }`}
            >
              <AlignJustify className="w-3.5 h-3.5" />
              <span>Unified</span>
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-archival-accent text-archival-bg font-semibold'
                  : 'text-archival-muted hover:text-archival-text'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                viewMode === 'raw'
                  ? 'bg-archival-accent text-archival-bg font-semibold'
                  : 'text-archival-muted hover:text-archival-text'
              }`}
            >
              <span>Raw</span>
            </button>
          </div>

          {rawUnified && (
            <button
              onClick={handleCopyRaw}
              className="p-1.5 rounded-md hover:bg-archival-surface border border-archival-border text-archival-muted hover:text-archival-text transition-colors"
              title="Copy Raw Diff"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-archival-success" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* File Tab Selector if multiple files */}
      {files.length > 1 && (
        <div className="flex overflow-x-auto border-b border-archival-border bg-archival-surface/50 px-2 py-1 gap-1">
          {files.map((file, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedFileIndex(idx)}
              className={`px-3 py-1.5 rounded text-xs font-mono flex items-center gap-2 whitespace-nowrap transition-colors ${
                selectedFileIndex === idx
                  ? 'bg-archival-elevated text-archival-text border border-archival-border font-medium'
                  : 'text-archival-muted hover:text-archival-text'
              }`}
            >
              <span>{file.filename}</span>
              <span className="text-[10px] text-archival-success font-mono">+{file.addedCount}</span>
              <span className="text-[10px] text-archival-danger font-mono">-{file.deletedCount}</span>
            </button>
          ))}
        </div>
      )}

      {/* Diff Content Body */}
      {viewMode === 'raw' ? (
        <pre className="p-4 text-xs font-mono text-archival-text overflow-x-auto bg-archival-bg/50 max-h-[500px]">
          {rawUnified}
        </pre>
      ) : viewMode === 'side-by-side' ? (
        <div className="overflow-x-auto font-mono text-xs max-h-[600px] divide-y divide-archival-border/40">
          {currentFile?.hunks?.map((hunk, hIdx) => (
            <div key={hIdx} className="bg-archival-surface">
              <div className="bg-archival-elevated/40 text-archival-teal px-4 py-1 text-[11px] font-mono border-y border-archival-border/60">
                {hunk.header}
              </div>
              <div className="grid grid-cols-2 divide-x divide-archival-border">
                {/* Left Side (Old) & Right Side (New) */}
                <div className="divide-y divide-archival-border/20">
                  {hunk.lines.filter(l => l.type !== 'add').map((line, lIdx) => (
                    <div
                      key={lIdx}
                      className={`flex items-start px-2 py-0.5 ${
                        line.type === 'del'
                          ? 'bg-archival-danger/15 text-archival-danger'
                          : 'text-archival-text/80'
                      }`}
                    >
                      <span className="w-8 select-none text-right pr-2 text-archival-muted text-[10px] opacity-60">
                        {line.oldLineNo || ''}
                      </span>
                      <span className="w-4 select-none text-center text-[11px] font-bold">
                        {line.type === 'del' ? '-' : ' '}
                      </span>
                      <span className="flex-1 whitespace-pre-wrap break-all font-mono">
                        {line.content}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-archival-border/20">
                  {hunk.lines.filter(l => l.type !== 'del').map((line, lIdx) => (
                    <div
                      key={lIdx}
                      className={`flex items-start px-2 py-0.5 ${
                        line.type === 'add'
                          ? 'bg-archival-success/15 text-archival-success'
                          : 'text-archival-text/80'
                      }`}
                    >
                      <span className="w-8 select-none text-right pr-2 text-archival-muted text-[10px] opacity-60">
                        {line.newLineNo || ''}
                      </span>
                      <span className="w-4 select-none text-center text-[11px] font-bold">
                        {line.type === 'add' ? '+' : ' '}
                      </span>
                      <span className="flex-1 whitespace-pre-wrap break-all font-mono">
                        {line.content}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Unified View */
        <div className="overflow-x-auto font-mono text-xs max-h-[600px] divide-y divide-archival-border/40">
          {currentFile?.hunks?.map((hunk, hIdx) => (
            <div key={hIdx}>
              <div className="bg-archival-elevated/40 text-archival-teal px-4 py-1 text-[11px] font-mono border-y border-archival-border/60">
                {hunk.header}
              </div>
              <div className="divide-y divide-archival-border/20">
                {hunk.lines.map((line, lIdx) => (
                  <div
                    key={lIdx}
                    className={`flex items-start px-3 py-0.5 transition-colors ${
                      line.type === 'add'
                        ? 'bg-archival-success/15 text-archival-success'
                        : line.type === 'del'
                        ? 'bg-archival-danger/15 text-archival-danger'
                        : 'text-archival-text/85'
                    }`}
                  >
                    <span className="w-8 select-none text-right pr-2 text-archival-muted text-[10px] opacity-60">
                      {line.oldLineNo || ''}
                    </span>
                    <span className="w-8 select-none text-right pr-2 text-archival-muted text-[10px] opacity-60">
                      {line.newLineNo || ''}
                    </span>
                    <span className="w-4 select-none text-center text-[11px] font-bold">
                      {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap break-all font-mono">
                      {line.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
