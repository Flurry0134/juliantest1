import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from 'react';

// Annahme der Typdefinitionen
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  citations?: Citation[];
  isError?: boolean;
}

interface Citation {
  id: string;
  text: string;
  source: string;
  url?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatContextType {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  messages: Message[];
  isCitationMode: boolean;
  isLoading: boolean;
  toggleCitationMode: () => void;
  sendMessage: (content: string) => Promise<void>;
  createNewSession: () => void;
  loadSession: (sessionId: string) => void;
  exportChat: (format: 'pdf' | 'txt' | 'json') => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isCitationMode, setIsCitationMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const _createNewSessionLogic = () => {
    const newSessionId = Date.now().toString();
    const newSession: ChatSession = {
      id: newSessionId,
      title: `Chat ${sessions.length + 1}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSessions((prevSessions) => [newSession, ...prevSessions]);
    setCurrentSession(newSession);
    setMessages([]);
    return newSession;
  };

  useEffect(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
        try {
            const parsedSessions = JSON.parse(savedSessions).map((s: any) => ({
                ...s,
                createdAt: new Date(s.createdAt),
                updatedAt: new Date(s.updatedAt),
                messages: s.messages.map((m: any) => ({...m, timestamp: new Date(m.timestamp)}))
            }));
            setSessions(parsedSessions);
            const lastSessionId = localStorage.getItem('lastSessionId');
            const lastSession = lastSessionId ? parsedSessions.find((s: ChatSession) => s.id === lastSessionId) : parsedSessions[0];

            if(lastSession) {
                setCurrentSession(lastSession);
                setMessages(lastSession.messages);
            } else {
                 _createNewSessionLogic();
            }
        } catch (e) {
            console.error("Fehler beim Laden der Sessions:", e);
            _createNewSessionLogic();
        }
    } else {
        _createNewSessionLogic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    if (currentSession) {
      localStorage.setItem('lastSessionId', currentSession.id);
    }
  }, [currentSession]);


  const createNewSession = () => _createNewSessionLogic();

  const ensureSession = (): ChatSession => currentSession || _createNewSessionLogic();

  const loadSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
      setMessages(session.messages);
    }
  };

  const toggleCitationMode = () => setIsCitationMode(!isCitationMode);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const sessionToUpdate = ensureSession();
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
    };

    const currentMessagesWithUser = [...(sessionToUpdate.messages || []), userMessage];
    setMessages(currentMessagesWithUser);

    const tempUpdatedSession = { ...sessionToUpdate, messages: currentMessagesWithUser };
    setCurrentSession(tempUpdatedSession);
    setSessions((prev) => prev.map((s) => (s.id === tempUpdatedSession.id ? tempUpdatedSession : s)));
    setIsLoading(true);

    // ==========================================================
    // KORRIGIERTER try...catch...finally Block START
    // ==========================================================
    try {
      const apiUrl = 'https://d864-78-42-249-25.ngrok-free.app/ask';
      
      // Für den Moment senden wir den Modus hartcodiert.
      // Dies wird später durch den Zustand des Modus-Buttons ersetzt.
      const currentMode = "Knowledge Base";

      console.log(`Sende Anfrage an: ${apiUrl} mit Frage: "${content}" und Modus: "${currentMode}"`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: content,
          mode: currentMode,
        }),
      });

      // Die gesamte Logik zur Verarbeitung der Antwort MUSS innerhalb des try-Blocks sein
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: `API error: ${response.status} ${response.statusText}`,
        }));
        console.error('API Error Response:', errorData);
        throw new Error(errorData.detail || `API error: ${response.status}`);
      }

      const data = await response.json();

      const citations: Citation[] =
        data.sources_list?.map((source: any, index: number) => ({
          id: `citation-${Date.now()}-${index}`,
          text: source.Inhalt_Auszug,
          source: source.Quelle,
          url: source.metadata?.url,
        })) || [];

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.answer_display_text,
        sender: 'bot',
        timestamp: new Date(),
        citations: isCitationMode ? citations : undefined,
      };

      const finalMessages = [...currentMessagesWithUser, botMessage];
      setMessages(finalMessages);

      const finalUpdatedSession = { ...tempUpdatedSession, messages: finalMessages, updatedAt: new Date() };
      setCurrentSession(finalUpdatedSession);
      setSessions((prev) => prev.map((s) => (s.id === finalUpdatedSession.id ? finalUpdatedSession : s)));

    } catch (error: any) {
      console.error('Chat submission error / Failed to fetch:', error);
      const errorMessageContent = error.message || 'Failed to get response. Please try again.';
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Error: ${errorMessageContent}`,
        sender: 'bot',
        timestamp: new Date(),
        isError: true,
      };
      
      const messagesWithError = [...currentMessagesWithUser, errorMessage];
      setMessages(messagesWithError);
      
      const sessionWithError = { ...tempUpdatedSession, messages: messagesWithError, updatedAt: new Date() };
      setCurrentSession(sessionWithError);
      setSessions((prev) => prev.map((s) => (s.id === sessionWithError.id ? sessionWithError : s)));

    } finally {
      setIsLoading(false);
    }
    // ==========================================================
    // KORRIGIERTER try...catch...finally Block ENDE
    // ==========================================================
  };

  const exportChat = (format: 'pdf' | 'txt' | 'json') => {
    // Deine Export-Logik bleibt hier unverändert
  };

  return (
    <ChatContext.Provider
      value={{
        currentSession,
        sessions,
        messages,
        isCitationMode,
        isLoading,
        toggleCitationMode,
        sendMessage,
        createNewSession,
        loadSession,
        exportChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
