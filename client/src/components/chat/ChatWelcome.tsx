import { Code2, Lightbulb, PenLine, Sparkles } from "lucide-react";

const suggestions = [
  {
    icon: Code2,
    title: "Write code",
    description: "Create, explain or debug code",
    prompt: "Help me understand how REST APIs work with Node.js.",
  },
  {
    icon: Lightbulb,
    title: "Learn something",
    description: "Explore a new topic step by step",
    prompt: "Explain how large language models work.",
  },
  {
    icon: PenLine,
    title: "Write something",
    description: "Create professional content",
    prompt: "Help me write a professional software developer introduction.",
  },
];

interface ChatWelcomeProps {
  onSelectPrompt: (prompt: string) => void;
}

export default function ChatWelcome({ onSelectPrompt }: ChatWelcomeProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 pb-8 pt-16 md:pt-24">
      <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-[22px] border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-indigo-500/10 shadow-xl shadow-violet-500/10">
        <Sparkles size={30} className="text-violet-400" />
      </div>

      <h2 className="text-center text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
        What can I help you with?
      </h2>

      <p className="mt-3 max-w-md text-center text-sm leading-6 text-[var(--muted)]">
        Ask questions, explore ideas, write code and discover new possibilities
        with Nexa AI.
      </p>

      <div className="mt-12 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {suggestions.map(({ icon: Icon, title, description, prompt }) => (
          <button
            key={title}
            onClick={() => onSelectPrompt(prompt)}
            className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition hover:-translate-y-1 hover:border-violet-500/40 hover:bg-[var(--hover)]"
          >
            <div className="mb-5 inline-flex rounded-xl bg-violet-500/10 p-2.5 text-violet-400 transition group-hover:bg-violet-500/20">
              <Icon size={19} />
            </div>

            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              {title}
            </h3>

            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              {description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
