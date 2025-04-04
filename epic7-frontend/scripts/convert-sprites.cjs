const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, '../public/epic7-Hero/sprite-hero');
const outputWebp = path.join(__dirname, '../public/epic7-Hero/webp');
const outputAvif = path.join(__dirname, '../public/epic7-Hero/avif');

// Crée les dossiers s'ils n'existent pas
fs.mkdirSync(outputWebp, { recursive: true });
fs.mkdirSync(outputAvif, { recursive: true });

fs.readdirSync(inputDir).forEach((file) => {
  if (file.endsWith('.png')) {
    const fileName = path.parse(file).name;
    const inputPath = path.join(inputDir, file);

    // Génération WebP
    sharp(inputPath)
      .toFormat('webp', { quality: 80 })
      .toFile(path.join(outputWebp, `${fileName}.webp`))
      .then(() => console.log(`✅ ${fileName}.webp généré`));

    // Génération AVIF
    sharp(inputPath)
      .toFormat('avif', { quality: 50 })
      .toFile(path.join(outputAvif, `${fileName}.avif`))
      .then(() => console.log(`✅ ${fileName}.avif généré`));
  }
});
