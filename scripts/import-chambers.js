import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse KML XML to extract chambers
function parseKML(kmlContent) {
  const chambers = [];
  
  // Simple regex-based parsing for Placemark elements
  const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g;
  const nameRegex = /<name>(.*?)<\/name>/;
  const coordinatesRegex = /<coordinates>(.*?)<\/coordinates>/;
  
  let match;
  while ((match = placemarkRegex.exec(kmlContent)) !== null) {
    const placemarkContent = match[1];
    
    const nameMatch = nameRegex.exec(placemarkContent);
    const coordMatch = coordinatesRegex.exec(placemarkContent);
    
    if (nameMatch && coordMatch) {
      const name = nameMatch[1].trim();
      const coords = coordMatch[1].trim().split(',');
      
      // Only import chambers (names starting with 'C' followed by numbers)
      // Skip other placemarks like "Meet Me Room"
      if (/^C\d+/.test(name)) {
        chambers.push({
          name,
          longitude: parseFloat(coords[0]),
          latitude: parseFloat(coords[1])
        });
      }
    }
  }
  
  return chambers;
}

async function importChambers() {
  try {
    // Read KML file
    const kmlPath = join(__dirname, '..', 'attached_assets', 'kmz_extracted', 'doc.kml');
    console.log('Reading KML file...');
    const kmlContent = await readFile(kmlPath, 'utf-8');
    
    // Parse chambers
    console.log('Parsing chambers...');
    const chambers = parseKML(kmlContent);
    console.log(`Found ${chambers.length} chambers`);
    
    // Connect to database
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    
    await client.connect();
    console.log('Connected to database');
    
    // Get organization_id (assuming first org for now)
    const orgResult = await client.query('SELECT id FROM organizations LIMIT 1');
    if (orgResult.rows.length === 0) {
      throw new Error('No organization found in database');
    }
    const organizationId = orgResult.rows[0].id;
    console.log(`Using organization ID: ${organizationId}`);
    
    // Import chambers
    console.log('Importing chambers...');
    let imported = 0;
    
    for (const chamber of chambers) {
      try {
        await client.query(
          `INSERT INTO fiber_network_nodes (
            organization_id,
            name,
            node_type,
            status,
            latitude,
            longitude,
            notes,
            photos,
            fiber_details
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            organizationId,
            chamber.name,
            'chamber',
            'active',
            chamber.latitude,
            chamber.longitude,
            `Imported from KML file`,
            '[]',
            '{}'
          ]
        );
        imported++;
      } catch (err) {
        console.error(`Error importing chamber ${chamber.name}:`, err.message);
      }
    }
    
    console.log(`Successfully imported ${imported} chambers`);
    
    await client.end();
    
  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  }
}

importChambers();
