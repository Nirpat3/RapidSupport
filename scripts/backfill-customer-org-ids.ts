import { db } from '../server/db';
import { customers, conversations, organizations } from '../shared/schema';
import { eq, isNull, desc } from 'drizzle-orm';

async function backfillCustomerOrgIds() {
  console.log('Starting customer organizationId backfill...');
  
  const nullOrgCustomers = await db.select()
    .from(customers)
    .where(isNull(customers.organizationId));
  
  console.log(`Found ${nullOrgCustomers.length} customers with NULL organizationId`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const customer of nullOrgCustomers) {
    const customerConvos = await db.select({ contextData: conversations.contextData })
      .from(conversations)
      .where(eq(conversations.customerId, customer.id))
      .orderBy(desc(conversations.createdAt))
      .limit(1);
    
    if (customerConvos.length > 0 && customerConvos[0].contextData) {
      try {
        const contextData = typeof customerConvos[0].contextData === 'string' 
          ? JSON.parse(customerConvos[0].contextData) 
          : customerConvos[0].contextData;
        
        if (contextData?.orgSlug) {
          const org = await db.select()
            .from(organizations)
            .where(eq(organizations.slug, contextData.orgSlug))
            .limit(1);
          
          if (org.length > 0) {
            await db.update(customers)
              .set({ organizationId: org[0].id, updatedAt: new Date() })
              .where(eq(customers.id, customer.id));
            console.log(`Updated customer ${customer.id} (${customer.email}) with org ${org[0].slug}`);
            updated++;
            continue;
          }
        }
      } catch (e) {
        console.log(`Could not parse contextData for customer ${customer.id}`);
      }
    }
    
    console.log(`Skipped customer ${customer.id} (${customer.email}) - no org context found`);
    skipped++;
  }
  
  console.log(`\nBackfill complete: ${updated} updated, ${skipped} skipped`);
  console.log('Customers without org context may need manual review or will be claimed by first embed request.');
}

backfillCustomerOrgIds()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
