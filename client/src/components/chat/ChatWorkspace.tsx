import { useEffect, useState } from "react";

import AppSidebar from "../layout/AppSidebar";
import ChatHeader from "../layout/ChatHeader";
import ChatWelcome from "./ChatWelcome";
import ChatMessages from "./ChatMessages";
import ChatComposer from "./ChatComposer";
import SearchModal from "./SearchModal";
import DocumentLibrary from "../documents/DocumentLibrary";
import type { AIModel } from "../../types/chat";
import { useChatStore } from "../../stores/chatStore";
import { useDocumentStore } from "../../stores/documentStore";
import { queryDocumentsStream, getDocuments } from "../../services/documentApi";

import {
  createConversation,
  getConversations,
  getConversation,
  getModels,
  mapConversation,
  mapMessages,
  sendChatMessage,
} from "../../services/chatApi";

export default function ChatWorkspace() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasReceivedToken, setHasReceivedToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [isModelsLoading, setIsModelsLoading] = useState(true);

  const messages = useChatStore((state) => state.messages);
  const conversations = useChatStore((state) => state.conversations);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const removeMessage = useChatStore((state) => state.removeMessage);

  const activeConversationId = useChatStore(
    (state) => state.activeConversationId
  );

  const setMessages = useChatStore((state) => state.setMessages);
  const setConversations = useChatStore((state) => state.setConversations);
  const setActiveConversation = useChatStore(
    (state) => state.setActiveConversation
  );
  const upsertConversation = useChatStore((state) => state.upsertConversation);
  const startNewChat = useChatStore((state) => state.startNewChat);

  // Global ⌘K / Ctrl+K shortcut to open search modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load conversations when workspace starts.
  useEffect(() => {
    let isMounted = true;

    const loadConversations = async () => {
      try {
        const data = await getConversations();
        if (isMounted) {
          setConversations(data.map(mapConversation));
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Unable to load conversations."
          );
        }
      }
    };

    void loadConversations();

    return () => {
      isMounted = false;
    };
  }, [setConversations]);

  // Load documents on mount for document count badge
  useEffect(() => {
    getDocuments()
      .then((docs) => useDocumentStore.getState().setDocuments(docs))
      .catch(() => {});
  }, []);

  // Load available Ollama models.
  useEffect(() => {
    let isMounted = true;

    const loadModels = async () => {
      try {
        const data = await getModels();

        if (!isMounted) return;

        setModels(data.models);

        const savedModel = localStorage.getItem("nexa-selected-model");

        const availableSavedModel = data.models.find(
          (model) => model.name === savedModel
        );

        const availableDefaultModel = data.models.find(
          (model) => model.name === data.defaultModel
        );

        const initialModel =
          availableSavedModel?.name ??
          availableDefaultModel?.name ??
          data.models[0]?.name ??
          "";

        setSelectedModel(initialModel);
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Unable to load AI models."
          );
        }
      } finally {
        if (isMounted) {
          setIsModelsLoading(false);
        }
      }
    };

    void loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem("nexa-selected-model", model);
  };

  // Load selected conversation from database.
  const handleSelectConversation = async (id: string) => {
    if (isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const data = await getConversation(id);

      setActiveConversation(id);
      setMessages(mapMessages(data.messages ?? []));
      upsertConversation(mapConversation(data));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load conversation."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (content: string) => {
    const trimmedContent = content.trim();

    if (!trimmedContent || isLoading) return;

    if (!selectedModel) {
      setError("Please select an available AI model.");
      return;
    }
    setError(null);
    setHasReceivedToken(false);
    setIsLoading(true);

    let conversationId = activeConversationId;
    let assistantMessageId: string | null = null;

    try {
      // Create a real backend conversation for the first message.
      if (!conversationId) {
        const conversation = await createConversation(
          trimmedContent.slice(0, 60)
        );

        conversationId = conversation.id;

        setActiveConversation(conversationId);
        upsertConversation(mapConversation(conversation));
      }

      // Add user message to UI.
      addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: trimmedContent,
        createdAt: new Date(),
      });

      // Build history without the empty assistant placeholder.
      const conversationMessages = useChatStore
        .getState()
        .messages.map(({ role, content }) => ({
          role,
          content,
        }));

      // Create assistant placeholder.
      assistantMessageId = crypto.randomUUID();

      addMessage({
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      });

      // Check if RAG mode is active with selected documents
      const { isRAGMode, selectedDocumentIds, setRAGSources } =
        useDocumentStore.getState();

      if (isRAGMode && selectedDocumentIds.size > 0) {
        setRAGSources([]);
        const docIds = Array.from(selectedDocumentIds);

        await queryDocumentsStream(
          trimmedContent,
          docIds,
          selectedModel,
          (chunk) => {
            setHasReceivedToken(true);

            const currentMessage = useChatStore
              .getState()
              .messages.find((message) => message.id === assistantMessageId);

            if (currentMessage) {
              updateMessage(assistantMessageId!, currentMessage.content + chunk);
            }
          },
          (sources) => {
            setRAGSources(sources);
          }
        );
      } else {
        // Clear any previous RAG sources in standard chat mode
        setRAGSources([]);

        // Start standard SSE streaming.
        await sendChatMessage(
          conversationId,
          conversationMessages,
          selectedModel,
          (chunk) => {
            setHasReceivedToken(true);

            const currentMessage = useChatStore
              .getState()
              .messages.find((message) => message.id === assistantMessageId);

            if (currentMessage) {
              updateMessage(assistantMessageId!, currentMessage.content + chunk);
            }
          },
          (backendConversationId) => {
            setActiveConversation(backendConversationId);
          }
        );
      }

      // Refresh sidebar from database after successful response.
      const conversations = await getConversations();
      setConversations(conversations.map(mapConversation));
    } catch (err) {
      const assistantMessage = assistantMessageId
        ? useChatStore
            .getState()
            .messages.find((message) => message.id === assistantMessageId)
        : undefined;

      if (assistantMessage && !assistantMessage.content) {
        removeMessage(assistantMessage.id);
      }

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`app-shell ${theme}`} data-theme={theme}>
      <div className="flex h-dvh overflow-hidden">
        {sidebarOpen && (
          <button
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
        )}

        <div
          className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 lg:relative lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <AppSidebar
            onClose={() => setSidebarOpen(false)}
            onNewChat={() => {
              startNewChat();
              setError(null);
            }}
            onSelectConversation={handleSelectConversation}
            onOpenSearch={() => setSearchOpen(true)}
            onOpenDocuments={() => setDocumentsOpen(true)}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col bg-[var(--background)]">
          <ChatHeader
            theme={theme}
            onToggleTheme={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
            onOpenSidebar={() => setSidebarOpen(true)}
            models={models}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            isModelsLoading={isModelsLoading}
          />

          <div className="min-h-0 flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <ChatWelcome onSelectPrompt={handleSend} />
            ) : (
              <ChatMessages
                isLoading={isLoading}
                hasReceivedToken={hasReceivedToken}
                error={error}
              />
            )}
          </div>

          <ChatComposer
            onSend={handleSend}
            onOpenDocuments={() => setDocumentsOpen(true)}
          />
        </main>
      </div>

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectConversation={handleSelectConversation}
        recentConversations={conversations}
      />

      <DocumentLibrary
        isOpen={documentsOpen}
        onClose={() => setDocumentsOpen(false)}
      />
    </div>
  );
}
