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
import { useEmailBuilderStore, BlockType } from "./store";
import { SidebarTools } from "./builder/SidebarTools";
import { BuilderCanvas } from "./builder/BuilderCanvas";
import { PropertiesPanel } from "./builder/PropertiesPanel";
import { authFetch } from "@/lib/api";
import { renderBlocksToHtml } from "./renderBlocksToHtml";

interface SignatureBuilderProps {
  signature?: { id: string | null; name?: string; isDefault?: boolean } | null;
  onSave: (html: string, json: any, name: string, isDefault: boolean) => void;
  onCancel?: () => void;
}

export function EmailSignatureBuilder({ signature, onSave, onCancel }: SignatureBuilderProps) {
  const { blocks, addBlock, reorderBlocks, globalStyles, setBlocks, setGlobalStyles } =
    useEmailBuilderStore();
  const [activeToolType, setActiveToolType] = useState<BlockType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(signature?.name ?? "My Signature");
  const [isDefault, setIsDefault] = useState(signature?.isDefault ?? false);

  useEffect(() => {
    setName(signature?.name ?? "My Signature");
    setIsDefault(signature?.isDefault ?? false);

    if (!signature?.id) {
      setBlocks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let isMounted = true;

    authFetch(`/api/email/signatures/${signature.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const version = data?.data?.version;
        if (version?.contentJson) {
          setBlocks(version.contentJson.blocks ?? []);
          if (version.contentJson.globalStyles) {
            setGlobalStyles(version.contentJson.globalStyles);
          }
        } else {
          setBlocks([]);
        }
      })
      .catch(() => {
        if (isMounted) setBlocks([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [signature?.id, setBlocks, setGlobalStyles]);

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

  const handleSave = () => {
    const html = renderBlocksToHtml(blocks, globalStyles);
    onSave(html, { blocks, globalStyles }, name, isDefault);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-on-surface-variant">
        Loading signature…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant bg-surface-container-lowest shrink-0">
        {/* Name input */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Signature name"
          className="flex-1 min-w-0 px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
        />

        {/* Default toggle */}
        <label className="flex items-center gap-2 shrink-0 cursor-pointer select-none">
          <div
            onClick={() => setIsDefault((v) => !v)}
            className={`relative w-8 h-4 rounded-full transition-colors ${isDefault ? "bg-primary" : "bg-outline-variant"}`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${isDefault ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </div>
          <span className="text-xs text-on-surface-variant">Default</span>
        </label>

        <div className="flex items-center gap-2 shrink-0">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

      {/* Builder body */}
      <div className="flex flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SidebarTools showVariables />
          <BuilderCanvas placeholder="Drag blocks here to build your signature" />

          <DragOverlay>
            {activeToolType ? (
              <div className="px-3 py-1.5 bg-primary text-on-primary rounded-lg shadow-lg text-sm">
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
