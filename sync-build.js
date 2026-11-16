const fs = require('fs');
const path = require('path');

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
  copyFolderRecursiveSync(sourceDist, rootDist);
  copyFolderRecursiveSync(sourceDist, rootPublic);
  
  // Also copy index.html and assets directly to root for fallback
  const indexHtml = path.join(sourceDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    fs.copyFileSync(indexHtml, path.join(__dirname, 'index.html'));
  }
  const assetsFolder = path.join(sourceDist, 'assets');
  if (fs.existsSync(assetsFolder)) {
    copyFolderRecursiveSync(assetsFolder, path.join(__dirname, 'assets'));
  }
  console.log('Successfully synced build artifacts to dist, public, and root!');
} else {
  console.warn('Source dist does not exist:', sourceDist);
}
