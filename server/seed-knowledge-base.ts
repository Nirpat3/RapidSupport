import { db } from "./db";
import { knowledgeBase, knowledgeBaseFaqs } from "@shared/schema";

interface KnowledgeArticle {
  title: string;
  content: string;
  category: string;
  tags: string[];
  priority: number;
  isActive: boolean;
  sourceType: string;
}

interface FAQ {
  question: string;
  answer: string;
}

const platformDocumentation: Array<{ article: KnowledgeArticle; faqs?: FAQ[] }> = [
  {
    article: {
      title: "Getting Started with Nova AI Support Platform",
      content: `# Getting Started with Nova AI

Welcome to Nova AI, your intelligent customer support companion. This guide will help you get started with the platform.

## What is Nova AI?

Nova AI is a comprehensive multi-tenant customer support platform designed to optimize real-time chat, conversation management, and administrative tasks. It uses advanced AI to help support teams respond faster and more effectively.

## Key Features

### For Customers
- **Live Chat Support**: Get instant help through our chat widget
- **Knowledge Base Access**: Browse articles and FAQs to find answers
- **Conversation History**: View your past support interactions
- **Multi-Channel Support**: Reach us via chat, email, or phone

### For Support Agents
- **Smart Conversation Assignment**: AI routes conversations to the right agent
- **Knowledge Base Integration**: Access answers while chatting
- **Real-time Collaboration**: Work with team members on complex issues
- **Performance Analytics**: Track your response times and satisfaction scores

### For Administrators
- **Team Management**: Add and manage support agents
- **Analytics Dashboard**: Monitor team performance
- **AI Configuration**: Customize AI behavior and responses
- **Multi-Organization Support**: Manage multiple workspaces

## First Steps

1. **Log in** to your account using your email and password
2. **Complete your profile** by adding your name and avatar
3. **Explore the dashboard** to familiarize yourself with the layout
4. **Check the knowledge base** for helpful articles
5. **Start a conversation** to test the system

## Need Help?

If you have questions, our support team is available 24/7 through the chat widget.`,
      category: "Training",
      tags: ["getting-started", "onboarding", "introduction", "basics"],
      priority: 1,
      isActive: true,
      sourceType: "manual"
    },
    faqs: [
      { question: "What is Nova AI?", answer: "Nova AI is a comprehensive customer support platform that uses artificial intelligence to help support teams respond to customers faster and more effectively." },
      { question: "How do I log in?", answer: "Click the 'Staff Login' button on the homepage and enter your email address and password. If you don't have an account, contact your administrator." },
      { question: "Is there a mobile app?", answer: "Yes! Nova AI is a Progressive Web App (PWA). You can install it on your mobile device by visiting the website and clicking 'Add to Home Screen' in your browser menu." }
    ]
  },
  {
    article: {
      title: "How to Use the Customer Chat Widget",
      content: `# Customer Chat Widget Guide

The Nova AI chat widget provides instant access to customer support. Here's how to use it effectively.

## Accessing the Chat

1. Look for the chat bubble icon in the bottom-right corner of the website
2. Click the icon to open the chat window
3. You can start typing your question immediately

## Starting a Conversation

### New Customers
- Enter your name and email address
- Select a support category that matches your question
- Type your message and press Enter or click Send

### Returning Customers
- Your information is saved automatically
- Previous conversations are accessible from your history
- Continue existing conversations or start new ones

## Chat Features

### Text Messages
Type your question in the message box and press Enter to send.

### File Attachments
Click the paperclip icon to attach files like screenshots or documents.

### Voice Messages
Click the microphone icon to record a voice message.

### Emoji Reactions
Use the emoji picker to add expressions to your messages.

## AI-Powered Responses

Our AI assistant will try to answer your question immediately using our knowledge base. If the AI can't help, a human agent will join the conversation.

### How AI Responses Work
1. You send a message
2. AI analyzes your question
3. AI searches the knowledge base for relevant information
4. If confident, AI provides an answer
5. If unsure, AI connects you with a human agent

## Conversation History

Access your past conversations:
1. Log in to your customer portal
2. Navigate to "Chat History"
3. Click any conversation to view the full transcript

## Tips for Faster Support

- Be specific about your issue
- Include order numbers or account details when relevant
- Attach screenshots if reporting a visual problem
- Check the knowledge base first for common questions`,
      category: "Support",
      tags: ["chat", "widget", "customer", "messaging", "help"],
      priority: 2,
      isActive: true,
      sourceType: "manual"
    },
    faqs: [
      { question: "How do I start a chat?", answer: "Click the chat bubble icon in the bottom-right corner of the website. Enter your name and email, then type your question." },
      { question: "Can I attach files in chat?", answer: "Yes! Click the paperclip icon next to the message box to attach files like screenshots, documents, or images." },
      { question: "Will I talk to a real person or AI?", answer: "You'll first interact with our AI assistant. If your question requires human help, a support agent will join the conversation automatically." },
      { question: "Can I see my old conversations?", answer: "Yes, log in to your customer portal and navigate to 'Chat History' to view all your past support conversations." }
    ]
  },
  {
    article: {
      title: "Customer Portal User Guide",
      content: `# Customer Portal Guide

The customer portal gives you access to your support history, knowledge base, and account settings.

## Accessing the Portal

1. Go to the main website
2. Click "Customer Login" or "Portal"
3. Enter your email and password
4. Click "Sign In"

## Portal Features

### Dashboard
Your personalized dashboard shows:
- Recent conversations
- Open support tickets
- Quick access to common actions
- Announcements and updates

### Chat
Start new support conversations or continue existing ones:
- Click "New Conversation" to start fresh
- Select a previous conversation to continue it
- All messages are saved automatically

### Support History
View your complete support history:
- See all past conversations
- Filter by date, status, or category
- Download transcripts for your records

### Knowledge Base
Browse our self-service resources:
- Search for answers to common questions
- Browse articles by category
- View FAQs and tutorials
- Rate articles as helpful or not

### Account Settings
Manage your account preferences:
- Update your name and contact information
- Change your password
- Set notification preferences
- Manage connected devices

## Mobile Access

The customer portal works on all devices:
- Responsive design for phones and tablets
- Install as a PWA for app-like experience
- Push notifications for new messages (if enabled)

## Password Reset

If you forgot your password:
1. Click "Forgot Password" on the login page
2. Enter your email address
3. Check your inbox for a reset link
4. Click the link and create a new password

## Security

We take security seriously:
- All data is encrypted in transit
- Sessions expire after inactivity
- Two-factor authentication available (if enabled by admin)`,
      category: "Support",
      tags: ["portal", "customer", "account", "login", "dashboard"],
      priority: 3,
      isActive: true,
      sourceType: "manual"
    },
    faqs: [
      { question: "How do I access the customer portal?", answer: "Click 'Customer Login' on the main website and enter your email and password. If you don't have an account, you can register during your first chat interaction." },
      { question: "How do I reset my password?", answer: "Click 'Forgot Password' on the login page, enter your email, and follow the instructions sent to your inbox." },
      { question: "Can I use the portal on my phone?", answer: "Yes, the customer portal is fully responsive and works on all devices. You can also install it as an app by adding it to your home screen." }
    ]
  },
  {
    article: {
      title: "Support Agent Training Guide",
      content: `# Support Agent Training Guide

This comprehensive guide covers everything you need to know as a support agent on Nova AI.

## Getting Started as an Agent

### Your First Login
1. Use the credentials provided by your administrator
2. Change your password on first login
3. Complete your profile with a photo and bio
4. Review the team guidelines document

### Understanding the Interface

#### Left Sidebar
- **Conversations**: Your main workspace for customer chats
- **Customers**: Customer database and profiles
- **Knowledge Base**: Articles and FAQs for reference
- **Activity**: Notifications and team updates

#### Main Area
- Active conversation view
- Customer information panel
- Quick action buttons
- AI assistance panel

## Handling Conversations

### Conversation Assignment
Conversations are assigned based on:
- Your availability status
- Your skills and expertise
- Current workload
- Customer preferences

### Status Management
Set your status to:
- **Online**: Ready to receive new conversations
- **Away**: Temporarily unavailable
- **Busy**: Working but not taking new assignments
- **Offline**: Not working

### Response Best Practices

1. **Greet the customer** - Use their name if available
2. **Acknowledge their issue** - Show you understand
3. **Provide clear solutions** - Step-by-step when needed
4. **Confirm resolution** - Ask if they need anything else
5. **Close professionally** - Thank them for contacting

### Using AI Assistance

The AI assistant helps you:
- Suggests relevant knowledge base articles
- Drafts response templates
- Provides customer history summary
- Detects customer sentiment

**To use AI suggestions:**
1. View the AI panel on the right
2. Review suggested responses
3. Click to insert or modify before sending
4. Never send AI responses without review

## Knowledge Base

### Finding Articles
- Use the search bar for keywords
- Browse by category
- Check related articles
- View most popular content

### Creating Articles
1. Go to Knowledge Base management
2. Click "New Article"
3. Enter title, content, and category
4. Add relevant tags
5. Save and publish

## Performance Metrics

Track your performance:
- **Response Time**: How quickly you reply
- **Resolution Rate**: Issues resolved per conversation
- **Customer Satisfaction**: Feedback scores
- **Conversations Handled**: Daily/weekly volume

## Escalation Procedures

When to escalate:
- Technical issues beyond your expertise
- Billing disputes requiring authorization
- Complaints requiring management attention
- Security or legal concerns

How to escalate:
1. Click the escalation button
2. Select the appropriate team
3. Add a summary note
4. The conversation transfers automatically`,
      category: "Training",
      tags: ["agent", "training", "support", "guide", "procedures"],
      priority: 1,
      isActive: true,
      sourceType: "manual"
    },
    faqs: [
      { question: "How are conversations assigned to me?", answer: "Conversations are automatically assigned based on your online status, skills, current workload, and customer preferences. Stay online and update your skills to receive relevant conversations." },
      { question: "How do I use AI assistance?", answer: "The AI panel on the right side of your screen shows suggested responses and relevant knowledge base articles. Click any suggestion to insert it, but always review before sending." },
      { question: "When should I escalate a conversation?", answer: "Escalate when you encounter technical issues beyond your expertise, billing disputes needing authorization, complaints requiring management, or any security/legal concerns." },
      { question: "How is my performance measured?", answer: "Your performance is tracked by response time, resolution rate, customer satisfaction scores, and total conversations handled. View your metrics in the Analytics section." }
    ]
  },
  {
    article: {
      title: "Administrator Guide - Platform Configuration",
      content: `# Administrator Guide

This guide covers administrative functions for managing the Nova AI platform.

## User Management

### Adding New Users
1. Go to Administration > Users
2. Click "Add User"
3. Enter email, name, and role
4. Set initial password or send invite
5. Click "Create"

### User Roles
- **Admin**: Full platform access and configuration
- **Agent**: Handle conversations and access knowledge base
- **Customer**: Portal access only

### Deactivating Users
1. Find the user in the user list
2. Click the menu icon
3. Select "Deactivate"
4. Confirm the action

## Organization Settings

### General Settings
- Organization name and branding
- Time zone and language
- Business hours
- Contact information

### Branding & Theming
- Upload your logo
- Set brand colors
- Customize chat widget appearance
- Configure email templates

## AI Configuration

### Conversation AI
- Enable/disable AI responses
- Set confidence thresholds
- Configure handoff rules
- Customize AI personality

### Knowledge Base AI
- Auto-suggestion settings
- FAQ generation
- Article recommendations
- Search optimization

## Analytics & Reporting

### Available Reports
- Conversation volume and trends
- Agent performance metrics
- Customer satisfaction scores
- Response time analysis
- AI effectiveness metrics

### Scheduling Reports
1. Go to Analytics
2. Select report type
3. Click "Schedule"
4. Set frequency and recipients
5. Save schedule

## Security Settings

### Authentication
- Password policies
- Session timeout settings
- Two-factor authentication
- Single sign-on (SSO) configuration

### Data & Privacy
- Data retention policies
- Export customer data
- Delete customer records
- Audit logging

## Email Integration

### Connecting Email Accounts
1. Go to Settings > Email Integration
2. Click "Add Email Account"
3. Choose provider (IMAP, Gmail, Outlook)
4. Enter credentials
5. Configure polling interval
6. Test connection

### Auto-Reply Rules
- Set up automatic responses
- Configure triggers and conditions
- Define confidence thresholds
- Enable/disable by category

## Troubleshooting

### Common Issues
- **Users can't log in**: Check account status and password
- **AI not responding**: Verify AI is enabled and configured
- **Emails not syncing**: Check email credentials and polling settings
- **Slow performance**: Contact support for optimization`,
      category: "Training",
      tags: ["admin", "configuration", "settings", "management", "setup"],
      priority: 2,
      isActive: true,
      sourceType: "manual"
    },
    faqs: [
      { question: "How do I add a new user?", answer: "Go to Administration > Users, click 'Add User', enter their details and role, then save. They'll receive an email with login instructions." },
      { question: "How do I change the platform branding?", answer: "Go to Settings > Branding to upload your logo, set brand colors, and customize the chat widget appearance." },
      { question: "How do I set up email integration?", answer: "Go to Settings > Email Integration, click 'Add Email Account', select your provider, enter credentials, and configure polling settings." },
      { question: "Where can I see platform analytics?", answer: "Click 'Analytics' in the sidebar to view conversation volumes, agent performance, customer satisfaction, and AI effectiveness metrics." }
    ]
  },
  {
    article: {
      title: "Common Issues and Troubleshooting",
      content: `# Troubleshooting Guide

This guide helps you resolve common issues with the Nova AI platform.

## Login Issues

### "Invalid email or password"
- Check that you're using the correct email address
- Verify CAPS LOCK is not enabled
- Try resetting your password
- Contact your administrator if locked out

### Account Locked
- Wait 15 minutes for automatic unlock
- Contact administrator for immediate unlock
- Reset password if you forgot it

### Can't Access Portal
- Clear browser cache and cookies
- Try a different browser
- Disable browser extensions
- Check your internet connection

## Chat Widget Issues

### Widget Not Loading
- Refresh the page
- Clear browser cache
- Check if JavaScript is enabled
- Try incognito/private mode

### Messages Not Sending
- Check internet connection
- Wait a moment and try again
- Refresh the page if stuck
- Contact support if persistent

### Can't Attach Files
- Check file size (max 10MB)
- Verify file type is supported
- Try a different file format
- Ensure browser permissions allow file access

## Agent Console Issues

### Not Receiving Conversations
- Verify your status is "Online"
- Check your skill assignments
- Refresh the page
- Contact administrator if persistent

### Slow Performance
- Close unnecessary browser tabs
- Clear browser cache
- Check your internet speed
- Try a different browser

### AI Suggestions Not Appearing
- Ensure AI is enabled for your account
- Refresh the AI panel
- Check knowledge base connectivity
- Report to administrator if broken

## Email Integration Issues

### Emails Not Syncing
- Verify email credentials are correct
- Check polling interval settings
- Test the connection manually
- Review error logs for details

### Auto-Replies Not Working
- Ensure auto-reply is enabled
- Check confidence threshold settings
- Verify email templates exist
- Review auto-reply rules

## Mobile App Issues

### App Not Installing
- Ensure you're using a supported browser
- Clear browser data and try again
- Use HTTPS (secure connection)
- Try the "Add to Home Screen" option

### Push Notifications Not Working
- Check browser notification permissions
- Enable notifications in app settings
- Verify your device allows notifications
- Re-install the app if needed

## Getting More Help

If you can't resolve an issue:
1. Check this troubleshooting guide first
2. Search the knowledge base
3. Contact support via chat
4. Email support@company.com for urgent issues`,
      category: "Support",
      tags: ["troubleshooting", "issues", "problems", "help", "errors"],
      priority: 1,
      isActive: true,
      sourceType: "manual"
    },
    faqs: [
      { question: "I can't log in, what should I do?", answer: "First, verify your email and password are correct. Check that CAPS LOCK is off. If you forgot your password, click 'Forgot Password' to reset it. Contact your administrator if your account is locked." },
      { question: "The chat widget won't load", answer: "Try refreshing the page, clearing your browser cache, or using incognito mode. Ensure JavaScript is enabled in your browser settings." },
      { question: "Why am I not receiving any conversations?", answer: "Make sure your status is set to 'Online'. Check your skill assignments with your administrator. Try refreshing the page." },
      { question: "How do I contact support?", answer: "Use the chat widget on our website, search the knowledge base for answers, or email support@company.com for urgent issues." }
    ]
  },
  {
    article: {
      title: "Platform Features Overview",
      content: `# Nova AI Platform Features

Discover all the powerful features available in Nova AI.

## Real-Time Communication

### Live Chat
- Instant messaging with customers
- Typing indicators
- Read receipts
- File and image sharing
- Voice message support

### Multi-Channel Support
- Web chat widget
- Email integration
- WhatsApp Business
- Facebook Messenger
- Telegram

## AI-Powered Assistance

### Smart Responses
- AI-generated reply suggestions
- Knowledge base integration
- Sentiment analysis
- Intent classification
- Automatic routing

### Conversational Intelligence
- Customer memory across sessions
- Context-aware responses
- Emotion detection
- Language translation
- Voice-to-text transcription

## Knowledge Base

### Content Management
- Rich text articles
- Image and video support
- Categorization and tagging
- Version history
- Multi-language support

### AI Enhancement
- Automatic FAQ generation
- Smart search optimization
- Related article suggestions
- Content gap detection
- Automatic reindexing

## Analytics & Insights

### Performance Metrics
- Response time tracking
- Resolution rate analysis
- Customer satisfaction scores
- Agent productivity metrics
- Volume trends

### AI Analytics
- AI response accuracy
- Knowledge base coverage
- Escalation patterns
- Customer journey insights

## Team Collaboration

### Internal Communication
- Staff chat channels
- Conversation notes
- @mentions and notifications
- Shift handoffs
- Team announcements

### Workflow Management
- Conversation assignment rules
- Priority management
- SLA tracking
- Escalation workflows
- Automated follow-ups

## Administration

### User Management
- Role-based access control
- Skill-based routing
- Performance tracking
- Schedule management

### Customization
- White-label branding
- Custom chat widget themes
- Email templates
- Automated responses
- Workflow rules

## Security & Compliance

### Data Protection
- End-to-end encryption
- Secure data storage
- Regular backups
- Audit logging

### Access Control
- Multi-factor authentication
- Session management
- IP restrictions
- API key management

## Integrations

### Native Integrations
- Email (IMAP, Gmail, Outlook)
- Cloud storage (Drive, Dropbox, OneDrive)
- Payment processing (Stripe)
- CRM systems

### API Access
- RESTful API
- Webhook support
- Custom integrations
- Developer documentation`,
      category: "Training",
      tags: ["features", "overview", "capabilities", "platform", "introduction"],
      priority: 3,
      isActive: true,
      sourceType: "manual"
    },
    faqs: [
      { question: "What communication channels are supported?", answer: "Nova AI supports web chat, email, WhatsApp Business, Facebook Messenger, and Telegram for multi-channel customer support." },
      { question: "How does AI assist with customer support?", answer: "AI provides reply suggestions, searches the knowledge base for answers, detects customer sentiment, classifies intent, and automatically routes conversations to the right agents." },
      { question: "What analytics are available?", answer: "You can track response times, resolution rates, customer satisfaction, agent productivity, AI accuracy, and conversation volume trends." },
      { question: "Is the platform secure?", answer: "Yes, Nova AI uses end-to-end encryption, secure data storage, regular backups, audit logging, multi-factor authentication, and role-based access control." }
    ]
  },
  {
    article: {
      title: "Keyboard Shortcuts and Tips",
      content: `# Keyboard Shortcuts and Productivity Tips

Master these shortcuts to work faster in Nova AI.

## Global Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + K | Open quick search |
| Ctrl/Cmd + / | Open keyboard shortcut help |
| Ctrl/Cmd + B | Toggle sidebar |
| Escape | Close modal or dialog |

## Conversation Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + Enter | Send message |
| Ctrl/Cmd + Shift + E | Insert emoji |
| Ctrl/Cmd + U | Upload file |
| Ctrl/Cmd + N | New conversation |
| Ctrl/Cmd + R | Mark as resolved |

## Navigation Shortcuts

| Shortcut | Action |
|----------|--------|
| G then C | Go to Conversations |
| G then K | Go to Knowledge Base |
| G then A | Go to Analytics |
| G then S | Go to Settings |

## Text Formatting

| Shortcut | Result |
|----------|--------|
| **text** | Bold text |
| *text* | Italic text |
| \`code\` | Inline code |
| [text](url) | Hyperlink |

## Productivity Tips

### Quick Replies
Save commonly used responses:
1. Type your response
2. Click the bookmark icon
3. Name your quick reply
4. Access from the quick reply menu

### Keyboard Navigation
- Use Tab to move between elements
- Use Enter to select/activate
- Use arrow keys in lists
- Use Space to toggle checkboxes

### Search Tips
- Use quotes for exact phrases: "billing issue"
- Use - to exclude: support -billing
- Use OR for alternatives: chat OR email
- Filter by date: after:2024-01-01

### Multi-Select
- Hold Shift + Click to select range
- Hold Ctrl/Cmd + Click to select individual items
- Use checkboxes for bulk actions

### Notification Management
- Click the bell icon to view all
- Mark all as read with one click
- Filter by type or source
- Customize notification preferences

## Mobile Gestures

| Gesture | Action |
|---------|--------|
| Swipe right | Open conversation menu |
| Swipe left | Archive conversation |
| Pull down | Refresh content |
| Long press | Context menu |
| Pinch | Zoom on images |`,
      category: "Training",
      tags: ["shortcuts", "keyboard", "productivity", "tips", "efficiency"],
      priority: 4,
      isActive: true,
      sourceType: "manual"
    },
    faqs: [
      { question: "How do I send a message quickly?", answer: "Press Ctrl+Enter (or Cmd+Enter on Mac) to send your message immediately without clicking the send button." },
      { question: "Is there a quick search feature?", answer: "Yes, press Ctrl+K (or Cmd+K on Mac) to open the quick search dialog where you can search conversations, customers, and knowledge base articles." },
      { question: "How do I save a quick reply template?", answer: "Type your response, click the bookmark icon, give it a name, and it will be saved to your quick reply menu for future use." }
    ]
  },
  {
    article: {
      title: "Privacy Policy and Data Handling",
      content: `# Privacy and Data Handling

Understanding how your data is handled in Nova AI.

## Data We Collect

### Customer Data
- Name and contact information
- Conversation history
- Support preferences
- Feedback and ratings

### Usage Data
- Login activity
- Feature usage patterns
- Performance metrics
- Error reports

### Technical Data
- Browser type and version
- Device information
- IP address (anonymized)
- Session data

## How We Use Data

### Service Delivery
- Providing customer support
- Improving AI responses
- Personalizing experience
- Maintaining conversation history

### Platform Improvement
- Analyzing usage patterns
- Optimizing performance
- Developing new features
- Training AI models

### Communication
- Service notifications
- Important updates
- Requested information
- Support follow-ups

## Data Protection

### Security Measures
- Encryption in transit (TLS 1.3)
- Encryption at rest (AES-256)
- Regular security audits
- Access controls and logging

### Data Access
- Role-based access control
- Audit trails for all access
- Principle of least privilege
- Regular access reviews

## Your Rights

### Access
Request a copy of your personal data.

### Correction
Update inaccurate information.

### Deletion
Request removal of your data.

### Portability
Export your data in standard formats.

### Objection
Opt out of certain data processing.

## Data Retention

- Active account data: Retained while account is active
- Conversation history: 2 years after last activity
- Analytics data: 1 year (anonymized)
- Backup data: 90 days

## Third-Party Services

We use trusted partners for:
- Cloud infrastructure (encrypted, compliant)
- AI processing (no data retention)
- Analytics (anonymized data only)
- Email delivery (transactional only)

## Contact Us

For privacy questions:
- Email: privacy@company.com
- Use the in-app support chat
- Submit a request through the portal`,
      category: "Support",
      tags: ["privacy", "data", "security", "gdpr", "compliance"],
      priority: 5,
      isActive: true,
      sourceType: "manual"
    },
    faqs: [
      { question: "What data do you collect about me?", answer: "We collect your name, contact information, conversation history, and usage data to provide and improve our support services. All data is encrypted and protected." },
      { question: "How long is my data kept?", answer: "Active account data is kept while your account is active. Conversation history is retained for 2 years after your last activity. You can request deletion at any time." },
      { question: "Can I delete my data?", answer: "Yes, you have the right to request deletion of your personal data. Contact privacy@company.com or use the in-app support to submit a deletion request." },
      { question: "Is my data secure?", answer: "Yes, we use industry-standard encryption (TLS 1.3 in transit, AES-256 at rest), regular security audits, role-based access control, and comprehensive audit logging." }
    ]
  }
];

