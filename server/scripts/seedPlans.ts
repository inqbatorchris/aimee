import { db } from '../db';
import { plans } from '../../shared/schema';

async function seedPlans() {
  console.log('Seeding subscription plans...');
  
  const defaultPlans = [
    {
      name: 'Starter',
      type: 'paid' as const,
      maxUsers: 5,
      maxStorageGb: 10,
      priceMonthly: '29.00',
      features: ['Basic CRM', 'Email Support', 'Basic Analytics', '5 Users', '10GB Storage']
    },
    {
      name: 'Professional',
      type: 'paid' as const,
      maxUsers: 20,
      maxStorageGb: 50,
      priceMonthly: '79.00',
      features: ['Advanced CRM', 'Priority Support', 'Advanced Analytics', 'API Access', 'Custom Integrations', '20 Users', '50GB Storage']
    },
    {
      name: 'Enterprise',
      type: 'enterprise' as const,
      maxUsers: 999, // Very high number instead of -1
      maxStorageGb: 999, // Very high number instead of -1
      priceMonthly: '199.00',
      features: ['Everything in Professional', 'Dedicated Support', 'Custom Training', 'SLA', 'White Labeling', 'Unlimited Users', 'Unlimited Storage']
    }
  ];

  try {
    // Check if plans already exist
    const existingPlans = await db.select().from(plans);
    
    if (existingPlans.length === 0) {
      // Insert default plans
      await db.insert(plans).values(defaultPlans);
      console.log('✅ Successfully seeded', defaultPlans.length, 'subscription plans');
    } else {
      console.log('ℹ️ Plans already exist, skipping seed');
    }
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    throw error;
  }
}

// Run the seed function
seedPlans()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });

export { seedPlans };