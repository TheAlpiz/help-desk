import { useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import { useEmailBuilderStore, Block } from "../store";

function BlockRenderer({ block }: { block: Block }) {
  const { t } = useTranslation("emailTemplates");
  const { globalStyles } = useEmailBuilderStore();
  const { content, styles } = block;
  const align = (styles.textAlign ?? "left") as React.CSSProperties["textAlign"];
  const padding = styles.padding ?? "8px 0";

  switch (block.type) {
    case "TEXT":
      return (
        <div
          style={{
            padding,
            margin: styles.margin ?? "0",
            textAlign: align,
            color: styles.color ?? globalStyles.textColor,
            fontFamily: globalStyles.fontFamily,
            fontSize: styles.fontSize ?? "14px",
            lineHeight: "1.6",
          }}
          dangerouslySetInnerHTML={{ __html: content.text ?? "" }}
        />
      );

    case "HEADING": {
      const Tag = (content.level ?? "h2") as "h1" | "h2" | "h3";
      const size: Record<string, string> = { h1: "28px", h2: "22px", h3: "18px" };
      return (
        <Tag
          style={{
            padding,
            margin: styles.margin ?? "0 0 8px 0",
            textAlign: align,
            color: content.color ?? globalStyles.textColor,
            fontFamily: globalStyles.fontFamily,
            fontSize: size[Tag] ?? "22px",
            fontWeight: 700,
          }}
        >
          {content.text ?? ""}
        </Tag>
      );
    }

    case "IMAGE":
      return (
        <div style={{ textAlign: align, padding }}>
          {content.url ? (
            <img
              src={content.url}
              alt={content.alt ?? ""}
              style={{ maxWidth: "100%", width: styles.width ?? "100%", height: "auto" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 80,
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9ca3af",
                fontSize: 13,
              }}
            >
              No image — add URL in settings
            </div>
          )}
        </div>
      );

    case "DIVIDER":
      return (
        <div style={{ padding, margin: styles.margin ?? "0" }}>
          <hr
            style={{
              border: "none",
              borderTop: `${styles.thickness ?? 1}px solid ${styles.color ?? "#e5e7eb"}`,
              margin: 0,
            }}
          />
        </div>
      );

    case "BUTTON": {
      const bg = content.backgroundColor || globalStyles.primaryColor;
      return (
        <div style={{ textAlign: align, padding, margin: styles.margin ?? "0" }}>
          <a
            href={content.url ?? "#"}
            style={{
              display: "inline-block",
              padding: `${content.paddingY ?? "10px"} ${content.paddingX ?? "20px"}`,
              backgroundColor: bg,
              color: content.color ?? "#ffffff",
              textDecoration: "none",
              borderRadius: `${styles.borderRadius ?? 6}px`,
              fontWeight: 600,
              fontSize: styles.fontSize ?? "14px",
              fontFamily: globalStyles.fontFamily,
            }}
          >
            {content.text ?? "Click Here"}
          </a>
        </div>
      );
    }

    case "SOCIAL_LINKS": {
      const links: { label: string; url: string }[] = content.links ?? [];
      const isRow = content.layout !== "flex-col";
      const flexAlign =
        align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
      return (
        <div
          style={{
            display: "flex",
            flexDirection: isRow ? "row" : "column",
            justifyContent: isRow ? flexAlign : "center",
            alignItems: isRow ? "center" : flexAlign,
            gap: 10,
            padding,
            margin: styles.margin ?? "0",
          }}
        >
          {links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              style={{
                color: globalStyles.primaryColor,
                textDecoration: "none",
                fontWeight: 500,
                fontSize: 13,
              }}
            >
              {link.label}
            </a>
          ))}
          {links.length === 0 && (
            <span style={{ color: globalStyles.textColor, opacity: 0.5, fontSize: 13 }}>
              No links configured
            </span>
          )}
        </div>
      );
    }

    case "VARIABLE":
      return (
        <div
          style={{
            padding,
            margin: styles.margin ?? "0",
            fontFamily: "monospace",
            fontSize: 13,
            color: globalStyles.primaryColor,
            background: `${globalStyles.primaryColor}18`,
            borderRadius: 4,
            display: "inline-block",
          }}
        >
          {`{{${content.variableName ?? "variable"}}}`}
        </div>
      );

    case "SPACER":
      return (
        <div
          style={{
            height: content.height ?? "20px",
            background: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 8px)",
          }}
        />
      );

    case "LINK": {
      const color = content.color || globalStyles.primaryColor;
      return (
        <p style={{ padding, margin: styles.margin ?? "0", textAlign: align, fontFamily: globalStyles.fontFamily, fontSize: styles.fontSize ?? "14px" }}>
          <a href={content.url ?? "#"} style={{ color, textDecoration: "underline", fontWeight: 500 }}>
            {content.text ?? "Click here"}
          </a>
        </p>
      );
    }

    case "FEEDBACK": {
      const type = content.type ?? "stars";
      const scale = content.scale ?? 5;
      const question = content.question ?? "How helpful was this?";
      return (
        <div style={{ textAlign: align, padding, margin: styles.margin ?? "0" }}>
          <p style={{ margin: "0 0 10px 0", fontFamily: globalStyles.fontFamily, fontSize: 14, color: globalStyles.textColor, fontWeight: 600 }}>
            {question}
          </p>
          <div style={{ display: "flex", gap: 6, justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start" }}>
            {type === "stars" && Array.from({ length: scale }).map((_, i) => (
              <span key={i} style={{ fontSize: 22 }}>⭐</span>
            ))}
            {type === "thumbs" && (
              <>
                <span style={{ fontSize: 26 }}>👍</span>
                <span style={{ fontSize: 26 }}>👎</span>
              </>
            )}
            {type === "emoji" && ["😍", "😊", "😐", "😞", "😡"].map((e, i) => (
              <span key={i} style={{ fontSize: 22 }}>{e}</span>
            ))}
          </div>
        </div>
      );
    }

    case "COLUMNS": {
      const [w1, w2] = (content.ratio ?? "50:50").split(":").map(Number);
      const total = w1 + w2;
      const pct1 = Math.round((w1 / total) * 100);
      const pct2 = 100 - pct1;
      return (
        <div style={{ display: "flex", gap: content.gap ?? "16px", padding, margin: styles.margin ?? "0" }}>
          <div
            style={{ flex: `0 0 ${pct1}%`, fontFamily: globalStyles.fontFamily, fontSize: 14, color: globalStyles.textColor, lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: content.col1 ?? "<p>Column 1</p>" }}
          />
          <div
            style={{ flex: `0 0 ${pct2}%`, fontFamily: globalStyles.fontFamily, fontSize: 14, color: globalStyles.textColor, lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: content.col2 ?? "<p>Column 2</p>" }}
          />
        </div>
      );
    }

    case "SECTION": {
      const bg = content.backgroundColor ?? "#f9fafb";
      const br = content.borderRadius ?? 8;
      const bc = content.borderColor ?? "#e5e7eb";
      const bw = content.borderWidth ?? 1;
      const sp = content.padding ?? "24px";
      return (
        <div
          style={{
            margin: styles.margin ?? "0",
            padding: sp,
            backgroundColor: bg,
            borderRadius: br,
            border: `${bw}px solid ${bc}`,
            fontFamily: globalStyles.fontFamily,
            fontSize: 14,
            color: globalStyles.textColor,
            lineHeight: 1.6,
          }}
          dangerouslySetInnerHTML={{ __html: content.text ?? "Section content..." }}
        />
      );
    }

    case "CALLOUT": {
      const bg = content.backgroundColor ?? "#eff6ff";
      const tc = content.textColor ?? "#1e40af";
      const bc = content.borderColor ?? "#bfdbfe";
      const br = content.borderRadius ?? 8;
      const icon = content.icon ?? "💡";
      return (
        <div
          style={{
            margin: styles.margin ?? "0",
            padding,
            backgroundColor: bg,
            borderLeft: `4px solid ${bc}`,
            borderRadius: br,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
          <p style={{ margin: 0, fontFamily: globalStyles.fontFamily, fontSize: 14, color: tc, lineHeight: 1.6 }}>
            {content.text ?? ""}
          </p>
        </div>
      );
    }

    case "QUOTE": {
      const bc = content.borderColor || globalStyles.primaryColor;
      return (
        <blockquote
          style={{
            margin: styles.margin ?? "0",
            padding: `${padding} 0 ${padding} 20px`,
            borderLeft: `4px solid ${bc}`,
            fontStyle: "italic",
          }}
        >
          <p style={{ margin: "0 0 6px 0", fontSize: 16, color: globalStyles.textColor, fontFamily: globalStyles.fontFamily, lineHeight: 1.7 }}>
            {content.text ?? ""}
          </p>
          {content.attribution && (
            <cite style={{ fontSize: 13, color: globalStyles.textColor, opacity: 0.6, fontStyle: "normal", fontFamily: globalStyles.fontFamily }}>
              {content.attribution}
            </cite>
          )}
        </blockquote>
      );
    }

    case "LIST": {
      const items: string[] = content.items ?? [];
      const Tag = content.ordered ? "ol" : "ul";
      return (
        <Tag
          style={{
            margin: styles.margin ?? "0",
            padding,
            paddingLeft: 24,
            listStyleType: content.ordered ? "decimal" : "disc",
            fontFamily: globalStyles.fontFamily,
            fontSize: styles.fontSize ?? "14px",
            color: globalStyles.textColor,
            lineHeight: 1.6,
          }}
        >
          {items.map((item, i) => (
            <li key={i} style={{ marginBottom: 6 }}>{item}</li>
          ))}
          {items.length === 0 && (
            <li style={{ opacity: 0.4 }}>{t("builder.canvas.noItems")}</li>
          )}
        </Tag>
      );
    }

    case "HTML":
      return (
        <div style={{ padding }}>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: "#6b7280",
              background: "#f9fafb",
              border: "1px dashed #d1d5db",
              borderRadius: 4,
              padding: "8px 12px",
            }}
          >
            {content.html ? (
              <span>{t("builder.canvas.htmlBlock", { count: content.html.length })}</span>
            ) : (
              <span>{t("builder.canvas.emptyHtml")}</span>
            )}
          </div>
        </div>
      );

    default:
      return <div style={{ color: "#ef4444", fontSize: 12 }}>Unknown block: {block.type}</div>;
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

export function BuilderCanvas({ placeholder = "Drag blocks here to build your design" }: { placeholder?: string }) {
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
          isOver ? "ring-2 ring-primary bg-surface/80" : ""
        }`}
        style={{ backgroundColor: globalStyles.backgroundColor }}
      >
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col min-h-[600px]">
            {blocks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-on-surface-variant/50 border-2 border-dashed border-outline-variant m-4 text-sm">
                {placeholder}
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
