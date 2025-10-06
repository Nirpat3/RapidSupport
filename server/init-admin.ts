import { hash } from 'bcryptjs';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Ensures a default admin user exists in the database
 * Creates one if no admin users are found
 */
export async function ensureAdminExists() {
  try {
    // Check if any admin user exists
    const adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1);

    if (adminUsers.length === 0) {
      console.log('No admin user found. Creating default admin...');
      
      const hashedPassword = await hash('admin123', 10);
      
      await db.insert(users).values({
        email: 'admin@supportboard.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        status: 'online'
      });

      console.log('✅ Default admin user created:');
      console.log('   Email: admin@supportboard.com');
      console.log('   Password: admin123');
    } else {
      console.log('✅ Admin user exists');
    }
  } catch (error) {
    console.error('Error ensuring admin exists:', error);
    // Don't throw - let the app start even if this fails
  }
}
