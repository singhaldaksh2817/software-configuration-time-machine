import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Search,
  ArrowRight,
  BookmarkCheck,
  GitCommit,
  Clock,
  Terminal,
  Trash2,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import NewProjectModal from '../components/modals/NewProjectModal';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      addToast(err.message, 'error', 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id, name, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete project "${name}" and archive configuration tracking?`)) return;

    try {
      await api.deleteProject(id);
      addToast(`Project "${name}" removed`, 'info', 'Project Deleted');
      fetchProjects();
    } catch (err) {
      addToast(err.message, 'error', 'Delete Failed');
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchFilter.toLowerCase()));
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-archival-text">
            SCM Repositories & Projects
          </h1>
          <p className="text-xs text-archival-muted mt-0.5">
            Manage tracked software configurations, Fossil workspaces, and baseline evolution
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchProjects}
            className="p-2 rounded-lg bg-archival-surface hover:bg-archival-elevated border border-archival-border text-archival-muted hover:text-archival-text transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-archival-accent hover:bg-archival-accent-hover text-archival-bg font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-archival-accent/20"
          >
            <Plus className="w-4 h-4" />
            <span>Initialize Project</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-xl bg-archival-surface border border-archival-border shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-archival-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter projects by name or description..."
            className="w-full bg-archival-elevated border border-archival-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-archival-text placeholder-archival-muted focus:outline-none focus:border-archival-accent font-sans"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-archival-muted font-mono">Status:</span>
          {['All', 'Active', 'Archived'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                statusFilter === status
                  ? 'bg-archival-accent text-archival-bg font-semibold'
                  : 'bg-archival-elevated text-archival-muted hover:text-archival-text'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((proj) => (
            <Link
              key={proj.id}
              to={`/projects/${proj.id}`}
              className="group rounded-xl bg-archival-surface border border-archival-border hover:border-archival-accent/60 shadow-md hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-archival-elevated border border-archival-accent/30 text-archival-accent flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FolderGit2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-archival-text group-hover:text-archival-accent transition-colors truncate">
                        {proj.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-archival-muted font-mono mt-0.5">
                        <span>Owner: {proj.owner}</span>
                        <span>•</span>
                        <span className="text-archival-success">{proj.status}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(proj.id, proj.name, e)}
                    className="p-1 rounded text-archival-muted hover:text-archival-danger transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-archival-muted line-clamp-2 leading-relaxed">
                  {proj.description || 'No description provided.'}
                </p>

                {/* SCM Details */}
                <div className="pt-2 border-t border-archival-border/60 space-y-1.5 font-mono text-xs">
                  <div className="flex items-center justify-between text-archival-muted">
                    <span className="flex items-center gap-1">
                      <GitCommit className="w-3.5 h-3.5 text-archival-accent" /> Latest Rev:
                    </span>
                    <span className="text-archival-text font-medium">
                      [{proj.current_revision?.substring(0, 8) || 'HEAD'}]
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-archival-muted">
                    <span className="flex items-center gap-1">
                      <BookmarkCheck className="w-3.5 h-3.5 text-archival-warning" /> Baseline:
                    </span>
                    <span className="text-archival-warning font-semibold">
                      {proj.current_baseline || 'None Defined'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Metrics */}
              <div className="bg-archival-elevated/60 px-5 py-3 border-t border-archival-border flex items-center justify-between text-xs font-mono text-archival-muted">
                <div className="flex items-center gap-3">
                  <span>{proj.item_count || 0} items</span>
                  <span>•</span>
                  <span>{proj.baseline_count || 0} baselines</span>
                </div>

                <div className="flex items-center gap-1 text-archival-accent group-hover:translate-x-0.5 transition-transform text-[11px] font-semibold">
                  <span>Open SCM</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-archival-surface rounded-xl border border-archival-border">
          <FolderOpen className="w-10 h-10 text-archival-muted mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-semibold text-archival-text">No Projects Found</h3>
          <p className="text-xs text-archival-muted mt-1 max-w-sm mx-auto">
            {searchFilter ? 'Try clearing your search query or status filter.' : 'Initialize your first SCM repository to begin managing configuration baselines.'}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-archival-accent hover:bg-archival-accent-hover text-archival-bg font-semibold text-xs transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Project</span>
          </button>
        </div>
      )}

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectCreated={() => fetchProjects()}
      />
    </div>
  );
}
