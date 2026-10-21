import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileCode2, Search, ArrowRight, Eye, FolderGit2 } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Configurations() {
  const [projects, setProjects] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const { addToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const projs = await api.getProjects();
        setProjects(projs);

        // Fetch configs across projects
        const itemPromises = projs.map(p =>
          api.getConfigurations(p.id)
            .then(res => res.map(i => ({ ...i, projectName: p.name, projectId: p.id })))
            .catch(() => [])
        );
        const allItemsNested = await Promise.all(itemPromises);
        setItems(allItemsNested.flat());
      } catch (err) {
        addToast(err.message, 'error', 'Failed to load configuration items');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = items.filter(i => {
    const matchesSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.path.toLowerCase().includes(search.toLowerCase()) ||
      i.projectName.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'All' || i.file_type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-archival-text">
          Configuration Items Inventory
        </h1>
        <p className="text-xs text-archival-muted mt-0.5">
          Global index of all versioned software configuration artifacts across SCM repositories
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-3 rounded-xl bg-archival-surface border border-archival-border shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-archival-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search configuration items by path or project..."
            className="w-full bg-archival-elevated border border-archival-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-archival-text focus:outline-none focus:border-archival-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-archival-muted font-mono">Format:</span>
          {['All', 'yaml', 'conf', 'json', 'markdown'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors uppercase ${
                selectedType === type
                  ? 'bg-archival-accent text-archival-bg font-semibold'
                  : 'bg-archival-elevated text-archival-muted hover:text-archival-text'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <div className="rounded-xl bg-archival-surface border border-archival-border overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-archival-elevated text-archival-muted uppercase tracking-wider text-[10px] border-b border-archival-border">
              <tr>
                <th className="px-4 py-3">Artifact Path</th>
                <th className="px-4 py-3">Project Repository</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Current Version</th>
                <th className="px-4 py-3">Last Modified</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-archival-border/60">
              {filtered.map(item => (
                <tr key={`${item.projectId}-${item.id}`} className="hover:bg-archival-elevated/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-archival-text flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-archival-teal shrink-0" />
                    <span>{item.path}</span>
                  </td>
                  <td className="px-4 py-3 text-archival-muted">{item.projectName}</td>
                  <td className="px-4 py-3 text-archival-muted uppercase">{item.file_type}</td>
                  <td className="px-4 py-3 text-archival-accent font-semibold">[{item.current_version?.substring(0, 10)}]</td>
                  <td className="px-4 py-3 text-archival-muted">{new Date(item.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/projects/${item.projectId}?tab=configurations`}
                      className="px-2.5 py-1 rounded bg-archival-elevated hover:bg-archival-border text-archival-accent text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-archival-muted">
                    No matching configuration artifacts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
