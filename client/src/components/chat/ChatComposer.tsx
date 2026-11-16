import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Plus, BookOpen, X } from "lucide-react";
import { useDocumentStore } from "../../stores/documentStore";
import DocumentUploadButton from "../documents/DocumentUploadButton";

interface ChatComposerProps {
  onSend: (message: string) => void;
  onOpenDocuments?: () => void;
}

export default function ChatComposer({
  onSend,
  onOpenDocuments,
}: ChatComposerProps) {
  const [input, setInput] = useState("");
  const {
    selectedDocumentIds,
    isRAGMode,
    setIsRAGMode,
    isUploading,
    uploadProgress,
  } = useDocumentStore();

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    const message = input.trim();
    if (!message) return;
    onSend(message);
    setInput("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const hasSelectedDocs = selectedDocumentIds.size > 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-5 pt-3">
      {/* RAG mode indicator */}
      {hasSelectedDocs && isRAGMode && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-2">
          <BookOpen size={13} className="text-violet-400" />
          <span className="text-xs text-violet-300">
            Searching {selectedDocumentIds.size} document
            {selectedDocumentIds.size !== 1 ? "s" : ""} for context
          </span>
          <button
            type="button"
            onClick={() => setIsRAGMode(false)}
            className="ml-auto rounded p-0.5 text-violet-400 hover:text-violet-300"
            title="Disable RAG mode"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="mb-2">
          <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full bg-violet-600 transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl shadow-black/[0.04] transition focus-within:border-violet-500/50"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={
            hasSelectedDocs && isRAGMode
              ? "Ask a question about your documents..."
              : "Message Nexa AI..."
          }
          className="max-h-40 min-h-[55px] w-full resize-y bg-transparent px-2 py-2 text-sm leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenDocuments}
              className={`rounded-lg p-2 transition hover:bg-[var(--hover)] ${
                hasSelectedDocs ? "text-violet-400" : "text-[var(--muted)]"
              }`}
              aria-label="Document library"
              title="Document library"
            >
              <Plus size={19} />
            </button>

            <DocumentUploadButton />

            <span className="ml-2 text-[11px] text-[var(--muted)]">
              Enter to send · Shift + Enter for new line
            </span>
          </div>

          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <ArrowUp size={19} />
          </button>
        </div>
      </form>

      <p className="mt-3 text-center text-[10px] text-[var(--muted)]">
        Nexa AI can make mistakes. Verify important information.
      </p>
    </div>
  );
}
