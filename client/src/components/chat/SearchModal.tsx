import { useState, useEffect, useRef } from "react";
import { Search, X, MessageSquare, Loader2, Calendar } from "lucide-react";
import type { Conversation } from "../../types/chat";
import { getConversations, mapConversation } from "../../services/chatApi";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
  recentConversations: Conversation[];
}

export default function SearchModal({
  isOpen,
  onClose,
  onSelectConversation,
  recentConversations,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search query to backend API
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();

    if (!trimmed) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await getConversations(trimmed);
        setSearchResults(data.map(mapConversation));
      } catch (err) {
        console.error("Search conversations failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const displayResults = query.trim() ? searchResults : recentConversations;

  const handleClose = () => {
    setQuery("");
    setSearchResults([]);
    onClose();
  };

  const formatDate = (date: Date) => {
    try {
      return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
      }).format(date);
    } catch {
      return "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.1] bg-[#13151b] shadow-2xl shadow-black/60 transition-all">
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-white/[0.08] px-4 py-3.5">
          <Search size={18} className="text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations by title or message..."
            className="ml-3 flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
          />

          {isSearching && (
            <Loader2
              size={16}
              className="animate-spin text-violet-400 shrink-0 mr-2"
            />
          )}

          {query && !isSearching && (
            <button
              onClick={() => {
                setQuery("");
                setSearchResults([]);
              }}
              className="rounded-md p-1 text-zinc-500 hover:bg-white/10 hover:text-white mr-1.5 transition"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}

          <kbd className="hidden sm:inline-block rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-[380px] overflow-y-auto p-2">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {query.trim() ? "Search Results" : "Recent Conversations"}
          </div>

          {displayResults.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="mx-auto mb-2 text-zinc-600" size={26} />
              <p className="text-sm font-medium text-zinc-300">
                {query.trim()
                  ? `No conversations found for "${query}"`
                  : "No conversations found"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Try searching for a different keyword or topic.
              </p>
            </div>
          ) : (
            <div className="space-y-1 mt-1">
              {displayResults.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => {
                    onSelectConversation(conversation.id);
                    handleClose();
                  }}
                  className="group flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left transition hover:bg-white/[0.06]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 transition group-hover:bg-violet-500/20">
                      <MessageSquare size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-200 group-hover:text-white">
                        {conversation.title}
                      </p>
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                        <Calendar size={11} />
                        <span>{formatDate(conversation.updatedAt)}</span>
                        {conversation.messageCount !== undefined && (
                          <>
                            <span>•</span>
                            <span>{conversation.messageCount} messages</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <span className="hidden text-xs text-zinc-500 group-hover:inline-block transition">
                    Open →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
