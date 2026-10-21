import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function NewProjectModal({ isOpen, onClose, onProjectCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const project = await api.createProject({
        name: name.trim(),
        description: description.trim(),
        owner: 'Admin'
      });
      addToast(`Project "${project.name}" initialized with Fossil repository!`, 'success', 'SCM Project Created');
      onProjectCreated(project);
      onClose();
    } catch (err) {
      addToast(err.message, 'error', 'Creation Failed');
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
          <div className="w-10 h-10 rounded-lg bg-archival-accent/15 border border-archival-accent/30 flex items-center justify-center text-archival-accent">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-archival-text">Initialize SCM Project</h2>
            <p className="text-xs text-archival-muted mt-0.5">Creates dedicated Fossil repository and checkout workspace</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Payment Gateway Service"
              className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary configuration items, deployment target and architecture context"
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
              className="px-4 py-2 rounded-lg bg-archival-accent hover:bg-archival-accent-hover text-archival-bg font-semibold text-xs transition-colors disabled:opacity-50"
            >
              {loading ? 'Initializing Repo...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
