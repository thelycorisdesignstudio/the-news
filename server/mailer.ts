import nodemailer from 'nodemailer';
import { config } from './config';

export interface Mail { to: string; subject: string; text: string; html: string }
export type Mailer = (m: Mail) => Promise<void>;

/** Sends through SMTP when SMTP_URL is set; otherwise logs the email so codes are visible in development. */
export function createMailer(): Mailer {
  if (!config.smtpUrl) {
    return async m => {
      console.log(`\n[mail] to=${m.to} subject="${m.subject}"\n${m.text}\n`);
    };
  }
  const transport = nodemailer.createTransport(config.smtpUrl);
  return async m => {
    await transport.sendMail({ from: config.mailFrom, ...m });
  };
}

const wrap = (body: string) => `<!doctype html><html><body style="margin:0;background:#FAFAF8;font-family:'Rethink Sans',Helvetica,Arial,sans-serif;color:#0A0A0A">
<div style="max-width:440px;margin:0 auto;padding:40px 24px">
<div style="line-height:1"><div style="font-style:italic;font-size:14px;color:#6B6B6B">The</div><div style="font-weight:800;font-size:24px;letter-spacing:-1px">News</div></div>
${body}
<p style="margin-top:40px;font-size:11px;color:#6B6B6B">The News · A Lycoris Product</p></div></body></html>`;

export const verificationEmail = (code: string) => ({
  subject: `${code} is your The News code`,
  text: `Your verification code is ${code}. It expires in 10 minutes.`,
  html: wrap(`<h1 style="font-size:24px;letter-spacing:-0.5px;margin:32px 0 8px">check your inbox.</h1>
<p style="font-size:14px;color:#6B6B6B;margin:0 0 24px">enter this code in the app. it expires in 10 minutes.</p>
<div style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</div>`),
});

export const resetEmail = (link: string) => ({
  subject: 'Reset your The News password',
  text: `Reset your password: ${link}\nThis link expires in 30 minutes. If you didn't ask for it, ignore this email.`,
  html: wrap(`<h1 style="font-size:24px;letter-spacing:-0.5px;margin:32px 0 8px">reset your password.</h1>
<p style="font-size:14px;color:#6B6B6B;margin:0 0 24px">this link expires in 30 minutes. if you didn't ask for it, you can ignore this email.</p>
<a href="${link}" style="display:inline-block;padding:14px 28px;border-radius:50px;background:#0055FF;color:#fff;text-decoration:none;font-weight:600">reset password</a>`),
});
