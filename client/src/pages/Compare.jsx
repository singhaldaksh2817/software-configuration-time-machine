import React, { useState, useEffect } from 'react';
import { GitCompare, ArrowRight, FileCode2 } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import DiffViewer from '../components/diff/DiffViewer';

export default function Compare() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [timeline, setTimeline] = useState([]);
  const [baselines, setBaselines] = useState([]);

  const [compareType, setCompareType] = useState('revisions');
  const [refA, setRefA] = useState('');
  const [refB, setRefB] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    api.getProjects().then(projs => {
      setProjects(projs);
      if (projs.length > 0) {
        setSelectedProjectId(projs[0].id);
      }
    }).catch(err => addToast(err.message, 'error', 'Failed to load projects'));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    Promise.all([
      api.getTimeline(selectedProjectId, 50).catch(() => []),
      api.getBaselines(selectedProjectId).catch(() => [])
    ]).then(([tl, bl]) => {
      setTimeline(tl);
      setBaselines(bl);
      if (tl.length >= 2) {
        setRefA(tl[1].revision);
        setRefB(tl[0].revision);
      } else if (tl.length === 1) {
        setRefA(tl[0].revision);
      }
    });
  }, [selectedProjectId]);

  const handleCompare = async () => {
    if (!selectedProjectId || !refA) return;
    setLoading(true);
    try {
      const res = await api.compare(selectedProjectId, {
        refA,
        refB: compareType === 'baseline_vs_current' ? null : refB,
        type: compareType
      });
      setResult(res);
    } catch (err) {
      addToast(err.message, 'error', 'Comparison Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-archival-text">
          Configuration Comparator Hub
        </h1>
        <p className="text-xs text-archival-muted mt-0.5">
          Deep line-by-line SCM diff generator across Fossil revisions and configuration baselines
        </p>
      </div>

      <div className="p-5 rounded-xl bg-archival-surface border border-archival-border shadow-md space-y-4">
        {/* Project Selector & Type Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-archival-muted">Repository:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text font-semibold focus:outline-none focus:border-archival-accent"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex rounded-lg bg-archival-elevated p-0.5 border border-archival-border text-xs font-mono">
            <button
              onClick={() => setCompareType('revisions')}
              className={`px-3 py-1 rounded transition-colors ${
                compareType === 'revisions' ? 'bg-archival-accent text-archival-bg font-semibold' : 'text-archival-muted'
              }`}
            >
              Revision vs Revision
            </button>
            <button
              onClick={() => setCompareType('baseline_vs_current')}
              className={`px-3 py-1 rounded transition-colors ${
                compareType === 'baseline_vs_current' ? 'bg-archival-accent text-archival-bg font-semibold' : 'text-archival-muted'
              }`}
            >
              Baseline vs Current
            </button>
            <button
              onClick={() => setCompareType('baselines')}
              className={`px-3 py-1 rounded transition-colors ${
                compareType === 'baselines' ? 'bg-archival-accent text-archival-bg font-semibold' : 'text-archival-muted'
              }`}
            >
              Baseline A vs Baseline B
            </button>
          </div>
        </div>

        {/* References inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-mono text-archival-muted uppercase mb-1">
              Base Reference (A)
            </label>
            {compareType === 'revisions' ? (
              <select
                value={refA}
                onChange={(e) => setRefA(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text font-mono"
              >
                <option value="">Select check-in...</option>
                {timeline.map(t => (
                  <option key={t.revision} value={t.revision}>
                    [{t.revision.substring(0, 8)}] {t.message.substring(0, 40)}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={refA}
                onChange={(e) => setRefA(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text font-mono"
              >
                <option value="">Select baseline...</option>
                {baselines.map(b => (
                  <option key={b.id} value={b.baseline_code}>
                    {b.baseline_code}: {b.name} [{b.revision_id?.substring(0, 8)}]
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-mono text-archival-muted uppercase mb-1">
              Target Reference (B)
            </label>
            {compareType === 'baseline_vs_current' ? (
              <div className="px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-muted font-mono">
                Current Working Checkout (HEAD)
              </div>
            ) : compareType === 'revisions' ? (
              <select
                value={refB}
                onChange={(e) => setRefB(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text font-mono"
              >
                <option value="">Select check-in...</option>
                {timeline.map(t => (
                  <option key={t.revision} value={t.revision}>
                    [{t.revision.substring(0, 8)}] {t.message.substring(0, 40)}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={refB}
                onChange={(e) => setRefB(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text font-mono"
              >
                <option value="">Select baseline...</option>
                {baselines.map(b => (
                  <option key={b.id} value={b.baseline_code}>
                    {b.baseline_code}: {b.name} [{b.revision_id?.substring(0, 8)}]
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleCompare}
            disabled={loading || !refA}
            className="px-4 py-2 rounded-lg bg-archival-accent hover:bg-archival-accent-hover text-archival-bg font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <GitCompare className="w-4 h-4" />
            <span>{loading ? 'Comparing in Fossil...' : 'Execute Compare'}</span>
          </button>
        </div>
      </div>

      {result && (
        <DiffViewer
          files={result.files}
          rawUnified={result.unifiedDiff}
          title={`Diff: ${result.refA} ↔ ${result.refB}`}
        />
      )}
    </div>
  );
}
