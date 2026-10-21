import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Terminal,
  Server,
  Box,
  Palette,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Save
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const { theme, setTheme, themes } = useTheme();
  const { addToast } = useToast();

  const [fossilStatus, setFossilStatus] = useState(null);
  const [jenkinsStatus, setJenkinsStatus] = useState(null);
  const [dockerStatus, setDockerStatus] = useState(null);
  const [testingFossil, setTestingFossil] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [fossilPath, setFossilPath] = useState('');
  const [jenkinsUrl, setJenkinsUrl] = useState('http://localhost:8080');

  const fetchSystemData = async () => {
    try {
      const [fossil, jenkins, docker, settings] = await Promise.all([
        api.getFossilStatus().catch(() => ({ connected: false })),
        api.getJenkinsStatus().catch(() => ({ connected: false })),
        api.getDockerStatus().catch(() => ({ connected: false })),
        api.getSettings().catch(() => ({}))
      ]);
      setFossilStatus(fossil);
      setJenkinsStatus(jenkins);
      setDockerStatus(docker);
      if (settings.fossilPath) setFossilPath(settings.fossilPath);
      if (settings.jenkinsUrl) setJenkinsUrl(settings.jenkinsUrl);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const handleTestFossil = async () => {
    setTestingFossil(true);
    try {
      const res = await api.getFossilStatus();
      setFossilStatus(res);
      if (res.connected) {
        addToast(`Fossil SCM is connected! (v${res.version}) - Latency: ${res.latencyMs}ms`, 'success', 'Fossil SCM Healthy');
      } else {
        addToast(res.error || 'Fossil binary not found', 'error', 'Fossil Connection Error');
      }
    } catch (err) {
      addToast(err.message, 'error', 'Test Failed');
    } finally {
      setTestingFossil(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      if (fossilPath) await api.updateSetting('fossilPath', fossilPath);
      if (jenkinsUrl) await api.updateSetting('jenkinsUrl', jenkinsUrl);
      addToast('System configuration saved successfully', 'success');
      handleTestFossil();
    } catch (err) {
      addToast(err.message, 'error', 'Save Failed');
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await api.seedDemo();
      addToast('E-Commerce Platform demo project seeded with real Fossil check-ins and baselines!', 'success', 'Demo Created');
    } catch (err) {
      addToast(err.message, 'error', 'Seed Failed');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-archival-text">
          System Settings & SCM Tool Integrations
        </h1>
        <p className="text-xs text-archival-muted mt-0.5">
          Configure Fossil SCM engine path, CI/CD pipelines, container runtime, and visual themes
        </p>
      </div>

      {/* SCM Engine Configuration (Fossil) */}
      <div className="rounded-xl bg-archival-surface border border-archival-border p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-archival-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-archival-teal/15 border border-archival-teal/30 flex items-center justify-center text-archival-teal">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-archival-text">Fossil SCM Version Engine</h2>
              <p className="text-xs text-archival-muted">Primary configuration history and version-control backend</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
                fossilStatus?.connected
                  ? 'bg-archival-success/15 border-archival-success/40 text-archival-success'
                  : 'bg-archival-danger/15 border-archival-danger/40 text-archival-danger'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${fossilStatus?.connected ? 'bg-archival-success' : 'bg-archival-danger'}`} />
              <span>{fossilStatus?.connected ? 'Connected' : 'Offline'}</span>
            </span>

            <button
              type="button"
              onClick={handleTestFossil}
              disabled={testingFossil}
              className="px-3 py-1.5 rounded-lg bg-archival-elevated hover:bg-archival-border border border-archival-border text-xs font-mono text-archival-text transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingFossil ? 'animate-spin' : ''}`} />
              <span>Test SCM Connection</span>
            </button>
          </div>
        </div>

        {/* Fossil Path Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-archival-elevated border border-archival-border">
            <span className="text-archival-muted block text-[10px] uppercase">Detected Version</span>
            <span className="text-archival-text font-bold mt-1 block">
              {fossilStatus?.version ? `Fossil v${fossilStatus.version}` : 'Not Detected'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-archival-elevated border border-archival-border">
            <span className="text-archival-muted block text-[10px] uppercase">Engine Binary Location</span>
            <span className="text-archival-text truncate mt-1 block" title={fossilStatus?.executablePath}>
              {fossilStatus?.executablePath || 'System PATH lookup'}
            </span>
          </div>
        </div>
      </div>

      {/* CI/CD & Containers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Jenkins */}
        <div className="rounded-xl bg-archival-surface border border-archival-border p-5 shadow-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-archival-border">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-archival-accent" />
              <h3 className="text-xs font-mono uppercase font-semibold text-archival-text">Jenkins CI/CD Pipeline</h3>
            </div>
            <span className="text-[10px] font-mono text-archival-muted">Configured</span>
          </div>
          <p className="text-xs text-archival-muted">
            Jenkinsfile is included for dependency installation, test execution, frontend build, and Docker image validation.
          </p>
          <div className="p-2.5 rounded bg-archival-elevated border border-archival-border text-xs font-mono text-archival-text">
            URL: {jenkinsUrl}
          </div>
        </div>

        {/* Docker */}
        <div className="rounded-xl bg-archival-surface border border-archival-border p-5 shadow-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-archival-border">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-archival-teal" />
              <h3 className="text-xs font-mono uppercase font-semibold text-archival-text">Docker Container Engine</h3>
            </div>
            <span className="text-[10px] font-mono text-archival-success">Ready</span>
          </div>
          <p className="text-xs text-archival-muted">
            Dockerfile & docker-compose.yml ready with persistent volume mounts for Fossil repositories.
          </p>
          <div className="p-2.5 rounded bg-archival-elevated border border-archival-border text-xs font-mono text-archival-teal">
            Multi-stage Dockerfile + Docker Compose configured
          </div>
        </div>
      </div>

      {/* Appearance & Themes */}
      <div className="rounded-xl bg-archival-surface border border-archival-border p-6 shadow-md space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-archival-border">
          <Palette className="w-4 h-4 text-archival-accent" />
          <h2 className="text-sm font-semibold text-archival-text">Theme & Archival Identity</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themes.map(t => (
            <div
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                theme === t.id
                  ? 'bg-archival-elevated border-archival-accent ring-2 ring-archival-accent/30'
                  : 'bg-archival-elevated/50 border-archival-border hover:border-archival-border/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-archival-text">{t.name}</span>
                {theme === t.id && <CheckCircle2 className="w-4 h-4 text-archival-accent" />}
              </div>
              <p className="text-[11px] text-archival-muted mt-1 leading-relaxed">
                {t.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Seeding Utility */}
      <div className="rounded-xl bg-archival-surface border border-archival-border p-6 shadow-md flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-sm font-semibold text-archival-text">Academic Demo Repository Seeder</h3>
          <p className="text-xs text-archival-muted mt-0.5 max-w-lg">
            Populates the system with "E-Commerce Platform" including microservice configs, real Fossil check-ins, tagged baselines, change requests, and diffs.
          </p>
        </div>

        <button
          onClick={handleSeed}
          disabled={seeding}
          className="px-4 py-2 rounded-lg bg-archival-accent hover:bg-archival-accent-hover text-archival-bg font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-archival-accent/20 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{seeding ? 'Seeding SCM Repository...' : 'Seed Demo Data'}</span>
        </button>
      </div>
    </div>
  );
}
