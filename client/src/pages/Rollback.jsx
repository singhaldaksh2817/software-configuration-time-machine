import React, { useState, useEffect } from 'react';
import { RotateCcw, ShieldAlert, ArrowRight, BookmarkCheck, GitCommit, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import RollbackModal from '../components/modals/RollbackModal';

export default function Rollback() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [timeline, setTimeline] = useState([]);
  const [baselines, setBaselines] = useState([]);
  const [targetRev, setTargetRev] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    api.getProjects().then(projs => {
      setProjects(projs);
      if (projs.length > 0) {
        setSelectedProjectId(projs[0].id);
      }
    }).catch(err => addToast(err.message, 'error', 'Failed to load projects'));
  }, []);

  const activeProject = projects.find(p => String(p.id) === String(selectedProjectId));

  useEffect(() => {
    if (!selectedProjectId) return;
    Promise.all([
      api.getTimeline(selectedProjectId, 50).catch(() => []),
      api.getBaselines(selectedProjectId).catch(() => [])
    ]).then(([tl, bl]) => {
      setTimeline(tl);
      setBaselines(bl);
      if (bl.length > 0) {
        setTargetRev(bl[0].revision_id);
      } else if (tl.length > 1) {
        setTargetRev(tl[1].revision);
      }
    });
  }, [selectedProjectId]);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-archival-text">
          Configuration Rollback & State Restoration
        </h1>
        <p className="text-xs text-archival-muted mt-0.5">
          Non-destructive forward check-ins that safely restore proven configuration baselines with full auditability
        </p>
      </div>

      <div className="p-6 rounded-xl bg-archival-surface border border-archival-border shadow-md space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-archival-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-archival-danger/15 border border-archival-danger/30 flex items-center justify-center text-archival-danger">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-archival-text">Select Target Repository</h2>
              <p className="text-xs text-archival-muted">Fossil SCM checkout workspace to revert</p>
            </div>
          </div>

          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text font-semibold focus:outline-none focus:border-archival-accent"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} [{p.current_revision?.substring(0, 8)}]
              </option>
            ))}
          </select>
        </div>

        {activeProject && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Baselines options */}
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-archival-warning font-semibold flex items-center gap-1.5">
                <BookmarkCheck className="w-4 h-4" /> Option 1: Revert to Approved Baseline
              </span>
              <div className="space-y-2">
                {baselines.map(b => (
                  <div
                    key={b.id}
                    onClick={() => setTargetRev(b.revision_id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      targetRev === b.revision_id
                        ? 'bg-archival-accent/15 border-archival-accent text-archival-text'
                        : 'bg-archival-elevated border-archival-border text-archival-muted hover:border-archival-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-archival-warning">{b.baseline_code}: {b.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-archival-surface border border-archival-border">
                        {b.status}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono mt-1 text-archival-muted">
                      Target Revision: <span className="text-archival-accent font-semibold">[{b.revision_id?.substring(0, 10)}]</span>
                    </div>
                  </div>
                ))}
                {baselines.length === 0 && (
                  <div className="p-4 text-xs text-archival-muted font-mono bg-archival-elevated rounded">
                    No baselines defined in this repository yet.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Historical Revisions options */}
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-archival-accent font-semibold flex items-center gap-1.5">
                <GitCommit className="w-4 h-4" /> Option 2: Revert to Check-in Node
              </span>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {timeline.map(t => (
                  <div
                    key={t.revision}
                    onClick={() => setTargetRev(t.revision)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      targetRev === t.revision
                        ? 'bg-archival-accent/15 border-archival-accent text-archival-text'
                        : 'bg-archival-elevated border-archival-border text-archival-muted hover:border-archival-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-archival-accent font-semibold">[{t.revision.substring(0, 8)}]</span>
                      <span className="text-[10px] text-archival-muted">{t.date} {t.time}</span>
                    </div>
                    <div className="text-xs text-archival-text truncate mt-0.5">{t.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {targetRev && activeProject && (
          <div className="pt-4 border-t border-archival-border flex items-center justify-between flex-wrap gap-4">
            <div className="text-xs font-mono">
              <span className="text-archival-muted">Selected Target: </span>
              <span className="text-archival-accent font-bold">[{targetRev.substring(0, 10)}]</span>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-lg bg-archival-danger hover:bg-archival-danger/80 text-archival-text font-semibold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-archival-danger/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Preview & Execute Safe Rollback</span>
            </button>
          </div>
        )}
      </div>

      {/* Rollback Safety Modal */}
      {activeProject && (
        <RollbackModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          projectId={activeProject.id}
          currentRevision={activeProject.current_revision}
          targetRevision={targetRev}
          onRollbackComplete={() => {
            api.getProjects().then(p => setProjects(p));
            api.getTimeline(activeProject.id, 50).then(t => setTimeline(t));
          }}
        />
      )}
    </div>
  );
}
