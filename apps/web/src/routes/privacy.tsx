import { createFileRoute } from "@tanstack/react-router";
import { Nav, Footer } from "../features/marketing/LandingPage";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] bg-background text-on-surface antialiased flex flex-col selection:bg-primary/30 selection:text-primary">
      <Nav />
      
      {/* Header */}
      <div className="bg-surface-container-low border-b border-white/5 py-16 px-6">
        <div className="max-w-[800px] mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-on-surface-variant text-lg">Last updated: June 20, 2026</p>
        </div>
      </div>

      <main className="flex-grow px-6 md:px-10 py-16 max-w-[800px] mx-auto w-full">
        <div className="prose prose-invert prose-p:text-on-surface-variant prose-p:leading-relaxed prose-headings:text-on-surface prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-a:text-primary prose-li:text-on-surface-variant prose-li:marker:text-primary/50 max-w-none">
          
          <p className="text-lg text-on-surface">
            At Alpis, we believe that privacy is a fundamental human right. This Privacy Policy explains how we collect, use, and share information about you when you use our website, application, and services.
          </p>

          <h2>1. Information We Collect</h2>
          <p>We collect information in two main ways: information you directly provide to us, and information we collect automatically.</p>
          
          <h3 className="text-lg font-semibold text-on-surface mt-6 mb-3">Information you provide to us:</h3>
          <ul>
            <li><strong>Account information:</strong> Name, email address, password, and billing information.</li>
            <li><strong>Profile information:</strong> Department, role, avatar, and notification preferences.</li>
            <li><strong>Communications:</strong> Content of emails, support tickets, and feedback forms you submit to us.</li>
          </ul>
          
          <h3 className="text-lg font-semibold text-on-surface mt-6 mb-3">Information collected automatically:</h3>
          <ul>
            <li><strong>Log data:</strong> IP addresses, browser type, operating system, pages visited, and timestamps.</li>
            <li><strong>Device information:</strong> Hardware models and mobile network information.</li>
            <li><strong>Tracking technologies:</strong> We use strictly necessary cookies for authentication and security. We do not use third-party tracking or advertising cookies on the core platform.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect strictly to provide and improve our services. Specific uses include:</p>
          <ul>
            <li>Providing, maintaining, and protecting our services.</li>
            <li>Processing transactions and sending related information (e.g., invoices).</li>
            <li>Sending technical notices, security alerts, and administrative messages.</li>
            <li>Responding to your comments, questions, and customer service requests.</li>
            <li>Monitoring and analyzing trends, usage, and activities to improve performance.</li>
          </ul>

          <h2>3. Service Data (Tenant Data)</h2>
          <p>
            "Service Data" refers to the data you and your agents submit to the Alpis platform to use the service (e.g., incoming customer emails, ticket threads, internal notes, attachments).
          </p>
          <p>
            <strong>We process Service Data strictly on your behalf and in accordance with your instructions.</strong> We do not sell your Service Data, nor do we use it to train AI models without your explicit opt-in consent. Our Postgres Row-Level Security (RLS) ensures your Service Data is completely isolated from other tenants.
          </p>

          <h2>4. Data Sharing and Disclosure</h2>
          <p>We do not share your personal information with third parties except in the following limited circumstances:</p>
          <ul>
            <li><strong>Service Providers:</strong> We use third-party subprocessors (like AWS for hosting, or Stripe for payments) who are bound by strict confidentiality agreements.</li>
            <li><strong>Legal Requirements:</strong> If required to do so by law, court order, or subpoena.</li>
            <li><strong>Business Transfers:</strong> In connection with any merger, sale of company assets, or acquisition.</li>
          </ul>
          
          <h2>5. Contact Us</h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or your data rights (GDPR/CCPA), please contact our Data Protection Officer at <a href="mailto:privacy@alpis.io">privacy@alpis.io</a>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
