const fs = require('fs');
const path = require('path');

// Define source and destination paths
const sourceDir = path.join(__dirname, '..', 'node_modules', '@rdkit', 'rdkit', 'dist');
const destDir = path.join(__dirname, '..', 'public', 'static', 'wasm');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy RDKit WASM files
const files = ['RDKit_minimal.js', 'RDKit_minimal.wasm'];

files.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const destPath = path.join(destDir, file);

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied ${file} to ${destPath}`);
  } else {
    console.error(`Source file not found: ${sourcePath}`);
    process.exit(1);
  }
});

console.log('RDKit WASM files copied successfully!');