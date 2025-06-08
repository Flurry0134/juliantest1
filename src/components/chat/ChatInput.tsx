import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useFiles } from '../../context/FileContext';
import { Send, PaperclipIcon } from 'lucide-react';

const ChatInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const { sendMessage, isLoading } = useChat();
  const { toggleUploadOverlay } = useFiles();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Zuerst zurücksetzen
      // Setze die Höhe auf die scrollHeight, um das Textfeld zu vergrößern
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Verhindert das Standardverhalten des Formulars
    if (!message.trim() || isLoading) return;
    
    sendMessage(message);
    setMessage('');
  };

  // --- ANPASSUNG HIER ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Wenn die Shift-Taste gedrückt ist, während Enter gedrückt wird,
    // erlaube den normalen Zeilenumbruch und sende nicht.
    if (e.key === 'Enter' && e.shiftKey) {
      return;
    }
    
    // Wenn NUR die Enter-Taste gedrückt wird (ohne Shift, Ctrl, Alt),
    // sende die Nachricht.
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault(); // Verhindert, dass ein Zeilenumbruch in die Textarea eingefügt wird.
      handleSubmit(e);    // Rufe die Submit-Funktion auf.
    }
  };

  return (
    // Das form-Element ist wichtig, damit `onSubmit` funktioniert.
    <form onSubmit={handleSubmit} className="flex items-end space-x-2">
      <div className="flex-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown} // Der angepasste Handler wird hier verwendet
          // --- ANPASSUNG HIER: Platzhalter-Text geändert ---
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          className="w-full px-4 py-2 resize-none outline-none focus:ring-0 bg-transparent text-gray-800 dark:text-white"
          rows={1}
          maxLength={4000}
          disabled={isLoading}
        />
      </div>
      
      <button
        type="button"
        onClick={toggleUploadOverlay}
        className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-600"
        title="Upload file"
      >
        <PaperclipIcon size={20} />
      </button>
      
      <button
        type="submit"
        disabled={!message.trim() || isLoading}
        className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Send size={20} />
      </button>
    </form>
  );
};

export default ChatInput;
