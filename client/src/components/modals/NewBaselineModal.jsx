import React, { useState } from 'react';
import { X, BookmarkCheck } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function NewBaselineModal({ isOpen, onClose, projectId, currentRevision, onBaselineCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Approved');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const baseline = await api.createBaseline(projectId, {
        name: name.trim(),
        description: description.trim(),
        revisionId: currentRevision,
        status,
        user: 'Admin'
      });
      addToast(`Baseline ${baseline.baseline_code} created and tagged in Fossil!`, 'success', 'Baseline Established');
      onBaselineCreated(baseline);
      onClose();
    } catch (err) {
      addToast(err.message, 'error', 'Baseline Creation Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-md rounded-xl bg-archival-surface border border-archival-border shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-archival-muted hover:text-archival-text hover:bg-archival-elevated transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-archival-warning/15 border border-archival-warning/30 flex items-center justify-center text-archival-warning">
            <BookmarkCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-archival-text">Establish SCM Baseline</h2>
            <p className="text-xs text-archival-muted mt-0.5">Freezes a known stable configuration state and tags in Fossil</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-archival-elevated/70 border border-archival-border text-xs flex items-center justify-between">
            <span className="text-archival-muted font-mono">Target Check-in Revision:</span>
            <span className="font-mono font-bold text-archival-accent">[{currentRevision?.substring(0, 12)}]</span>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1">
              Baseline Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Release 2.0"
              className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1">
              Baseline Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-accent"
            >
              <option value="Active">Active (Default baseline for drift detection)</option>
              <option value="Approved">Approved (Formal release candidate)</option>
              <option value="Archived">Archived (Historical reference)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1">
              Description / Release Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rationale, sign-off details, or architectural notes"
              className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-accent"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-archival-border text-xs text-archival-muted hover:text-archival-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 rounded-lg bg-archival-warning hover:bg-archival-warning/80 text-archival-bg font-semibold text-xs transition-colors disabled:opacity-50"
            >
              {loading ? 'Tagging in Fossil...' : 'Establish Baseline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
