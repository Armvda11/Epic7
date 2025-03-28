import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const inputFile = path.resolve('public/epic7-Hero/sprite-hero/hwayoung.png');
const outputFile = path.resolve('public/epic7-Hero/webp/hwayoung.webp');

if (!fs.existsSync(inputFile)) {
  console.error("❌ Image source introuvable :", inputFile);
  process.exit(1);
}

sharp(inputFile)
  .webp({ quality: 85 })
  .toFile(outputFile)
  .then(() => {
    console.log("✅ Image convertie avec succès :", outputFile);
  })
  .catch((err) => {
    console.error("❌ Erreur pendant la conversion :", err);
  });
