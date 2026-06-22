import { useDraggable } from "@dnd-kit/core";
import { GripVertical, Type, Image, Minus, Link2 } from "lucide-react";
import type { BlockType } from "../store";

const TOOLS = [
  { type: "TEXT" as BlockType, label: "Text", icon: Type },
  { type: "IMAGE" as BlockType, label: "Image", icon: Image },
  { type: "DIVIDER" as BlockType, label: "Divider", icon: Minus },
  { type: "SOCIAL_LINKS" as BlockType, label: "Social Links", icon: Link2 },
];

function DraggableTool({ type, label, icon: Icon }: typeof TOOLS[0]) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tool-${type}`,
    data: { type, isTool: true },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 p-3 bg-surface border border-outline-variant rounded-lg cursor-grab hover:bg-surface-container transition-colors ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <GripVertical className="w-4 h-4 text-on-surface-variant/50" />
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium text-on-surface">{label}</span>
    </div>
  );
}

export function SidebarTools() {
  return (
    <div className="w-64 border-r border-outline-variant bg-surface-container-lowest flex flex-col h-full">
      <div className="p-4 border-b border-outline-variant">
        <h3 className="font-semibold text-on-surface">Blocks</h3>
        <p className="text-xs text-on-surface-variant mt-1">Drag blocks to the canvas</p>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {TOOLS.map((tool) => (
          <DraggableTool key={tool.type} {...tool} />
        ))}
      </div>
    </div>
  );
}