export async function seedKnowledgeBase() {
  console.log("📚 Seeding knowledge base with platform documentation...");
  
  let articlesCreated = 0;
  let faqsCreated = 0;
  
  for (const doc of platformDocumentation) {
    try {
      const [article] = await db.insert(knowledgeBase).values({
        title: doc.article.title,
        content: doc.article.content,
        category: doc.article.category,
        tags: doc.article.tags,
        priority: doc.article.priority,
        isActive: doc.article.isActive,
        sourceType: doc.article.sourceType,
      }).returning();
      
      articlesCreated++;
      console.log(`   ✅ Created article: ${doc.article.title}`);
      
      if (doc.faqs && doc.faqs.length > 0) {
        const faqData = doc.faqs.map((faq, index) => ({
          knowledgeBaseId: article.id,
          question: faq.question,
          answer: faq.answer,
          displayOrder: index,
        }));
        
        await db.insert(knowledgeBaseFaqs).values(faqData);
        faqsCreated += doc.faqs.length;
        console.log(`      + Added ${doc.faqs.length} FAQs`);
      }
    } catch (error) {
      console.error(`   ❌ Error creating article "${doc.article.title}":`, error);
    }
  }
  
  console.log(`\n📚 Knowledge base seeding complete!`);
  console.log(`   Articles created: ${articlesCreated}`);
  console.log(`   FAQs created: ${faqsCreated}`);
}

import { fileURLToPath } from 'url';

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  seedKnowledgeBase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
