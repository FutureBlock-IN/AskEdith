import sgMail from '@sendgrid/mail';

const apiKey = process.env.SENDGRID_ASK_EDITH_1_API_KEY;
sgMail.setApiKey(apiKey);

const resetToken = 'd65fc01726f29652b925be1c99f99f48f4835ae7fac77f04f65514d23b88eae1';
const resetUrl = `https://29702bf1-770c-4095-afdd-dc8fcc65ffbb-00-1s9hnopi7aao4.worf.replit.dev/reset-password?token=${resetToken}`;

const msg = {
  to: 'papasavvaselias50@gmail.com',
  from: 'elias@askedith.org',
  subject: 'Reset your AskEdith password',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #0B666B; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Password Reset Request</h1>
      </div>
      <div style="padding: 30px; background-color: #f5f5f5;">
        <h2 style="color: #333;">Hi Elias (Founder),</h2>
        <p style="color: #666; line-height: 1.6;">
          We received a request to reset your password. If you didn't make this request, you can safely ignore this email.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #0B666B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #0B666B;">${resetUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 1 hour for security reasons.
        </p>
      </div>
      <div style="background-color: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
        <p style="margin: 0;">© 2025 AskEdith. All rights reserved.</p>
      </div>
    </div>
  `,
};

console.log('Sending password reset email...');
console.log('Reset URL:', resetUrl);

sgMail
  .send(msg)
  .then(() => {
    console.log('✓ Password reset email sent successfully!');
    console.log('Check your email at papasavvaselias50@gmail.com');
  })
  .catch((error) => {
    console.error('✗ Error:', error.message);
    if (error.response) {
      console.error('Details:', JSON.stringify(error.response.body, null, 2));
    }
  });