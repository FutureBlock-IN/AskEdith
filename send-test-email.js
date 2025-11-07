import sgMail from '@sendgrid/mail';

// Use the working API key directly
const apiKey = process.env.SENDGRID_ASK_EDITH_1_API_KEY;

console.log('Setting up SendGrid...');
sgMail.setApiKey(apiKey);

const msg = {
  to: 'papasavvaselias50@gmail.com',
  from: 'elias@askedith.org', // Using the verified sender
  subject: 'AskEdith Password Reset Test',
  text: 'This is a test email from AskEdith. Your password reset functionality is working!',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #0B666B; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">AskEdith Password Reset</h1>
      </div>
      <div style="padding: 30px; background-color: #f5f5f5;">
        <h2>Test Email</h2>
        <p>This is a test email to confirm SendGrid is working correctly.</p>
        <p>If you're seeing this, the email service is functioning properly!</p>
        <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://29702bf1-770c-4095-afdd-dc8fcc65ffbb-00-1s9hnopi7aao4.worf.replit.dev/reset-password?token=test123" 
             style="background-color: #0B666B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Test Reset Button
          </a>
        </div>
      </div>
    </div>
  `,
};

console.log('Sending email to:', msg.to);

sgMail
  .send(msg)
  .then(() => {
    console.log('✓ Email sent successfully!');
    console.log('Check your inbox at papasavvaselias50@gmail.com');
  })
  .catch((error) => {
    console.error('✗ Error:', error.message);
    if (error.response) {
      console.error('Details:', JSON.stringify(error.response.body, null, 2));
    }
  });