const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const roots = process.argv.slice(2);
const scanRoots = roots.length ? roots : ['Sample-project-list', 'public/assets', 'sample-project', 'assets-for-sample'];
const mediaExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp3', '.wav', '.ogg', '.m4a']);
const hashes = new Map();

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, name);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!mediaExtensions.has(path.extname(name).toLowerCase())) continue;
    if (stat.size <= 0) continue;
    const hash = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
    if (!hashes.has(hash)) hashes.set(hash, []);
    hashes.get(hash).push(fullPath.replace(/\\/g, '/'));
  }
}

for (const root of scanRoots) walk(root);
const groups = [...hashes.values()];
const duplicateGroups = groups.filter((group) => group.length > 1);
const report = {
  roots: scanRoots,
  mediaFiles: groups.reduce((total, group) => total + group.length, 0),
  uniqueHashes: groups.length,
  duplicateGroups: duplicateGroups.length,
  duplicateFiles: duplicateGroups.reduce((total, group) => total + group.length, 0),
  duplicates: duplicateGroups
};
console.log(JSON.stringify(report, null, 2));
