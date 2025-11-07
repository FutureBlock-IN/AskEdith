import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config();

const apiKey = process.env.SENDGRID_ASK_EDITH_1_API_KEY || process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'elias@askedith.org';

console.log('=== SendGrid Configuration ===');
console.log('API Key found:', !!apiKey);
console.log('API Key length:', apiKey ? apiKey.length : 0);
console.log('API Key prefix:', apiKey ? apiKey.substring(0, 7) : 'N/A');
console.log('From email:', fromEmail);
console.log('To email:', 'papasavvaselias50@gmail.com');

if (!apiKey) {
  console.error('No SendGrid API key found!');
  process.exit(1);
}

sgMail.setApiKey(apiKey);

const msg = {
  to: 'papasavvaselias50@gmail.com',
  from: fromEmail,
  subject: 'Password Reset Test - AskEdith',
  text: 'This is a test password reset email. If you receive this, SendGrid is working correctly.',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #0B666B; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Password Reset Test</h1>
      </div>
      <div style="padding: 30px; background-color: #f5f5f5;">
        <p>This is a test email to verify SendGrid is working correctly.</p>
        <p>If you're receiving this, the email service is functioning properly.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      </div>
    </div>
  `,
};

console.log('\n=== Sending test email ===');

sgMail
  .send(msg)
  .then((response) => {
    console.log('✓ Email sent successfully!');
    console.log('Response status:', response[0].statusCode);
    console.log('Response headers:', response[0].headers);
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ SendGrid error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.statusCode);
      console.error('Response body:', JSON.stringify(error.response.body, null, 2));
      console.error('Response headers:', error.response.headers);
    }
    process.exit(1);
  });