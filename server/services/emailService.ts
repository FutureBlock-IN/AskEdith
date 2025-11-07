import sgMail from "@sendgrid/mail";

// Initialize SendGrid
const sendgridApiKey = process.env.SENDGRID_API_KEY;

if (sendgridApiKey) {
  console.log("SendGrid API key configured successfully");
  sgMail.setApiKey(sendgridApiKey);
} else {
  console.warn("SendGrid API key not configured - email sending disabled");
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailService = {
  async sendEmail(options: EmailOptions): Promise<boolean> {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.log("Email service not configured. Would have sent:", options);
      return false;
    }

    try {
      // Use verified SendGrid sender email - hardcoded to avoid corrupted env var
      const fromEmail = "elias@askedith.org";

      const msg = {
        to: options.to,
        from: fromEmail,
        subject: options.subject,
        text: options.text || options.html.replace(/<[^>]*>/g, ""),
        html: options.html,
      };

      await sgMail.send(msg);
      console.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error: any) {
      console.error("SendGrid error:", error);
      if (error.response) {
        console.error(
          "SendGrid response body:",
          JSON.stringify(error.response.body, null, 2),
        );
      }
      return false;
    }
  },

  async sendVerificationEmail(
    email: string,
    username: string,
    verificationToken: string,
  ): Promise<boolean> {
    const verificationUrl = `${process.env.APP_URL || "http://localhost:5000"}/verify-email?token=${verificationToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0B666B; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Welcome to AskEdith!</h1>
        </div>
        <div style="padding: 30px; background-color: #f5f5f5;">
          <h2 style="color: #333;">Hi ${username},</h2>
          <p style="color: #666; line-height: 1.6;">
            Thank you for joining our caregiving community. Please verify your email address to complete your registration.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #0B666B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #0B666B;">${verificationUrl}</a>
          </p>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 24 hours.
          </p>
        </div>
        <div style="background-color: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2025 AskEdith. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: "Verify your AskEdith account",
      html,
    });
  },

  async sendPasswordResetEmail(
    email: string,
    username: string,
    resetToken: string,
  ): Promise<boolean> {
    // Use the Replit domain for password reset links
    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "http://localhost:5000";
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0B666B; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Password Reset Request</h1>
        </div>
        <div style="padding: 30px; background-color: #f5f5f5;">
          <h2 style="color: #333;">Hi ${username},</h2>
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
    `;

    return this.sendEmail({
      to: email,
      subject: "Reset your AskEdith password",
      html,
    });
  },

  async sendWelcomeEmail(email: string, username: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0B666B; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Welcome to AskEdith!</h1>
        </div>
        <div style="padding: 30px; background-color: #f5f5f5;">
          <h2 style="color: #333;">Hi ${username},</h2>
          <p style="color: #666; line-height: 1.6;">
            Your email has been verified and your account is now active. Welcome to our caregiving community!
          </p>
          <h3 style="color: #333;">Getting Started:</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>Browse our discussion forums to connect with other caregivers</li>
            <li>Book consultations with verified experts</li>
            <li>Share your experiences and get support</li>
            <li>Access curated resources in "This Week by..."</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || "http://localhost:5000"}" style="background-color: #0B666B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Visit Community
            </a>
          </div>
        </div>
        <div style="background-color: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2025 AskEdith. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: "Welcome to AskEdith Community",
      html,
    });
  },

  async sendAiAnswerEmail(
    firstName: string,
    email: string,
    question: string,
    answer: string,
  ): Promise<boolean> {
    // Convert markdown-style answer to HTML
    const htmlAnswer = answer
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0B666B; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Your AskEdith Answer</h1>
        </div>
        <div style="padding: 30px; background-color: #f5f5f5;">
          <h2 style="color: #333;">Hi ${firstName},</h2>
          <p style="color: #666; line-height: 1.6;">
            Thank you for visiting AskEdith. Edith's answer is listed below. We are in test-mode as we just launched. Our mission is to provide you clean and crisp answers with information you truly want to see. If Edith's answer left you searching for more, please send a note to Elias Papasavvas, the Founder of AskEdith at hi@askedith.org. We will very quickly adjust and improve. Search engines are overrun with click-bait articles and articles with agendas. AskEdith is on a mission to give retirees and adult caregivers the information they need without the noise!
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0B666B;">
            <h3 style="color: #333; margin-top: 0;">Your Question:</h3>
            <p style="color: #666; font-style: italic;">"${question}"</p>
          </div>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">AI Answer:</h3>
            <div style="color: #444; line-height: 1.6;">
              <p>${htmlAnswer}</p>
            </div>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This answer was generated by AskEdith's AI system using our comprehensive knowledge base about elder care, ADUs, and retirement planning.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || "http://localhost:5000"}/ai-search" style="background-color: #0B666B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Ask Another Question
            </a>
          </div>
        </div>
        <div style="background-color: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2025 AskEdith. All rights reserved.</p>
          <p style="margin: 5px 0 0 0;">This email was sent because you requested to receive an AI answer via email.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Your AskEdith Answer: ${question.substring(0, 50)}${question.length > 50 ? "..." : ""}`,
      html,
    });
  },
};
