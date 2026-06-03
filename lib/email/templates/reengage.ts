interface ReengageEmailParams {
  name: string;
  message: string;
  ctaUrl: string;
  ctaLabel?: string;
}

/**
 * Cute, pink re-engagement email. The body `message` is plain text; blank
 * lines split it into paragraphs. `{{name}}` is replaced before this runs.
 */
export function getReengageEmailHtml({
  name,
  message,
  ctaUrl,
  ctaLabel = "Complete my streak",
}: ReengageEmailParams): string {
  const paragraphs = message
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#6b2148;">${p
          .split("\n")
          .join("<br/>")}</p>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LeetRun misses you</title>
</head>
<body style="margin:0;padding:0;background-color:#fff0f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">LeetRun is calling you, cutie. Your streak and your dream company are waiting.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff0f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(244,114,182,0.25);border:1px solid #fbcfe8;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#fb7185 0%,#f472b6 45%,#e879f9 100%);padding:40px 40px 36px;text-align:center;">
              <div style="font-size:40px;line-height:1;margin-bottom:8px;">&#128149;</div>
              <h1 style="margin:0;font-size:26px;font-weight:900;letter-spacing:1px;color:#ffffff;">LeetRun is calling you</h1>
              <p style="margin:8px 0 0;font-size:14px;color:#ffe4ef;font-weight:600;">your dream company awaits, cutie &#10024;</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 8px;">
              <p style="margin:0 0 16px;font-size:18px;font-weight:800;color:#db2777;">Hey ${name}, &#127800;</p>
              ${paragraphs}
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:12px 40px 40px;text-align:center;">
              <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#fb7185 0%,#ec4899 100%);color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;padding:14px 34px;border-radius:999px;box-shadow:0 6px 18px rgba(236,72,153,0.4);">${ctaLabel} &#128293;</a>
              <p style="margin:18px 0 0;font-size:13px;color:#9d174d;">More XP. Longer streak. Closer to the offer. You&apos;ve got this. &#128150;</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#fdf2f8;text-align:center;border-top:1px solid #fbcfe8;">
              <p style="margin:0;font-size:12px;color:#be185d;font-weight:700;">LeetRun</p>
              <p style="margin:6px 0 0;font-size:11px;color:#db2777;">Made with love for your placement grind.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const DEFAULT_REENGAGE_SUBJECT = "LeetRun is calling you, cutie!";

export const DEFAULT_REENGAGE_MESSAGE = `Hey cutie, LeetRun is calling you!

We noticed your streak misses you. Hop back in and complete your daily quest today.

More XP, a longer streak, and your dream company are all waiting for you. Let's get back to grinding, you've totally got this!`;
