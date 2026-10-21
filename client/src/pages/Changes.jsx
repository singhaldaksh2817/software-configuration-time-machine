import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GitPullRequest, Search, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Changes() {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const { addToast } = useToast();

  const fetchChanges = async () => {
    try {
      setLoading(true);
      const data = await api.getChanges();
      setChanges(data);
    } catch (err) {
      addToast(err.message, 'error', 'Failed to load change requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChanges();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateChangeStatus(id, { status: newStatus, user: 'Admin' });
      addToast(`Change Request status updated to ${newStatus}`, 'success');
      fetchChanges();
    } catch (err) {
      addToast(err.message, 'error', 'Status Update Failed');
    }
  };

  const filtered = changes.filter(c => {
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.change_code.toLowerCase().includes(search.toLowerCase()) ||
      (c.project_name && c.project_name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-archival-text">
          Configuration Change Control
        </h1>
        <p className="text-xs text-archival-muted mt-0.5">
          Audited change requests linked to Fossil SCM check-ins, priorities, and status accounting
        </p>
      </div>

      {/* Filter and Search */}
      <div className="p-3 rounded-xl bg-archival-surface border border-archival-border shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-archival-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search changes by code, title, or project..."
            className="w-full bg-archival-elevated border border-archival-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-archival-text focus:outline-none focus:border-archival-accent"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {['All', 'Requested', 'Approved', 'Implemented', 'Rolled Back'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                statusFilter === st
                  ? 'bg-archival-accent text-archival-bg font-semibold'
                  : 'bg-archival-elevated text-archival-muted hover:text-archival-text'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Changes Table */}
      <div className="rounded-xl bg-archival-surface border border-archival-border overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-archival-elevated text-archival-muted uppercase tracking-wider text-[10px] border-b border-archival-border">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">SCM Revision</th>
                <th className="px-4 py-3 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-archival-border/60">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-archival-elevated/40 transition-colors">
                  <td className="px-4 py-3 font-bold text-archival-accent">{c.change_code}</td>
                  <td className="px-4 py-3 font-medium text-archival-text">{c.title}</td>
                  <td className="px-4 py-3 text-archival-muted">{c.project_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.priority === 'Critical'
                          ? 'text-archival-danger bg-archival-danger/15'
                          : c.priority === 'High'
                          ? 'text-archival-warning bg-archival-warning/15'
                          : 'text-archival-text bg-archival-elevated'
                      }`}
                    >
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-archival-teal/15 text-archival-teal border border-archival-teal/30">
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-archival-text">{c.assigned_to || 'Unassigned'}</td>
                  <td className="px-4 py-3 text-archival-accent">
                    {c.related_revision ? `[${c.related_revision.substring(0, 8)}]` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={c.status}
                      onChange={(e) => handleStatusChange(c.id, e.target.value)}
                      className="px-2 py-1 rounded bg-archival-elevated border border-archival-border text-[11px] text-archival-text font-mono focus:outline-none focus:border-archival-accent"
                    >
                      <option value="Requested">Requested</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Implemented">Implemented</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Rolled Back">Rolled Back</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-archival-muted">
                    No matching change records found.
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
