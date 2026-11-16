import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { RAGSource } from "../../types/document";
import { getFileIcon } from "../../services/documentApi";

interface RAGSourceCardProps {
  sources: RAGSource[];
}

export default function RAGSourceCard({ sources }: RAGSourceCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left text-xs font-medium text-violet-400"
      >
        <FileText size={12} />
        <span>Sources ({sources.length})</span>
        {expanded ? (
          <ChevronUp size={12} className="ml-auto" />
        ) : (
          <ChevronDown size={12} className="ml-auto" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {sources.map((source, i) => (
            <div
              key={i}
              className="rounded-lg border border-violet-500/20 bg-[var(--background)] p-3"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-violet-300">
                <span>{getFileIcon("application/pdf")}</span>
                <span className="truncate">{source.originalName}</span>
                {source.pageNumber && (
                  <span className="ml-auto shrink-0 rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px]">
                    p.{source.pageNumber}
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-3 text-xs text-[var(--muted)]">
                {source.excerpt}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
