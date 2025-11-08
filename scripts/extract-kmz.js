import extract from 'extract-zip';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const kmzPath = join(__dirname, '..', 'attached_assets', '2025.10.14 - PPP Chambers_1760473324114.kmz');
const outputDir = join(__dirname, '..', 'attached_assets', 'kmz_extracted');

try {
  console.log('Extracting KMZ file...');
  await extract(kmzPath, { dir: outputDir });
  console.log('Extraction complete!');
} catch (err) {
  console.error('Error extracting KMZ:', err);
  process.exit(1);
}
