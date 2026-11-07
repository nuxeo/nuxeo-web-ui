import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const SEVERITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 };
const MAX_READ_ATTEMPTS = 4;

export function highestSeverity(severities) {
  return severities.reduce((best, current) => (SEVERITY_RANK[current] > SEVERITY_RANK[best] ? current : best), 'low');
}

export function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function canonical(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort((a, b) => a.localeCompare(b, 'en'))
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function digest(value) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

export function shortHash(value, length = 12) {
  return digest(value).slice(0, length);
}

export function quarterExpired(quarter, now) {
  const match = /^(\d{4})-Q([1-4])$/.exec(quarter || '');
  if (!match) {
    return true;
  }
  return now.getTime() >= Date.UTC(Number(match[1]), Number(match[2]) * 3, 1);
}

export function alertId(repository, number) {
  return `${repository}#${number}`;
}

// Public Actions logs: only print aggregate, non-sensitive progress lines.
export function log(message) {
  process.stdout.write(`${message}\n`);
}

/**
 * Runs `fn` over `items` one at a time, in order. Used for remote writes, which must stay ordered so the
 * action journal reflects exactly what was attempted.
 */
export function mapSequential(items, fn) {
  const results = [];
  return items
    .reduce(
      (chain, item, index) =>
        chain.then(async () => {
          results.push(await fn(item, index));
        }),
      Promise.resolve(),
    )
    .then(() => results);
}

export class RequestError extends Error {
  constructor(service, method, status, label) {
    // Never include URLs with query strings, credentials or response bodies.
    const suffix = status ? `: HTTP ${status}` : '';
    super(`${service} ${method} ${label} failed${suffix}`);
    this.service = service;
    this.method = method;
    this.status = status;
  }
}

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function retryDelayMs(response, attempt) {
  const retryAfter = Number(response.headers.get('retry-after')) || 2 ** attempt;
  return Math.min(retryAfter, 60) * 1000;
}

async function attemptRequest(options, attempt) {
  const { service, url, method = 'GET', headers = {}, body, label, timeoutMs = 60000 } = options;
  // Writes are never retried here: an uncertain write must be reconciled against remote state by the caller.
  const retryable = method === 'GET' && attempt < MAX_READ_ATTEMPTS;
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: { Accept: 'application/json', 'User-Agent': 'nuxeo-dependabot-ai-triage', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (retryable) {
      await sleep(1000 * 2 ** attempt);
      return attemptRequest(options, attempt + 1);
    }
    const failure = new RequestError(service, method, 0, label);
    failure.uncertain = method !== 'GET';
    failure.cause = error.name;
    throw failure;
  }
  if (retryable && (response.status === 429 || response.status >= 500)) {
    await sleep(retryDelayMs(response, attempt));
    return attemptRequest(options, attempt + 1);
  }
  if (!response.ok) {
    const failure = new RequestError(service, method, response.status, label);
    // A 5xx after a write may still have been applied remotely.
    failure.uncertain = method !== 'GET' && response.status >= 500;
    throw failure;
  }
  const text = await response.text();
  return { data: text ? JSON.parse(text) : {}, headers: response.headers, status: response.status };
}

/** JSON HTTP request with bounded retries for idempotent reads. */
export function request(options) {
  return attemptRequest(options, 1);
}

// Minimal semver comparison sufficient for npm advisory ranges such as ">= 9.0.0, < 9.0.7" or "< 2.31.0".
export function parseVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(version ?? '').trim());
  if (!match) {
    return null;
  }
  return { parts: [Number(match[1]), Number(match[2]), Number(match[3])], pre: match[4] ?? '' };
}

function comparePre(left, right) {
  if (left === right) {
    return 0;
  }
  if (!left || !right) {
    return left ? -1 : 1;
  }
  return left.localeCompare(right, 'en', { numeric: true });
}

export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) {
    return Number.NaN;
  }
  const index = left.parts.findIndex((part, i) => part !== right.parts[i]);
  if (index >= 0) {
    return left.parts[index] < right.parts[index] ? -1 : 1;
  }
  return comparePre(left.pre, right.pre);
}

const OPERATORS = {
  '>=': (result) => result >= 0,
  '<=': (result) => result <= 0,
  '>': (result) => result > 0,
  '<': (result) => result < 0,
  '=': (result) => result === 0,
};

/** @returns {boolean|null} null when the comparator cannot be evaluated. */
function satisfiesComparator(version, comparator) {
  const match = /^(>=|<=|>|<|=)?\s*(\S+)$/.exec(comparator);
  const result = match ? compareVersions(version, match[2]) : Number.NaN;
  return Number.isNaN(result) ? null : OPERATORS[match[1] || '='](result);
}

/** @returns {boolean|null} null when the range or version cannot be evaluated. */
export function inAdvisoryRange(version, range) {
  if (!parseVersion(version) || !range) {
    return null;
  }
  const results = String(range)
    .split('||')
    .map((alternative) =>
      alternative
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((comparator) => satisfiesComparator(version, comparator)),
    );
  if (results.some((alternative) => !alternative.length || alternative.includes(null))) {
    return null;
  }
  return results.some((alternative) => alternative.every(Boolean));
}

// Atlassian Document Format helpers.
const BLOCK_NODES = new Set(['paragraph', 'heading', 'listItem', 'codeBlock', 'tableRow', 'blockquote', 'rule']);

export function textOf(node) {
  if (!node) {
    return '';
  }
  if (typeof node === 'string') {
    return node;
  }
  if (node.type === 'text') {
    return node.text ?? '';
  }
  if (node.type === 'hardBreak') {
    return '\n';
  }
  if (node.type === 'inlineCard' || node.type === 'blockCard') {
    return node.attrs?.url ?? '';
  }
  const inner = (node.content ?? []).map(textOf).join('');
  return BLOCK_NODES.has(node.type) ? `${inner}\n` : inner;
}

export function adfText(text, marks) {
  return { type: 'text', text, ...(marks ? { marks } : {}) };
}

export function adfLink(text, href) {
  return adfText(text, [{ type: 'link', attrs: { href } }]);
}

export function adfParagraph(...content) {
  return { type: 'paragraph', content: content.flat().filter(Boolean) };
}

export function adfHeading(text, level = 3) {
  return { type: 'heading', attrs: { level }, content: [adfText(text)] };
}

export function adfBullets(items) {
  return {
    type: 'bulletList',
    content: items.map((item) => {
      return { type: 'listItem', content: [Array.isArray(item) ? adfParagraph(...item) : adfParagraph(adfText(item))] };
    }),
  };
}

export function adfCode(text, language = 'json') {
  return { type: 'codeBlock', attrs: { language }, content: [adfText(text)] };
}

export function adfDoc(content) {
  return { type: 'doc', version: 1, content: content.filter(Boolean) };
}

export function clip(value, limit) {
  const text = String(value ?? '');
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

export function isMainModule(metaUrl) {
  return Boolean(process.argv[1]) && fileURLToPath(metaUrl) === path.resolve(process.argv[1]);
}
