import type { Block } from "./store";

interface GlobalStyles {
  fontFamily: string;
  primaryColor: string;
  textColor: string;
  backgroundColor: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBlock(block: Block, g: GlobalStyles): string {
  const { content, styles } = block;
  const padding = styles.padding ?? "8px 0";
  const margin = styles.margin ?? "0";
  const align = styles.textAlign ?? "left";

  switch (block.type) {
    case "TEXT":
      return `<p style="margin:${margin};padding:${padding};text-align:${align};color:${styles.color ?? g.textColor};font-family:${g.fontFamily};font-size:${styles.fontSize ?? "14px"};line-height:1.6;">${content.text ?? ""}</p>`;

    case "HEADING": {
      const tag = content.level ?? "h2";
      const size: Record<string, string> = { h1: "28px", h2: "22px", h3: "18px" };
      return `<${tag} style="margin:${margin};padding:${padding};text-align:${align};color:${content.color ?? g.textColor};font-family:${g.fontFamily};font-size:${size[tag] ?? "22px"};font-weight:700;">${escapeHtml(content.text ?? "")}</${tag}>`;
    }

    case "IMAGE":
      if (!content.url) return "";
      return `<div style="text-align:${align};padding:${padding};margin:${margin};"><img src="${escapeHtml(content.url)}" alt="${escapeHtml(content.alt ?? "")}" width="${styles.width ?? "100%"}" style="max-width:100%;height:auto;display:inline-block;" /></div>`;

    case "DIVIDER":
      return `<div style="padding:${padding};margin:${margin};"><hr style="border:none;border-top:${styles.thickness ?? 1}px solid ${styles.color ?? "#e5e7eb"};margin:0;" /></div>`;

    case "BUTTON": {
      const bg = content.backgroundColor || g.primaryColor;
      const r = styles.borderRadius ?? 6;
      return `<div style="text-align:${align};padding:${padding};margin:${margin};"><a href="${escapeHtml(content.url ?? "#")}" style="display:inline-block;padding:${content.paddingY ?? "10px"} ${content.paddingX ?? "20px"};background-color:${bg};color:${content.color ?? "#ffffff"};text-decoration:none;border-radius:${r}px;font-weight:600;font-size:${styles.fontSize ?? "14px"};font-family:${g.fontFamily};">${escapeHtml(content.text ?? "Click Here")}</a></div>`;
    }

    case "SOCIAL_LINKS": {
      const links: { label: string; url: string }[] = content.links ?? [];
      const isRow = content.layout !== "flex-col";
      const flexAlign =
        align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
      const items = links
        .map(
          (l) =>
            `<a href="${escapeHtml(l.url)}" style="color:${g.primaryColor};text-decoration:none;font-weight:500;font-family:${g.fontFamily};font-size:13px;margin:${isRow ? "0 12px 0 0" : "0 0 6px 0"};display:${isRow ? "inline-block" : "block"};">${escapeHtml(l.label)}</a>`,
        )
        .join("");
      return `<div style="display:flex;flex-direction:${isRow ? "row" : "column"};justify-content:${flexAlign};align-items:${isRow ? "center" : "flex-start"};flex-wrap:wrap;padding:${padding};margin:${margin};">${items}</div>`;
    }

    case "VARIABLE":
      return `<span style="color:${g.textColor};font-family:${g.fontFamily};font-size:${styles.fontSize ?? "14px"};">{{${content.variableName ?? ""}}}</span>`;

    case "SPACER":
      return `<div style="height:${content.height ?? "20px"};line-height:${content.height ?? "20px"};">&nbsp;</div>`;

    case "LINK": {
      const color = content.color || g.primaryColor;
      return `<p style="margin:${margin};padding:${padding};text-align:${align};font-family:${g.fontFamily};font-size:${styles.fontSize ?? "14px"};"><a href="${escapeHtml(content.url ?? "#")}" style="color:${color};text-decoration:underline;font-weight:500;">${escapeHtml(content.text ?? "Click here")}</a></p>`;
    }

    case "FEEDBACK": {
      const question = escapeHtml(content.question ?? "How helpful was this?");
      const base = content.baseUrl ?? "https://";
      const type = content.type ?? "stars";
      const scale = content.scale ?? 5;

      let items = "";
      if (type === "stars") {
        for (let i = 1; i <= scale; i++) {
          items += `<a href="${escapeHtml(base)}?rating=${i}" style="display:inline-block;margin:0 4px;font-size:24px;text-decoration:none;">⭐</a>`;
        }
      } else if (type === "thumbs") {
        items = `<a href="${escapeHtml(base)}?rating=positive" style="display:inline-block;margin:0 8px;font-size:28px;text-decoration:none;">👍</a><a href="${escapeHtml(base)}?rating=negative" style="display:inline-block;margin:0 8px;font-size:28px;text-decoration:none;">👎</a>`;
      } else {
        items = `<a href="${escapeHtml(base)}?rating=5" style="display:inline-block;margin:0 6px;font-size:24px;text-decoration:none;">😍</a><a href="${escapeHtml(base)}?rating=4" style="display:inline-block;margin:0 6px;font-size:24px;text-decoration:none;">😊</a><a href="${escapeHtml(base)}?rating=3" style="display:inline-block;margin:0 6px;font-size:24px;text-decoration:none;">😐</a><a href="${escapeHtml(base)}?rating=2" style="display:inline-block;margin:0 6px;font-size:24px;text-decoration:none;">😞</a><a href="${escapeHtml(base)}?rating=1" style="display:inline-block;margin:0 6px;font-size:24px;text-decoration:none;">😡</a>`;
      }

      return `<div style="text-align:${align};padding:${padding};margin:${margin};"><p style="margin:0 0 12px 0;font-family:${g.fontFamily};font-size:14px;color:${g.textColor};font-weight:600;">${question}</p><div style="text-align:${align};">${items}</div></div>`;
    }

    case "COLUMNS": {
      const [w1, w2] = (content.ratio ?? "50:50").split(":").map(Number);
      const total = w1 + w2;
      const pct1 = Math.round((w1 / total) * 100);
      const pct2 = 100 - pct1;
      const gap = content.gap ?? "16px";
      return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:${padding};margin:${margin};"><tr><td width="${pct1}%" valign="top" style="padding-right:${gap};font-family:${g.fontFamily};font-size:14px;color:${g.textColor};line-height:1.6;">${content.col1 ?? ""}</td><td width="${pct2}%" valign="top" style="font-family:${g.fontFamily};font-size:14px;color:${g.textColor};line-height:1.6;">${content.col2 ?? ""}</td></tr></table>`;
    }

    case "SECTION": {
      const bg = content.backgroundColor ?? "#f9fafb";
      const br = content.borderRadius ?? 8;
      const bc = content.borderColor ?? "#e5e7eb";
      const bw = content.borderWidth ?? 1;
      const sp = content.padding ?? "24px";
      return `<div style="margin:${margin};padding:${sp};background-color:${bg};border-radius:${br}px;border:${bw}px solid ${bc};font-family:${g.fontFamily};font-size:14px;color:${g.textColor};line-height:1.6;">${content.text ?? ""}</div>`;
    }

    case "CALLOUT": {
      const bg = content.backgroundColor ?? "#eff6ff";
      const tc = content.textColor ?? "#1e40af";
      const bc = content.borderColor ?? "#bfdbfe";
      const br = content.borderRadius ?? 8;
      const icon = content.icon ?? "💡";
      return `<div style="margin:${margin};padding:${padding};background-color:${bg};border-left:4px solid ${bc};border-radius:${br}px;display:flex;align-items:flex-start;gap:12px;"><span style="font-size:20px;line-height:1;">${icon}</span><p style="margin:0;font-family:${g.fontFamily};font-size:14px;color:${tc};line-height:1.6;">${content.text ?? ""}</p></div>`;
    }

    case "QUOTE": {
      const bc = content.borderColor || g.primaryColor;
      return `<blockquote style="margin:${margin};padding:${padding} 0 ${padding} 20px;border-left:4px solid ${bc};font-family:${g.fontFamily};font-style:italic;"><p style="margin:0 0 8px 0;font-size:16px;color:${g.textColor};line-height:1.7;">${escapeHtml(content.text ?? "")}</p>${content.attribution ? `<cite style="font-size:13px;color:${g.textColor};opacity:0.6;font-style:normal;">${escapeHtml(content.attribution)}</cite>` : ""}</blockquote>`;
    }

    case "LIST": {
      const items: string[] = content.items ?? [];
      const tag = content.ordered ? "ol" : "ul";
      const listStyle = content.ordered ? "decimal" : "disc";
      const rows = items.map((item) => `<li style="margin-bottom:6px;">${escapeHtml(item)}</li>`).join("");
      return `<${tag} style="margin:${margin};padding:${padding};padding-left:24px;list-style-type:${listStyle};font-family:${g.fontFamily};font-size:${styles.fontSize ?? "14px"};color:${g.textColor};line-height:1.6;">${rows}</${tag}>`;
    }

    case "HTML":
      return `<div style="padding:${padding};margin:${margin};">${content.html ?? ""}</div>`;

    default:
      return "";
  }
}

export function renderBlocksToHtml(blocks: Block[], globalStyles: GlobalStyles): string {
  const body = blocks.map((b) => renderBlock(b, globalStyles)).join("\n");
  return `<div style="font-family:${globalStyles.fontFamily};color:${globalStyles.textColor};background-color:${globalStyles.backgroundColor};max-width:600px;margin:0 auto;padding:0;">${body}</div>`;
}
