/**
 * SendGrid Email Notification Service
 * Sends email notifications to customers on ticket events.
 * Requires: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL env vars.
 */

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM_EMAIL || 'support@novaai.app';

  if (!apiKey) {
    console.warn('[SendGrid] Missing SENDGRID_API_KEY — email not sent');
    return false;
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to }] }],
        from: { email: from },
        subject: payload.subject,
        content: [
          { type: 'text/plain', value: payload.text || payload.html.replace(/<[^>]+>/g, '') },
          { type: 'text/html', value: payload.html },
        ],
      }),
    });

    if (!response.ok && response.status !== 202) {
      const errorText = await response.text();
      console.error('[SendGrid] Failed to send email:', response.status, errorText);
      return false;
    }

    console.log('[SendGrid] Email sent to', payload.to);
    return true;
  } catch (error) {
    console.error('[SendGrid] Error sending email:', error);
    return false;
  }
}

export async function sendTicketCreatedEmail(email: string, customerName: string, ticketId: string, title: string, description: string): Promise<boolean> {
  const ref = ticketId.slice(0, 8).toUpperCase();
  return sendEmail({
    to: email,
    subject: `Your support ticket has been created — #${ref}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#4f46e5">Support Ticket Created</h2>
        <p>Hi ${customerName},</p>
        <p>Your support request has been received and a ticket has been created.</p>
        <table style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;font-weight:bold;color:#6b7280">Ticket Ref</td><td style="padding:8px">#${ref}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#6b7280">Issue</td><td style="padding:8px">${title}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#6b7280">Status</td><td style="padding:8px"><span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px">Open</span></td></tr>
        </table>
        <p style="color:#6b7280;margin-top:16px">${description}</p>
        <p>You can track updates and reply in your <a href="${process.env.APP_URL || ''}/customer/tickets" style="color:#4f46e5">customer portal</a>.</p>
        <p style="color:#9ca3af;font-size:12px">You're receiving this because you opted in to email notifications. To unsubscribe, update your preferences in the customer portal.</p>
      </div>
    `,
  });
}

export async function sendTicketUpdatedEmail(email: string, customerName: string, ticketId: string, status: string, comment?: string): Promise<boolean> {
  const ref = ticketId.slice(0, 8).toUpperCase();
  const statusLabel = status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1);
  const statusColor = status === 'closed' ? '#10b981' : status === 'in-progress' ? '#3b82f6' : '#f59e0b';
  return sendEmail({
    to: email,
    subject: `Update on your support ticket #${ref}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#4f46e5">Ticket Update</h2>
        <p>Hi ${customerName},</p>
        <p>There's been an update to your support ticket <strong>#${ref}</strong>.</p>
        <p>Status: <span style="background:${statusColor}22;color:${statusColor};padding:2px 8px;border-radius:4px;font-weight:bold">${statusLabel}</span></p>
        ${comment ? `<div style="background:#f9fafb;border-left:4px solid #4f46e5;padding:12px 16px;margin:16px 0;border-radius:4px"><p style="margin:0">${comment}</p></div>` : ''}
        <p><a href="${process.env.APP_URL || ''}/customer/tickets/${ticketId}" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">View Ticket</a></p>
        <p style="color:#9ca3af;font-size:12px">To unsubscribe from email notifications, update your preferences in the customer portal.</p>
      </div>
    `,
  });
}

export async function sendTicketClosedEmail(email: string, customerName: string, ticketId: string, surveyUrl?: string): Promise<boolean> {
  const ref = ticketId.slice(0, 8).toUpperCase();
  return sendEmail({
    to: email,
    subject: `Your support ticket #${ref} has been resolved`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#10b981">Ticket Resolved</h2>
        <p>Hi ${customerName},</p>
        <p>Great news — your support ticket <strong>#${ref}</strong> has been resolved!</p>
        ${surveyUrl ? `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
          <p style="font-weight:bold;margin:0 0 8px">How did we do?</p>
          <p style="color:#6b7280;margin:0 0 16px">Please take a moment to rate your support experience.</p>
          <a href="${surveyUrl}" style="background:#10b981;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Rate Your Experience</a>
        </div>` : ''}
        <p>If your issue isn't fully resolved, you can <a href="${process.env.APP_URL || ''}/customer/tickets" style="color:#4f46e5">open a new ticket</a> in your customer portal.</p>
        <p style="color:#9ca3af;font-size:12px">To unsubscribe from email notifications, update your preferences in the customer portal.</p>
      </div>
    `,
  });
}
