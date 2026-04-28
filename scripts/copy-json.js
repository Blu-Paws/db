const fs = require('node:fs');
const path = require('node:path');

const sourceRoot = path.resolve(__dirname, '..', 'src');
const targetRoot = path.resolve(__dirname, '..', 'dist');

const copyJsonFiles = (sourceDir, targetDir) => {
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyJsonFiles(sourcePath, targetPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }

    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
};

copyJsonFiles(sourceRoot, targetRoot);
