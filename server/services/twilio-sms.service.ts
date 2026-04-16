/**
 * Twilio SMS Notification Service
 * Sends SMS messages to customers when ticket events occur.
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER env vars.
 */

interface TwilioSmsPayload {
  to: string;
  body: string;
}

export async function sendSms(payload: TwilioSmsPayload): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.warn('[TwilioSMS] Missing Twilio credentials — SMS not sent');
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({ From: from, To: payload.to, Body: payload.body });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json() as any;
      console.error('[TwilioSMS] Failed to send SMS:', errorData);
      return false;
    }

    console.log('[TwilioSMS] SMS sent to', payload.to);
    return true;
  } catch (error) {
    console.error('[TwilioSMS] Error sending SMS:', error);
    return false;
  }
}

export async function sendTicketCreatedSms(phone: string, ticketId: string, title: string): Promise<boolean> {
  return sendSms({
    to: phone,
    body: `Your support ticket has been created. Ticket: "${title}". Track it in your customer portal. Ref: #${ticketId.slice(0, 8).toUpperCase()}`,
  });
}

export async function sendTicketUpdatedSms(phone: string, ticketId: string, status: string): Promise<boolean> {
  const statusLabel = status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1);
  return sendSms({
    to: phone,
    body: `Your support ticket #${ticketId.slice(0, 8).toUpperCase()} has been updated. Status: ${statusLabel}. Log in to your customer portal for details.`,
  });
}

export async function sendTicketClosedSms(phone: string, ticketId: string): Promise<boolean> {
  return sendSms({
    to: phone,
    body: `Your support ticket #${ticketId.slice(0, 8).toUpperCase()} has been resolved. We hope we helped! Please rate your experience in your customer portal.`,
  });
}
