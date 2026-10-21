/**
 * validatorService.js
 * Validates configuration file content before committing to Fossil SCM.
 * Supports: JSON, YAML (basic), Nginx configs, .env files, XML (basic), TOML (basic).
 * Uses only Node built-ins + optional js-yaml if installed.
 */

class ValidatorService {
  /**
   * Validate content based on file extension / declared type.
   * @param {string} content     - The raw file content string.
   * @param {string} fileType    - 'json', 'yaml', 'yml', 'nginx', 'env', 'xml', 'toml', etc.
   * @param {string} filePath    - The file path (used to infer type if fileType='auto').
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  validate(content, fileType = 'auto', filePath = '') {
    const resolvedType = fileType === 'auto' ? this._inferType(filePath) : fileType.toLowerCase();

    const result = { valid: true, errors: [], warnings: [], type: resolvedType };

    if (!content || content.trim() === '') {
      result.warnings.push('File is empty.');
      return result;
    }

    switch (resolvedType) {
      case 'json':
        return this._validateJson(content, result);
      case 'yaml':
      case 'yml':
        return this._validateYaml(content, result);
      case 'nginx':
        return this._validateNginx(content, result);
      case 'env':
        return this._validateEnv(content, result);
      case 'xml':
        return this._validateXml(content, result);
      case 'toml':
        return this._validateToml(content, result);
      default:
        result.warnings.push(`No validator available for type "${resolvedType}". File was accepted as-is.`);
        return result;
    }
  }

  // ── Validators ──────────────────────────────────────────────────────────────

  _validateJson(content, result) {
    try {
      const parsed = JSON.parse(content);
      if (parsed === null) {
        result.warnings.push('JSON parsed successfully but value is null.');
      }
    } catch (err) {
      result.valid = false;
      result.errors.push(`Invalid JSON: ${err.message}`);
    }
    return result;
  }

  _validateYaml(content, result) {
    // Try to use js-yaml if available; fall back to heuristic
    try {
      const yaml = require('js-yaml');
      try {
        yaml.load(content);
      } catch (err) {
        result.valid = false;
        result.errors.push(`Invalid YAML: ${err.message}`);
      }
      return result;
    } catch (_) {
      // js-yaml not installed — use heuristic checks
    }

    const lines = content.split('\n');
    let indentStack = [0];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*#/.test(line) || line.trim() === '') continue; // skip comments/blank

      // Check for tab indentation (not allowed in YAML)
      if (/^\t/.test(line)) {
        result.valid = false;
        result.errors.push(`Line ${i + 1}: YAML does not allow tab indentation.`);
      }
      // Check for duplicate colons in key (heuristic)
      const colonCount = (line.match(/:/g) || []).length;
      if (colonCount > 3 && !/https?:/.test(line)) {
        result.warnings.push(`Line ${i + 1}: Unusually high number of colons — check YAML syntax.`);
      }
    }
    return result;
  }

  _validateNginx(content, result) {
    // Heuristic nginx config validation
    const braceOpen = (content.match(/\{/g) || []).length;
    const braceClose = (content.match(/\}/g) || []).length;

    if (braceOpen !== braceClose) {
      result.valid = false;
      result.errors.push(`Mismatched braces: ${braceOpen} opening '{' vs ${braceClose} closing '}'.`);
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#') || line.endsWith('{') || line.endsWith('}') || line === '') continue;
      // Statements must end with semicolon (unless they open a block)
      if (!line.endsWith(';') && !line.endsWith('{') && !line.endsWith('}')) {
        result.warnings.push(`Line ${i + 1}: Statement may be missing a semicolon: "${line.substring(0, 60)}"`);
      }
    }

    // Check for required directives in server blocks
    if (content.includes('server {') && !content.includes('listen')) {
      result.warnings.push('Nginx server block found but no "listen" directive detected.');
    }

    return result;
  }

  _validateEnv(content, result) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      // Each non-blank, non-comment line should be KEY=VALUE
      if (!/^[A-Z_][A-Z0-9_]*=/.test(line) && !/^[a-z_][a-zA-Z0-9_]*=/.test(line)) {
        result.valid = false;
        result.errors.push(`Line ${i + 1}: Invalid .env syntax — expected KEY=VALUE: "${line}"`);
      }
    }
    return result;
  }

  _validateXml(content, result) {
    // Basic XML structural check — no external lib needed
    const tagStack = [];
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9_:.-]*)([^>]*)>/g;
    let match;
    while ((match = tagRegex.exec(content)) !== null) {
      const fullTag = match[0];
      const tagName = match[1];
      const attrs = match[2];
      if (fullTag.startsWith('</')) {
        // Closing tag
        if (tagStack.length === 0 || tagStack[tagStack.length - 1] !== tagName) {
          result.valid = false;
          result.errors.push(`XML: Unexpected closing tag </${tagName}> — mismatched nesting.`);
          break;
        }
        tagStack.pop();
      } else if (!attrs.endsWith('/')) {
        // Opening tag (not self-closing)
        tagStack.push(tagName);
      }
    }
    if (tagStack.length > 0) {
      result.valid = false;
      result.errors.push(`XML: Unclosed tag(s): <${tagStack.join('>, <')}>`);
    }
    return result;
  }

  _validateToml(content, result) {
    // Heuristic TOML validation
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      // Section headers: [section] or [[array]]
      if (/^\[/.test(line)) {
        if (!/^\[+[\w.\-"]+\]+$/.test(line)) {
          result.warnings.push(`Line ${i + 1}: Possibly malformed TOML section header: "${line}"`);
        }
        continue;
      }
      // Key = value
      if (!line.includes('=')) {
        result.valid = false;
        result.errors.push(`Line ${i + 1}: TOML expects key = value format: "${line}"`);
      }
    }
    return result;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _inferType(filePath) {
    if (!filePath) return 'unknown';
    const basename = filePath.split(/[\\/]/).pop().toLowerCase();
    const ext = basename.split('.').pop();

    if (basename === '.env' || basename.startsWith('.env.')) return 'env';
    if (basename === 'nginx.conf' || filePath.includes('nginx')) return 'nginx';

    const extMap = {
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      toml: 'toml',
      conf: 'nginx',
      env: 'env'
    };
    return extMap[ext] || 'unknown';
  }
}

module.exports = new ValidatorService();
