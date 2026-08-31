const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '../frontend/node_modules/sharp'));

const IMAGES_DIR = path.join(__dirname, '../frontend/public/images');

async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) return;
  if (filePath.includes('-mobile') || filePath.includes('-temp')) return;

  const baseName = path.basename(filePath, ext);
  const dir = path.dirname(filePath);
  const originalSize = fs.statSync(filePath).size;

  console.log(`Processing: ${path.relative(IMAGES_DIR, filePath)} (${(originalSize / 1024).toFixed(1)} KB)`);

  const image = sharp(filePath);
  const metadata = await image.metadata();
  console.log(`  Dimensions: ${metadata.width}x${metadata.height}`);

  // Generate optimized WebP
  const webpPath = path.join(dir, `${baseName}.webp`);
  await sharp(filePath)
    .webp({ quality: 82, effort: 6 })
    .toFile(webpPath);
  const webpSize = fs.statSync(webpPath).size;
  console.log(`  -> WebP: ${(webpSize / 1024).toFixed(1)} KB (${Math.round((1 - webpSize / originalSize) * 100)}% smaller)`);

  // Generate mobile-specific WebP (max width 750px for mobile retina)
  if (metadata.width > 750) {
    const mobileWebpPath = path.join(dir, `${baseName}-mobile.webp`);
    await sharp(filePath)
      .resize({ width: 750, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(mobileWebpPath);
    const mobileSize = fs.statSync(mobileWebpPath).size;
    console.log(`  -> Mobile WebP (750w): ${(mobileSize / 1024).toFixed(1)} KB (${Math.round((1 - mobileSize / originalSize) * 100)}% smaller)`);

    // Mobile fallback JPEG
    const mobileJpgPath = path.join(dir, `${baseName}-mobile.jpg`);
    await sharp(filePath)
      .resize({ width: 750, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(mobileJpgPath);
  }

  // Also optimize the base JPEG in-place using mozjpeg
  const tempJpg = path.join(dir, `${baseName}-temp.jpg`);
  let maxW = metadata.width > 1600 ? 1600 : metadata.width;
  await sharp(filePath)
    .resize({ width: maxW, withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(tempJpg);
  fs.unlinkSync(filePath);
  fs.renameSync(tempJpg, filePath);
  const newJpgSize = fs.statSync(filePath).size;
  console.log(`  -> Optimized JPEG: ${(newJpgSize / 1024).toFixed(1)} KB (${Math.round((1 - newJpgSize / originalSize) * 100)}% smaller)`);
}

async function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (entry.isFile()) {
      await processFile(fullPath);
    }
  }
}

async function main() {
  console.log("=== OPTIMIZING ALL PUBLIC IMAGES ===");
  await walk(IMAGES_DIR);
  console.log("=== COMPLETED IMAGE OPTIMIZATION ===");
}

main().catch(console.error);
