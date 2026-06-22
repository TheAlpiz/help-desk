import { create } from "zustand";
import { arrayMove } from "@dnd-kit/sortable";

export type BlockType =
  | "TEXT"
  | "HEADING"
  | "IMAGE"
  | "DIVIDER"
  | "BUTTON"
  | "SOCIAL_LINKS"
  | "VARIABLE"
  | "SPACER"
  | "LINK"
  | "FEEDBACK"
  | "COLUMNS"
  | "SECTION"
  | "CALLOUT"
  | "QUOTE"
  | "LIST"
  | "HTML";

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

const DEFAULT_CONTENT: Partial<Record<BlockType, Record<string, any>>> = {
  TEXT: { text: "Write your text here..." },
  HEADING: { text: "Heading", level: "h2" },
  IMAGE: { url: "", alt: "Image" },
  DIVIDER: {},
  BUTTON: { text: "Click Here", url: "https://", backgroundColor: "" },
  SOCIAL_LINKS: {
    layout: "flex-row",
    links: [
      { label: "Twitter", url: "https://twitter.com" },
      { label: "LinkedIn", url: "https://linkedin.com" },
    ],
  },
  VARIABLE: { variableName: "ticket_id" },
  SPACER: { height: "20px" },
  LINK: { text: "Click here", url: "https://", color: "" },
  FEEDBACK: {
    question: "How helpful was this?",
    type: "stars",
    scale: 5,
    baseUrl: "https://",
  },
  COLUMNS: {
    col1: "<p>Column 1 content</p>",
    col2: "<p>Column 2 content</p>",
    ratio: "50:50",
    gap: "16px",
  },
  SECTION: {
    text: "Section content goes here...",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderColor: "#e5e7eb",
    borderWidth: 1,
    padding: "24px",
  },
  CALLOUT: {
    text: "Important information for you.",
    icon: "💡",
    backgroundColor: "#eff6ff",
    textColor: "#1e40af",
    borderColor: "#bfdbfe",
    borderRadius: 8,
  },
  QUOTE: {
    text: "Insert a memorable quote or customer testimonial here.",
    attribution: "— Author Name",
    borderColor: "",
  },
  LIST: {
    items: ["First item", "Second item", "Third item"],
    ordered: false,
  },
  HTML: { html: "<!-- Custom HTML here -->" },
};

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
        content: { ...(DEFAULT_CONTENT[type] ?? {}) },
        styles: { padding: "10px", margin: "0px", textAlign: "left" },
      };
      const newBlocks = [...state.blocks];
      newBlocks.splice(index, 0, newBlock);
      return { blocks: newBlocks, selectedBlockId: newBlock.id };
    }),
  updateBlock: (id, properties) =>
    set((state) => ({
      blocks: state.blocks.map((block) =>
        block.id === id ? { ...block, ...properties } : block,
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
