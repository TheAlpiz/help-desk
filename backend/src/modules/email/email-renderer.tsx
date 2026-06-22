import React from "react";
import { render } from "@react-email/render";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Img,
  Hr,
  Link,
  Preview,
  Font,
} from "@react-email/components";

// ── Block type mirror (must match frontend store) ─────────────────────────────

export type BlockType =
  | "TEXT"
  | "HEADING"
  | "IMAGE"
  | "DIVIDER"
  | "BUTTON"
  | "SOCIAL_LINKS"
  | "VARIABLE"
  | "SPACER";

export interface Block {
  id: string;
  type: BlockType;
  content: Record<string, any>;
  styles: Record<string, any>;
}

export interface GlobalStyles {
  fontFamily: string;
  primaryColor: string;
  textColor: string;
  backgroundColor: string;
  buttonBorderRadius?: number;
}

export interface EmailBrandingConfig {
  primaryColor?: string;
  fontFamily?: string;
  headerBgColor?: string;
  logoUrl?: string | null;
  buttonColor?: string | null;
  buttonBorderRadius?: number;
  footerText?: string | null;
  footerBgColor?: string;
  companyAddress?: string | null;
  companyPhone?: string | null;
  unsubscribeText?: string | null;
  removeHelpdeskBranding?: boolean;
}

// ── Block renderer ────────────────────────────────────────────────────────────

