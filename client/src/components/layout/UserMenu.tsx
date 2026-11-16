import { useState, useRef, useEffect } from "react";
import { LogOut, ChevronUp } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useChatStore } from "../../stores/chatStore";

export default function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const startNewChat = useChatStore((state) => state.startNewChat);
  const setConversations = useChatStore((state) => state.setConversations);

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    startNewChat();
    setConversations([]);
    await logout();
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="relative" ref={menuRef}>
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-full rounded-xl border border-white/[0.08] bg-[#15171e] p-1.5 shadow-xl shadow-black/40 backdrop-blur-md">
          <div className="border-b border-white/[0.06] px-3 py-2">
            <p className="text-xs font-semibold text-white truncate">
              {user?.name || "User"}
            </p>
            <p className="text-[11px] text-zinc-400 truncate">
              {user?.email || "user@example.com"}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 rounded-xl bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.07]"
        aria-label="User account menu"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-semibold text-white shadow-sm shadow-violet-500/30">
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {user?.name || "User"}
          </p>
          <p className="truncate text-xs text-zinc-400">
            {user?.email || "Personal Workspace"}
          </p>
        </div>

        <ChevronUp
          size={16}
          className={`text-zinc-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
    </div>
  );
}
