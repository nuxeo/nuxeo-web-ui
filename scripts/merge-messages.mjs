import path from 'path';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const DEST = '.tmp/i18n';
const CWD = process.cwd();

mkdirSync(DEST, { recursive: true });

const BUNDLES = (process.env.NUXEO_PACKAGES || '')
  .split(/[\s,]+/)
  .filter(Boolean)
  .filter((p) => existsSync(`addons/${p}`));

const SOURCES = [...BUNDLES.map((b) => `addons/${b}/i18n`), 'node_modules/@nuxeo/nuxeo-ui-elements/i18n'];

(async () => {
  const files = await glob('i18n/messages*.json');
  files.forEach(async (file) => {
    const messages = await import(`${CWD}/${file}`, { assert: { type: "json" } });
    const filename = path.basename(file);

    SOURCES.forEach((s) => {
      const p = `${CWD}/${s}/${filename}`;
      if (existsSync(p)) {
        Object.assign(messages, require(p));
      }
    });

    writeFileSync(`${DEST}/${filename}`, JSON.stringify(messages, null, 2));
  });
})();
