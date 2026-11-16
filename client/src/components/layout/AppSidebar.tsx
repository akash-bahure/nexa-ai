import {
  MessageSquare,
  Plus,
  Search,
  PanelLeftClose,
  Settings,
  Sparkles,
  MoreHorizontal,
  Pencil,
  Trash2,
  BookOpen,
} from "lucide-react";

import { useChatStore } from "../../stores/chatStore";
import { useDocumentStore } from "../../stores/documentStore";
import UserMenu from "./UserMenu";
import {
  renameConversation,
  deleteConversation,
  mapConversation,
} from "../../services/chatApi";

interface AppSidebarProps {
  onClose?: () => void;
  onNewChat?: () => void;
  onSelectConversation?: (id: string) => void;
  onOpenSearch?: () => void;
  onOpenDocuments?: () => void;
}

export default function AppSidebar({
  onClose,
  onNewChat,
  onSelectConversation,
  onOpenSearch,
  onOpenDocuments,
}: AppSidebarProps) {
  const conversations = useChatStore((state) => state.conversations);
  const documents = useDocumentStore((state) => state.documents);
  const activeConversationId = useChatStore(
    (state) => state.activeConversationId
  );
  const upsertConversation = useChatStore((state) => state.upsertConversation);
  const removeConversation = useChatStore((state) => state.removeConversation);

  const handleNewChat = () => {
    onNewChat?.();
    onClose?.();
  };

  const handleRename = async (id: string, currentTitle: string) => {
    const title = window.prompt("Enter conversation name:", currentTitle);

    if (!title?.trim() || title.trim() === currentTitle) return;

    try {
      const updated = await renameConversation(id, title.trim());
      upsertConversation(mapConversation(updated));
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Unable to rename chat."
      );
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this conversation?"
    );

    if (!confirmed) return;

    try {
      await deleteConversation(id);
      removeConversation(id);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Unable to delete chat."
      );
    }
  };

  return (
    <aside className="flex h-full w-[270px] shrink-0 flex-col border-r border-white/[0.07] bg-[#111318]">
      <div className="flex h-[72px] items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
            <Sparkles size={19} className="text-white" />
          </div>
          <div>
            <h1 className="text-[17px] font-semibold tracking-tight text-white">
              Nexa <span className="text-violet-400">AI</span>
            </h1>
            <p className="text-[10px] tracking-[0.16em] text-zinc-500">
              INTELLIGENCE WORKSPACE
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Close sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      <div className="px-4 pt-3">
        <button
          onClick={handleNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-violet-600/10 transition hover:bg-violet-500"
        >
          <Plus size={17} />
          New chat
        </button>

        <button
          onClick={() => {
            onOpenSearch?.();
            onClose?.();
          }}
          className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
        >
          <Search size={17} />
          Search conversations
          <span className="ml-auto text-xs text-zinc-600">⌘ K</span>
        </button>

        <button
          onClick={() => {
            onOpenDocuments?.();
            onClose?.();
          }}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
        >
          <BookOpen size={17} />
          Documents
          {documents.length > 0 && (
            <span className="ml-auto rounded-full bg-violet-600/30 px-2 py-0.5 text-[10px] text-violet-400 font-medium">
              {documents.length}
            </span>
          )}
        </button>
      </div>

      <div className="mt-8 flex-1 overflow-y-auto px-4">
        <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-zinc-600">
          Recent conversations
        </p>

        {conversations.length === 0 ? (
          <div className="px-2 py-6 text-center">
            <MessageSquare className="mx-auto mb-2 text-zinc-700" size={22} />
            <p className="text-xs text-zinc-600">No conversations yet</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group mb-1 flex items-center rounded-lg transition ${
                activeConversationId === conversation.id
                  ? "bg-white/[0.08] text-white"
                  : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left text-sm"
                onClick={() => {
                  onSelectConversation?.(conversation.id);
                  onClose?.();
                }}
              >
                <MessageSquare size={15} className="shrink-0 text-zinc-600" />
                <span className="flex-1 truncate">{conversation.title}</span>
              </button>

              <div className="flex items-center pr-2">
                <button
                  title="Rename conversation"
                  className="rounded p-1 text-zinc-500 opacity-0 hover:bg-white/10 hover:text-white group-hover:opacity-100"
                  onClick={() =>
                    handleRename(conversation.id, conversation.title)
                  }
                >
                  <Pencil size={13} />
                </button>

                <button
                  title="Delete conversation"
                  className="rounded p-1 text-zinc-500 opacity-0 hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                  onClick={() => handleDelete(conversation.id)}
                >
                  <Trash2 size={13} />
                </button>

                <MoreHorizontal size={15} className="ml-1 text-zinc-600" />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-white/[0.07] p-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-white/[0.05] hover:text-white">
          <Settings size={17} />
          Settings
        </button>

        <div className="mt-3">
          <UserMenu />
        </div>
      </div>
    </aside>
  );
}
