const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const config = require('../config');

class FossilService {
  constructor() {
    this.cachedFossilPath = null;
  }

  getExecutablePath() {
    if (this.cachedFossilPath && fs.existsSync(this.cachedFossilPath)) {
      return this.cachedFossilPath;
    }

    const candidates = [];
    if (config.FOSSIL_PATH) candidates.push(config.FOSSIL_PATH);

    // 1. Local bundled binary in server/bin/
    candidates.push(
      path.join(__dirname, '../../bin/fossil.exe'),
      path.join(__dirname, '../../bin/fossil'),
      path.join(config.ROOT_DIR, 'bin', 'fossil.exe'),
      path.join(config.ROOT_DIR, 'bin', 'fossil')
    );

    // 2. Known Windows user winget locations
    candidates.push(
      'C:\\Users\\Daksh\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Fossil.Fossil_Microsoft.Winget.Source_8wekyb3d8bbwe\\fossil.exe',
      'C:\\Users\\Daksh\\AppData\\Local\\Microsoft\\WinGet\\Links\\fossil.exe'
    );

    const localAppData = process.env.LOCALAPPDATA || '';
    if (localAppData) {
      candidates.push(
        path.join(localAppData, 'Microsoft', 'WinGet', 'Packages', 'Fossil.Fossil_Microsoft.Winget.Source_8wekyb3d8bbwe', 'fossil.exe'),
        path.join(localAppData, 'Microsoft', 'WinGet', 'Links', 'fossil.exe')
      );
    }

    // 3. System paths
    candidates.push(
      '/usr/bin/fossil',
      '/usr/local/bin/fossil'
    );

    for (const candidate of candidates) {
      if (candidate === 'fossil' || candidate === 'fossil.exe') {
        // Will be checked via execFile call
        continue;
      }
      if (fs.existsSync(candidate)) {
        this.cachedFossilPath = candidate;
        return candidate;
      }
    }

    // Default fallback to PATH lookup
    return 'fossil';
  }

