// Pfad: src/context/ChatContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from 'react';
import { Message, ChatSession, Citation, ChatMode } from '../types';

// ... (Interface-Definitionen bleiben gleich wie zuvor)

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
  // ... (Die Hooks und Funktionen von useState bis toggleCitationMode bleiben gleich)

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
  
    const sessionToUpdate = ensureSession();
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
    };
  
    const currentMessagesWithUser = [...sessionToUpdate.messages, userMessage];
    setMessages(currentMessagesWithUser);
  
    const tempUpdatedSession = { ...sessionToUpdate, messages: currentMessagesWithUser, updatedAt: new Date() };
    setCurrentSession(tempUpdatedSession);
    setSessions((prev) => prev.map((s) => (s.id === tempUpdatedSession.id ? tempUpdatedSession : s)));
    setIsLoading(true);
  
    try {
      // WICHTIG: Ersetze dies mit deiner aktuellsten, aktiven ngrok-URL!
      const apiUrl = 'https://DEINE_AKTUELLE_NGROK_URL/ask'; // <-- ANPASSEN!
  
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
          backendMode = "Standard";
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
          mode: backendMode,
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
      console.log('DEBUG: Rohe API Response:', data);
      
      // --- FINALE KORREKTUR HIER ---
      // Wir greifen auf die korrekten englischen Schlüssel zu, die dein Backend sendet.
      const citations: Citation[] = (data.sources_list || []).map((sourceItem: any, index: number) => ({
        id: `citation-${Date.now()}-${index}`,
        text: sourceItem.content || 'Kein Inhalt verfügbar.', // KORREKT: sourceItem.content
        source: sourceItem.source || 'Unbekannte Quelle',   // KORREKT: sourceItem.source
        url: sourceItem.metadata?.url || undefined,
      }));

      console.log('DEBUG: Finale Citations Array:', citations);
  
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.answer_display_text,
        sender: 'bot',
        timestamp: new Date(),
        citations: isCitationMode && citations.length > 0 ? citations : [],
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
      
      const finalMessages = [...currentMessagesWithUser, errorMessage];
      setMessages(finalMessages);
      const sessionWithError = { ...tempUpdatedSession, messages: finalMessages, updatedAt: new Date() };
      setCurrentSession(sessionWithError);
      setSessions((prev) => prev.map((s) => (s.id === sessionWithError.id ? sessionWithError : s)));
    } finally {
      setIsLoading(false);
    }
  };

  // ... (der Rest der Datei, inklusive exportChat und dem Provider, bleibt gleich)
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
        chatMode,
        setChatMode,
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
