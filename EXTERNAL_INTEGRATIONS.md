# External Channel Integrations Guide

## Overview
Support Board includes built-in integrations for multiple external channels, allowing customers to reach you through their preferred platforms. All messages from external channels flow into your unified support dashboard.

---

## 🟢 WhatsApp Business API

### Prerequisites
1. Meta Business Account
2. WhatsApp Business API access
3. Phone number verified with Meta

### Setup Steps

#### 1. Get API Credentials
- Go to [Meta for Developers](https://developers.facebook.com)
- Create/select your app
- Add WhatsApp product
- Get your:
  - `Phone Number ID`
  - `Access Token`
  - `App Secret`
  - `Verify Token` (create your own secure token)

#### 2. Configure Environment Variables
Add these to your Replit Secrets or `.env`:
```bash
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_VERIFY_TOKEN=your_verify_token
```

#### 3. Register Webhook with Meta
- **Webhook URL**: `https://your-domain.replit.app/webhooks/whatsapp`
- **Verify Token**: Use the same token from step 2
- **Subscribe to**: `messages` events

#### 4. Test Your Integration
Send a WhatsApp message to your business number. It should:
- Appear in your Support Board dashboard
- Automatically get AI response
- Support full conversation threading

### Webhook Endpoint Details
- **POST** `/webhooks/whatsapp` - Receives messages
- **GET** `/webhooks/whatsapp` - Meta verification
- **Security**: HMAC signature verification using `x-hub-signature-256`

---

## 🔵 Telegram Bot

### Prerequisites
1. Telegram account
2. Bot created via BotFather

### Setup Steps

#### 1. Create Telegram Bot
1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow prompts to create your bot
4. Save the **Bot Token** provided

#### 2. Configure Environment Variables
```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_SECRET_TOKEN=your_optional_secret_token  # Optional but recommended
```

#### 3. Set Webhook
Use Telegram Bot API to set your webhook:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.replit.app/webhooks/telegram",
    "secret_token": "your_optional_secret_token"
  }'
```

#### 4. Test Your Integration
- Send a message to your bot
- Message appears in Support Board
- Bot responds with AI-powered replies

### Webhook Endpoint Details
- **POST** `/webhooks/telegram` - Receives messages and callback queries
- **Security**: Optional secret token verification via `X-Telegram-Bot-Api-Secret-Token` header
- **Features**: 
  - Text messages
  - Callback queries (button interactions)
  - Reply keyboard support

---

## 💙 Facebook Messenger

### Prerequisites
1. Facebook Page
2. Meta Business Account
3. Facebook App with Messenger product

### Setup Steps

#### 1. Get API Credentials
- Go to [Meta for Developers](https://developers.facebook.com)
- Create/select your app
- Add Messenger product
- Generate Page Access Token
- Get App Secret

#### 2. Configure Environment Variables
```bash
MESSENGER_PAGE_ACCESS_TOKEN=your_page_access_token
MESSENGER_APP_SECRET=your_app_secret
MESSENGER_VERIFY_TOKEN=your_verify_token
```

#### 3. Register Webhook
- **Webhook URL**: `https://your-domain.replit.app/webhooks/messenger`
- **Verify Token**: Use the same token from step 2
- **Subscribe to**: `messages`, `messaging_postbacks` events
- **Select your Page** to connect

#### 4. Test Your Integration
Send a message to your Facebook Page:
- Message appears in Support Board
- AI responds automatically
- Full conversation history maintained

### Webhook Endpoint Details
- **POST** `/webhooks/messenger` - Receives messages
- **GET** `/webhooks/messenger` - Meta verification
- **Security**: HMAC signature verification using `x-hub-signature-256`

---

## 📧 Gmail Integration (Coming Soon)

Gmail connector is available but needs configuration:

### Setup Steps
1. Use Replit's Gmail connector for authentication
2. Configure OAuth credentials
3. Set up email parsing
4. Map emails to conversations

**Note**: This requires additional development to:
- Parse incoming emails
- Create conversations from email threads
- Send replies via Gmail
- Handle attachments

---

## 📸 Instagram Direct Messages

### Prerequisites
- Instagram Business Account
- Facebook Page connected to Instagram
- Meta Business Account

### Implementation Needed
Instagram uses similar webhook architecture to Facebook Messenger. To add support:

1. **Webhook Endpoint**: Create `/webhooks/instagram`
2. **Subscribe to**: `messages` events
3. **Authentication**: Use Instagram Graph API
4. **Message Format**: Parse Instagram-specific message structure

---

## Common Webhook Features

### Security
All webhooks implement:
- ✅ Signature verification (HMAC SHA-256)
- ✅ Secret token validation
- ✅ HTTPS required
- ✅ Request validation

### Message Processing
1. **Receive**: Webhook receives message from platform
2. **Parse**: Extract sender, content, metadata
3. **Create/Find**: Get or create conversation and customer
4. **AI Response**: Generate smart AI reply
5. **Send**: Deliver response back to platform
6. **Notify**: Update staff dashboard in real-time

### Conversation Threading
- Messages from same sender grouped into conversations
- Full conversation history maintained
- Customer info preserved across channels
- Staff can see which channel message came from

---

## Testing Webhooks Locally

### Using ngrok (for local development)
```bash
# Install ngrok
npm install -g ngrok

# Start your app
npm run dev

# In another terminal, create tunnel
ngrok http 5000

# Use ngrok URL for webhook registration
# Example: https://abc123.ngrok.io/webhooks/whatsapp
```

### Testing Checklist
- [ ] Webhook verification succeeds
- [ ] Messages received and parsed correctly
- [ ] Conversation created in database
- [ ] AI response generated
- [ ] Response sent back to platform
- [ ] Staff dashboard updates in real-time

---

## Troubleshooting

### WhatsApp Issues
- **Webhook verification fails**: Check verify token matches exactly
- **Messages not received**: Verify webhook subscription includes `messages`
- **Signature mismatch**: Ensure app secret is correct

### Telegram Issues
- **Bot not responding**: Verify bot token is correct
- **Webhook not set**: Use setWebhook API endpoint
- **Secret token errors**: Ensure header name is exact

### Facebook Messenger Issues
- **Verification fails**: Check verify token and ensure GET endpoint works
- **Messages not appearing**: Verify page subscription and permissions
- **Signature invalid**: Double-check app secret

### General Debugging
1. Check server logs for error messages
2. Verify environment variables are set correctly
3. Test webhook endpoints with curl/Postman
4. Ensure HTTPS is used (required by all platforms)
5. Check platform-specific webhook logs in their developer portals

---

## Rate Limits & Best Practices

### WhatsApp
- **Rate Limit**: 1,000 messages per day (scalable with approval)
- **Best Practice**: Use message templates for proactive outreach
- **Response Time**: Reply within 24 hours for free

### Telegram
- **Rate Limit**: 30 messages per second
- **Best Practice**: Use inline keyboards for interactive experiences
- **File Size**: Max 50MB for files

### Facebook Messenger
- **Rate Limit**: Varies by page tier
- **Best Practice**: Use quick replies for common questions
- **Response Time**: 24-hour messaging window

---

## Next Steps

1. **Choose your channels**: Start with 1-2 channels
2. **Configure webhooks**: Follow setup guides above
3. **Test thoroughly**: Send test messages from each platform
4. **Monitor**: Watch dashboard for incoming messages
5. **Scale**: Add more channels as needed

For additional help, refer to:
- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Telegram Bot API Docs](https://core.telegram.org/bots/api)
- [Facebook Messenger Platform Docs](https://developers.facebook.com/docs/messenger-platform)
