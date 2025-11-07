import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config();

const apiKey = process.env.SENDGRID_ASK_EDITH_1_API_KEY || process.env.SENDGRID_API_KEY;

console.log('Testing SendGrid email...');
console.log('API Key found:', !!apiKey);
console.log('API Key length:', apiKey ? apiKey.length : 0);
console.log('API Key prefix:', apiKey ? apiKey.substring(0, 7) : 'N/A');

if (!apiKey) {
  console.error('No SendGrid API key found!');
  process.exit(1);
}

sgMail.setApiKey(apiKey);

const msg = {
  to: 'elias@askedith.org',
  from: 'elias@askedith.org',
  subject: 'Test Email from AskEdith',
  text: 'This is a test email to verify SendGrid is working.',
  html: '<p>This is a test email to verify SendGrid is working.</p>',
};

console.log('Sending test email to:', msg.to);

sgMail
  .send(msg)
  .then(() => {
    console.log('Email sent successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('SendGrid error:', error);
    if (error.response) {
      console.error('Response body:', JSON.stringify(error.response.body, null, 2));
    }
    process.exit(1);
  });