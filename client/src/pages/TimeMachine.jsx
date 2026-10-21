import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Clock, FolderGit2, GitCommit, BookmarkCheck, RotateCcw, GitCompare, ArrowRight, Eye, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import TimeMachineScrubber from '../components/timeline/TimeMachineScrubber';
import DiffViewer from '../components/diff/DiffViewer';
import RollbackModal from '../components/modals/RollbackModal';
import NewBaselineModal from '../components/modals/NewBaselineModal';

export default function TimeMachine() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [timeline, setTimeline] = useState([]);
  const [selectedRev, setSelectedRev] = useState(null);
  const [revisionDetail, setRevisionDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);
  const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
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
    setLoading(true);
    api.getTimeline(selectedProjectId, 50)
      .then(tline => {
        setTimeline(tline);
        if (tline.length > 0) {
          setSelectedRev(tline[0]);
        }
      })
      .catch(err => addToast(err.message, 'error', 'Timeline Load Error'))
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  // Load detailed revision info & diff when selected
  useEffect(() => {
    if (!selectedProjectId || !selectedRev) return;
    api.getRevisionInfo(selectedProjectId, selectedRev.revision)
      .then(info => setRevisionDetail(info))
      .catch(err => console.error(err));
  }, [selectedProjectId, selectedRev]);

  const activeProject = projects.find(p => String(p.id) === String(selectedProjectId));

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-archival-accent">
            <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '16s' }} />
            <span>CHRONOLOGICAL EVOLUTION EXPLORER</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-archival-text mt-0.5">
            Software Configuration Time Machine
          </h1>
          <p className="text-xs text-archival-muted">
            Step through historical check-ins, inspect frozen states, and trace baseline evolution in Fossil SCM
          </p>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-archival-muted">Target Project:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-archival-surface border border-archival-border text-xs text-archival-text font-semibold focus:outline-none focus:border-archival-accent"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} [{p.current_revision?.substring(0, 8)}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-archival-muted">
          Loading Fossil SCM timeline...
        </div>
      ) : timeline.length > 0 ? (
        <div className="space-y-6">
          {/* Visual Timeline Scrubber Ribbon */}
          <TimeMachineScrubber
            revisions={timeline}
            selectedRevision={selectedRev}
            onSelectRevision={(rev) => setSelectedRev(rev)}
            onRollback={() => setIsRollbackModalOpen(true)}
            onMarkBaseline={() => setIsBaselineModalOpen(true)}
          />

          {/* Line-level Diff for this Revision */}
          {revisionDetail && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-archival-accent font-semibold">
                  Changes Introduced in Revision [{revisionDetail.revision?.substring(0, 10)}]
                </span>
                {revisionDetail.parent && (
                  <span className="text-xs font-mono text-archival-muted">
                    Parent: [{revisionDetail.parent?.substring(0, 8)}]
                  </span>
                )}
              </div>

              <DiffViewer
                files={revisionDetail.parsedDiff}
                rawUnified={revisionDetail.diff}
                title={`Revision Check-in Diff`}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center bg-archival-surface rounded-xl border border-archival-border">
          <Clock className="w-10 h-10 text-archival-muted mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-semibold text-archival-text">No History Recorded</h3>
          <p className="text-xs text-archival-muted mt-1 max-w-sm mx-auto">
            This repository has no Fossil check-ins yet. Add configuration items to establish a timeline.
          </p>
        </div>
      )}

      {/* Modals */}
      {activeProject && (
        <>
          <RollbackModal
            isOpen={isRollbackModalOpen}
            onClose={() => setIsRollbackModalOpen(false)}
            projectId={activeProject.id}
            currentRevision={activeProject.current_revision}
            targetRevision={selectedRev?.revision}
            onRollbackComplete={() => {
              // Refresh
              api.getTimeline(activeProject.id, 50).then(t => setTimeline(t));
            }}
          />

          <NewBaselineModal
            isOpen={isBaselineModalOpen}
            onClose={() => setIsBaselineModalOpen(false)}
            projectId={activeProject.id}
            currentRevision={selectedRev?.revision}
            onBaselineCreated={() => {
              api.getTimeline(activeProject.id, 50).then(t => setTimeline(t));
            }}
          />
        </>
      )}
    </div>
  );
}
