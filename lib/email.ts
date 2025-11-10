export async function sendTextEmail(to: string, subject: string, text: string) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'No-reply', email: 'info@doorgas.co' },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error('Brevo Error:', error);
    throw new Error(error.message || 'Failed to send email');
  }

  return await res.json();
}

export async function sendApprovalEmail(to: string, name?: string) {
  const userName = name || 'User';
  const subject = 'Account Approved - Welcome!';
  const text = `Hello ${userName},

Great news! Your account has been approved and you now have full access to our platform.

You can now browse and purchase products.

Thank you for joining us!

Best regards,
The Admin Team at Doorgas`;

  return await sendTextEmail(to, subject, text);
}

export async function sendRejectionEmail(to: string, name?: string) {
  const userName = name || 'User';
  const subject = 'Account Status Update';
  const text = `Hello ${userName},

We wanted to update you on your account status. Your account is currently pending review.

If you have any questions or concerns, please don't hesitate to contact our support team.

Best regards,
The Admin Team at Doorgas`;

  return await sendTextEmail(to, subject, text);
}
