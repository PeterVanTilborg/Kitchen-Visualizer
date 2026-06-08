/**
 * Notification service for sending design previews to customers.
 * Uses SendGrid HTTP Web API (not SMTP) to avoid port 587 being blocked by Railway.
 *
 * Required env vars:
 * Email: SMTP_PASS (SendGrid API key, starts with SG.), SMTP_FROM
 * SMS: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */

import sgMail from "@sendgrid/mail";
import { maskEmail } from "./lib/maskEmail";

const BASE_URL = process.env.BASE_URL || "https://wrap-up-ai-production.up.railway.app";

// Shared HTML template for design-delivery emails. Callers pick the heading
// (e.g. "Your Custom Car Wrap Design" or "Your render from <partner>") and
// optionally a sender-contact block; the layout, color-name subhead, image
// placeholder, and footer CTA stay constant.
function buildDesignEmailHtml(opts: {
  heading: string;
  colorName?: string;
  contactSection?: string;
}): string {
  const colorText = opts.colorName ? ` in <strong>${opts.colorName}</strong>` : "";
  const contactSection = opts.contactSection || "";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #141414; color: #fff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 32px 24px; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
    .header p { color: #888; margin: 8px 0 0; font-size: 15px; }
    .image-container { border-radius: 12px; overflow: hidden; margin: 24px 0; }
    .image-container img { width: 100%; display: block; }
    .tagline { text-align: center; padding: 28px 0; border-top: 1px solid #2a2a2a; margin-top: 32px; }
    .tagline p { color: #888; font-size: 14px; margin: 0 0 12px; }
    .tagline a { display: inline-block; background: #fff; color: #141414; text-decoration: none; font-weight: 600; font-size: 14px; padding: 10px 24px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${opts.heading}</h1>
      <p>Here's the wrap visualization${colorText} created for you</p>
    </div>
    <div class="image-container">
      <img src="cid:design-image" alt="Car Wrap Design" />
    </div>
    ${contactSection}
    <div class="tagline">
      <p>This design was created using <strong>WRAP-UP.AI</strong> — AI-powered car wrap visualization.</p>
      <a href="${BASE_URL}">Try it yourself at WRAP-UP.AI</a>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ─── Email ──────────────────────────────────────────────────────────────────

export async function sendDesignByEmail(opts: {
  to: string;
  imageData: string; // base64 data URL or raw base64
  colorName?: string;
  designId: number;
  senderName?: string;
  senderEmail?: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.SMTP_PASS;
  if (!apiKey) {
    return { success: false, error: "Email service not configured. Please set SMTP_PASS environment variable." };
  }

  const from = process.env.SMTP_FROM || "noreply@wrap-up.ai";

  // Strip the data URL prefix if present
  const base64Data = opts.imageData.replace(/^data:image\/\w+;base64,/, "");

  // Shared attachment payload — base64 decoded once, reused across both sends
  const attachments = [
    {
      content: base64Data,
      filename: "car-wrap-design.jpg",
      type: "image/jpeg",
      disposition: "inline" as const,
      content_id: "design-image",
    },
  ];

  // Customer email — sender contact CTA block (existing behavior preserved)
  let contactSection = "";
  if (opts.senderName || opts.senderEmail) {
    const nameHtml = opts.senderName ? `<p style="font-size: 18px; font-weight: 700; margin: 0 0 8px; color: #fff;">${opts.senderName}</p>` : "";
    const emailHtml = opts.senderEmail ? `<p style="margin: 0;"><a href="mailto:${opts.senderEmail}" style="color: #4da6ff; text-decoration: none; font-size: 15px;">${opts.senderEmail}</a></p>` : "";
    contactSection = `
    <div style="background: #1e1e1e; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
      <p style="color: #888; font-size: 14px; margin: 0 0 16px;">If you want to move forward with this project, please contact:</p>
      ${nameHtml}
      ${emailHtml}
    </div>`;
  }

  const customerHtml = buildDesignEmailHtml({
    heading: "Your Custom Car Wrap Design",
    colorName: opts.colorName,
    contactSection,
  });

  sgMail.setApiKey(apiKey);

  // ── Send 1: customer (gating — failure is returned to caller) ──────────
  console.log(`[sendDesignByEmail] sending to=${maskEmail(opts.to)} designId=${opts.designId}`);
  try {
    await sgMail.send({
      from: `WRAP-UP.AI <${from}>`,
      to: opts.to,
      subject: "Your Custom Car Wrap Design",
      html: customerHtml,
      attachments,
    });
    console.log(`[sendDesignByEmail] customer send OK to=${maskEmail(opts.to)} designId=${opts.designId}`);
  } catch (err: any) {
    const detail = err?.response?.body?.errors?.[0]?.message || err.message;
    console.error(`[sendDesignByEmail] customer send FAILED to=${maskEmail(opts.to)} designId=${opts.designId} error=${detail}`);
    return { success: false, error: `Failed to send email: ${detail}` };
  }

  // ── Send 2: partner copy (best-effort — failure does not fail request) ─
  // Independent envelope so per-recipient deliverability (Gmail spam filters,
  // SendGrid suppression list) cannot take down the customer send.
  if (opts.senderEmail) {
    const partnerHtml = buildDesignEmailHtml({
      heading: "Copy of design sent to your contact",
      colorName: opts.colorName,
      contactSection: `
    <div style="background: #1e1e1e; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
      <p style="color: #ccc; font-size: 15px; margin: 0;">Here&apos;s a copy of the design you just sent to your contact. The recipient received the design in a separate email.</p>
    </div>`,
    });

    console.log(`[sendDesignByEmail] sending partner copy to=${maskEmail(opts.senderEmail)} designId=${opts.designId}`);
    try {
      await sgMail.send({
        from: `WRAP-UP.AI <${from}>`,
        to: opts.senderEmail,
        subject: "Copy of design sent to your contact",
        html: partnerHtml,
        attachments,
      });
      console.log(`[sendDesignByEmail] partner copy OK to=${maskEmail(opts.senderEmail)} designId=${opts.designId}`);
    } catch (err: any) {
      const detail = err?.response?.body?.errors?.[0]?.message || err.message;
      console.error(`[sendDesignByEmail] partner copy FAILED to=${maskEmail(opts.senderEmail)} designId=${opts.designId} error=${detail}`);
    }
  } else {
    console.log(`[sendDesignByEmail] no senderEmail, skipping partner copy designId=${opts.designId}`);
  }

  return { success: true };
}

// ─── Auto Render-Result Email (fire-and-forget) ─────────────────────────────

/**
 * Fire-and-forget email of a completed render to the recipient. Does NOT
 * throw, does NOT block — failures land in Railway logs with a tagged
 * prefix so silent misses are visible. Used by the HQ /api/generate hook
 * (signed-in users) and the widget /api/widget/generate hook (verified
 * visitors).
 *
 * When partnerName is provided the subject and heading switch to
 * "Your render from <partnerName>"; otherwise they fall back to the
 * generic WRAP-UP.AI copy used by sendDesignByEmail. No contact block is
 * included — auto-send has no sender.
 */
export function sendRenderResultEmail(opts: {
  to: string;
  imageData: string; // base64 data URL or raw base64
  colorName?: string;
  designId?: number;
  partnerName?: string;
  context: "hq" | "widget";
}): void {
  void (async () => {
    const tag = `[auto-email:${opts.context}]`;
    const apiKey = process.env.SMTP_PASS;
    if (!apiKey) {
      console.error(`${tag} FAILED to=${opts.to} design=${opts.designId ?? "?"} err=SMTP_PASS not set`);
      return;
    }
    const from = process.env.SMTP_FROM || "noreply@wrap-up.ai";
    const base64Data = opts.imageData.replace(/^data:image\/\w+;base64,/, "");

    const subject = opts.partnerName
      ? `Your render from ${opts.partnerName}`
      : "Your Custom Car Wrap Design";

    const html = buildDesignEmailHtml({
      heading: subject,
      colorName: opts.colorName,
      contactSection: "",
    });

    try {
      sgMail.setApiKey(apiKey);
      await sgMail.send({
        from: `WRAP-UP.AI <${from}>`,
        to: opts.to,
        subject,
        html,
        attachments: [
          {
            content: base64Data,
            filename: "car-wrap-design.jpg",
            type: "image/jpeg",
            disposition: "inline",
            content_id: "design-image",
          },
        ],
      });
      console.info(`${tag} sent to=${opts.to} design=${opts.designId ?? "?"}`);
    } catch (err: any) {
      const detail = err?.response?.body?.errors?.[0]?.message || err?.message || String(err);
      console.error(`${tag} FAILED to=${opts.to} design=${opts.designId ?? "?"} err=${detail}`);
    }
  })();
}

// ─── SMS (Twilio) ────────────────────────────────────────────────────────────

export async function sendDesignBySMS(opts: {
  to: string;
  designId: number;
  colorName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      error: "SMS service not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.",
    };
  }

  let twilioClient: any;
  try {
    const twilio = await import("twilio");
    twilioClient = twilio.default(accountSid, authToken);
  } catch {
    return { success: false, error: "Twilio package not available." };
  }

  const colorText = opts.colorName ? ` in ${opts.colorName}` : "";
  const imageUrl = `${BASE_URL}/api/designs/${opts.designId}/image`;
  const body = `Your custom car wrap design${colorText} is ready! View it here: ${imageUrl}\n\nCreated with WRAP-UP.AI — try it yourself at ${BASE_URL}`;

  try {
    await twilioClient.messages.create({
      body,
      from: fromNumber,
      to: opts.to,
      mediaUrl: [imageUrl],
    });
    return { success: true };
  } catch (err: any) {
    console.error("[sms] Send error:", err.message);
    return { success: false, error: `Failed to send SMS: ${err.message}` };
  }
}


// ─── Password Reset Email ────────────────────────────────────────────────────

export async function sendPasswordResetEmail(opts: {
  to: string;
  resetUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "noreply@wrap-up.ai";
  if (!apiKey || !from) {
    console.error("[Password Reset] Missing SMTP_PASS or SMTP_FROM env vars");
    return { success: false, error: "Email service not configured" };
  }

  sgMail.setApiKey(apiKey);

  try {
    await sgMail.send({
      to: opts.to,
      from,
      subject: "Reset Your Wrap Up AI Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested a password reset for your Wrap Up AI account.</p>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${opts.resetUrl}" style="background-color: #c8e634; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
          <p style="color: #999; font-size: 12px;">— Wrap Up AI</p>
        </div>
      `,
    });
    console.log(`[Password Reset] Email sent to ${opts.to}`);
    return { success: true };
  } catch (err: any) {
    const detail = err?.response?.body?.errors?.[0]?.message || err?.message || err;
    console.error("[Password Reset] Failed to send email:", detail);
    return { success: false, error: `Failed to send password reset email: ${detail}` };
  }
}


// ---- Ambassador Application Notification ------------------------------------------------

export async function sendAmbassadorApplicationEmail(opts: {
  applicantName: string;
  applicantEmail: string;
  instagramUrl: string;
  tiktokUrl?: string | null;
  youtubeUrl?: string | null;
  otherSocialUrl?: string | null;
  motivation: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "noreply@wrap-up.ai";
  if (!apiKey || !from) {
    console.error("[Ambassador] Missing SMTP_PASS or SMTP_FROM env vars");
    return { success: false, error: "Email service not configured" };
  }

  sgMail.setApiKey(apiKey);

  const adminEmail = process.env.ADMIN_EMAIL || "peter@2wrap.com";

  try {
    await sgMail.send({
      to: adminEmail,
      from,
      subject: `New Ambassador Application from ${opts.applicantName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">New Ambassador Application</h2>
          <p><strong>Name:</strong> ${opts.applicantName}</p>
          <p><strong>Email:</strong> <a href="mailto:${opts.applicantEmail}">${opts.applicantEmail}</a></p>
          <p><strong>Instagram:</strong> <a href="${opts.instagramUrl}">${opts.instagramUrl}</a></p>
          ${opts.tiktokUrl ? `<p><strong>TikTok:</strong> <a href="${opts.tiktokUrl}">${opts.tiktokUrl}</a></p>` : ""}
          ${opts.youtubeUrl ? `<p><strong>YouTube:</strong> <a href="${opts.youtubeUrl}">${opts.youtubeUrl}</a></p>` : ""}
          ${opts.otherSocialUrl ? `<p><strong>Other Social:</strong> <a href="${opts.otherSocialUrl}">${opts.otherSocialUrl}</a></p>` : ""}
          <hr style="margin: 20px 0;">
          <h3 style="color: #333;">Motivation</h3>
          <p>${opts.motivation}</p>
          <hr style="margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">Review this application in the admin panel.</p>
          <p style="color: #999; font-size: 12px;">— Wrap Up AI</p>
        </div>
      `,
    });
    console.log(`[Ambassador] Application notification sent to ${adminEmail}`);
    return { success: true };
  } catch (err: any) {
    console.error("[Ambassador] Failed to send email:", err?.message || err);
    return { success: false, error: err?.message || "Failed to send email" };
  }
}

export async function sendVerificationCodeEmail(opts: {
  to: string;
  name?: string;
  code: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.SMTP_PASS;
  if (!apiKey) {
    return { success: false, error: 'Email service not configured. Please set SMTP_PASS.' };
  }
  const from = process.env.SMTP_FROM || 'noreply@wrap-up.ai';
  try {
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      from: `WRAP-UP.AI <${from}>`,
      to: opts.to,
      subject: 'Your verification code',
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#D2D915;margin-bottom:8px">Verify your email</h2>
        ${opts.name ? `<p>Hi ${opts.name},</p>` : ''}
        <p>Enter this code to start visualising your vehicle wrap:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111;background:#f5f5f5;padding:16px 24px;border-radius:8px;display:inline-block;margin:16px 0">${opts.code}</div>
        <p style="color:#666;font-size:13px">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
        <p style="color:#999;font-size:12px">— WRAP-UP.AI</p>
      </div>`,
    });
    return { success: true };
  } catch (err: any) {
    const detail = err?.response?.body ? JSON.stringify(err.response.body) : (err?.message || 'Unknown error');
    console.error('[sendVerificationCodeEmail]', detail);
    return { success: false, error: detail };
  }
}

// Welcome email — Item 0a Session 3 Step 3.
// Fires on /api/register auto_promote success and on /api/register/confirm
// success. Uses the SDK object form for `from` to set a display name
// (WrapUp AI) without requiring a global SMTP_FROM refactor (GR 17 cleanup
// is a separate batch). Reply-To routes responses to info@wrap-up.app, the
// active 2WRAP support mailbox, since noreply@wrap-up.ai has no inbox.
export async function sendWelcomeEmail(opts: {
  to: string;
  firstName: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.SMTP_PASS;
  if (!apiKey) {
    return { success: false, error: 'Email service not configured. Please set SMTP_PASS.' };
  }
  const fromEmail = process.env.SMTP_FROM || 'noreply@wrap-up.ai';
  const ctaUrl = 'https://www.wrap-up.ai/?utm_source=welcome_email&utm_campaign=signup';
  const bannerUrl = 'https://www.wrap-up.ai/welcome-email-banner.jpg';
  const safeName = opts.firstName || 'there';

  const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:0 16px 32px">
    <img src="${bannerUrl}" alt="WrapUp AI" style="width:100%;max-width:480px;height:auto;display:block;border-radius:8px;margin-bottom:24px" />
    <h2 style="color:#D2D915;margin:0 0 16px;font-size:22px;line-height:1.3">Welcome to the WrapUp AI family, ${safeName}</h2>
    <p style="margin:0 0 16px;color:#111;font-size:15px;line-height:1.5">Hi ${safeName},</p>
    <p style="margin:0 0 16px;color:#111;font-size:15px;line-height:1.5">You're in. Your account is ready and you have <strong>2 free renders</strong> waiting for you.</p>
    <p style="margin:0 0 8px;color:#111;font-size:15px;line-height:1.5">Here's how it works:</p>
    <ol style="margin:0 0 20px;padding-left:24px;color:#111;font-size:15px;line-height:1.7">
      <li>Upload a photo of your car</li>
      <li>Pick a vinyl wrap color</li>
      <li>See it on your car in seconds</li>
    </ol>
    <p style="margin:0 0 24px;color:#111;font-size:15px;line-height:1.5">Whether you're planning a full wrap or just curious how that satin midnight green would look on your daily driver — WrapUp AI shows you before you commit.</p>
    <p style="margin:0 0 28px;text-align:center">
      <a href="${ctaUrl}" style="display:inline-block;background:#D2D915;color:#111;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px;font-size:15px">Start your first render →</a>
    </p>
    <p style="margin:0 0 8px;color:#666;font-size:13px;line-height:1.5">Have questions? Reply to this email — we read every one.</p>
    <p style="margin:0 0 4px;color:#666;font-size:13px;line-height:1.5">Cheers,</p>
    <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.5">The WrapUp AI team</p>
    <p style="margin:24px 0 0;color:#999;font-size:11px;text-align:center">— WRAP-UP.AI</p>
  </div>`;

  const text = `Welcome to the WrapUp AI family, ${safeName}

Hi ${safeName},

You're in. Your account is ready and you have 2 free renders waiting for you.

Here's how it works:
  1. Upload a photo of your car
  2. Pick a vinyl wrap color
  3. See it on your car in seconds

Whether you're planning a full wrap or just curious how that satin midnight green would look on your daily driver — WrapUp AI shows you before you commit.

Start your first render: ${ctaUrl}

Have questions? Reply to this email — we read every one.

Cheers,
The WrapUp AI team
— WRAP-UP.AI`;

  try {
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      from: { email: fromEmail, name: 'WrapUp AI' },
      replyTo: 'info@wrap-up.app',
      to: opts.to,
      subject: `Welcome to the WrapUp AI family, ${safeName}`,
      text,
      html,
    });
    console.log(`[welcome-email] sent to=${maskEmail(opts.to)}`);
    return { success: true };
  } catch (err: any) {
    const detail = err?.response?.body ? JSON.stringify(err.response.body) : (err?.message || 'Unknown error');
    console.error(`[welcome-email] failed to=${maskEmail(opts.to)} error=${detail}`);
    return { success: false, error: detail };
  }
}
