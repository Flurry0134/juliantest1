// Pfad: src/components/chat/MessageBubble.tsx
import React, { useState } from 'react';
import { Message } from '../../types';
import { ThumbsUp, ThumbsDown, Link as LinkIcon, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const isUserMessage = message.sender === 'user';
  const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedback(type);
    console.log(`User gave ${type} feedback for message: ${message.id}`);
  };

  return (
    <div className={`flex items-end gap-2 ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
      <div  
        className={`max-w-[80%] rounded-lg px-4 py-3 shadow-md ${
          isUserMessage 
            ? 'bg-blue-600 text-white rounded-br-none' 
            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
        }`}
      >
        {/* KORREKTUR: Markdown-Rendering für den Nachrichteninhalt */}
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ol:my-2 prose-ul:my-2">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
        
        {/* KORREKTUR: Quellen (Citations) werden hier gerendert */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-500">
            <h4 className="text-xs font-semibold mb-2 opacity-80">
              Sources:
            </h4>
            <ul className="space-y-1.5 list-none p-0 m-0">
              {message.citations.map((citation) => (
                <li key={citation.id} className="text-xs flex items-center gap-2">
                  <LinkIcon size={12} className="opacity-60 flex-shrink-0" />
                  <span className="opacity-90">{citation.source}</span>
                  {citation.url && (
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-400 hover:text-blue-300"
                      title="Quelle öffnen"
                    >
                      <ExternalLink size={12} className="ml-1" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mt-1 text-right">
          <span className="text-xs opacity-70">{time}</span>
        </div>
      </div>
      
      {!isUserMessage && (
        <div className="ml-2 flex flex-col justify-end">
          {/* Feedback Buttons */}
          <div className="flex space-x-1">
            <button
              onClick={() => handleFeedback('positive')}
              className={`p-1 rounded-md ${feedback === 'positive' ? 'text-green-600 bg-green-100' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ThumbsUp size={14} />
            </button>
            <button
              onClick={() => handleFeedback('negative')}
              className={`p-1 rounded-md ${feedback === 'negative' ? 'text-red-600 bg-red-100' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ThumbsDown size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
