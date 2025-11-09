import React from 'react';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUser }) => {
  return (
    <div className={`chat-message ${isUser ? 'user' : 'ai'}`}>
      <div className="message-content">
        {message}
      </div>
    </div>
  );
};

