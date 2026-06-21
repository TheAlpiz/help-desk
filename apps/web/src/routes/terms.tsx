import { createFileRoute } from "@tanstack/react-router";
import { Nav, Footer } from "../features/marketing/LandingPage";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-[100dvh] bg-background text-on-surface antialiased flex flex-col selection:bg-primary/30 selection:text-primary">
      <Nav />
      
      {/* Header */}
      <div className="bg-surface-container-low border-b border-white/5 py-16 px-6">
        <div className="max-w-[800px] mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Terms of Service</h1>
          <p className="text-on-surface-variant text-lg">Effective Date: June 20, 2026</p>
        </div>
      </div>

      <main className="flex-grow px-6 md:px-10 py-16 max-w-[800px] mx-auto w-full">
        <div className="prose prose-invert prose-p:text-on-surface-variant prose-p:leading-relaxed prose-headings:text-on-surface prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-a:text-primary prose-li:text-on-surface-variant prose-li:marker:text-primary/50 max-w-none">
          
          <p className="text-lg text-on-surface">
            Welcome to Alpis. These Terms of Service ("Terms") govern your access to and use of our service desk platform, website, and APIs (collectively, the "Service").
          </p>

          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using the Service, you agree to be bound by these Terms. If you are using the Service on behalf of an organization, you are agreeing to these Terms for that organization and representing that you have the authority to bind that organization. If you disagree with any part of the terms, you may not access the Service.
          </p>

          <h2>2. Access and Use of the Service</h2>
          <p><strong>Account Registration:</strong> You must create an account to use most features of the Service. You are responsible for safeguarding your password and for any activities under your account.</p>
          <p><strong>Acceptable Use:</strong> You agree not to use the Service to:</p>
          <ul>
            <li>Upload or transmit any malicious code, viruses, or destructive software.</li>
            <li>Interfere with, disrupt, or attempt to gain unauthorized access to the Service infrastructure.</li>
            <li>Send unsolicited commercial communications (spam) or process unlawful data.</li>
            <li>Violate any applicable laws, regulations, or third-party rights.</li>
          </ul>

          <h2>3. Service Level Agreement (SLA)</h2>
          <p>
            For customers on our Enterprise tier, we guarantee a 99.99% monthly uptime. If we fail to meet this guarantee, you will be eligible for a service credit as detailed in your specific Enterprise Master Service Agreement. Standard and Pro tiers are provided on an "as-is" basis without strict SLA guarantees, though we strive for maximum uptime.
          </p>

          <h2>4. Payment and Billing</h2>
          <p>
            Some aspects of the Service are billed on a subscription basis ("Subscriptions"). You will be billed in advance on a recurring, periodic basis (monthly or annually). Your Subscription will automatically renew under the exact same conditions unless you cancel it or Alpis cancels it. There are no refunds for partial months of service.
          </p>
          
          <h2>5. Intellectual Property</h2>
          <p>
            The Service and its original content (excluding Service Data provided by you), features, and functionality are and will remain the exclusive property of Alpis and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.
          </p>

          <h2>6. Limitation of Liability</h2>
          <p>
            In no event shall Alpis, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
          </p>
          <ul>
            <li>Your access to or use of or inability to access or use the Service.</li>
            <li>Any conduct or content of any third party on the Service.</li>
            <li>Unauthorized access, use, or alteration of your transmissions or content.</li>
          </ul>
          
          <h2>7. Contact</h2>
          <p>
            If you have any questions about these Terms, please contact us at <a href="mailto:legal@alpis.io">legal@alpis.io</a>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
