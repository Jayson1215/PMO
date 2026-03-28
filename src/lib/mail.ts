interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Sends an email using the EmailJS REST API with HTML content
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  try {
    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const apiKey = process.env.EMAILJS_API_KEY;

    if (!serviceId || !templateId || !apiKey) {
      console.error('EmailJS configuration is incomplete');
      return { success: false, error: 'EmailJS configuration is not complete' };
    }

    const recipients = Array.isArray(to) ? to.join(',') : to;
    
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
          to_email: recipients,
          subject: subject,
          html_content: html,
          reply_to: process.env.EMAIL_FROM || 'PMO FSUU <pmo@fsuu.edu.ph>',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('EmailJS API error:', response.status, errorText);
      return { success: false, error: `EmailJS error: ${errorText}` };
    }

    // EmailJS returns plain text "OK" on success, not JSON
    return { success: true, data: { status: 'sent' } };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
