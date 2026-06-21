import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Phone, Zap, Users, Link2, BarChart3, RefreshCw } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_auth/whatsapp")({
  component: WhatsAppChannels,
});

function WhatsAppChannels() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[15px] font-semibold text-on-surface">WhatsApp</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Connect WhatsApp Business accounts to handle conversations.
        </p>
      </div>

      <ComingSoon
        icon={MessageSquare}
        iconColor="text-[#25D366]"
        iconBg="bg-[#25D366]/10 border-[#25D366]/20"
        title="WhatsApp Business integration"
        description="Bring WhatsApp conversations into Alpis — manage them alongside email and portal tickets in one unified inbox."
        badge="Coming soon"
        eta="Q3 2025"
        features={[
          {
            icon: Phone,
            label: "Multi-number support",
            description: "Connect multiple WhatsApp Business numbers to different departments or mailboxes.",
          },
          {
            icon: Zap,
            label: "Automatic ticket creation",
            description: "Incoming WhatsApp messages create tickets instantly with full conversation threading.",
          },
          {
            icon: RefreshCw,
            label: "Session window tracking",
            description: "Respects the 24-hour messaging window with smart re-engagement prompts.",
          },
          {
            icon: Users,
            label: "Agent assignment",
            description: "Route WhatsApp tickets to agents and teams with the same rules as email tickets.",
          },
          {
            icon: Link2,
            label: "Template messages",
            description: "Send pre-approved WhatsApp message templates for proactive outreach.",
          },
          {
            icon: BarChart3,
            label: "Channel analytics",
            description: "Response times, resolution rates, and CSAT scores broken out by channel.",
          },
        ]}
      />
    </div>
  );
}
