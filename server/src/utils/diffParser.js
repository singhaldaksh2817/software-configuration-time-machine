/**
 * Parses Fossil unified diff output into structured line-by-line diff data
 */
function parseUnifiedDiff(rawDiff) {
  if (!rawDiff || typeof rawDiff !== 'string') {
    return [];
  }

  const files = [];
  const lines = rawDiff.split(/\r?\n/);
  let currentFile = null;
  let currentHunk = null;
  let oldLineCounter = 0;
  let newLineCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for Index: or --- / +++ markers in Fossil diff
    // Fossil typically produces:
    // Index: application.yml
    // ==================================================================
    // --- application.yml
    // +++ application.yml
    if (line.startsWith('Index: ') || (line.startsWith('--- ') && !currentFile)) {
      const filename = line.replace(/^(Index:\s*|---\s*)/, '').trim();
      currentFile = {
        filename,
        oldPath: filename,
        newPath: filename,
        addedCount: 0,
        deletedCount: 0,
        hunks: []
      };
      files.push(currentFile);
      currentHunk = null;
      continue;
    }

    if (line.startsWith('+++ ') && currentFile) {
      currentFile.newPath = line.replace(/^\+\+\+\s*/, '').trim();
      continue;
    }

    if (line.startsWith('@@ ') && currentFile) {
      // Hunk header: @@ -1,5 +1,7 @@
      const match = line.match(/@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
      if (match) {
        oldLineCounter = parseInt(match[1], 10);
        newLineCounter = parseInt(match[3], 10);
        currentHunk = {
          header: line,
          oldStart: oldLineCounter,
          newStart: newLineCounter,
          lines: []
        };
        currentFile.hunks.push(currentHunk);
      }
      continue;
    }

    if (currentHunk) {
      if (line.startsWith('+')) {
        currentFile.addedCount++;
        currentHunk.lines.push({
          type: 'add',
          oldLineNo: null,
          newLineNo: newLineCounter++,
          content: line.substring(1)
        });
      } else if (line.startsWith('-')) {
        currentFile.deletedCount++;
        currentHunk.lines.push({
          type: 'del',
          oldLineNo: oldLineCounter++,
          newLineNo: null,
          content: line.substring(1)
        });
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({
          type: 'normal',
          oldLineNo: oldLineCounter++,
          newLineNo: newLineCounter++,
          content: line.substring(1)
        });
      } else if (line.startsWith('\\ No newline')) {
        // Ignore or mark
      } else if (line.startsWith('=====')) {
        // Separator between files
        currentHunk = null;
      }
    }
  }

  return files;
}

module.exports = {
  parseUnifiedDiff
};
