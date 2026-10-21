const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errBody.error || `HTTP Error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err.message);
    throw err;
  }
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getCurrentUser: () => request('/auth/me'),

  // Dashboard
  getDashboardStats: () => request('/dashboard'),

  // Search
  search: (query) => request(`/search?q=${encodeURIComponent(query)}`),

  // Projects
  getProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  getComplianceReport: (id) => request(`/projects/${id}/compliance-report`),
  createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  // Configuration Items
  getConfigurations: (projectId) => request(`/projects/${projectId}/configurations`),
  saveConfiguration: (projectId, data) => request(`/projects/${projectId}/configurations`, { method: 'POST', body: JSON.stringify(data) }),
  syncWorkspace: (projectId) => request(`/projects/${projectId}/sync`, { method: 'POST' }),
  getConfigurationContent: (projectId, itemId, revision) => request(`/projects/${projectId}/configurations/${itemId}/content${revision ? `?revision=${revision}` : ''}`),
  deleteConfiguration: (projectId, itemId, user) => request(`/projects/${projectId}/configurations/${itemId}`, { method: 'DELETE', body: JSON.stringify({ user }) }),

  // Fossil SCM Revisions & Timeline
  getTimeline: (projectId, limit = 50) => request(`/projects/${projectId}/timeline?limit=${limit}`),
  getRevisionInfo: (projectId, revision) => request(`/projects/${projectId}/revisions/${revision}`),

  // Baselines
  getBaselines: (projectId) => request(`/projects/${projectId}/baselines`),
  createBaseline: (projectId, data) => request(`/projects/${projectId}/baselines`, { method: 'POST', body: JSON.stringify(data) }),
  updateBaselineStatus: (projectId, baselineId, status, user) => request(`/projects/${projectId}/baselines/${baselineId}/status`, { method: 'PUT', body: JSON.stringify({ status, user }) }),

  // Compare
  compare: (projectId, { refA, refB, type }) => request(`/projects/${projectId}/compare`, { method: 'POST', body: JSON.stringify({ refA, refB, type }) }),

  // Configuration Drift
  getDrift: (projectId, baselineId) => request(`/projects/${projectId}/drift${baselineId ? `?baselineId=${baselineId}` : ''}`),
  autoHealDrift: (projectId, baselineId, user) => request(`/projects/${projectId}/drift/auto-heal`, { method: 'POST', body: JSON.stringify({ baselineId, user }) }),

  // Rollback
  previewRollback: (projectId, targetRevision) => request(`/projects/${projectId}/rollback/preview`, { method: 'POST', body: JSON.stringify({ targetRevision }) }),
  executeRollback: (projectId, data) => request(`/projects/${projectId}/rollback`, { method: 'POST', body: JSON.stringify(data) }),

  // Changes
  getChanges: (projectId) => request(`/changes${projectId ? `?projectId=${projectId}` : ''}`),
  createChange: (data) => request('/changes', { method: 'POST', body: JSON.stringify(data) }),
  updateChangeStatus: (id, data) => request(`/changes/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),

  // Audit
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/audit${query ? `?${query}` : ''}`);
  },

  // System & Jenkins
  getFossilStatus: () => request('/system/fossil-status'),
  getJenkinsStatus: () => request('/system/jenkins-status'),
  getJenkinsJobStatus: (job) => request(`/jenkins/status${job ? `?job=${encodeURIComponent(job)}` : ''}`),
  triggerJenkinsBuild: (job) => request('/jenkins/build', { method: 'POST', body: JSON.stringify({ job }) }),
  getDockerStatus: () => request('/system/docker-status'),
  getSettings: () => request('/system/settings'),
  updateSetting: (key, value) => request('/system/settings', { method: 'POST', body: JSON.stringify({ key, value }) }),
  seedDemo: () => request('/system/seed', { method: 'POST' })
};
