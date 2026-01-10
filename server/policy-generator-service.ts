import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type PolicyType = 'terms' | 'privacy' | 'cookies';
export type RegionCode = 'us' | 'eu' | 'uk' | 'caribbean' | 'global' | 'ca' | 'au' | 'latam' | 'asia';

interface PolicyGenerationRequest {
  type: PolicyType;
  region: RegionCode;
  companyName: string;
  websiteUrl?: string;
  industry?: string;
  additionalContext?: string;
}

interface GeneratedPolicy {
  title: string;
  content: string;
  summary: string;
}

const REGION_CONFIG: Record<RegionCode, { name: string; regulations: string[] }> = {
  us: {
    name: 'United States',
    regulations: ['CCPA (California Consumer Privacy Act)', 'COPPA', 'CAN-SPAM Act', 'State-specific privacy laws']
  },
  eu: {
    name: 'European Union',
    regulations: ['GDPR (General Data Protection Regulation)', 'ePrivacy Directive', 'EU Cookie Law']
  },
  uk: {
    name: 'United Kingdom',
    regulations: ['UK GDPR', 'Data Protection Act 2018', 'PECR (Privacy and Electronic Communications Regulations)']
  },
  caribbean: {
    name: 'Caribbean Region',
    regulations: ['Jamaica Data Protection Act', 'Barbados Data Protection Act', 'Trinidad and Tobago Data Protection Act', 'Regional data protection frameworks']
  },
  ca: {
    name: 'Canada',
    regulations: ['PIPEDA (Personal Information Protection and Electronic Documents Act)', 'CASL (Canada Anti-Spam Legislation)', 'Quebec Law 25']
  },
  au: {
    name: 'Australia',
    regulations: ['Privacy Act 1988', 'Australian Privacy Principles (APPs)', 'Spam Act 2003']
  },
  latam: {
    name: 'Latin America',
    regulations: ['Brazil LGPD', 'Argentina Personal Data Protection Law', 'Mexico Federal Law on Protection of Personal Data']
  },
  asia: {
    name: 'Asia Pacific',
    regulations: ['Singapore PDPA', 'Japan APPI', 'South Korea PIPA', 'China PIPL']
  },
  global: {
    name: 'Global (International)',
    regulations: ['GDPR compliance as baseline', 'CCPA compliance', 'International best practices']
  }
};

const POLICY_TEMPLATES: Record<PolicyType, { description: string; sections: string[] }> = {
  terms: {
    description: 'Terms and Conditions / Terms of Service',
    sections: [
      'Acceptance of Terms',
      'Use of Service',
      'User Accounts',
      'Intellectual Property',
      'User Content',
      'Prohibited Activities',
      'Disclaimers and Limitations',
      'Indemnification',
      'Termination',
      'Governing Law',
      'Dispute Resolution',
      'Changes to Terms',
      'Contact Information'
    ]
  },
  privacy: {
    description: 'Privacy Policy',
    sections: [
      'Information We Collect',
      'How We Use Your Information',
      'Information Sharing and Disclosure',
      'Data Security',
      'Data Retention',
      'Your Rights and Choices',
      'Cookies and Tracking',
      'International Data Transfers',
      'Children\'s Privacy',
      'Changes to Privacy Policy',
      'Contact Us'
    ]
  },
  cookies: {
    description: 'Cookie Policy',
    sections: [
      'What Are Cookies',
      'How We Use Cookies',
      'Types of Cookies We Use',
      'Essential Cookies',
      'Performance Cookies',
      'Functionality Cookies',
      'Targeting/Advertising Cookies',
      'Third-Party Cookies',
      'Managing Cookie Preferences',
      'Cookie Consent',
      'Updates to This Policy',
      'Contact Information'
    ]
  }
};

export async function generatePolicy(request: PolicyGenerationRequest): Promise<GeneratedPolicy> {
  const regionConfig = REGION_CONFIG[request.region];
  const policyTemplate = POLICY_TEMPLATES[request.type];
  
  const prompt = buildPolicyPrompt(request, regionConfig, policyTemplate);
  
  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      {
        role: "system",
        content: `You are an expert legal document generator specializing in creating compliant ${policyTemplate.description} documents. Generate professional, comprehensive legal policies that are compliant with the specified regional regulations. Use clear, accessible language while maintaining legal precision. Format the output in Markdown. Respond with JSON containing title, content (markdown), and summary fields.`
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 8192
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  
  return {
    title: result.title || `${request.companyName} ${policyTemplate.description}`,
    content: result.content || '',
    summary: result.summary || ''
  };
}

function buildPolicyPrompt(
  request: PolicyGenerationRequest,
  regionConfig: { name: string; regulations: string[] },
  policyTemplate: { description: string; sections: string[] }
): string {
  const sections = policyTemplate.sections.map(s => `- ${s}`).join('\n');
  const regulations = regionConfig.regulations.map(r => `- ${r}`).join('\n');
  
  return `Generate a comprehensive ${policyTemplate.description} for the following company:

**Company Information:**
- Company Name: ${request.companyName}
${request.websiteUrl ? `- Website: ${request.websiteUrl}` : ''}
${request.industry ? `- Industry: ${request.industry}` : ''}
${request.additionalContext ? `- Additional Context: ${request.additionalContext}` : ''}

**Target Region:** ${regionConfig.name}

**Applicable Regulations:**
${regulations}

**Required Sections:**
${sections}

**Requirements:**
1. Ensure full compliance with all listed regulations for ${regionConfig.name}
2. Use clear, professional language accessible to the average reader
3. Include proper legal disclaimers and limitations
4. Add appropriate dates and version information (use today's date as effective date)
5. Format the content in Markdown with proper headings (##, ###)
6. Include specific rights and obligations relevant to ${regionConfig.name} residents

**Output Format:**
Respond with a JSON object containing:
- "title": The full title of the policy document
- "content": The complete policy in Markdown format
- "summary": A 2-3 sentence summary of what the policy covers`;
}

export function getAvailableRegions(): Array<{ code: RegionCode; name: string; regulations: string[] }> {
  return Object.entries(REGION_CONFIG).map(([code, config]) => ({
    code: code as RegionCode,
    name: config.name,
    regulations: config.regulations
  }));
}

export function getPolicyTypes(): Array<{ type: PolicyType; description: string; sections: string[] }> {
  return Object.entries(POLICY_TEMPLATES).map(([type, config]) => ({
    type: type as PolicyType,
    description: config.description,
    sections: config.sections
  }));
}
