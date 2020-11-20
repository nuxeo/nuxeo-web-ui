const glob = require('glob');
const { mkdirSync, existsSync, writeFileSync } = require('fs');
const path = require('path');

const DEST = '.tmp/i18n';
const CWD = process.cwd();

mkdirSync(DEST, { recursive: true });

const BUNDLES = (process.env.NUXEO_PACKAGES || '')
  .split(/[\s,]+/)
  .filter(Boolean)
  .filter((p) => existsSync(`addons/${p}`));

const SOURCES = [...BUNDLES.map((b) => `addons/${b}/i18n`), 'node_modules/@nuxeo/nuxeo-ui-elements/i18n'];

glob('i18n/messages*.json', (_, files) =>
  files.forEach((file) => {
    const messages = require(`${CWD}/${file}`);
    const filename = path.basename(file);

    SOURCES.forEach((s) => {
      const p = `${CWD}/${s}/${filename}`;
      if (existsSync(p)) {
        Object.assign(messages, require(p));
      }
    });

    writeFileSync(`${DEST}/${filename}`, JSON.stringify(messages, null, 2));
  }),
);
