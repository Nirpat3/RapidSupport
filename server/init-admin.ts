import { hash } from 'bcryptjs';
import { db } from './db';
import { users, customers } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Ensures default users exist in the database with proper roles and permissions
 * Creates Super Admin, Agent, and Customer users
 */
export async function ensureAdminExists() {
  try {
    // 1. Create or verify Super Admin user
    const adminExists = await db
      .select()
      .from(users)
      .where(eq(users.email, 'Admin@ris.com'))
      .limit(1);

    if (adminExists.length === 0) {
      console.log('Creating Super Admin user...');
      const hashedAdminPassword = await hash('Admin$123', 10);
      
      await db.insert(users).values({
        email: 'Admin@ris.com',
        password: hashedAdminPassword,
        name: 'Super Admin',
        role: 'admin',
        status: 'online'
      });

      console.log('✅ Super Admin created:');
      console.log('   Email: Admin@ris.com');
      console.log('   Password: Admin$123');
      console.log('   Role: admin (Full system access)');
    } else {
      console.log('✅ Super Admin user exists (Admin@ris.com)');
    }

    // 2. Create or verify Agent user
    const agentExists = await db
      .select()
      .from(users)
      .where(eq(users.email, 'Agent@rapidrms.com'))
      .limit(1);

    if (agentExists.length === 0) {
      console.log('Creating Agent user...');
      const hashedAgentPassword = await hash('Agent$123', 10);
      
      await db.insert(users).values({
        email: 'Agent@rapidrms.com',
        password: hashedAgentPassword,
        name: 'Support Agent',
        role: 'agent',
        status: 'online'
      });

      console.log('✅ Agent created:');
      console.log('   Email: Agent@rapidrms.com');
      console.log('   Password: Agent$123');
      console.log('   Role: agent (Handle conversations, manage assigned cases)');
    } else {
      console.log('✅ Agent user exists (Agent@rapidrms.com)');
    }

    // 3. Create or verify Customer user with portal access
    const customerExists = await db
      .select()
      .from(customers)
      .where(eq(customers.email, 'Customer@rms.com'))
      .limit(1);

    if (customerExists.length === 0) {
      console.log('Creating Customer user...');
      const hashedCustomerPassword = await hash('Customer$123', 10);
      
      await db.insert(customers).values({
        name: 'Portal Customer',
        email: 'Customer@rms.com',
        phone: '+1-800-123-4567',
        company: 'Customer Organization',
        status: 'offline',
        portalPassword: hashedCustomerPassword,
        hasPortalAccess: true
      });

      console.log('✅ Customer created:');
      console.log('   Email: Customer@rms.com');
      console.log('   Password: Customer$123');
      console.log('   Role: customer (Portal access - view support history, submit feedback)');
    } else {
      console.log('✅ Customer user exists (Customer@rms.com)');
    }

    console.log('\n📋 User Roles & Permissions:');
    console.log('   Super Admin (Admin@ris.com): Full system access, user management, all settings');
    console.log('   Agent (Agent@rapidrms.com): Handle conversations, manage assigned cases');
    console.log('   Customer (Customer@rms.com): Portal access, view history, submit feedback');
    
  } catch (error) {
    console.error('Error ensuring users exist:', error);
    // Don't throw - let the app start even if this fails
  }
}
