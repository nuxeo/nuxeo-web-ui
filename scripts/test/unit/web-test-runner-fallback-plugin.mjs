/**
 * Dev-server fallback responses for stray component requests during unit tests.
 *
 * Components often fire iron-ajax / Nuxeo REST calls that are not stubbed in every suite.
 * Without fallbacks the dev server returns HTML 404 pages, the client rejects with
 * "Invalid json", and Web Test Runner logs hundreds of 404 / promise errors.
 */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const EMPTY_DOCUMENTS = JSON.stringify({
  'entity-type': 'documents',
  entries: [],
  isPaginable: true,
  isLazy: true,
  currentPageSize: 0,
  numberOfPages: 0,
});

const EMPTY_ENTITY = JSON.stringify({ 'entity-type': 'entity', properties: {} });

/** Minimal valid JPEG (1×1 px) for theme preview requests. */
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/' +
    'wAALCAABAAEBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APvV2yCo8X5qKKKKAP/Z',
  'base64',
);

function fallbackBody(urlPath) {
  if (urlPath.startsWith('/api/v1/search/') || urlPath.startsWith('/api/v1/task')) {
    return EMPTY_DOCUMENTS;
  }
  if (urlPath.startsWith('/api/v1/automation/')) {
    return EMPTY_ENTITY;
  }
  if (urlPath.startsWith('/api/v1/')) {
    return EMPTY_ENTITY;
  }
  if (urlPath.startsWith('/json/')) {
    return '{}';
  }
  if (urlPath.endsWith('.html')) {
    return '<html><head></head><body></body></html>';
  }
  if (urlPath.endsWith('.jpg') || urlPath.endsWith('.jpeg')) {
    return TINY_JPEG;
  }
  return null;
}

export function nuxeoTestFallbackPlugin() {
  return {
    name: 'nuxeo-test-fallback',
    serve(context) {
      const urlPath = context.path.split('?')[0];
      const diskPath = path.join(rootDir, urlPath.replace(/^\//, ''));
      if (fs.existsSync(diskPath)) {
        return undefined;
      }
      const body = fallbackBody(urlPath);
      if (body == null) {
        return undefined;
      }
      if (body instanceof Uint8Array) {
        return { body, type: 'jpeg' };
      }
      if (urlPath.endsWith('.html')) {
        return { body, type: 'html' };
      }
      return { body, type: 'js', headers: JSON_HEADERS };
    },
  };
}
