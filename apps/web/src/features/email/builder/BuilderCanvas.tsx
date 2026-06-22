import { useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEmailBuilderStore, Block } from "../store";

function BlockRenderer({ block }: { block: Block }) {
  const { globalStyles } = useEmailBuilderStore();

  switch (block.type) {
    case "TEXT":
      return (
        <div style={{ ...block.styles, color: globalStyles.textColor, fontFamily: globalStyles.fontFamily }}>
          {block.content.text}
        </div>
      );
    case "IMAGE":
      return (
        <div style={{ textAlign: "center", ...block.styles }}>
          <img
            src={block.content.url}
            alt={block.content.alt}
            style={{ maxWidth: "100%", width: block.styles.width || "100%", height: "auto" }}
          />
        </div>
      );
    case "DIVIDER":
      return (
        <div style={{ ...block.styles, padding: block.styles.padding || "20px 0" }}>
          <hr style={{ borderTop: `1px solid ${globalStyles.primaryColor}`, margin: 0 }} />
        </div>
      );
    case "SOCIAL_LINKS":
      const links = block.content.links || [];
      const isRow = block.content.layout !== "flex-col";
      const align = block.styles.textAlign || "center";
      const flexAlign = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
      return (
        <div style={{ ...block.styles, display: "flex", flexDirection: isRow ? "row" : "column", alignItems: isRow ? "center" : flexAlign, justifyContent: isRow ? flexAlign : "center", gap: "10px" }}>
          {links.map((link: any, index: number) => (
            <a key={index} href={link.url} style={{ color: globalStyles.primaryColor, textDecoration: "none", fontWeight: "500" }}>
              {link.label}
            </a>
          ))}
          {links.length === 0 && <span style={{ color: globalStyles.textColor, opacity: 0.5 }}>No social links configured</span>}
        </div>
      );
    default:
      return <div>Unknown Block</div>;
  }
}

function SortableBlock({ block }: { block: Block }) {
  const { selectedBlockId, setSelectedBlockId, removeBlock } = useEmailBuilderStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { isBlock: true, block },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSelected = selectedBlockId === block.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group cursor-pointer border-2 ${
        isSelected ? "border-primary" : "border-transparent hover:border-outline"
      } transition-colors`}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedBlockId(block.id);
      }}
    >
      {isSelected && (
        <div className="absolute -top-3 -right-3 flex gap-1 z-10">
          <button
            {...listeners}
            {...attributes}
            className="w-6 h-6 flex items-center justify-center bg-surface border border-outline-variant rounded shadow cursor-grab text-on-surface hover:bg-surface-container"
            title="Drag"
          >
            ⠿
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeBlock(block.id);
            }}
            className="w-6 h-6 flex items-center justify-center bg-error text-on-error rounded shadow hover:bg-error/90"
            title="Delete"
          >
            ×
          </button>
        </div>
      )}
      <BlockRenderer block={block} />
    </div>
  );
}

export function BuilderCanvas() {
  const { blocks, globalStyles, setSelectedBlockId } = useEmailBuilderStore();
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  return (
    <div
      className="flex-1 overflow-y-auto bg-surface-container p-8"
      onClick={() => setSelectedBlockId(null)}
    >
      <div
        ref={setNodeRef}
        className={`max-w-2xl mx-auto min-h-[600px] shadow-sm transition-colors ${
          isOver ? "ring-2 ring-primary bg-surface/80" : "bg-white"
        }`}
        style={{ backgroundColor: globalStyles.backgroundColor }}
      >
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col min-h-[600px]">
            {blocks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-on-surface-variant/50 border-2 border-dashed border-outline-variant m-4">
                Drag blocks here to build your signature
              </div>
            ) : (
              blocks.map((block) => <SortableBlock key={block.id} block={block} />)
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
