import React, { useState } from 'react';
import { X, GitPullRequest } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function NewChangeModal({ isOpen, onClose, projectId, availableItems = [], onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [assignedTo, setAssignedTo] = useState('Daksh');
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleToggleItem = (path) => {
    if (selectedItems.includes(path)) {
      setSelectedItems(selectedItems.filter(p => p !== path));
    } else {
      setSelectedItems([...selectedItems, path]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const change = await api.createChange({
        projectId,
        title: title.trim(),
        description: description.trim(),
        reason: reason.trim(),
        priority,
        requestedBy: 'Daksh',
        assignedTo,
        affectedItems: selectedItems
      });
      addToast(`Change Request ${change.change_code} registered`, 'success', 'Change Recorded');
      onCreated(change);
      onClose();
    } catch (err) {
      addToast(err.message, 'error', 'Change Creation Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-lg rounded-xl bg-archival-surface border border-archival-border shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-archival-muted hover:text-archival-text hover:bg-archival-elevated transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-archival-success/15 border border-archival-success/30 flex items-center justify-center text-archival-success">
            <GitPullRequest className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-archival-text">Submit SCM Change Request</h2>
            <p className="text-xs text-archival-muted mt-0.5">Formal change control request linked to configuration items</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1">
              Change Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Expand Redis connection pool and add TLS"
              className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-accent"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1">
                Assignee
              </label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="DevOps Lead"
                className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1">
              Business / Technical Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Audit finding, scalability upgrade, bugfix"
              className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1">
              Detailed Scope & Verification Steps
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What parameters will change and how will stability be verified?"
              className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-accent"
            />
          </div>

          {availableItems.length > 0 && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1.5">
                Target Configuration Items ({selectedItems.length} selected):
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-lg bg-archival-elevated border border-archival-border">
                {availableItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleToggleItem(item.path)}
                    className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                      selectedItems.includes(item.path)
                        ? 'bg-archival-accent text-archival-bg font-semibold'
                        : 'bg-archival-surface text-archival-muted hover:text-archival-text'
                    }`}
                  >
                    {item.path}
                  </button>
                ))}
              </div>
            </div>
          )}

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
              disabled={loading || !title.trim()}
              className="px-4 py-2 rounded-lg bg-archival-success hover:bg-archival-success/80 text-archival-bg font-semibold text-xs transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Change Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
