const path = require("node:path");
const sharp = require("sharp");

const frontendDirectory = path.resolve(__dirname, "..");
const sourceImages = [
  "src/assets/hero/hero-1.jpg",
  "src/assets/hero/hero-2.jpg",
  "src/assets/Carrossel-1.jpg",
  "src/assets/Carrossel-2.jpg",
  "src/assets/Carrossel-3.jpg",
  "src/assets/brunch/brunch-1.jpg",
  "src/assets/brunch/brunch-3.jpg",
  "src/assets/brunch/frutas/brunch-1.jpg",
  "src/assets/brunch/frutas/brunch-2.jpg",
  "src/assets/brunch/harmonizacoes/brunch-1.jpg",
  "src/assets/brunch/harmonizacoes/brunch-3.jpg",
  "src/assets/brunch/laticinios/brunch-1.jpg",
  "src/assets/brunch/laticinios/brunch-2.jpg",
  "src/assets/brunch/laticinios/brunch-3.jpg",
];

const responsiveHeroImages = [
  "src/assets/hero/hero-1.jpg",
  "src/assets/hero/hero-2.jpg",
  "src/assets/Carrossel-1.jpg",
  "src/assets/brunch/brunch-3.jpg",
];

async function optimize() {
  await Promise.all(
    sourceImages.map(async (relativeInput) => {
      const input = path.join(frontendDirectory, ...relativeInput.split("/"));
      const output = input.replace(/\.jpe?g$/i, ".webp");

      await sharp(input)
        .rotate()
        .resize({ width: 1440, withoutEnlargement: true })
        .webp({ quality: 76, effort: 6 })
        .toFile(output);

      console.log(`[imagem] ${path.relative(frontendDirectory, output)}`);
    }),
  );

  await Promise.all(
    responsiveHeroImages.map(async (relativeInput) => {
      const input = path.join(frontendDirectory, ...relativeInput.split("/"));
      const output = input.replace(/\.jpe?g$/i, "-800.webp");

      await sharp(input)
        .rotate()
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 72, effort: 6 })
        .toFile(output);

      console.log(`[imagem responsiva] ${path.relative(frontendDirectory, output)}`);
    }),
  );
}

optimize().catch((error) => {
  console.error("[imagem] Falha ao otimizar imagens:", error);
  process.exitCode = 1;
});
