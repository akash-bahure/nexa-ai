import { useEffect, useRef } from "react";
import { Bot, User, LoaderCircle } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import { useDocumentStore } from "../../stores/documentStore";
import RAGSourceCard from "../documents/RAGSourceCard";

interface ChatMessagesProps {
  isLoading: boolean;
  hasReceivedToken: boolean;
  error: string | null;
}

export default function ChatMessages({
  isLoading,
  hasReceivedToken,
  error,
}: ChatMessagesProps) {
  const messages = useChatStore((state) => state.messages);
  const ragSources = useDocumentStore((state) => state.ragSources);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading, error]);

  const lastAssistantIndex = messages.reduce<number>(
    (lastIdx, msg, idx) => (msg.role === "assistant" ? idx : lastIdx),
    -1
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-7 px-5 py-8">
      {messages.map((message, index) => {
        // Hide the empty assistant placeholder while thinking.
        if (
          message.role === "assistant" &&
          !message.content &&
          isLoading &&
          !hasReceivedToken
        ) {
          return null;
        }

        const isLastAssistant = index === lastAssistantIndex;

        return (
          <div
            key={message.id}
            className={`flex gap-4 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                <Bot size={18} />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 ${
                message.role === "user"
                  ? "rounded-br-md bg-violet-600 text-white"
                  : "text-[var(--foreground)]"
              }`}
            >
              <div>{message.content}</div>

              {message.role === "assistant" &&
                isLastAssistant &&
                ragSources.length > 0 && (
                  <RAGSourceCard sources={ragSources} />
                )}
            </div>

            {message.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)]">
                <User size={17} />
              </div>
            )}
          </div>
        );
      })}

      {/* Show thinking indicator only before first token. */}
      {isLoading && !hasReceivedToken && (
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
            <Bot size={18} />
          </div>

          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--muted)]">
            <LoaderCircle size={16} className="animate-spin" />
            Nexa AI is thinking...
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="ml-12 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
