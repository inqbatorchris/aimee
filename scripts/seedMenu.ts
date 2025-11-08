/**
 * Simple menu seeding script to populate initial menu data
 */

import { db } from '../server/db.js';
import { menuSections, menuItems } from '../shared/schema.js';

async function seedMenu() {
  try {
    console.log('Creating initial menu sections...');
    
    // Create main sections
    const [mainSection] = await db.insert(menuSections).values({
      organizationId: 1,
      name: 'Main',
      description: 'Main navigation',
      icon: 'Home',
      orderIndex: 0,
      isVisible: true,
      isCollapsible: false,
      isDefaultExpanded: true,
      rolePermissions: [],
    }).returning();

    const [strategySection] = await db.insert(menuSections).values({
      organizationId: 1,
      name: 'Strategy & OKRs',
      description: 'Strategy and objectives',
      icon: 'Target',
      orderIndex: 1,
      isVisible: true,
      isCollapsible: true,
      isDefaultExpanded: true,
      rolePermissions: [],
    }).returning();

    const [devSection] = await db.insert(menuSections).values({
      organizationId: 1,
      name: 'Developer Tools',
      description: 'Developer and admin tools',
      icon: 'Code',
      orderIndex: 2,
      isVisible: true,
      isCollapsible: true,
      isDefaultExpanded: false,
      rolePermissions: ['super_admin', 'admin', 'dev'],
    }).returning();

    console.log('Creating menu items...');

    // Main section items
    await db.insert(menuItems).values([
      {
        organizationId: 1,
        sectionId: mainSection.id,
        title: 'My Day',
        path: '/my-day',
        icon: 'LayoutDashboard',
        orderIndex: 0,
        isVisible: true,
        status: 'active',
        rolePermissions: [],
      }
    ]);

    // Strategy section items
    await db.insert(menuItems).values([
      {
        organizationId: 1,
        sectionId: strategySection.id,
        title: 'Mission & Vision',
        path: '/strategy/mission',
        icon: 'Target',
        orderIndex: 0,
        isVisible: true,
        status: 'active',
        rolePermissions: [],
      },
      {
        organizationId: 1,
        sectionId: strategySection.id,
        title: 'Objectives',
        path: '/objectives/work',
        icon: 'CheckCircle',
        orderIndex: 1,
        isVisible: true,
        status: 'active',
        rolePermissions: [],
      }
    ]);

    // Developer tools items
    await db.insert(menuItems).values([
      {
        organizationId: 1,
        sectionId: devSection.id,
        title: 'Page Manager',
        path: '/dev-tools?tab=pages',
        icon: 'FileText',
        orderIndex: 0,
        isVisible: true,
        status: 'active',
        rolePermissions: ['super_admin', 'admin', 'dev'],
      },
      {
        organizationId: 1,
        sectionId: devSection.id,
        title: 'Menu Builder',
        path: '/dev-tools?tab=menu',
        icon: 'Menu',
        orderIndex: 1,
        isVisible: true,
        status: 'active',
        rolePermissions: ['super_admin', 'admin', 'dev'],
      }
    ]);

    console.log('Menu seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding menu:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMenu()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedMenu };