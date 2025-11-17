import { db } from './server/db.js';
import { integrations } from './shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { SplynxService } from './server/services/integrations/splynxService.js';

async function testSplynxLabels() {
  try {
    // Get Splynx integration credentials for organization 4
    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.organizationId, 4),
        eq(integrations.type, 'splynx')
      )
    });

    if (!integration || !integration.credentials) {
      console.log('❌ No Splynx integration found');
      process.exit(1);
    }

    console.log('✅ Found Splynx integration');

    // Create service instance
    const service = new SplynxService(integration.credentials);

    // Query customers in LIST mode to get full records
    console.log('\n📡 Fetching customers from Splynx...\n');
    
    const result = await service.queryEntities({
      entity: 'customers',
      mode: 'list',
      filters: [],
      limit: 5  // Just get first 5 customers
    });

    console.log(`Found ${result.count} customers\n`);

    // Show the first customer with labels
    if (result.records && result.records.length > 0) {
      const firstCustomer = result.records[0];
      
      console.log('=====================================');
      console.log('CUSTOMER RECORD #1');
      console.log('=====================================\n');
      console.log('ID:', firstCustomer.id);
      console.log('\n--- ATTRIBUTES ---');
      console.log(JSON.stringify(firstCustomer.attributes, null, 2));
      
      console.log('\n--- LABELS FIELD (exact format) ---');
      console.log('Type:', typeof firstCustomer.attributes.labels);
      console.log('Value:', firstCustomer.attributes.labels);
      console.log('JSON:', JSON.stringify(firstCustomer.attributes.labels, null, 2));
      
      // Show a few more customers if they have labels
      console.log('\n\n=====================================');
      console.log('OTHER CUSTOMERS WITH LABELS');
      console.log('=====================================\n');
      
      for (let i = 0; i < Math.min(result.records.length, 5); i++) {
        const customer = result.records[i];
        if (customer.attributes.labels) {
          console.log(`Customer ${customer.id}: ${customer.attributes.name}`);
          console.log(`  Labels: ${JSON.stringify(customer.attributes.labels)}\n`);
        }
      }
    } else {
      console.log('❌ No customers found');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testSplynxLabels();
