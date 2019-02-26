const glob = require('glob');
const fs = require('fs');
const path = require('path');

const DEST = '.tmp/i18n';
const CWD = process.cwd();

fs.mkdirSync(DEST, {recursive: true});

glob('i18n/messages*.json', (_, files) => files.forEach(file => {
  let messages = require(`${CWD}/${file}`);
  let filename = path.basename(file);
  let p = `${CWD}/node_modules/@nuxeo/nuxeo-ui-elements/i18n/${filename}`;
  if (fs.existsSync(p)) {
    Object.assign(messages, require(p));
  }
  fs.writeFileSync(`${DEST}/${filename}`, JSON.stringify(messages, null, 2));
}));
