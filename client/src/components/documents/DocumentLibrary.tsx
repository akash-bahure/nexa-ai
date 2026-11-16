import { useEffect } from "react";
import {
  X,
  Trash2,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { useDocumentStore } from "../../stores/documentStore";
import {
  getDocuments,
  deleteDocument,
  formatFileSize,
  getFileIcon,
} from "../../services/documentApi";
import type { Document } from "../../types/document";

interface DocumentLibraryProps {
  isOpen: boolean;
  onClose: () => void;
}

function StatusBadge({ status }: { status: Document["status"] }) {
  if (status === "completed" || status === "ready") {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-400">
        <CheckCircle2 size={11} /> Completed
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="flex items-center gap-1 text-xs text-amber-400">
        <Clock size={11} /> Processing
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-400">
      <AlertCircle size={11} /> Error
    </span>
  );
}

export default function DocumentLibrary({
  isOpen,
  onClose,
}: DocumentLibraryProps) {
  const {
    documents,
    setDocuments,
    removeDocument,
    selectedDocumentIds,
    toggleSelectDocument,
    isLoading,
    setIsLoading,
    setError,
    isRAGMode,
    setIsRAGMode,
  } = useDocumentStore();

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    getDocuments()
      .then(setDocuments)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load documents")
      )
      .finally(() => setIsLoading(false));
  }, [isOpen, setDocuments, setError, setIsLoading]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this document and all its data?")) return;
    try {
      await deleteDocument(id);
      removeDocument(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 flex h-[80vh] max-h-[640px] w-full max-w-2xl flex-col rounded-2xl border border-[var(--border)] bg-[#13141a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Document Library
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {documents.length} document{documents.length !== 1 ? "s" : ""} ·{" "}
                {selectedDocumentIds.size} selected for RAG
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedDocumentIds.size > 0 && (
              <button
                onClick={() => setIsRAGMode(!isRAGMode)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  isRAGMode
                    ? "bg-violet-600 text-white"
                    : "bg-violet-600/20 text-violet-400 hover:bg-violet-600/30"
                }`}
              >
                <BookOpen size={13} />
                {isRAGMode ? "RAG Active" : "Enable RAG"}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--hover)] hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <FileText className="text-zinc-700" size={40} />
              <p className="text-sm text-[var(--muted)]">
                No documents uploaded yet.
              </p>
              <p className="text-xs text-zinc-600">
                Upload PDF, TXT, or DOCX files to chat with them.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const isSelected = selectedDocumentIds.has(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-3 rounded-xl border p-4 transition cursor-pointer ${
                      isSelected
                        ? "border-violet-500/50 bg-violet-500/10"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-violet-500/30"
                    }`}
                    onClick={() =>
                      (doc.status === "completed" || doc.status === "ready") &&
                      toggleSelectDocument(doc.id)
                    }
                  >
                    <span className="shrink-0 text-2xl">
                      {getFileIcon(doc.mimeType)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">
                        {doc.originalName}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-[var(--muted)]">
                        <span>{formatFileSize(doc.size)}</span>
                        {doc.pageCount && <span>{doc.pageCount} pages</span>}
                        {doc._count && (
                          <span>{doc._count.chunks} chunks</span>
                        )}
                        <StatusBadge status={doc.status} />
                      </div>
                      {doc.errorMessage && (
                        <p className="mt-1 text-xs text-red-400">
                          {doc.errorMessage}
                        </p>
                      )}
                    </div>

                    {isSelected && (
                      <div className="shrink-0 rounded-full bg-violet-600 p-0.5">
                        <CheckCircle2 size={14} className="text-white" />
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(doc.id);
                      }}
                      className="shrink-0 rounded-lg p-1.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
                      title="Delete document"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedDocumentIds.size > 0 && (
          <div className="border-t border-[var(--border)] px-6 py-3">
            <p className="text-xs text-violet-400">
              ✓ {selectedDocumentIds.size} document
              {selectedDocumentIds.size !== 1 ? "s" : ""} selected — your next
              messages will search these documents for context.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
