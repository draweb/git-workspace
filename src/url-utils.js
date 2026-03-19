'use strict';

/**
 * Parse SSH URL and extract host.
 * Supports: git@host:path and ssh://git@host/path
 */
function parseSshUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  const u = url.trim();
  let host = null;
  let pathPart = null;
  if (u.startsWith('ssh://')) {
    const match = u.match(/^ssh:\/\/[^/]+@([^/]+)(\/.*)?$/);
    if (match) {
      host = match[1];
      pathPart = (match[2] || '/').replace(/^\//, '');
    }
  } else if (u.includes('@') && u.includes(':')) {
    const afterAt = u.slice(u.indexOf('@') + 1);
    const colon = afterAt.indexOf(':');
    if (colon !== -1) {
      host = afterAt.slice(0, colon);
      pathPart = afterAt.slice(colon + 1);
    }
  }
  if (!host) return null;
  return { host, pathPart, isSsh: true };
}

function isSshUrl(url) {
  return parseSshUrl(url) !== null;
}

/**
 * Build aliased SSH URL: replace host with workspace.host
 */
function buildAliasedUrl(originalUrl, aliasHost) {
  const parsed = parseSshUrl(originalUrl);
  if (!parsed) return null;
  const u = originalUrl.trim();
  if (u.startsWith('ssh://')) {
    const beforeHost = u.match(/^ssh:\/\/[^/]+@/)[0];
    const afterHost = (parsed.pathPart ? '/' + parsed.pathPart : '');
    return `${beforeHost}${aliasHost}${afterHost}`;
  }
  const beforeHost = u.slice(0, u.indexOf(parsed.host));
  const afterHost = u.slice(u.indexOf(parsed.host) + parsed.host.length);
  return `${beforeHost}${aliasHost}${afterHost}`;
}

module.exports = {
  parseSshUrl,
  isSshUrl,
  buildAliasedUrl
};
