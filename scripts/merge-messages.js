const glob = require('glob');
const fs = require('fs');
const path = require('path');

const DEST = '.tmp/i18n';
const CWD = process.cwd();

fs.mkdirSync(DEST, { recursive: true });

glob('i18n/messages*.json', (_, files) =>
  files.forEach((file) => {
    const messages = require(`${CWD}/${file}`);
    const filename = path.basename(file);
    const p = `${CWD}/node_modules/@nuxeo/nuxeo-ui-elements/i18n/${filename}`;
    if (fs.existsSync(p)) {
      Object.assign(messages, require(p));
    }
    fs.writeFileSync(`${DEST}/${filename}`, JSON.stringify(messages, null, 2));
  }),
);
