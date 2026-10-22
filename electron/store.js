const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let dataFile = '';
let metaFile = '';
let data = null;
let meta = {};
let lastBackup = 0;

const BACKUP_INTERVAL = 30 * 60 * 1000;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeAtomic(file, text) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
}

function init() {
  const dir = app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  dataFile = path.join(dir, 'beyond-human.json');
  metaFile = path.join(dir, 'window-state.json');
  data = readJson(dataFile) ?? readJson(`${dataFile}.bak`);
  meta = readJson(metaFile) ?? {};
}

function getData() {
  return data;
}

function setData(next) {
  if (!next || typeof next !== 'object') return false;
  data = next;
  try {
    const now = Date.now();
    if (now - lastBackup > BACKUP_INTERVAL && fs.existsSync(dataFile)) {
      fs.copyFileSync(dataFile, `${dataFile}.bak`);
      lastBackup = now;
    }
    writeAtomic(dataFile, JSON.stringify(next));
    return true;
  } catch (err) {
    console.error('[store] save failed', err);
    return false;
  }
}

function getMeta() {
  return meta;
}

function setMeta(patch) {
  meta = { ...meta, ...patch };
  try {
    writeAtomic(metaFile, JSON.stringify(meta));
  } catch (err) {
    console.error('[store] meta save failed', err);
  }
}

function getDataPath() {
  return dataFile;
}

module.exports = { init, getData, setData, getMeta, setMeta, getDataPath };
