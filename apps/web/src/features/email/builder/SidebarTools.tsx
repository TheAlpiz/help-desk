import { useState } from "react";
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

const BLOCK_GROUPS: { label: string; blocks: { type: BlockType; label: string; icon: React.ComponentType<any> }[] }[] = [
  {
    label: "Content",
    blocks: [
      { type: "HEADING", label: "Heading", icon: Heading },
      { type: "TEXT", label: "Text", icon: Type },
      { type: "LINK", label: "Link", icon: ExternalLink },
      { type: "LIST", label: "List", icon: List },
      { type: "QUOTE", label: "Quote", icon: Quote },
      { type: "HTML", label: "Raw HTML", icon: Code },
    ],
  },
  {
    label: "Media",
    blocks: [
      { type: "IMAGE", label: "Image", icon: Image },
    ],
  },
  {
    label: "Layout",
    blocks: [
      { type: "COLUMNS", label: "Columns", icon: Columns2 },
      { type: "SECTION", label: "Section", icon: Square },
      { type: "CALLOUT", label: "Callout", icon: AlertCircle },
      { type: "DIVIDER", label: "Divider", icon: Minus },
      { type: "SPACER", label: "Spacer", icon: Space },
    ],
  },
  {
    label: "Interactive",
    blocks: [
      { type: "BUTTON", label: "Button", icon: MousePointer2 },
      { type: "FEEDBACK", label: "Feedback", icon: Star },
      { type: "SOCIAL_LINKS", label: "Social Links", icon: Link2 },
    ],
  },
  {
    label: "Dynamic",
    blocks: [
      { type: "VARIABLE", label: "Variable", icon: Code2 },
    ],
  },
];

const VARIABLES = [
  {
    group: "Ticket",
    vars: [
      "ticket_id",
      "ticket_subject",
      "ticket_status",
      "ticket_priority",
      "ticket_url",
      "ticket_created_at",
    ],
  },
  {
    group: "Customer",
    vars: ["customer_name", "customer_email"],
  },
  {
    group: "Agent",
    vars: ["agent_name", "agent_email", "agent_title"],
  },
  {
    group: "Organization",
    vars: [
      "organization_name",
      "organization_email",
      "organization_website",
      "organization_phone",
    ],
  },
  {
    group: "System",
    vars: ["current_date", "current_year"],
  },
];

function DraggableTool({
  type,
  label,
  icon: Icon,
}: {
  type: BlockType;
  label: string;
  icon: React.ComponentType<any>;
}) {
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
      <span className="text-xs font-medium text-on-surface">{label}</span>
    </div>
  );
}

function VariablePicker() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyVar = (name: string) => {
    navigator.clipboard.writeText(`{{${name}}}`);
    setCopied(name);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="p-4 space-y-4">
      {VARIABLES.map(({ group, vars }) => (
        <div key={group}>
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
            {group}
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
  const [tab, setTab] = useState<"blocks" | "variables">("blocks");

  return (
    <div className="w-60 border-r border-outline-variant bg-surface-container-lowest flex flex-col h-full">
      <div className="p-3 border-b border-outline-variant">
        <h3 className="font-semibold text-on-surface text-sm">Components</h3>
        {showVariables && (
          <div className="flex mt-2 bg-surface border border-outline-variant rounded-lg overflow-hidden">
            <button
              onClick={() => setTab("blocks")}
              className={`flex-1 py-1 text-xs font-medium transition-colors ${tab === "blocks" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}
            >
              Blocks
            </button>
            <button
              onClick={() => setTab("variables")}
              className={`flex-1 py-1 text-xs font-medium transition-colors ${tab === "variables" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}
            >
              Variables
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
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-1.5 px-0.5">
                  {group.label}
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
