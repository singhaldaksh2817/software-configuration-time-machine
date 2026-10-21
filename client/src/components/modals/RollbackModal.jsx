import React, { useState, useEffect } from 'react';
import { X, RotateCcw, AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function RollbackModal({ isOpen, onClose, projectId, currentRevision, targetRevision, onRollbackComplete }) {
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [reason, setReason] = useState('');
  const [executing, setExecuting] = useState(false);
  const [completedResult, setCompletedResult] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen && projectId && targetRevision) {
      setCompletedResult(null);
      setLoadingPreview(true);
      api.previewRollback(projectId, targetRevision)
        .then(res => setPreview(res))
        .catch(err => addToast(err.message, 'error', 'Preview Failed'))
        .finally(() => setLoadingPreview(false));
    }
  }, [isOpen, projectId, targetRevision]);

  if (!isOpen) return null;

  const handleExecuteRollback = async () => {
    if (!reason.trim()) return;

    setExecuting(true);
    try {
      const res = await api.executeRollback(projectId, {
        targetRevision,
        reason: reason.trim(),
        user: 'Admin'
      });
      setCompletedResult(res);
      addToast(`Restored state to [${targetRevision.substring(0, 10)}]. New forward revision: [${res.newRevision}]`, 'success', 'Rollback Completed');
      onRollbackComplete(res);
    } catch (err) {
      addToast(err.message, 'error', 'Rollback Failed');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-xl rounded-xl bg-archival-surface border border-archival-border shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-archival-muted hover:text-archival-text hover:bg-archival-elevated transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {completedResult ? (
          /* Rollback Success View */
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-archival-success/15 border border-archival-success/40 text-archival-success flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-archival-text">Rollback Completed Successfully</h2>
            <p className="text-xs text-archival-muted max-w-md mx-auto">
              The configuration was safely restored without destroying history. A new forward check-in was registered in Fossil SCM, and an auditable event was logged.
            </p>

            <div className="p-4 rounded-lg bg-archival-elevated border border-archival-border text-left font-mono text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-archival-muted">Target Revision Restored:</span>
                <span className="text-archival-accent font-semibold">{completedResult.restoredRevision?.substring(0, 12)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-archival-muted">Previous Revision:</span>
                <span className="text-archival-text">{completedResult.previousRevision?.substring(0, 12)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-archival-muted">New SCM Revision:</span>
                <span className="text-archival-success font-semibold">[{completedResult.newRevision?.substring(0, 12)}]</span>
              </div>
              <div className="flex justify-between">
                <span className="text-archival-muted">Executor:</span>
                <span className="text-archival-text">{completedResult.user}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-archival-muted">Timestamp:</span>
                <span className="text-archival-text">{new Date(completedResult.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-archival-accent text-archival-bg font-semibold text-xs transition-colors hover:bg-archival-accent-hover"
            >
              Close & View Updated State
            </button>
          </div>
        ) : (
          /* Confirmation & Preview View */
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-archival-danger/15 border border-archival-danger/40 flex items-center justify-center text-archival-danger">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-archival-text">Configuration Rollback Safety Review</h2>
                <p className="text-xs text-archival-muted mt-0.5">
                  Verify changes before reverting to an earlier configuration state
                </p>
              </div>
            </div>

            {loadingPreview ? (
              <div className="p-8 text-center text-xs font-mono text-archival-muted">
                Calculating rollback diff in Fossil...
              </div>
            ) : (
              <div className="space-y-4">
                {/* State Comparison Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-archival-elevated border border-archival-border text-xs">
                    <div className="text-[10px] font-mono uppercase text-archival-muted">Current State</div>
                    <div className="font-mono font-bold text-archival-text mt-1">
                      [{currentRevision?.substring(0, 12)}]
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-archival-elevated border border-archival-accent/40 text-xs">
                    <div className="text-[10px] font-mono uppercase text-archival-accent font-semibold">Target Restored State</div>
                    <div className="font-mono font-bold text-archival-accent mt-1">
                      [{targetRevision?.substring(0, 12)}]
                    </div>
                  </div>
                </div>

                {/* Notice Alert */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-archival-elevated border border-archival-warning/40 text-xs text-archival-text">
                  <ShieldAlert className="w-4 h-4 text-archival-warning shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-archival-warning">SCM Safety Guarantee: </span>
                    Fossil SCM history will remain intact. This operation performs a clean forward rollback commit that records this restoration in both Fossil and the audit database.
                  </div>
                </div>

                {/* Affected Files */}
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-archival-muted mb-2">
                    Configuration Files That Will Be Reverted ({preview?.affectedFiles?.length || 0}):
                  </div>
                  {preview?.affectedFiles?.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {preview.affectedFiles.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded bg-archival-elevated/70 border border-archival-border text-xs font-mono"
                        >
                          <span className="text-archival-text">{f.file}</span>
                          <span className="text-[10px] text-archival-muted">
                            +{f.addedLines} / -{f.deletedLines} lines
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-archival-elevated text-xs text-archival-muted text-center font-mono">
                      No difference detected or files are identical.
                    </div>
                  )}
                </div>

                {/* Mandatory Rollback Reason */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1">
                    Auditable Reason for Rollback *
                  </label>
                  <input
                    type="text"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Incident INC-904: Configuration drift triggered downstream timeouts"
                    className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-danger font-sans"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-archival-border text-xs text-archival-muted hover:text-archival-text transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={executing || !reason.trim()}
                    onClick={handleExecuteRollback}
                    className="px-5 py-2 rounded-lg bg-archival-danger hover:bg-archival-danger/80 text-archival-text font-semibold text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {executing ? 'Executing Rollback...' : 'Confirm Rollback'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
