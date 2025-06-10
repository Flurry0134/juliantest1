// In src/context/ChatContext.tsx

// ... (Rest deines Codes bleibt gleich) ...

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
  
    const tempUpdatedSession = { ...sessionToUpdate, messages: currentMessagesWithUser, updatedAt: new Date() };
    setCurrentSession(tempUpdatedSession);
    setSessions((prev) => prev.map((s) => (s.id === tempUpdatedSession.id ? tempUpdatedSession : s)));
    setIsLoading(true);
  
    try {
      // WICHTIG: Ersetze dies mit deiner aktuellsten, aktiven ngrok-URL!
      const apiUrl = 'https://b8c7-78-42-249-25.ngrok-free.app/ask';
  
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
  
      // --- KORREKTUR HIER: Schlüsselnamen angepasst ---
      // Das Backend sendet "Quelle" und "Inhalt (Auszug)"
      const citations: Citation[] = (data.sources_list || []).map((source: any, index: number) => ({
        id: `citation-${Date.now()}-${index}`,
        text: source["Inhalt (Auszug)"] || 'Kein Inhalt verfügbar.', // Greife auf "Inhalt (Auszug)" zu
        source: source["Quelle"] || 'Unbekannte Quelle',             // Greife auf "Quelle" zu
        url: undefined, // URL wird vom Backend aktuell nicht geliefert
      }));

      console.log('DEBUG: Finale Citations Array:', citations);
  
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.answer_display_text,
        sender: 'bot',
        timestamp: new Date(),
        citations: isCitationMode && citations.length > 0 ? citations : [], // Sicherstellen, dass immer ein Array übergeben wird
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
  
      const finalUpdatedSession = { ...tempUpdatedSession, messages: finalMessages, updatedAt: new Date() };
      setCurrentSession(finalUpdatedSession);
      setSessions((prev) => prev.map((s) => (s.id === finalUpdatedSession.id ? finalUpdatedSession : s)));
    } finally {
      setIsLoading(false);
    }
  }; // Ende der sendMessage Funktion
