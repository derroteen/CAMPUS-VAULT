const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;

const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'public', 'logo.svg');
const svg = fs.readFileSync(svgPath);

const brand = '#1B4332';

async function generate() {
  const base = sharp(svg, { density: 512 });

  await base.resize(192, 192).png().toFile(path.join(root, 'public', 'icon-192.png'));
  await base.resize(512, 512).png().toFile(path.join(root, 'public', 'icon-512.png'));

  const maskable = sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 27, g: 67, b: 50, alpha: 1 },
    },
  });

  const safeLogo = await sharp(svg, { density: 512 })
    .resize(360, 360, { fit: 'contain', background: brand })
    .png()
    .toBuffer();

  await maskable
    .composite([{ input: safeLogo, top: 76, left: 76 }])
    .png()
    .toFile(path.join(root, 'public', 'icon-maskable-512.png'));

  const appleTouch = sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 27, g: 67, b: 50, alpha: 1 },
    },
  });

  const appleLogo = await sharp(svg, { density: 512 })
    .resize(128, 128, { fit: 'contain', background: brand })
    .png()
    .toBuffer();

  await appleTouch
    .composite([{ input: appleLogo, top: 26, left: 26 }])
    .png()
    .toFile(path.join(root, 'public', 'apple-touch-icon.png'));

  // Build favicon sizes by rendering large first, then downscaling with lanczos3
  // to preserve thin stroke details better than direct tiny rasterization.
  const faviconMaster = await sharp(svg, { density: 2048 })
    .resize(128, 128, { fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const favicon16 = await sharp(faviconMaster)
    .resize(16, 16, { kernel: 'lanczos3' })
    .sharpen()
    .png({ compressionLevel: 9 })
    .toBuffer();

  const favicon32 = await sharp(faviconMaster)
    .resize(32, 32, { kernel: 'lanczos3' })
    .sharpen()
    .png({ compressionLevel: 9 })
    .toBuffer();

  const favicon48 = await sharp(faviconMaster)
    .resize(48, 48, { kernel: 'lanczos3' })
    .sharpen()
    .png({ compressionLevel: 9 })
    .toBuffer();

  const faviconBuffer = await pngToIco([favicon16, favicon32, favicon48]);
  fs.writeFileSync(path.join(root, 'public', 'favicon.ico'), faviconBuffer);

  console.log('Generated icon assets:');
  for (const filename of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon.ico']) {
    const file = path.join(root, 'public', filename);
    const size = fs.statSync(file).size;

    if (filename.endsWith('.ico')) {
      console.log(`${filename}: ${size} bytes`);
      continue;
    }

    const meta = await sharp(file).metadata();
    console.log(`${filename}: ${meta.width}x${meta.height}, ${size} bytes`);
  }
}

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});
