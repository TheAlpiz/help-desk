import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDraggable } from "@dnd-kit/core";
import {
  GripVertical,
  Type,
  Image,
  Minus,
  Link2,
  Heading,
  MousePointer2,
  Code2,
  Space,
  Copy,
  Check,
  ExternalLink,
  Star,
  Columns2,
  Square,
  AlertCircle,
  Quote,
  List,
  Code,
} from "lucide-react";
import type { BlockType } from "../store";

// Group `key` → i18n `builder.groups.<key>`; block label → `builder.blocks.<type>`.
const BLOCK_GROUPS: { key: string; blocks: { type: BlockType; icon: React.ComponentType<any> }[] }[] = [
  {
    key: "content",
    blocks: [
      { type: "HEADING", icon: Heading },
      { type: "TEXT", icon: Type },
      { type: "LINK", icon: ExternalLink },
      { type: "LIST", icon: List },
      { type: "QUOTE", icon: Quote },
      { type: "HTML", icon: Code },
    ],
  },
  {
    key: "media",
    blocks: [{ type: "IMAGE", icon: Image }],
  },
  {
    key: "layout",
    blocks: [
      { type: "COLUMNS", icon: Columns2 },
      { type: "SECTION", icon: Square },
      { type: "CALLOUT", icon: AlertCircle },
      { type: "DIVIDER", icon: Minus },
      { type: "SPACER", icon: Space },
    ],
  },
  {
    key: "interactive",
    blocks: [
      { type: "BUTTON", icon: MousePointer2 },
      { type: "FEEDBACK", icon: Star },
      { type: "SOCIAL_LINKS", icon: Link2 },
    ],
  },
  {
    key: "dynamic",
    blocks: [{ type: "VARIABLE", icon: Code2 }],
  },
];

// Group `key` → i18n `builder.varGroups.<key>`. Variable tokens stay literal.
const VARIABLES = [
  {
    key: "ticket",
    vars: [
      "ticket_id",
      "ticket_number",
      "ticket_subject",
      "ticket_status",
      "ticket_priority",
      "ticket_url",
      "ticket_created_at",
    ],
  },
  {
    key: "message",
    vars: ["content", "ticket_description", "latest_message"],
  },
  {
    key: "customer",
    vars: ["customer_name", "customer_first_name", "customer_email"],
  },
  {
    key: "agent",
    vars: ["agent_name", "agent_email", "agent_role"],
  },
  {
    key: "organization",
    vars: [
      "organization_name",
      "organization_email",
      "organization_website",
      "organization_phone",
    ],
  },
  {
    key: "system",
    vars: ["current_date", "current_year"],
  },
];

function DraggableTool({
  type,
  icon: Icon,
}: {
  type: BlockType;
  icon: React.ComponentType<any>;
}) {
  const { t } = useTranslation("emailTemplates");
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tool-${type}`,
    data: { type, isTool: true },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2.5 p-2.5 bg-surface border border-outline-variant rounded-lg cursor-grab hover:bg-surface-container transition-colors ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <GripVertical className="w-3.5 h-3.5 text-on-surface-variant/40 shrink-0" />
      <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
      <span className="text-xs font-medium text-on-surface">{t(`builder.blocks.${type}`)}</span>
    </div>
  );
}

function VariablePicker() {
  const { t } = useTranslation("emailTemplates");
  const [copied, setCopied] = useState<string | null>(null);

  const copyVar = (name: string) => {
    navigator.clipboard.writeText(`{{${name}}}`);
    setCopied(name);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="p-4 space-y-4">
      {VARIABLES.map(({ key, vars }) => (
        <div key={key}>
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
            {t(`builder.varGroups.${key}`)}
          </p>
          <div className="flex flex-col gap-1">
            {vars.map((v) => (
              <button
                key={v}
                onClick={() => copyVar(v)}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-surface border border-outline-variant hover:bg-surface-container text-xs font-mono text-left transition-colors"
              >
                <span className="text-primary truncate">{`{{${v}}}`}</span>
                {copied === v ? (
                  <Check className="w-3 h-3 text-secondary shrink-0 ml-1" />
                ) : (
                  <Copy className="w-3 h-3 text-on-surface-variant/50 shrink-0 ml-1" />
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SidebarTools({ showVariables = false }: { showVariables?: boolean }) {
  const { t } = useTranslation("emailTemplates");
  const [tab, setTab] = useState<"blocks" | "variables">("blocks");

  return (
    <div className="w-60 border-r border-outline-variant bg-surface-container-lowest flex flex-col h-full">
      <div className="p-3 border-b border-outline-variant">
        <h3 className="font-semibold text-on-surface text-sm">{t("builder.components")}</h3>
        {showVariables && (
          <div className="flex mt-2 bg-surface border border-outline-variant rounded-lg overflow-hidden">
            <button
              onClick={() => setTab("blocks")}
              className={`flex-1 py-1 text-xs font-medium transition-colors ${tab === "blocks" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}
            >
              {t("builder.tabBlocks")}
            </button>
            <button
              onClick={() => setTab("variables")}
              className={`flex-1 py-1 text-xs font-medium transition-colors ${tab === "variables" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}
            >
              {t("builder.tabVariables")}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pretty-scroll">
        {tab === "variables" && showVariables ? (
          <VariablePicker />
        ) : (
          <div className="p-3 space-y-4">
            {BLOCK_GROUPS.map((group) => (
              <div key={group.key}>
                <p className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-1.5 px-0.5">
                  {t(`builder.groups.${group.key}`)}
                </p>
                <div className="flex flex-col gap-1.5">
                  {group.blocks.map((tool) => (
                    <DraggableTool key={tool.type} {...tool} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
