/**
 * EMAIL UTILITY (mail.ts)
 * -----------------------
 * Functionality: Sends automated emails (reminders, status updates) to users.
 * Connection: Integrates with the External EmailJS API using environment variables.
 */

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * SEND EMAIL
 * Functionality: Formats and pushes an email request to the EmailJS cloud service.
 * Connection: Triggered by 'bookings.ts' whenever a booking status changes.
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  try {
    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const apiKey = process.env.EMAILJS_API_KEY;

    if (!serviceId || !templateId || !apiKey) {
      console.error('EmailJS configuration is incomplete. Missing:', {
        serviceId: !serviceId ? 'EMAILJS_SERVICE_ID' : null,
        templateId: !templateId ? 'EMAILJS_TEMPLATE_ID' : null,
        apiKey: !apiKey ? 'EMAILJS_API_KEY' : null,
      });
      return { success: false, error: 'EmailJS configuration is not complete' };
    }

    // Convert recipients to array if needed
    const recipientArray = Array.isArray(to) ? to : [to];
    
    // Send emails individually to ensure they're processed correctly by EmailJS
    const results = [];
    for (const recipient of recipientArray) {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: apiKey,
          template_params: {
            to_email: recipient,
            subject: subject,
            html_content: html,
            reply_to: process.env.EMAIL_FROM || 'PMO FSUU <pmo@fsuu.edu.ph>',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`EmailJS API error for ${recipient}:`, response.status, errorText);
        results.push({ recipient, success: false, error: errorText });
      } else {
        console.log(`Email sent successfully to ${recipient}`);
        results.push({ recipient, success: true });
      }
    }

    // Check if any emails failed
    const failedCount = results.filter(r => !r.success).length;
    if (failedCount > 0) {
      console.warn(`${failedCount} email(s) failed to send:`, results);
      return { success: false, error: `Failed to send ${failedCount} email(s)`, details: results };
    }

    return { success: true, data: { status: 'sent', recipients: recipientArray.length, details: results } };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