function BlockItem({ block, g }: { block: Block; g: GlobalStyles }) {
  const { content, styles } = block;
  const padding = styles.padding ?? "8px 0";
  const align = (styles.textAlign ?? "left") as React.CSSProperties["textAlign"];

  switch (block.type) {
    case "TEXT":
      return (
        <Text
          style={{
            padding,
            margin: styles.margin ?? "0",
            textAlign: align,
            color: styles.color ?? g.textColor,
            fontFamily: g.fontFamily,
            fontSize: styles.fontSize ?? "14px",
            lineHeight: "1.6",
          }}
          dangerouslySetInnerHTML={{ __html: content.text ?? "" }}
        />
      );

    case "HEADING": {
      const level = content.level ?? "h2";
      const sizeMap: Record<string, string> = { h1: "28px", h2: "22px", h3: "18px" };
      return (
        <Heading
          as={level}
          style={{
            padding,
            margin: styles.margin ?? "0 0 8px 0",
            textAlign: align,
            color: content.color ?? g.textColor,
            fontFamily: g.fontFamily,
            fontSize: sizeMap[level] ?? "22px",
            fontWeight: 700,
          }}
        >
          {content.text ?? ""}
        </Heading>
      );
    }

    case "IMAGE":
      if (!content.url) return null;
      return (
        <Section style={{ padding, textAlign: align }}>
          <Img
            src={content.url}
            alt={content.alt ?? ""}
            width={styles.width ?? "100%"}
            style={{ maxWidth: "100%", height: "auto", display: "inline-block" }}
          />
        </Section>
      );

    case "DIVIDER":
      return (
        <Hr
          style={{
            margin: `${styles.margin ?? "0"}`,
            borderTop: `${styles.thickness ?? 1}px solid ${styles.color ?? "#e5e7eb"}`,
          }}
        />
      );

    case "BUTTON": {
      const bg = content.backgroundColor ?? g.primaryColor;
      const radius = `${styles.borderRadius ?? g.buttonBorderRadius ?? 6}px`;
      return (
        <Section style={{ padding, textAlign: align }}>
          <Button
            href={content.url ?? "#"}
            style={{
              backgroundColor: bg,
              color: content.color ?? "#ffffff",
              fontFamily: g.fontFamily,
              fontSize: styles.fontSize ?? "14px",
              fontWeight: 600,
              borderRadius: radius,
              padding: `${content.paddingY ?? "10px"} ${content.paddingX ?? "20px"}`,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            {content.text ?? "Click Here"}
          </Button>
        </Section>
      );
    }

    case "SOCIAL_LINKS": {
      const links: { label: string; url: string }[] = content.links ?? [];
      const isRow = content.layout !== "flex-col";
      return (
        <Section style={{ padding, textAlign: align }}>
          {links.map((l, i) => (
            <Link
              key={i}
              href={l.url}
              style={{
                color: g.primaryColor,
                textDecoration: "none",
                fontWeight: 500,
                fontFamily: g.fontFamily,
                fontSize: "13px",
                marginRight: isRow ? "12px" : undefined,
                marginBottom: !isRow ? "6px" : undefined,
                display: isRow ? "inline-block" : "block",
              }}
            >
              {l.label}
            </Link>
          ))}
        </Section>
      );
    }

    case "VARIABLE":
      return (
        <Text
          style={{
            padding,
            margin: styles.margin ?? "0",
            color: g.textColor,
            fontFamily: g.fontFamily,
            fontSize: styles.fontSize ?? "14px",
          }}
        >
          {`{{${content.variableName ?? ""}}}`}
        </Text>
      );

    case "SPACER":
      return (
        <Section style={{ height: content.height ?? "20px", lineHeight: content.height ?? "20px" }}>
          {" "}
        </Section>
      );

    default:
      return null;
  }
}

// ── Full email template ───────────────────────────────────────────────────────

interface FullEmailProps {
  blocks: Block[];
  globalStyles: GlobalStyles;
  branding: EmailBrandingConfig;
  previewText?: string;
}

function FullEmail({ blocks, globalStyles, branding, previewText }: FullEmailProps) {
  const bg = branding.footerBgColor ?? "#f8fafc";
  const headerBg = branding.headerBgColor ?? "#ffffff";

  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily={branding.fontFamily ?? "Inter"}
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={{ backgroundColor: "#f3f4f6", fontFamily: globalStyles.fontFamily, margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", backgroundColor: globalStyles.backgroundColor }}>
          {/* Header */}
          {branding.logoUrl && (
            <Section style={{ backgroundColor: headerBg, padding: "24px 40px", textAlign: "center" }}>
              <Img src={branding.logoUrl} alt="Logo" width={140} style={{ height: "auto", display: "inline-block" }} />
            </Section>
          )}

          {/* Body blocks */}
          <Section style={{ padding: "32px 40px" }}>
            {blocks.map((block) => (
              <BlockItem key={block.id} block={block} g={globalStyles} />
            ))}
          </Section>

          {/* Footer */}
          <Section style={{ backgroundColor: bg, padding: "20px 40px", textAlign: "center" }}>
            {branding.companyAddress && (
              <Text style={{ margin: "0 0 4px", fontSize: "11px", color: "#6b7280", fontFamily: globalStyles.fontFamily }}>
                {branding.companyAddress}
              </Text>
            )}
            {branding.companyPhone && (
              <Text style={{ margin: "0 0 4px", fontSize: "11px", color: "#6b7280", fontFamily: globalStyles.fontFamily }}>
                {branding.companyPhone}
              </Text>
            )}
            {branding.footerText && (
              <Text style={{ margin: "0 0 4px", fontSize: "11px", color: "#9ca3af", fontFamily: globalStyles.fontFamily }}>
                {branding.footerText}
              </Text>
            )}
            {branding.unsubscribeText && (
              <Text style={{ margin: "8px 0 0", fontSize: "10px", color: "#d1d5db", fontFamily: globalStyles.fontFamily }}>
                {branding.unsubscribeText}
              </Text>
            )}
            {!branding.removeHelpdeskBranding && (
              <Text style={{ margin: "8px 0 0", fontSize: "10px", color: "#d1d5db", fontFamily: globalStyles.fontFamily }}>
                Powered by Alpis Help Desk
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Signature fragment ────────────────────────────────────────────────────────

function SignatureFragment({ blocks, globalStyles }: { blocks: Block[]; globalStyles: GlobalStyles }) {
  return (
    <Html lang="en">
      <Head />
      <Body style={{ margin: 0, padding: 0, fontFamily: globalStyles.fontFamily }}>
        <Container>
          {blocks.map((block) => (
            <BlockItem key={block.id} block={block} g={globalStyles} />
          ))}
        </Container>
      </Body>
    </Html>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function renderFullEmail(
  blocks: Block[],
  globalStyles: GlobalStyles,
  branding: EmailBrandingConfig,
  previewText?: string,
): Promise<string> {
  return render(
    <FullEmail
      blocks={blocks}
      globalStyles={globalStyles}
      branding={branding}
      previewText={previewText}
    />,
    { pretty: false },
  );
}

export async function renderSignatureFragment(
  blocks: Block[],
  globalStyles: GlobalStyles,
): Promise<string> {
  const fullHtml = await render(
    <SignatureFragment blocks={blocks} globalStyles={globalStyles} />,
    { pretty: false },
  );
  // Extract just the body content — strip outer html/body/head tags
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch?.[1]?.trim() ?? fullHtml;
}
