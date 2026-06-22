import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState, useEffect } from "react";
import { useEmailBuilderStore, BlockType } from "./store";
import { SidebarTools } from "./builder/SidebarTools";
import { BuilderCanvas } from "./builder/BuilderCanvas";
import { PropertiesPanel } from "./builder/PropertiesPanel";
import { authFetch } from "@/lib/api";

export function EmailSignatureBuilder({ 
  signature, 
  onSave 
}: { 
  signature?: { id: string, ownerType: string, ownerId: string } | null, 
  onSave: (html: string, json: any) => void 
}) {
  const { blocks, addBlock, reorderBlocks, globalStyles, setBlocks, setGlobalStyles } = useEmailBuilderStore();
  const [activeToolType, setActiveToolType] = useState<BlockType | null>(null);
  const [isLoading, setIsLoading] = useState(!!signature);

  useEffect(() => {
    if (!signature) {
      setBlocks([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    authFetch(`/api/email/signatures/${signature.id}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        const version = data?.data?.version;
        if (version?.contentJson) {
          setBlocks(version.contentJson.blocks || []);
          if (version.contentJson.globalStyles) {
            setGlobalStyles(version.contentJson.globalStyles);
          }
        } else {
          setBlocks([]);
        }
      })
      .catch((e) => {
        console.error("Failed to load signature:", e);
        if (isMounted) setBlocks([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [signature, setBlocks, setGlobalStyles]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    if (active.data.current?.isTool) {
      setActiveToolType(active.data.current.type);
    }
  };

  const handleDragEnd = (event: any) => {
    setActiveToolType(null);
    const { active, over } = event;

    if (!over) return;

    if (active.data.current?.isTool && over.id === "canvas") {
      // Dropped a new tool onto the canvas
      addBlock(active.data.current.type, blocks.length);
      return;
    }

    if (active.data.current?.isBlock && over.data.current?.isBlock) {
      // Reordered an existing block
      if (active.id !== over.id) {
        reorderBlocks(active.id, over.id);
      }
    }
  };

  const handleSave = () => {
    // Generate a simple HTML string to save to the database
    // In a real implementation, this would use ReactDOMServer or MJML to render the blocks to HTML properly.
    const html = `
      <div style="font-family: ${globalStyles.fontFamily}; color: ${globalStyles.textColor}; background-color: ${globalStyles.backgroundColor};">
        ${blocks.map(b => `<!-- Block: ${b.type} -->`).join("\\n")}
      </div>
    `;
    const json = { blocks, globalStyles };
    onSave(html, json);
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center items-center h-full">Loading builder...</div>;
  }

  return (
    <div className="flex flex-col h-screen max-h-[800px] bg-surface rounded-xl border border-outline-variant overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-outline-variant bg-surface">
        <h2 className="text-lg font-semibold text-on-surface">Signature Builder</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Save Signature
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SidebarTools />
          <BuilderCanvas />

          <DragOverlay>
            {activeToolType ? (
              <div className="px-4 py-2 bg-primary text-on-primary rounded shadow-lg">
                Drop to add {activeToolType}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <PropertiesPanel />
      </div>
    </div>
  );
}
