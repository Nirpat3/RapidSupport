import { hash } from 'bcryptjs';
import { db } from './db';
import { users, customers, organizations, workspaces, workspaceMembers, departments } from '@shared/schema';
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
        isPlatformAdmin: true,
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

    // 4. Create or verify default workspace
    await ensureDefaultWorkspace();
    
  } catch (error) {
    console.error('Error ensuring users exist:', error);
    // Don't throw - let the app start even if this fails
  }
}

/**
 * Ensures a default workspace exists with default departments
 */
async function ensureDefaultWorkspace() {
  try {
    const defaultOrgSlug = 'default-org';
    const defaultWorkspaceSlug = 'default';
    
    // First ensure a default organization exists
    let organizationId: string;
    
    const existingOrg = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, defaultOrgSlug))
      .limit(1);
    
    if (existingOrg.length === 0) {
      console.log('\n🏛️ Creating default organization...');
      
      const [newOrg] = await db.insert(organizations).values({
        name: 'Default Organization',
        slug: defaultOrgSlug,
      }).returning();
      
      organizationId = newOrg.id;
      console.log('✅ Default organization created');
    } else {
      organizationId = existingOrg[0].id;
    }
    
    const existingWorkspace = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.slug, defaultWorkspaceSlug))
      .limit(1);

    let workspaceId: string;
    
    if (existingWorkspace.length === 0) {
      console.log('\n🏢 Creating default workspace...');
      
      const [newWorkspace] = await db.insert(workspaces).values({
        name: 'Default Workspace',
        dba: 'Nova AI Support',
        email: 'support@novaai.com',
        description: 'Main support workspace for all conversations',
        slug: defaultWorkspaceSlug,
        organizationId,
        isDefault: true,
        settings: {
          theme: 'default',
          features: ['ai-support', 'knowledge-base', 'analytics']
        }
      }).returning();
      
      workspaceId = newWorkspace.id;
      console.log('✅ Default workspace created');
      
      // Create default departments
      const defaultDepts = [
        { name: 'General Support', description: 'Handle general customer inquiries', slug: 'general-support', color: '#6366f1', isDefault: true },
        { name: 'Technical Support', description: 'Technical issues and troubleshooting', slug: 'technical-support', color: '#10b981' },
        { name: 'Billing', description: 'Billing and payment inquiries', slug: 'billing', color: '#f59e0b' },
        { name: 'Sales', description: 'Sales and product inquiries', slug: 'sales', color: '#8b5cf6' }
      ];
      
      for (const dept of defaultDepts) {
        await db.insert(departments).values({
          name: dept.name,
          description: dept.description,
          slug: dept.slug,
          workspaceId,
          isDefault: dept.isDefault || false,
          color: dept.color,
          icon: 'Building2'
        });
      }
      console.log('✅ Default departments created');
      
      // Add admin user to the workspace
      const adminUser = await db
        .select()
        .from(users)
        .where(eq(users.email, 'Admin@ris.com'))
        .limit(1);
      
      if (adminUser.length > 0) {
        await db.insert(workspaceMembers).values({
          userId: adminUser[0].id,
          workspaceId,
          role: 'owner',
          status: 'active'
        });
        console.log('✅ Admin added to default workspace as owner');
      }
      
      // Add agent user to the workspace
      const agentUser = await db
        .select()
        .from(users)
        .where(eq(users.email, 'Agent@rapidrms.com'))
        .limit(1);
      
      if (agentUser.length > 0) {
        await db.insert(workspaceMembers).values({
          userId: agentUser[0].id,
          workspaceId,
          role: 'member',
          status: 'active'
        });
        console.log('✅ Agent added to default workspace as member');
      }
      
    } else {
      console.log('\n✅ Default workspace exists');
    }
    
  } catch (error) {
    console.error('Error ensuring default workspace:', error);
  }
}
