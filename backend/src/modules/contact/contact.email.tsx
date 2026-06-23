import React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Preview,
} from "@react-email/components";

interface ContactEmailProps {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  language?: "en" | "tr";
}

const translations = {
  en: {
    preview: (name: string) => `New contact submission from ${name}`,
    heading: "New Contact Submission",
    intro: "You have received a new contact form submission on your website.",
    nameLabel: "Name",
    emailLabel: "Email",
    messageLabel: "Message",
    footer: "This is an automated message from your platform's contact form.",
  },
  tr: {
    preview: (name: string) => `${name} adlı kişiden yeni iletişim bildirimi`,
    heading: "Yeni İletişim Bildirimi",
    intro: "Web sitenizde yeni bir iletişim formu bildirimi aldınız.",
    nameLabel: "İsim",
    emailLabel: "E-posta",
    messageLabel: "Mesaj",
    footer: "Bu, platformunuzun iletişim formundan gelen otomatik bir mesajdır.",
  }
};

export function ContactEmail({ firstName, lastName, email, message, language = "en" }: ContactEmailProps) {
  const t = translations[language] || translations.en;
  const fullName = `${firstName} ${lastName}`;
  const previewText = t.preview(fullName);

  return (
    <Html lang={language}>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{t.heading}</Heading>
          <Text style={text}>{t.intro}</Text>
          <Hr style={hr} />
          
          <Section style={section}>
            <Text style={label}>{t.nameLabel}</Text>
            <Text style={value}>{fullName}</Text>
            
            <Text style={label}>{t.emailLabel}</Text>
            <Text style={value}>{email}</Text>
            
            <Text style={label}>{t.messageLabel}</Text>
            <Text style={{ ...value, whiteSpace: "pre-wrap" }}>{message}</Text>
          </Section>
          
          <Hr style={hr} />
          <Text style={footer}>{t.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  maxWidth: "600px",
  marginTop: "40px",
  marginBottom: "40px",
};

const h1 = {
  color: "#1a202c",
  fontSize: "24px",
  fontWeight: "600",
  margin: "0 0 20px 0",
};

const text = {
  color: "#4a5568",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 20px 0",
};

const section = {
  padding: "20px",
  backgroundColor: "#f8fafc",
  borderRadius: "6px",
};

const label = {
  color: "#718096",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  fontWeight: "bold",
  margin: "0 0 4px 0",
};

const value = {
  color: "#2d3748",
  fontSize: "16px",
  margin: "0 0 16px 0",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "20px 0",
};

const footer = {
  color: "#a0aec0",
  fontSize: "12px",
  textAlign: "center" as const,
};
