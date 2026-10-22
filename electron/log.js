const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const MAX_BYTES = 512 * 1024;
let file = '';

function log(message) {
  try {
    if (!file) {
      const dir = path.join(app.getPath('userData'), 'logs');
      fs.mkdirSync(dir, { recursive: true });
      file = path.join(dir, 'main.log');
    }
    if (fs.existsSync(file) && fs.statSync(file).size > MAX_BYTES) fs.renameSync(file, `${file}.old`);
    fs.appendFileSync(file, `${new Date().toISOString()} ${message}\n`, 'utf8');
  } catch {}
}

module.exports = { log };
