const fs = require('fs');
const path = require('path');

const source = process.argv[2] || 'Sample-project-list/sample-2D-shooting/assets';
const target = process.argv[3] || 'public/assets';

if (!fs.existsSync(source)) {
  console.error(`Source assets directory not found: ${source}`);
  process.exit(1);
}
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(source, target, { recursive: true });
console.log(JSON.stringify({ source, target, synced: true }, null, 2));
