import React from 'react';

interface ChatMessageProps {
  message: string;
  reasoningText?: string;
  isUser: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, reasoningText, isUser }) => {
  // For user messages, show single column. For AI messages, show 2 columns
  if (isUser) {
    return (
      <div className={`chat-message ${isUser ? 'user' : 'ai'}`}>
        <div className="message-content">
          {message || ''}
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-message ${isUser ? 'user' : 'ai'}`}>
      <div className="message-columns">
        <div className="message-column content-column">
          <div className="column-label">Answer</div>
          <div className="message-content">
            {message || ''}
          </div>
        </div>
        <div className="message-column reasoning-column">
          <div className="column-label">Reasoning</div>
          <div className="reasoning-content">
            {reasoningText || ''}
          </div>
        </div>
      </div>
    </div>
  );
};

