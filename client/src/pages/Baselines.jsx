import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkCheck, Search, ArrowRight, RotateCcw, GitCompare } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Baselines() {
  const [projects, setProjects] = useState([]);
  const [baselines, setBaselines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const projs = await api.getProjects();
        setProjects(projs);

        const baselinePromises = projs.map(p =>
          api.getBaselines(p.id)
            .then(res => res.map(b => ({ ...b, projectName: p.name, projectId: p.id })))
            .catch(() => [])
        );
        const allBaselines = await Promise.all(baselinePromises);
        setBaselines(allBaselines.flat());
      } catch (err) {
        addToast(err.message, 'error', 'Failed to load baselines');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = baselines.filter(b => {
    return (
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.baseline_code.toLowerCase().includes(search.toLowerCase()) ||
      b.projectName.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-archival-text">
          Configuration Baseline Registry
        </h1>
        <p className="text-xs text-archival-muted mt-0.5">
          Standardized frozen configuration milestones and approved production baselines across all systems
        </p>
      </div>

      <div className="p-3 rounded-xl bg-archival-surface border border-archival-border shadow-sm max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-archival-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by baseline code, name, or project..."
            className="w-full bg-archival-elevated border border-archival-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-archival-text focus:outline-none focus:border-archival-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(b => (
          <div
            key={`${b.projectId}-${b.id}`}
            className="p-5 rounded-xl bg-archival-surface border border-archival-border hover:border-archival-warning/50 shadow-md flex flex-col justify-between space-y-3 transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono text-archival-warning">
                      {b.baseline_code}
                    </span>
                    <span className="text-[11px] font-mono text-archival-muted">({b.projectName})</span>
                  </div>
                  <h3 className="text-sm font-semibold text-archival-text mt-0.5">{b.name}</h3>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    b.status === 'Active'
                      ? 'bg-archival-success/20 text-archival-success border border-archival-success/40'
                      : b.status === 'Approved'
                      ? 'bg-archival-warning/20 text-archival-warning border border-archival-warning/40'
                      : 'bg-archival-elevated text-archival-muted border border-archival-border'
                  }`}
                >
                  {b.status}
                </span>
              </div>

              <p className="text-xs text-archival-muted leading-relaxed line-clamp-2">
                {b.description || 'Formal configuration baseline.'}
              </p>

              <div className="text-[11px] font-mono text-archival-muted">
                Fossil Revision: <span className="text-archival-accent font-semibold">[{b.revision_id?.substring(0, 10)}]</span>
              </div>
            </div>

            <div className="pt-3 border-t border-archival-border/60 flex items-center justify-between text-xs">
              <span className="text-[10px] text-archival-muted font-mono">
                {new Date(b.created_at).toLocaleDateString()} by {b.created_by}
              </span>

              <Link
                to={`/projects/${b.projectId}?tab=baselines`}
                className="px-2.5 py-1 rounded bg-archival-elevated hover:bg-archival-border text-archival-accent text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <span>Manage</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
