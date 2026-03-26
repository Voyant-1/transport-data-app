export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
  const apiKey = process.env.MAILERSEND_API_KEY;
  const fromEmail = process.env.MAILERSEND_FROM_EMAIL || "noreply@trial-abc.mlsender.net";
  const fromName = process.env.MAILERSEND_FROM_NAME || "Voyant Transport";

  if (!apiKey) {
    console.log(`\n========================================`);
    console.log(`  PASSWORD RESET LINK for ${email}: ${resetUrl}`);
    console.log(`========================================\n`);
    return true;
  }

  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: fromEmail, name: fromName },
      to: [{ email }],
      subject: "Reset Your Voyant Password",
      text: `You requested a password reset. Click this link to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
      html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">
        <h2 style="color:#005e8c;margin-bottom:20px;">Voyant Transport</h2>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;background:#005e8c;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Reset Password</a>
        </div>
        <p style="color:#666;font-size:13px;">This link expires in 1 hour.</p>
        <p style="color:#999;font-size:12px;">If you didn't request this, please ignore this email.</p>
      </div>`,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error(`[MailerSend] Failed to send reset email: ${res.status} ${errorText}`);
    console.log(`\n========================================`);
    console.log(`  PASSWORD RESET LINK (email failed) for ${email}: ${resetUrl}`);
    console.log(`========================================\n`);
  } else {
    console.log(`[MailerSend] Password reset email sent to ${email}`);
  }

  return res.ok;
}

export async function sendInviteEmail(email: string, resetUrl: string, inviterName: string): Promise<boolean> {
  const apiKey = process.env.MAILERSEND_API_KEY;
  const fromEmail = process.env.MAILERSEND_FROM_EMAIL || "noreply@trial-abc.mlsender.net";
  const fromName = process.env.MAILERSEND_FROM_NAME || "Voyant Transport";

  if (!apiKey) {
    console.log(`\n========================================`);
    console.log(`  INVITE LINK for ${email}: ${resetUrl}`);
    console.log(`========================================\n`);
    return true;
  }

  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: fromEmail, name: fromName },
      to: [{ email }],
      subject: "You've been invited to Voyant Transport",
      text: `You've been invited by ${inviterName} to join Voyant Transport.\n\nClick this link to set your password and get started:\n\n${resetUrl}\n\nThis link expires in 1 hour.`,
      html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">
        <h2 style="color:#005e8c;margin-bottom:20px;">Voyant Transport</h2>
        <p>You've been invited by <strong>${inviterName}</strong> to join Voyant Transport.</p>
        <p>Click the button below to set your password and get started:</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;background:#005e8c;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Set Your Password</a>
        </div>
        <p style="color:#666;font-size:13px;">This link expires in 1 hour.</p>
      </div>`,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error(`[MailerSend] Failed to send invite email: ${res.status} ${errorText}`);
    console.log(`\n========================================`);
    console.log(`  INVITE LINK (email failed) for ${email}: ${resetUrl}`);
    console.log(`========================================\n`);
  } else {
    console.log(`[MailerSend] Invite email sent to ${email}`);
  }

  return res.ok;
}

export async function send2FACode(email: string, code: string): Promise<boolean> {
  const apiKey = process.env.MAILERSEND_API_KEY;
  const fromEmail = process.env.MAILERSEND_FROM_EMAIL || "noreply@trial-abc.mlsender.net";
  const fromName = process.env.MAILERSEND_FROM_NAME || "Voyant Transport";

  if (!apiKey) {
    console.log(`\n========================================`);
    console.log(`  2FA CODE for ${email}: ${code}`);
    console.log(`========================================\n`);
    return true;
  }

  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: fromEmail, name: fromName },
      to: [{ email }],
      subject: "Your Voyant Login Code",
      text: `Your verification code is: ${code}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this code, please ignore this email.`,
      html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">
        <h2 style="color:#005e8c;margin-bottom:20px;">Voyant Transport</h2>
        <p>Your verification code is:</p>
        <div style="background:#f7f9fc;border:2px solid #005e8c;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#005e8c;">${code}</span>
        </div>
        <p style="color:#666;font-size:13px;">This code expires in 5 minutes.</p>
        <p style="color:#999;font-size:12px;">If you didn't request this code, please ignore this email.</p>
      </div>`,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error(`[MailerSend] Failed to send email: ${res.status} ${errorText}`);
    // Still log code to console as fallback
    console.log(`\n========================================`);
    console.log(`  2FA CODE (email failed) for ${email}: ${code}`);
    console.log(`========================================\n`);
  } else {
    console.log(`[MailerSend] 2FA code sent to ${email}`);
  }

  return res.ok;
}
