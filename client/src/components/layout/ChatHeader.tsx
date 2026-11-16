import { ChevronDown, Menu, Moon, Sun } from "lucide-react";
import type { AIModel } from "../../types/chat";

interface ChatHeaderProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenSidebar: () => void;

  models: AIModel[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  isModelsLoading: boolean;
}

export default function ChatHeader({
  theme,
  onToggleTheme,
  onOpenSidebar,
  models,
  selectedModel,
  onModelChange,
  isModelsLoading,
}: ChatHeaderProps) {
  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[var(--border)] px-5 md:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--hover)] lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="relative">
          <select
            value={selectedModel}
            onChange={(event) => onModelChange(event.target.value)}
            disabled={isModelsLoading || models.length === 0}
            className="appearance-none cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--background)] py-2 pl-3 pr-9 text-sm font-medium text-[var(--foreground)] outline-none transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Select AI model"
          >
            {isModelsLoading && <option value="">Loading models...</option>}

            {!isModelsLoading && models.length === 0 && (
              <option value="">No models available</option>
            )}

            {models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>

          <ChevronDown
            size={15}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-[var(--muted)] sm:block">
          AI workspace
        </span>

        <button
          onClick={onToggleTheme}
          className="rounded-lg border border-[var(--border)] p-2.5 text-[var(--muted)] transition hover:bg-[var(--hover)]"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
}
