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
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Send, Save } from "lucide-react";
import { useEmailBuilderStore, BlockType } from "./store";
import { SidebarTools } from "./builder/SidebarTools";
import { BuilderCanvas } from "./builder/BuilderCanvas";
import { PropertiesPanel } from "./builder/PropertiesPanel";
import { renderBlocksToHtml } from "./renderBlocksToHtml";
import { authFetch } from "@/lib/api";

// `soon: true` → not yet wired to a send trigger; shown disabled as "Coming Soon".
// Active types are dispatched by the backend email-template listener. Labels are
// resolved via i18n (`builder.types.<value>`).
const TEMPLATE_TYPES = [
  { value: "ticket_created" },
  { value: "ticket_assigned" },
  { value: "ticket_closed" },
  { value: "ticket_reopened" },
  { value: "agent_replied" },
  { value: "ticket_updated", soon: true },
  { value: "customer_replied", soon: true },
  { value: "ticket_reassigned", soon: true },
  { value: "sla_warning", soon: true },
  { value: "sla_breach", soon: true },
  { value: "internal_note", soon: true },
  { value: "mention", soon: true },
  { value: "agent_invitation", soon: true },
  { value: "account_deactivated", soon: true },
  { value: "account_reactivated", soon: true },
  { value: "csat_survey", soon: true },
  { value: "satisfaction_followup", soon: true },
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
  const { t } = useTranslation("emailTemplates");

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
    return <div className="p-8 flex justify-center text-sm text-on-surface-variant">{t("builder.loading")}</div>;
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
          {TEMPLATE_TYPES.map((tt) => {
            const soon = "soon" in tt && tt.soon;
            return (
              <option key={tt.value} value={tt.value} disabled={soon}>
                {t(`builder.types.${tt.value}`)}{soon ? ` (${t("builder.comingSoon")})` : ""}
              </option>
            );
          })}
        </select>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("builder.subjectPlaceholder")}
            className="w-full px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-sm"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface hover:bg-surface-container-high transition-colors"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? t("builder.edit") : t("builder.preview")}
          </button>
          <button
            onClick={() => handleSave("DRAFT")}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {t("builder.draft")}
          </button>
          <button
            onClick={() => handleSave("PUBLISHED")}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {t("builder.publish")}
          </button>
        </div>
      </div>

      {/* ── Preview text row ───────────────────────────────────────── */}
      <div className="px-4 py-2 border-b border-outline-variant bg-surface-container/30">
        <input
          type="text"
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder={t("builder.previewTextPlaceholder")}
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
            <BuilderCanvas placeholder={t("builder.canvasPlaceholder")} />
            <DragOverlay>
              {activeToolType ? (
                <div className="px-4 py-2 bg-primary text-on-primary rounded shadow-lg text-sm">
                  {t("builder.dropToAdd", { type: t(`builder.blocks.${activeToolType}`, { defaultValue: activeToolType }) })}
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
