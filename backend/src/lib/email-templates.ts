export type EmailLang = "tr" | "en";

// ─── Logo ─────────────────────────────────────────────────────────────────────
// SVG logo with #ffffff text (white) so it renders correctly on the dark header.
// currentColor from the source file is replaced here for email-client compatibility.
const LOGO_SVG_WHITE = `<svg width="210" height="56" viewBox="0 0 210 56" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="alpisMark" x1="2" y1="6" x2="46" y2="50" gradientUnits="userSpaceOnUse"><stop stop-color="#818cf8"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs><rect x="2" y="6" width="44" height="44" rx="11" fill="url(#alpisMark)"/><g transform="translate(2,6) scale(1.375)"><path d="M7 17 A9 9 0 0 1 25 17" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" fill="none"/><rect x="5" y="16" width="4.4" height="8" rx="2.2" fill="#FFFFFF"/><rect x="22.6" y="16" width="4.4" height="8" rx="2.2" fill="#FFFFFF"/><path d="M24.8 24 V25 Q24.8 28 18.5 28" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" fill="none"/><circle cx="16.4" cy="28" r="1.9" fill="#34D399"/></g><text x="58" y="33" font-family="system-ui,sans-serif" font-size="25" font-weight="700" fill="#ffffff" letter-spacing="-0.5">Alpis</text><text x="59" y="46" font-family="system-ui,sans-serif" font-size="9" font-weight="600" fill="#ffffff" opacity="0.55" letter-spacing="3.5">HELP DESK</text></svg>`;

const LOGO_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG_WHITE).toString("base64")}`;

// ─── Translations ─────────────────────────────────────────────────────────────

const T = {
  tr: {
    greeting: (name?: string) => (name ? `Merhaba ${name},` : "Merhaba,"),
    passwordReset: {
      heading: "Şifre Sıfırlama",
      intro: "Alpis Help Desk hesabınız için şifre sıfırlama talebinde bulundunuz.",
      button: "Şifremi Sıfırla",
      expiry: "Bu bağlantı <strong>1 saat</strong> içinde geçerliliğini yitirecektir.",
      ignore: "Bu isteği siz yapmadıysanız, bu e-postayı güvenle yok sayabilirsiniz.",
    },
    verifyEmail: {
      heading: "E-posta Doğrulama",
      intro: "Alpis Help Desk hesabınızı etkinleştirmek için e-posta adresinizi doğrulayın.",
      button: "E-postamı Doğrula",
      expiry: "Bu bağlantı <strong>24 saat</strong> içinde geçerliliğini yitirecektir.",
      ignore: "Eğer bu hesabı siz oluşturmadıysanız, bu e-postayı güvenle yok sayabilirsiniz.",
    },
    notification: {
      button: "Detayları Görüntüle",
    },
    common: {
      linkFallback: "Düğme çalışmıyorsa, aşağıdaki bağlantıyı tarayıcınıza kopyalayın:",
      automated: "Bu e-posta otomatik olarak oluşturulmuştur. Lütfen yanıtlamayın.",
      copyright: `&copy; ${new Date().getFullYear()} Alpis Help Desk. Tüm hakları saklıdır.`,
    },
  },
  en: {
    greeting: (name?: string) => (name ? `Hi ${name},` : "Hello,"),
    passwordReset: {
      heading: "Password Reset",
      intro: "We received a request to reset the password for your Alpis Help Desk account.",
      button: "Reset Password",
      expiry: "This link expires in <strong>1 hour</strong>.",
      ignore: "If you didn't request this, you can safely ignore this email.",
    },
    verifyEmail: {
      heading: "Email Verification",
      intro: "Please verify your email address to activate your Alpis Help Desk account.",
      button: "Verify Email Address",
      expiry: "This link expires in <strong>24 hours</strong>.",
      ignore: "If you didn't create this account, you can safely ignore this email.",
    },
    notification: {
      button: "View Details",
    },
    common: {
      linkFallback: "If the button doesn't work, copy and paste this link into your browser:",
      automated: "This is an automated message. Please do not reply.",
      copyright: `&copy; ${new Date().getFullYear()} Alpis Help Desk. All rights reserved.`,
    },
  },
} as const;

// ─── Base layout ──────────────────────────────────────────────────────────────

function base(lang: EmailLang, heading: string, body: string): string {
  const c = T[lang];
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:48px 20px;">

        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:580px;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12);">

          <!-- ── Logo header ──────────────────────────────────────────── -->
          <tr>
            <td style="background:linear-gradient(145deg,#1e1b4b 0%,#3730a3 100%);padding:32px 40px;text-align:center;">
              <img src="${LOGO_DATA_URI}"
                   alt="Alpis Help Desk"
                   width="168" height="45"
                   style="display:inline-block;border:0;max-width:168px;" />
            </td>
          </tr>

          <!-- ── Heading band ─────────────────────────────────────────── -->
          <tr>
            <td style="background:#6366f1;padding:16px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:19px;font-weight:700;letter-spacing:-0.2px;line-height:1.3;">
                ${heading}
              </h1>
            </td>
          </tr>

          <!-- ── Content ──────────────────────────────────────────────── -->
          <tr>
            <td style="background:#ffffff;padding:40px 40px 36px;">
              ${body}
            </td>
          </tr>

          <!-- ── Footer ───────────────────────────────────────────────── -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;line-height:1.5;">
                ${c.common.automated}
              </p>
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.5;">
                ${c.common.copyright}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Shared link-block used by auth emails ────────────────────────────────────

function linkBlock(lang: EmailLang, link: string, buttonLabel: string): string {
  const c = T[lang];
  return `
    <div style="text-align:center;margin:32px 0 28px;">
      <a href="${link}"
         style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;
                padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;
                letter-spacing:0.1px;line-height:1;">
        ${buttonLabel}
      </a>
    </div>
    <p style="margin:24px 0 6px;font-size:13px;color:#64748b;text-align:center;">
      ${c.common.linkFallback}
    </p>
    <p style="margin:0;font-size:12px;color:#94a3b8;word-break:break-all;text-align:center;">
      <a href="${link}" style="color:#6366f1;text-decoration:underline;">${link}</a>
    </p>`;
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

function p(text: string, style = ""): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.65;${style}">${text}</p>`;
}

