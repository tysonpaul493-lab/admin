const fs = require('fs');
const path = require('path');

function emptyDirSync(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(source)) return;
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

const sourceDist = path.join(__dirname, 'frontend', 'dist');
const rootDist = path.join(__dirname, 'dist');
const rootPublic = path.join(__dirname, 'public');

if (fs.existsSync(sourceDist)) {
  emptyDirSync(rootDist);
  emptyDirSync(rootPublic);
  copyFolderRecursiveSync(sourceDist, rootDist);
  copyFolderRecursiveSync(sourceDist, rootPublic);
  
  // Also copy index.html and assets directly to root for fallback
  const indexHtml = path.join(sourceDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    fs.copyFileSync(indexHtml, path.join(__dirname, 'index.html'));
  }
  const assetsFolder = path.join(sourceDist, 'assets');
  if (fs.existsSync(assetsFolder)) {
    emptyDirSync(path.join(__dirname, 'assets'));
    copyFolderRecursiveSync(assetsFolder, path.join(__dirname, 'assets'));
  }
  console.log('Successfully synced clean build artifacts to dist, public, and root!');
} else {
  console.warn('Source dist does not exist:', sourceDist);
}
