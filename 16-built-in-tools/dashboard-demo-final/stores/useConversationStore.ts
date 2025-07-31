import { create } from "zustand";
import { Item } from "@/lib/assistant";
import { INITIAL_MESSAGE } from "@/config/constants";

interface ConversationState {
  // Items displayed in the chat
  chatMessages: Item[];
  // ID of the previous assistant response
  previousResponseId: string | null;
  // Whether we are waiting for the assistant response
  isAssistantLoading: boolean;

  setChatMessages: (items: Item[]) => void;
  addChatMessage: (item: Item) => void;
  setPreviousResponseId: (id: string | null) => void;
  setAssistantLoading: (loading: boolean) => void;
  rawSet: (state: any) => void;
}

const useConversationStore = create<ConversationState>((set) => ({
  chatMessages: [
    {
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: INITIAL_MESSAGE }],
    },
  ],
  previousResponseId: null,
  isAssistantLoading: false,
  setChatMessages: (items) => set({ chatMessages: items }),
  addChatMessage: (item) =>
    set((state) => ({ chatMessages: [...state.chatMessages, item] })),

  setPreviousResponseId: (id) => set({ previousResponseId: id }),
  setAssistantLoading: (loading) => set({ isAssistantLoading: loading }),
  rawSet: set,
}));

export default useConversationStore;
