const path = require('path');

function sanitizePath(workspaceDir, relativePath) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error('Invalid file path');
  }

  // Prevent absolute paths or directory traversal
  const normalized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const absolutePath = path.resolve(workspaceDir, normalized);

  if (!absolutePath.startsWith(path.resolve(workspaceDir))) {
    throw new Error('Path traversal attempt detected');
  }

  return absolutePath;
}

function sanitizeSlug(str) {
  if (!str) return 'project';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-');
}

module.exports = {
  sanitizePath,
  sanitizeSlug
};
