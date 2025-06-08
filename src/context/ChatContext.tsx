import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from 'react';

// Typ-Definitionen
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

// NEU: Typ für die verschiedenen Chat-Modi
export type ChatMode = 'llm' | 'knowledgebase' | 'knowledgebase_fallback';

interface ChatContextType {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  messages: Message[];
  isCitationMode: boolean;
  isLoading: boolean;
  chatMode: ChatMode; // NEU
  setChatMode: (mode: ChatMode) => void; // NEU
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
  // NEU: Zustand für den Chat-Modus, mit 'knowledgebase_fallback' als Standard
  const [chatMode, setChatMode] = useState<ChatMode>('knowledgebase_fallback');


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

  // Lade Sessions UND den letzten Chat-Modus beim Start
  useEffect(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    // NEU: Lade den gespeicherten Chat-Modus
    const savedChatMode = localStorage.getItem('chatMode') as ChatMode;
    if (savedChatMode) {
      setChatMode(savedChatMode);
    }

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

  // Speichere Änderungen an Sessions und der letzten Session-ID
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

  // NEU: Speichere den Chat-Modus, wenn er sich ändert
  useEffect(() => {
    localStorage.setItem('chatMode', chatMode);
  }, [chatMode]);

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
  
    const currentMessagesWithUser = [...sessionToUpdate.messages || [], userMessage];
    setMessages(currentMessagesWithUser);
  
    const tempUpdatedSession = { ...sessionToUpdate, messages: currentMessagesWithUser };
    setCurrentSession(tempUpdatedSession);
    setSessions((prev) => prev.map((s) => (s.id === tempUpdatedSession.id ? tempUpdatedSession : s)));
    setIsLoading(true);
  
    try {
      const apiUrl = 'https://f653-2a02-8071-d80-4aa0-d58d-351a-97b4-845d.ngrok-free.app/ask';
  
      // NEU: Handle den Frontend-Modus aus dem Zustand in den vom Backend erwarteten String um
      let backendMode: string;
      switch (chatMode) {
        case 'llm':
          backendMode = "General LLM";
          break;
        case 'knowledgebase':
          backendMode = "Knowledge Base";
          break;
        case 'knowledgebase_fallback':
        default:
          backendMode = "Standard"; // Der Fallback-Modus im Backend
          break;
      }
  
      console.log(`Sende Anfrage mit Frage: "${content}" und Modus: "${backendMode}"`);
  
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: content,
          mode: backendMode, // Sende den korrekten Modus-String aus dem Zustand
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: `API error: ${response.status} ${response.statusText}`,
        }));
        console.error('API Error Response:', errorData);
        throw new Error(errorData.detail || `API error: ${response.status}`);
      }
  
      const data = await response.json();

            // DEBUG: Schauen wir uns die rohen Daten an
      console.log('DEBUG: Rohe API Response:', data);
      console.log('DEBUG: data.sources:', data.sources);
      console.log('DEBUG: data.sources Typ:', typeof data.sources);
      console.log('DEBUG: data.sources Array?', Array.isArray(data.sources));
      
      const citations: Citation[] = 
        data.sources?.map((source: any, index: number) => {
          console.log(`DEBUG: Verarbeite Quelle ${index}:`, source);
          console.log(`DEBUG: source.content:`, source.content);
          console.log(`DEBUG: source.source:`, source.source);
          
          const citation = {
            id: `citation-${Date.now()}-${index}`,
            text: source.content?.substring(0, 200) + (source.content?.length > 200 ? '...' : ''),
            source: source.source,
            url: source.url || undefined,
          };
          
          console.log(`DEBUG: Erstellte Citation ${index}:`, citation);
          return citation;
        }) || [];
      
      console.log('DEBUG: Finale Citations Array:', citations);
      console.log('DEBUG: Citations Länge:', citations.length);
      
      // KORRIGIERT: Verwende 'sources' statt 'sources_list'
      const citations: Citation[] = 
        data.sources_list?.map((source: any, index: number) => ({
          id: `citation-${Date.now()}-${index}`,
          text: source.text || source.content || source.excerpt || 'Kein Text verfügbar',
          source: source.source || source.filename || source.document || 'Unbekannte Quelle',
          url: source.url || undefined,
        })) || [];
  
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.answer_display_text,
        sender: 'bot',
        timestamp: new Date(),
        citations: citations.length > 0 ? citations : undefined, // KORRIGIERT: Immer Citations hinzufügen wenn vorhanden
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
        content: errorMessageContent,
        sender: 'bot',
        timestamp: new Date(),
        isError: true,
      };
  
      const finalMessages = [...currentMessagesWithUser, errorMessage];
      setMessages(finalMessages);
  
      const finalUpdatedSession = { ...tempUpdatedSession, messages: finalMessages, updatedAt: new Date() };
      setCurrentSession(finalUpdatedSession);
      setSessions((prev) => prev.map((s) => (s.id === finalUpdatedSession.id ? finalUpdatedSession : s)));
    } finally {
      setIsLoading(false);
    }
  };

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
        chatMode, // NEU hinzugefügt
        setChatMode, // NEU hinzugefügt
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
