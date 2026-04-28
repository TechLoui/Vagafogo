import sharp from "sharp";
import { readdir, stat, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = path.resolve(__dirname, "..", "src", "assets");
const MAX_WIDTH = 1920;
const QUALITY = 82;

async function walk(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function optimize(file) {
  const before = (await stat(file)).size;
  if (before < 200 * 1024) return { file, skipped: true };

  const input = await readFile(file);
  const output = await sharp(input)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true, progressive: true })
    .toBuffer();

  await writeFile(file, output);
  const after = output.length;
  return { file, before, after };
}

const files = await walk(ASSETS_DIR);
console.log(`Encontradas ${files.length} imagens em ${ASSETS_DIR}\n`);

let totalBefore = 0;
let totalAfter = 0;
for (const file of files) {
  try {
    const result = await optimize(file);
    if (result.skipped) {
      console.log(`  pulado (pequeno): ${path.relative(ASSETS_DIR, file)}`);
      continue;
    }
    totalBefore += result.before;
    totalAfter += result.after;
    const reduction = (((result.before - result.after) / result.before) * 100).toFixed(1);
    console.log(
      `  ${path.relative(ASSETS_DIR, file)}: ${(result.before / 1024 / 1024).toFixed(2)}MB -> ${(result.after / 1024 / 1024).toFixed(2)}MB (-${reduction}%)`
    );
  } catch (error) {
    console.error(`  ERRO em ${path.relative(ASSETS_DIR, file)}:`, error.message);
  }
}

console.log(
  `\nTotal: ${(totalBefore / 1024 / 1024).toFixed(2)}MB -> ${(totalAfter / 1024 / 1024).toFixed(2)}MB (economia: ${((totalBefore - totalAfter) / 1024 / 1024).toFixed(2)}MB)`
);
