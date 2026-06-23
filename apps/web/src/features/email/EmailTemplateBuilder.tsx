import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Send, Save } from "lucide-react";
import { useEmailBuilderStore, BlockType } from "./store";
import { SidebarTools } from "./builder/SidebarTools";
import { BuilderCanvas } from "./builder/BuilderCanvas";
import { PropertiesPanel } from "./builder/PropertiesPanel";
import { renderBlocksToHtml } from "./renderBlocksToHtml";
import { authFetch } from "@/lib/api";

const TEMPLATE_TYPES = [
  { value: "ticket_created", label: "Ticket Created" },
  { value: "ticket_updated", label: "Ticket Updated" },
  { value: "agent_replied", label: "Agent Replied" },
  { value: "customer_replied", label: "Customer Replied" },
  { value: "ticket_assigned", label: "Ticket Assigned" },
  { value: "ticket_reassigned", label: "Ticket Reassigned" },
  { value: "ticket_closed", label: "Ticket Closed" },
  { value: "ticket_reopened", label: "Ticket Reopened" },
  { value: "sla_warning", label: "SLA Warning" },
  { value: "sla_breach", label: "SLA Breach" },
  { value: "internal_note", label: "Internal Note Notification" },
  { value: "mention", label: "Mention Notification" },
  { value: "password_reset", label: "Password Reset" },
  { value: "email_verification", label: "Email Verification" },
  { value: "welcome", label: "Welcome Email" },
  { value: "agent_invitation", label: "Agent Invitation" },
  { value: "org_invitation", label: "Organization Invitation" },
  { value: "account_deactivated", label: "Account Deactivated" },
  { value: "account_reactivated", label: "Account Reactivated" },
  { value: "csat_survey", label: "CSAT Survey Request" },
  { value: "satisfaction_followup", label: "Ticket Satisfaction Follow-up" },
] as const;

interface Props {
  templateId?: string;
  templateType?: string;
  onSave: (payload: {
    subject: string;
    bodyHtml: string;
    bodyPlain: string;
    contentJson: any;
    status: "DRAFT" | "PUBLISHED";
  }) => Promise<void>;
}

export function EmailTemplateBuilder({ templateId, templateType, onSave }: Props) {
  const { blocks, addBlock, reorderBlocks, globalStyles, setBlocks, setGlobalStyles } =
    useEmailBuilderStore();

  const [activeToolType, setActiveToolType] = useState<BlockType | null>(null);
  const [subject, setSubject] = useState("{{ticket_subject}} — Your request (Ticket #{{ticket_id}})");
  const [previewText, setPreviewText] = useState("");
  const [selectedType, setSelectedType] = useState(templateType ?? "ticket_created");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!templateId);

  useEffect(() => {
    setIsLoading(true);

    authFetch(`/api/email/templates/${selectedType}/active`)
      .then((r) => r.json())
      .then((data) => {
        const version = data?.data?.version;
        if (version?.contentJson) {
          setBlocks(version.contentJson.blocks ?? []);
          if (version.contentJson.globalStyles) setGlobalStyles(version.contentJson.globalStyles);
          if (version.subject) setSubject(version.subject);
          if (version.contentJson.previewText) setPreviewText(version.contentJson.previewText);
        } else {
          setBlocks([]);
          setSubject("{{ticket_subject}} — Your request (Ticket #{{ticket_id}})");
          setPreviewText("");
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [templateId, selectedType, setBlocks, setGlobalStyles]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: any) => {
    if (event.active.data.current?.isTool) {
      setActiveToolType(event.active.data.current.type);
    }
  };

  const handleDragEnd = (event: any) => {
    setActiveToolType(null);
    const { active, over } = event;
    if (!over) return;

    if (active.data.current?.isTool && over.id === "canvas") {
      addBlock(active.data.current.type, blocks.length);
      return;
    }

    if (active.data.current?.isBlock && over.data.current?.isBlock && active.id !== over.id) {
      reorderBlocks(active.id, over.id);
    }
  };

  const handleSave = async (status: "DRAFT" | "PUBLISHED") => {
    setSaving(true);
    try {
      const bodyHtml = renderBlocksToHtml(blocks, globalStyles);
      await onSave({
        subject,
        bodyHtml,
        bodyPlain: blocks
          .map((b) => {
            if (b.type === "TEXT" || b.type === "HEADING") return b.content.text ?? "";
            if (b.type === "BUTTON") return `${b.content.text ?? ""}: ${b.content.url ?? ""}`;
            return "";
          })
          .filter(Boolean)
          .join("\n"),
        contentJson: { blocks, globalStyles, previewText, templateType: selectedType },
        status,
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center text-sm text-on-surface-variant">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen max-h-[900px] bg-surface rounded-xl border border-outline-variant overflow-hidden">
      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant bg-surface flex-wrap">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface"
        >
          {TEMPLATE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line..."
            className="w-full px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-sm"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface hover:bg-surface-container-high transition-colors"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? "Edit" : "Preview"}
          </button>
          <button
            onClick={() => handleSave("DRAFT")}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Draft
          </button>
          <button
            onClick={() => handleSave("PUBLISHED")}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Publish
          </button>
        </div>
      </div>

      {/* ── Preview text row ───────────────────────────────────────── */}
      <div className="px-4 py-2 border-b border-outline-variant bg-surface-container/30">
        <input
          type="text"
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder="Preview text (shown in email client inbox)..."
          className="w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface-variant"
        />
      </div>

      {showPreview ? (
        <HtmlPreview blocks={blocks} globalStyles={globalStyles} subject={subject} />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SidebarTools showVariables />
            <BuilderCanvas placeholder="Drag blocks here to build your email template" />
            <DragOverlay>
              {activeToolType ? (
                <div className="px-4 py-2 bg-primary text-on-primary rounded shadow-lg text-sm">
                  Drop to add {activeToolType}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          <PropertiesPanel />
        </div>
      )}
    </div>
  );
}

function HtmlPreview({
  blocks,
  globalStyles,
  subject,
}: {
  blocks: any[];
  globalStyles: any;
  subject: string;
}) {
  const html = renderBlocksToHtml(blocks, globalStyles);

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4 px-4 py-3 bg-surface border border-outline-variant rounded-lg">
          <p className="text-xs text-on-surface-variant mb-0.5">Subject</p>
          <p className="text-sm font-medium text-on-surface">{subject}</p>
        </div>
        <div
          className="bg-white shadow-sm rounded-lg overflow-hidden"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
