import { create } from "zustand";
import type { Document, RAGSource } from "../types/document";

interface DocumentState {
  documents: Document[];
  selectedDocumentIds: Set<string>;
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;

  // RAG state per conversation
  ragSources: RAGSource[];
  isRAGMode: boolean;

  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, patch: Partial<Document>) => void;
  removeDocument: (id: string) => void;
  toggleSelectDocument: (id: string) => void;
  selectDocument: (id: string) => void;
  deselectDocument: (id: string) => void;
  clearSelectedDocuments: () => void;
  setSelectedDocumentIds: (ids: string[]) => void;
  setIsLoading: (v: boolean) => void;
  setIsUploading: (v: boolean) => void;
  setUploadProgress: (v: number) => void;
  setError: (e: string | null) => void;
  setRAGSources: (sources: RAGSource[]) => void;
  setIsRAGMode: (v: boolean) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  selectedDocumentIds: new Set<string>(),
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,
  error: null,
  ragSources: [],
  isRAGMode: false,

  setDocuments: (documents) => set({ documents }),
  addDocument: (doc) =>
    set((state) => ({ documents: [doc, ...state.documents] })),
  updateDocument: (id, patch) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, ...patch } : d
      ),
    })),
  removeDocument: (id) =>
    set((state) => {
      const next = new Set(state.selectedDocumentIds);
      next.delete(id);
      return {
        documents: state.documents.filter((d) => d.id !== id),
        selectedDocumentIds: next,
      };
    }),
  toggleSelectDocument: (id) =>
    set((state) => {
      const next = new Set(state.selectedDocumentIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return {
        selectedDocumentIds: next,
        isRAGMode: next.size > 0 ? true : state.isRAGMode,
      };
    }),
  selectDocument: (id) =>
    set((state) => {
      const next = new Set(state.selectedDocumentIds);
      next.add(id);
      return { selectedDocumentIds: next, isRAGMode: true };
    }),
  deselectDocument: (id) =>
    set((state) => {
      const next = new Set(state.selectedDocumentIds);
      next.delete(id);
      return { selectedDocumentIds: next };
    }),
  clearSelectedDocuments: () =>
    set({ selectedDocumentIds: new Set<string>(), isRAGMode: false }),
  setSelectedDocumentIds: (ids) =>
    set({
      selectedDocumentIds: new Set(ids),
      isRAGMode: ids.length > 0,
    }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsUploading: (isUploading) => set({ isUploading }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
  setError: (error) => set({ error }),
  setRAGSources: (ragSources) => set({ ragSources }),
  setIsRAGMode: (isRAGMode) => set({ isRAGMode }),
}));
