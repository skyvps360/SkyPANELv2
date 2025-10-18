import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';
import { config } from '../config/index.js';

let transporter: Transporter | null = null;

function ensureTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  const user = config.SMTP2GO_USERNAME;
  const pass = config.SMTP2GO_PASSWORD || config.SMTP2GO_API_KEY;
  if (!user || !pass) {
    throw new Error('SMTP2GO credentials are not configured');
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP2GO_HOST || 'mail.smtp2go.com',
    port: Number(process.env.SMTP2GO_PORT || 587),
    secure: false,
    requireTLS: true,
    auth: {
      user,
      pass
    }
  });

  return transporter;
}

async function sendEmail(options: SendMailOptions): Promise<void> {
  const senderEmail = config.FROM_EMAIL || config.SMTP2GO_USERNAME;
  if (!senderEmail) {
    throw new Error('FROM_EMAIL is not configured');
  }

  const senderName = config.FROM_NAME || 'SkyVPS360';
  const mailOptions: SendMailOptions = {
    from: options.from || `${senderName} <${senderEmail}>`,
    ...options
  };

  const transport = ensureTransporter();
  await transport.sendMail(mailOptions);
}

export async function sendWelcomeEmail(to: string, name?: string): Promise<void> {
  const displayName = name || 'there';
  const subject = 'Welcome to SkyVPS360';
  const html = `
    <p>Hi ${displayName},</p>
    <p>Welcome to SkyVPS360. Your account is ready to go.</p>
    <p>If you did not create this account, please contact support right away.</p>
    <p>Thanks,<br/>The SkyVPS360 Team</p>
  `;
  const text = `Hi ${displayName},\n\nWelcome to SkyVPS360. Your account is ready to go.\n\nIf you did not create this account, please contact support right away.\n\nThanks,\nThe SkyVPS360 Team`;

  await sendEmail({ to, subject, html, text });
}

export async function sendLoginNotificationEmail(to: string, name?: string): Promise<void> {
  const displayName = name || 'there';
  const subject = 'SkyVPS360 login notification';
  const html = `
    <p>Hi ${displayName},</p>
    <p>We noticed a successful login to your SkyVPS360 account just now.</p>
    <p>If this was not you, we recommend resetting your password immediately.</p>
    <p>Thanks,<br/>The SkyVPS360 Team</p>
  `;
  const text = `Hi ${displayName},\n\nWe noticed a successful login to your SkyVPS360 account just now.\n\nIf this was not you, we recommend resetting your password immediately.\n\nThanks,\nThe SkyVPS360 Team`;

  await sendEmail({ to, subject, html, text });
}

export async function sendPasswordResetEmail(to: string, token: string, name?: string): Promise<void> {
  const baseUrl = (config.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const displayName = name || 'there';
  const subject = 'Reset your SkyVPS360 password';
  const html = `
    <p>Hi ${displayName},</p>
    <p>We received a request to reset your SkyVPS360 password.</p>
    <p>Use the reset code below within the next hour:</p>
    <p style="font-size:20px;font-weight:600;letter-spacing:0.35em;margin:16px 0;">${token}</p>
    <p>You can also <a href="${resetUrl}">reset your password using this link</a>.</p>
    <p>If you did not request this, you can safely ignore this email.</p>
    <p>Thanks,<br/>The SkyVPS360 Team</p>
  `;
  const text = `Hi ${displayName},\n\nWe received a request to reset your SkyVPS360 password.\nYour reset code (valid for 1 hour): ${token}\n\nYou can reset your password by entering this code on the reset page or by visiting the link below:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n\nThanks,\nThe SkyVPS360 Team`;

  await sendEmail({ to, subject, html, text });
}
