import React, { useState } from 'react';
import { X, FileCode2, GitCommit } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function NewConfigurationModal({ isOpen, onClose, projectId, initialItem = null, onSaved }) {
  const [path, setPath] = useState(initialItem?.path || '');
  const [name, setName] = useState(initialItem?.name || '');
  const [fileType, setFileType] = useState(initialItem?.file_type || 'yaml');
  const [description, setDescription] = useState(initialItem?.description || '');
  const [content, setContent] = useState(initialItem?.content || '');
  const [commitMessage, setCommitMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!path.trim() || typeof content !== 'string') return;

    setLoading(true);
    try {
      const res = await api.saveConfiguration(projectId, {
        name: name.trim() || path.trim(),
        path: path.trim(),
        fileType,
        description: description.trim(),
        content,
        commitMessage: commitMessage.trim() || `Update configuration: ${path.trim()}`,
        user: 'Admin'
      });
      addToast(`Committed to Fossil revision [${res.revision}]`, 'success', 'Configuration Item Saved');
      onSaved(res);
      onClose();
    } catch (err) {
      addToast(err.message, 'error', 'Save Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-2xl rounded-xl bg-archival-surface border border-archival-border shadow-2xl p-6 relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-archival-muted hover:text-archival-text hover:bg-archival-elevated transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-archival-teal/15 border border-archival-teal/30 flex items-center justify-center text-archival-teal">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-archival-text">
              {initialItem ? 'Edit Tracked Configuration' : 'Add Configuration Item'}
            </h2>
            <p className="text-xs text-archival-muted mt-0.5">
              Writes to workspace and commits directly to Fossil SCM
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1">
                File Relative Path *
              </label>
              <input
                type="text"
                required
                disabled={Boolean(initialItem)}
                value={path}
                onChange={(e) => {
                  setPath(e.target.value);
                  if (!name) setName(e.target.value);
                  if (e.target.value.endsWith('.yml') || e.target.value.endsWith('.yaml')) setFileType('yaml');
                  else if (e.target.value.endsWith('.json')) setFileType('json');
                  else if (e.target.value.endsWith('.conf')) setFileType('conf');
                }}
                placeholder="e.g. nginx.conf or configs/db.yml"
                className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-accent font-mono disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1">
                Format / Type
              </label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-accent"
              >
                <option value="yaml">YAML Configuration (.yml, .yaml)</option>
                <option value="json">JSON Configuration (.json)</option>
                <option value="conf">Server Conf (.conf, .nginx)</option>
                <option value="ini">INI / Properties (.ini, .properties)</option>
                <option value="dockerfile">Docker / Compose</option>
                <option value="markdown">Documentation (.md)</option>
              </select>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1 flex items-center justify-between">
              <span>Configuration File Content *</span>
              <span className="text-[10px] text-archival-muted font-normal lowercase">UTF-8 plain text</span>
            </label>
            <textarea
              rows={10}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or write configuration content here..."
              className="w-full flex-1 p-3 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-accent font-mono resize-none leading-relaxed"
            />
          </div>

          <div className="shrink-0">
            <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1 flex items-center gap-1.5">
              <GitCommit className="w-3.5 h-3.5 text-archival-accent" />
              <span>Fossil Check-in / Commit Message *</span>
            </label>
            <input
              type="text"
              required
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder={`e.g. feat(config): update ${path || 'settings'} configuration`}
              className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-accent"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-archival-border text-xs text-archival-muted hover:text-archival-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !path.trim()}
              className="px-4 py-2 rounded-lg bg-archival-teal hover:bg-archival-teal/80 text-archival-bg font-semibold text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? 'Committing to Fossil...' : 'Commit Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
