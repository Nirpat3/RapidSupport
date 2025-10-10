import { storage } from './storage';

/**
 * Seed default specialized AI agents if they don't exist
 */
export async function seedSpecializedAgents(): Promise<void> {
  try {
    console.log('🤖 Checking for specialized AI agents...');
    
    const existingAgents = await storage.getAllAiAgents();
    
    // Define default specialized agents
    const defaultAgents = [
      {
        name: 'Sales Assistant',
        description: 'Specialized in product information, pricing, and guiding purchase decisions',
        specializations: ['sales'],
        systemPrompt: 'You are a knowledgeable sales assistant. Help customers understand products, pricing, features, and guide them toward purchase decisions. Be enthusiastic but not pushy. Focus on value and benefits.',
        autoTakeoverThreshold: 60,
        temperature: 40,
        maxTokens: 1500,
        responseFormat: 'conversational' as const,
        isActive: true,
      },
      {
        name: 'Technical Support Specialist',
        description: 'Specialized in technical troubleshooting and step-by-step guidance',
        specializations: ['technical'],
        systemPrompt: 'You are a technical support specialist. Provide clear, step-by-step troubleshooting guidance. Use technical terminology when appropriate but explain complex concepts simply. Always ask clarifying questions.',
        autoTakeoverThreshold: 70,
        temperature: 20,
        maxTokens: 2000,
        responseFormat: 'step_by_step' as const,
        isActive: true,
      },
      {
        name: 'Billing Specialist',
        description: 'Specialized in billing, payments, invoices, and subscription management',
        specializations: ['billing'],
        systemPrompt: 'You are a billing and payments specialist. Handle questions about invoices, payments, refunds, and subscriptions with precision. Be empathetic about billing concerns. Provide exact numbers and dates.',
        autoTakeoverThreshold: 80,
        temperature: 10,
        maxTokens: 2000,
        responseFormat: 'bullet_points' as const,
        isActive: true,
      },
      {
        name: 'General Support Assistant',
        description: 'Friendly assistant for general inquiries and account questions',
        specializations: ['general'],
        systemPrompt: 'You are a friendly general support assistant. Help with general inquiries, account questions, and guide users to the right resources. Be warm, helpful, and efficient.',
        autoTakeoverThreshold: 65,
        temperature: 30,
        maxTokens: 1500,
        responseFormat: 'conversational' as const,
        isActive: true,
      },
    ];

    // Check which agents need to be created
    for (const agentConfig of defaultAgents) {
      const exists = existingAgents.some(
        agent => agent.name === agentConfig.name
      );

      if (!exists) {
        await storage.createAiAgent(agentConfig);
        console.log(`✅ Created specialized agent: ${agentConfig.name}`);
      } else {
        console.log(`ℹ️  Agent already exists: ${agentConfig.name}`);
      }
    }

    console.log('✅ Specialized AI agents check completed');
  } catch (error) {
    console.error('❌ Error seeding specialized agents:', error);
    // Don't throw - allow app to continue even if agent seeding fails
  }
}
