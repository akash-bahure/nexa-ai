import { useRef } from "react";
import { Paperclip } from "lucide-react";
import { useDocumentStore } from "../../stores/documentStore";
import { uploadDocument } from "../../services/documentApi";

const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE_MB = 20;

interface DocumentUploadButtonProps {
  onUploaded?: (doc: import("../../types/document").Document) => void;
}

export default function DocumentUploadButton({
  onUploaded,
}: DocumentUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    setIsUploading,
    setUploadProgress,
    addDocument,
    setError,
    isUploading,
  } = useDocumentStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Unsupported file type. Upload PDF, TXT, or DOCX.");
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const doc = await uploadDocument(file, (pct) => setUploadProgress(pct));
      addDocument(doc);
      onUploaded?.(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.txt,.docx"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-violet-400 disabled:opacity-50"
        aria-label="Upload document"
        title="Upload PDF, TXT, or DOCX"
      >
        <Paperclip size={17} />
      </button>
    </>
  );
}
