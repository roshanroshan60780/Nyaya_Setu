import nodemailer from 'nodemailer';

export interface MailerStatus {
  configured: boolean;
  reason?: string;
}

export interface SendOTPResult {
  delivered: boolean;
  mode: 'smtp' | 'development';
  devNotice?: string;
}

/**
 * Validates whether the environment has complete SMTP credentials configured.
 */
export function getMailerStatus(): MailerStatus {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return {
      configured: false,
      reason: 'SMTP configuration is incomplete. Please specify SMTP_HOST, SMTP_USER, and SMTP_PASS in server/.env.',
    };
  }

  return { configured: true };
}

/**
 * Checks whether the server is operating in local development mailer mode.
 * Returns true only when SMTP is unconfigured AND environment is not production.
 */
export function isLocalDevMailer(): boolean {
  return !getMailerStatus().configured && process.env.NODE_ENV !== 'production';
}

/**
 * Dispatches a single-use 6-digit OTP verification code.
 * 
 * Rules:
 * - If SMTP is fully configured: sends a real email via Nodemailer.
 * - If SMTP is NOT configured:
 *   - In production (NODE_ENV === 'production'): strictly fails and throws an error (fails securely).
 *   - In development/testing (NODE_ENV !== 'production'): enters local development mode, logs the OTP
 *     prominently to the backend terminal, and returns development delivery metadata for the frontend.
 */
export async function sendOTPEmail(
  toEmail: string,
  otp: string,
  purpose: 'Student Registration' | 'Authority Access Request'
): Promise<SendOTPResult> {
  const status = getMailerStatus();

  if (!status.configured) {
    // SECURITY ENFORCEMENT: Never permit unconfigured fallback in production.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Production Error: SMTP configuration is incomplete. Real email delivery is required in production (${status.reason || 'Missing SMTP credentials'}).`
      );
    }

    // Local Development Mode Fallback
    console.log('\n' + '='.repeat(76));
    console.log(' [NYAYASETU LOCAL DEV MODE] SIMULATED EMAIL OTP DISPATCH');
    console.log('='.repeat(76));
    console.log(` Recipient : ${toEmail}`);
    console.log(` Purpose   : ${purpose}`);
    console.log(` OTP Code  : ${otp}`);
    console.log(' Notice    : SMTP is not configured in local development.');
    console.log('             Enter this 6-digit OTP code on the verification page.');
    console.log('             Valid for 5 minutes (maximum 5 attempts).');
    console.log('='.repeat(76) + '\n');

    return {
      delivered: true,
      mode: 'development',
      devNotice: 'SMTP is not configured. Running in Local Development Mode: check the backend server terminal console for your 6-digit OTP code.',
    };
  }

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const from = process.env.SMTP_FROM || `"NyayaSetu Verification" <${process.env.SMTP_USER}>`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from,
    to: toEmail,
    subject: `NyayaSetu - ${purpose} Email Verification Code`,
    text: `Your single-use NyayaSetu verification code for ${purpose} is: ${otp}\n\nThis code expires in 5 minutes. Do not share this OTP with anyone.\n\nNyayaSetu Grievance Redressal Portal`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="font-size: 24px; font-weight: 800; margin: 0; color: #0f172a;">
            <span style="color: #ea580c;">Nyaya</span><span style="color: #2563eb;">Setu</span>
          </h2>
          <p style="font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em;">
            MNNIT Grievance Redressal Portal
          </p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
            Use the following single-use code to verify your official MNNIT email for <strong>${purpose}</strong>:
          </p>
          <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1e3a8a; padding: 14px 20px; background: #ffffff; border: 2px dashed #93c5fd; border-radius: 10px; display: inline-block; font-family: monospace;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #64748b; margin: 16px 0 0 0;">
            Valid for <strong>5 minutes</strong>. Maximum 5 verification attempts.
          </p>
        </div>

        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0; text-align: center;">
          If you did not initiate this request on NyayaSetu, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);

  return {
    delivered: true,
    mode: 'smtp',
  };
}
