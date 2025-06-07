import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
// Das "Zap" Icon für den Fallback-Modus wird nicht mehr benötigt
import { Download, FileJson, Brackets, Languages, RefreshCw, Brain, BookOpen } from 'lucide-react';
import type { ChatMode } from '../../context/ChatContext';

const ChatHeader: React.FC = () => {
  const { 
    currentSession, 
    isCitationMode, 
    toggleCitationMode, 
    exportChat, 
    createNewSession, 
    chatMode,
    setChatMode 
  } = useChat();
  const { language, setLanguage } = useTheme();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = (format: 'pdf' | 'txt' | 'json') => {
    exportChat(format);
    setShowExportMenu(false);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'de' : 'en');
  };

  const handleResetChat = () => {
    if (window.confirm(language === 'en' ? 'Are you sure you want to reset the chat?' : 'Möchten Sie den Chat wirklich zurücksetzen?')) {
      createNewSession();
    }
  };
  
  // KORREKTUR: Vereinfachte Logik, um nur zwischen zwei Modi umzuschalten
  const toggleChatMode = () => {
    // Schaltet einfach zwischen 'knowledgebase' und 'llm' hin und her
    const nextMode = chatMode === 'knowledgebase' ? 'llm' : 'knowledgebase';
    setChatMode(nextMode);
  };

  // KORREKTUR: Konfiguration für nur noch zwei Modi
  const getChatModeConfig = () => {
    switch (chatMode) {
      case 'llm':
        return {
          color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          icon: <Brain size={18} />,
          tooltip: language === 'en' ? 'LLM Mode (General AI)' : 'LLM-Modus (Allgemeines KI-Wissen)',
        };
      case 'knowledgebase':
      default: // 'knowledgebase' ist jetzt der Standardfall
        return {
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
          icon: <BookOpen size={18} />,
          tooltip: language === 'en' ? 'Knowledge Base Only' : 'Nur Wissensdatenbank',
        };
    }
  };

  const modeConfig = getChatModeConfig();

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 py-2 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {currentSession?.title || 'New Chat'}
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Sprachumschalter */}
          <button
            onClick={toggleLanguage}
            className="p-2 rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 group relative"
            title={language === 'en' ? 'Switch to German' : 'Zu Englisch wechseln'}
          >
            <Languages size={18} />
          </button>
          
          {/* Angepasster Modus-Umschalt-Button */}
          <button
            onClick={toggleChatMode} // KORREKTUR: Ruft die neue Umschaltfunktion auf
            className={`p-2 rounded-md transition-colors group relative ${modeConfig.color}`}
            title={modeConfig.tooltip}
          >
            {modeConfig.icon}
            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {modeConfig.tooltip}
            </span>
          </button>
          
          {/* Andere Buttons bleiben unverändert */}
          <button
            onClick={toggleCitationMode}
            className={`p-2 rounded-md transition-colors group relative ${
              isCitationMode
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            title={language === 'en' ? 'Toggle citation mode' : 'Zitationsmodus umschalten'}
          >
            <Brackets size={18} />
          </button>

          <button
            onClick={handleResetChat}
            className="p-2 rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 group relative"
            title={language === 'en' ? 'Reset Chat' : 'Chat zurücksetzen'}
          >
            <RefreshCw size={18} />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 group relative"
              title={language === 'en' ? 'Export chat' : 'Chat exportieren'}
            >
              <Download size={18} />
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleExport('json')}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <FileJson size={16} className="mr-2" />
                  {language === 'en' ? 'Export as JSON' : 'Als JSON exportieren'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
