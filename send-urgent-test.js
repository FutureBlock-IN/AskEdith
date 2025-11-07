import sgMail from '@sendgrid/mail';

const apiKey = process.env.SENDGRID_ASK_EDITH_1_API_KEY;
sgMail.setApiKey(apiKey);

const token = '155decfb29b312a0fb80acbb218861b971decc564b8675ffc16715a12251c3ed';
const resetUrl = `https://29702bf1-770c-4095-afdd-dc8fcc65ffbb-00-1s9hnopi7aao4.worf.replit.dev/reset-password?token=${token}`;

const msg = {
  to: 'papasavvaselias50@gmail.com',
  from: 'elias@askedith.org',
  subject: 'Important: Your AskEdith Account Access',
  text: `Password Reset Link: ${resetUrl}`,
  html: `
    <div style="font-family: Arial, sans-serif;">
      <h2>Password Reset for AskEdith</h2>
      <p>Hi Elias,</p>
      <p>Click here to reset your password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you're not receiving our emails, please check your spam folder and mark this email as "Not Spam".</p>
    </div>
  `,
};

console.log('Sending test email with different subject...');

sgMail
  .send(msg)
  .then(() => {
    console.log('✓ Email sent! Check inbox AND spam folder at papasavvaselias50@gmail.com');
  })
  .catch((error) => {
    console.error('Error:', error.message);
  });