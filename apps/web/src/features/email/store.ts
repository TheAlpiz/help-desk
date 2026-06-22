import { create } from "zustand";
import { arrayMove } from "@dnd-kit/sortable";

export type BlockType = "TEXT" | "IMAGE" | "DIVIDER" | "SOCIAL_LINKS";

export interface Block {
  id: string;
  type: BlockType;
  content: Record<string, any>;
  styles: Record<string, any>;
}

interface EmailBuilderState {
  blocks: Block[];
  selectedBlockId: string | null;
  globalStyles: {
    fontFamily: string;
    primaryColor: string;
    textColor: string;
    backgroundColor: string;
  };
  addBlock: (type: BlockType, index: number) => void;
  updateBlock: (id: string, properties: Partial<Block>) => void;
  removeBlock: (id: string) => void;
  reorderBlocks: (activeId: string, overId: string) => void;
  setSelectedBlockId: (id: string | null) => void;
  setGlobalStyles: (styles: Partial<EmailBuilderState["globalStyles"]>) => void;
  setBlocks: (blocks: Block[]) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useEmailBuilderStore = create<EmailBuilderState>((set) => ({
  blocks: [],
  selectedBlockId: null,
  globalStyles: {
    fontFamily: "Inter, sans-serif",
    primaryColor: "#2563eb",
    textColor: "#374151",
    backgroundColor: "#ffffff",
  },
  addBlock: (type, index) =>
    set((state) => {
      const newBlock: Block = {
        id: generateId(),
        type,
        content: {},
        styles: { padding: "10px", margin: "0px" },
      };

      if (type === "TEXT") {
        newBlock.content.text = "Write your text here...";
      } else if (type === "IMAGE") {
        newBlock.content.url = "https://via.placeholder.com/150";
        newBlock.content.alt = "Placeholder Image";
      } else if (type === "SOCIAL_LINKS") {
        newBlock.content.layout = "flex-row";
        newBlock.content.links = [
          { label: "Twitter", url: "https://twitter.com" },
          { label: "LinkedIn", url: "https://linkedin.com" }
        ];
      }

      const newBlocks = [...state.blocks];
      newBlocks.splice(index, 0, newBlock);

      return { blocks: newBlocks, selectedBlockId: newBlock.id };
    }),
  updateBlock: (id, properties) =>
    set((state) => ({
      blocks: state.blocks.map((block) =>
        block.id === id ? { ...block, ...properties } : block
      ),
    })),
  removeBlock: (id) =>
    set((state) => ({
      blocks: state.blocks.filter((block) => block.id !== id),
      selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
    })),
  reorderBlocks: (activeId, overId) =>
    set((state) => {
      const oldIndex = state.blocks.findIndex((b) => b.id === activeId);
      const newIndex = state.blocks.findIndex((b) => b.id === overId);
      if (oldIndex === -1 || newIndex === -1) return state;

      return { blocks: arrayMove(state.blocks, oldIndex, newIndex) };
    }),
  setSelectedBlockId: (id) => set({ selectedBlockId: id }),
  setGlobalStyles: (styles) =>
    set((state) => ({
      globalStyles: { ...state.globalStyles, ...styles },
    })),
  setBlocks: (blocks) => set({ blocks }),
}));