  execute(args, options = {}) {
    return new Promise((resolve, reject) => {
      const fossilBin = this.getExecutablePath();
      const execOptions = {
        cwd: options.cwd || undefined,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000,
        env: { ...process.env, ...options.env }
      };

      execFile(fossilBin, args, execOptions, (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`Fossil command failed: fossil ${args.join(' ')}\n${stderr || error.message}`));
        }
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      });
    });
  }

  async isAvailable() {
    try {
      const { stdout } = await this.execute(['version']);
      const match = stdout.match(/version\s+([^\s\[]+)/i);
      const version = match ? match[1] : 'Unknown';
      return {
        available: true,
        version,
        raw: stdout,
        executablePath: this.getExecutablePath()
      };
    } catch (err) {
      return {
        available: false,
        version: null,
        error: err.message,
        executablePath: this.getExecutablePath()
      };
    }
  }

  async initRepository(repoPath, projectName = 'SCM Project', adminUser = 'admin') {
    const dir = path.dirname(repoPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(repoPath)) {
      return { created: false, message: 'Repository already exists', repoPath };
    }

    await this.execute([
      'new',
      repoPath,
      '-A', adminUser,
      '--project-name', projectName
    ]);

    return { created: true, repoPath };
  }

  async openRepository(repoPath, workspaceDir) {
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }

    // Check if repository is already opened here
    const checkFile1 = path.join(workspaceDir, '_FOSSIL_');
    const checkFile2 = path.join(workspaceDir, '.fslckout');
    if (fs.existsSync(checkFile1) || fs.existsSync(checkFile2)) {
      return { opened: true, workspaceDir, alreadyOpen: true };
    }

    await this.execute([
      'open',
      repoPath,
      '--workdir', workspaceDir,
      '-f'
    ]);

    return { opened: true, workspaceDir };
  }

  async closeRepository(workspaceDir) {
    if (!fs.existsSync(workspaceDir)) return;
    try {
      await this.execute(['close', '-f'], { cwd: workspaceDir });
    } catch (_) {}
  }

  async addFiles(workspaceDir, filePaths = []) {
    if (filePaths.length === 0) {
      // Add all untracked files
      const result = await this.execute(['add', '.'], { cwd: workspaceDir });
      return result.stdout;
    }
    const result = await this.execute(['add', ...filePaths], { cwd: workspaceDir });
    return result.stdout;
  }

  async ensureUser(workspaceDir, username) {
    if (!username || username === 'admin') return;
    try {
      const { stdout } = await this.execute(['user', 'list'], { cwd: workspaceDir });
      const existingUsers = stdout.split('\n').map(l => l.trim().split(/\s+/)[0]).filter(Boolean);
      if (!existingUsers.includes(username)) {
        await this.execute(['user', 'new', username, `${username.toLowerCase()}@scmtimemachine.org`, 'scmPass123'], { cwd: workspaceDir });
      }
    } catch (e) {
      // Ignore user list/new errors
    }
  }

  async commit(workspaceDir, message, author = 'admin', allowEmpty = true) {
    // Add all untracked files first
    try {
      await this.execute(['add', '.'], { cwd: workspaceDir });
    } catch (e) {
      // Ignore if no new files
    }

    if (author) {
      await this.ensureUser(workspaceDir, author);
    }

    const args = [
      'commit',
      '-m', message,
      '--nosync',
      '--no-warnings'
    ];
    if (author) {
      args.push('--user', author);
    }
    if (allowEmpty) {
      args.push('--allow-empty');
    }

    try {
      const { stdout } = await this.execute(args, { cwd: workspaceDir });
      const match = stdout.match(/New_Version:\s*([a-f0-9]{40,64})/i);
      const revision = match ? match[1].substring(0, 16) : null;
      const fullHash = match ? match[1] : null;

      return {
        revision: revision || 'HEAD',
        fullHash: fullHash || revision || 'HEAD',
        message,
        author,
        raw: stdout
      };
    } catch (err) {
      // If error was "no such user", retry without --user flag so Fossil uses default repository user
      if (err.message && err.message.includes('no such user')) {
        const retryArgs = ['commit', '-m', message, '--nosync', '--no-warnings'];
        if (allowEmpty) retryArgs.push('--allow-empty');
        const { stdout } = await this.execute(retryArgs, { cwd: workspaceDir });
        const match = stdout.match(/New_Version:\s*([a-f0-9]{40,64})/i);
        const revision = match ? match[1].substring(0, 16) : null;
        const fullHash = match ? match[1] : null;

        return {
          revision: revision || 'HEAD',
          fullHash: fullHash || revision || 'HEAD',
          message,
          author,
          raw: stdout
        };
      }
      throw err;
    }
  }

  async getStatus(workspaceDir) {
    try {
      const { stdout } = await this.execute(['status'], { cwd: workspaceDir });
      const lines = stdout.split('\n');
      const statusData = {
        repository: null,
        checkout: null,
        parent: null,
        tags: null,
        comment: null,
        files: []
      };

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('repository:')) {
          statusData.repository = trimmed.replace('repository:', '').trim();
        } else if (trimmed.startsWith('checkout:')) {
          statusData.checkout = trimmed.replace('checkout:', '').trim();
        } else if (trimmed.startsWith('parent:')) {
          statusData.parent = trimmed.replace('parent:', '').trim();
        } else if (trimmed.startsWith('tags:')) {
          statusData.tags = trimmed.replace('tags:', '').trim();
        } else if (trimmed.startsWith('comment:')) {
          statusData.comment = trimmed.replace('comment:', '').trim();
        } else if (/^(ADDED|EDITED|DELETED|MISSING|NOT_A_FILE|EXTRA)\s+/i.test(trimmed)) {
          const parts = trimmed.split(/\s+/);
          statusData.files.push({ status: parts[0], path: parts.slice(1).join(' ') });
        }
      }

      return statusData;
    } catch (err) {
      return { error: err.message, files: [] };
    }
  }

  async getTimeline(workspaceDir, limit = 50) {
    try {
      // -v displays the files changed in each revision
      const { stdout } = await this.execute(['timeline', '-v', '-n', String(limit)], { cwd: workspaceDir });
      return this.parseTimeline(stdout);
    } catch (err) {
      return [];
    }
  }

  parseTimeline(rawOutput) {
    const entries = [];
    const lines = rawOutput.split('\n');
    let currentDate = null;
    let currentEntry = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Date separator like: "=== 2026-09-21 ==="
      const dateMatch = trimmed.match(/^===\s*(\d{4}-\d{2}-\d{2})\s*===/);
      if (dateMatch) {
        currentDate = dateMatch[1];
        continue;
      }

      // Check-in header line like: "17:08:56 [9a4cc4401e] *CURRENT* Initial config (user: admin tags: trunk)"
      // Or: "17:08:56 [9f230d5d81] initial empty check-in (user: admin tags: trunk)"
      const revMatch = trimmed.match(/^(\d{2}:\d{2}:\d{2})\s+\[([a-f0-9]{8,16})\]\s+(\*CURRENT\*\s+)?(.+?)(?:\s+\(user:\s*([^)]+?)(?:\s+tags:\s*([^)]+?))?\))?$/);
      if (revMatch) {
        if (currentEntry) {
          entries.push(currentEntry);
        }

        const timeStr = revMatch[1];
        const hash = revMatch[2];
        const isCurrent = Boolean(revMatch[3]);
        const msg = revMatch[4].trim();
        const user = revMatch[5] || 'admin';
        const tags = revMatch[6] || 'trunk';

        currentEntry = {
          revision: hash,
          date: currentDate || new Date().toISOString().split('T')[0],
          time: timeStr,
          timestamp: `${currentDate || new Date().toISOString().split('T')[0]}T${timeStr}Z`,
          author: user,
          message: msg,
          branch: tags.split(',')[0].trim(),
          tags: tags.split(',').map(t => t.trim()),
          isCurrent,
          changedFiles: []
        };
        continue;
      }

      // File change line inside revision, e.g.: "   ADDED test.conf" or "   EDITED application.yml"
      if (currentEntry && /^\s+(ADDED|EDITED|DELETED|RENAMED)\s+(.+)$/i.test(line)) {
        const parts = trimmed.split(/\s+/);
        currentEntry.changedFiles.push({
          status: parts[0].toUpperCase(),
          file: parts.slice(1).join(' ')
        });
      }
    }

    if (currentEntry) {
      entries.push(currentEntry);
    }

    return entries;
  }

  async getRevisionInfo(workspaceDir, revision) {
    try {
      const { stdout } = await this.execute(['info', revision], { cwd: workspaceDir });
      const lines = stdout.split('\n');
      const info = {
        revision,
        hash: revision,
        date: null,
        author: null,
        parent: null,
        child: null,
        tags: [],
        comment: null,
        raw: stdout
      };

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('hash:')) {
          info.hash = trimmed.replace('hash:', '').trim();
        } else if (trimmed.startsWith('checkout:') || trimmed.startsWith('uuid:')) {
          const parts = trimmed.split(/\s+/);
          info.hash = parts[1];
        } else if (trimmed.startsWith('parent:')) {
          const parts = trimmed.replace('parent:', '').trim().split(/\s+/);
          info.parent = parts[0];
        } else if (trimmed.startsWith('child:')) {
          const parts = trimmed.replace('child:', '').trim().split(/\s+/);
          info.child = parts[0];
        } else if (trimmed.startsWith('tags:')) {
          info.tags = trimmed.replace('tags:', '').trim().split(',').map(t => t.trim());
        } else if (trimmed.startsWith('comment:')) {
          info.comment = trimmed.replace('comment:', '').trim();
        } else if (trimmed.startsWith('user:')) {
          info.author = trimmed.replace('user:', '').trim();
        }
      }

      return info;
    } catch (err) {
      return { revision, error: err.message };
    }
  }

  async getFileContent(workspaceDir, filePath, revision = null) {
    try {
      const args = ['cat', filePath];
      if (revision) {
        args.push('-r', revision);
      }
      const { stdout } = await this.execute(args, { cwd: workspaceDir });
      return stdout;
    } catch (err) {
      // Fallback: If uncommitted file in workspace
      const localPath = path.resolve(workspaceDir, filePath);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath, 'utf8');
      }
      throw new Error(`File not found: ${filePath} at revision ${revision || 'HEAD'}`);
    }
  }

  async getDiff(workspaceDir, fromRev, toRev) {
    try {
      const args = ['diff', '--unified'];
      if (fromRev && toRev) {
        args.push('-r', fromRev, '--to', toRev);
      } else if (fromRev) {
        args.push('-r', fromRev);
      }
      const { stdout } = await this.execute(args, { cwd: workspaceDir });
      return stdout;
    } catch (err) {
      return '';
    }
  }

  async getSideBySideDiff(workspaceDir, fromRev, toRev) {
    try {
      const args = ['diff', '--side-by-side', '-W', '120'];
      if (fromRev && toRev) {
        args.push('-r', fromRev, '--to', toRev);
      } else if (fromRev) {
        args.push('-r', fromRev);
      }
      const { stdout } = await this.execute(args, { cwd: workspaceDir });
      return stdout;
    } catch (err) {
      return '';
    }
  }

  async tagAdd(workspaceDir, tagName, revision) {
    try {
      const { stdout } = await this.execute(['tag', 'add', tagName, revision], { cwd: workspaceDir });
      return { success: true, tagName, revision, stdout };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async revertToRevision(workspaceDir, targetRevision, author = 'admin', reason = 'Rollback', targetFiles = null) {
    // SCM Safe Rollback Workflow:
    // 1. Verify target revision exists
    const revInfo = await this.getRevisionInfo(workspaceDir, targetRevision);
    if (revInfo.error) {
      throw new Error(`Target revision ${targetRevision} does not exist in repository`);
    }

    // 2. Revert files in workspace to target revision
    const filesToRevert = (targetFiles && targetFiles.length > 0)
      ? targetFiles
      : fs.readdirSync(workspaceDir).filter(f => f !== '.fslckout' && f !== '_FOSSIL_');
    if (filesToRevert.length > 0) {
      await this.execute(['revert', '-r', targetRevision, ...filesToRevert], { cwd: workspaceDir });
    }

    // 3. Stage changes
    try {
      await this.execute(['add', '.'], { cwd: workspaceDir });
    } catch (e) {
      // Ignore
    }

    // 4. Create a new forward commit documenting the rollback
    const rollbackMessage = `Rollback configuration to revision [${targetRevision.substring(0, 10)}]. Reason: ${reason}`;
    const commitResult = await this.commit(workspaceDir, rollbackMessage, author, true);

    return {
      success: true,
      previousRevision: revInfo.hash ? revInfo.hash.substring(0, 16) : targetRevision,
      newRevision: commitResult.revision,
      fullHash: commitResult.fullHash,
      message: rollbackMessage,
      author,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new FossilService();