function notice(text: string): string {
  return `<p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;text-align:center;border-top:1px solid #f1f5f9;padding-top:20px;">${text}</p>`;
}

// ─── Public template functions ────────────────────────────────────────────────

export function renderPasswordResetEmail(opts: {
  link: string;
  lang?: EmailLang;
  firstName?: string;
}): { subject: string; html: string } {
  const lang = opts.lang ?? "tr";
  const s = T[lang].passwordReset;
  const c = T[lang];

  const body = `
    ${p(c.greeting(opts.firstName))}
    ${p(s.intro)}
    ${linkBlock(lang, opts.link, s.button)}
    ${p(`<em style="font-size:13px;color:#64748b;">${s.expiry}</em>`, "margin-top:20px;")}
    ${notice(s.ignore)}
  `;

  return { subject: s.heading, html: base(lang, s.heading, body) };
}

export function renderVerifyEmailEmail(opts: {
  link: string;
  lang?: EmailLang;
  firstName?: string;
}): { subject: string; html: string } {
  const lang = opts.lang ?? "tr";
  const s = T[lang].verifyEmail;
  const c = T[lang];

  const body = `
    ${p(c.greeting(opts.firstName))}
    ${p(s.intro)}
    ${linkBlock(lang, opts.link, s.button)}
    ${p(`<em style="font-size:13px;color:#64748b;">${s.expiry}</em>`, "margin-top:20px;")}
    ${notice(s.ignore)}
  `;

  return { subject: s.heading, html: base(lang, s.heading, body) };
}

export function renderNotificationEmail(opts: {
  title: string;
  body: string;
  actionUrl?: string;
  lang?: EmailLang;
}): { subject: string; html: string } {
  const lang = opts.lang ?? "tr";
  const s = T[lang].notification;

  const actionBlock = opts.actionUrl ? linkBlock(lang, opts.actionUrl, s.button) : "";

  const content = `
    ${p(opts.body)}
    ${actionBlock}
  `;

  return { subject: opts.title, html: base(lang, opts.title, content) };
}

// ─── Legacy compat ────────────────────────────────────────────────────────────
// Kept so any caller that hasn't been migrated yet doesn't crash at runtime.
// Removes itself once all callers use the typed functions above.
export function renderEmailTemplate(title: string, contentHtml: string): string {
  return base("tr", title, contentHtml);
}
