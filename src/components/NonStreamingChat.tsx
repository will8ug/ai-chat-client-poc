import React, { useState } from 'react';
import { sendChatMessage } from '../services/chatService';
import { ChatMessage } from './ChatMessage';

interface Message {
  text: string;
  isUser: boolean;
}

export const NonStreamingChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { text: userMessage, isUser: true }]);
    setLoading(true);

    try {
      const response = await sendChatMessage({ message: userMessage });
      setMessages((prev) => [...prev, { text: response.content, isUser: false }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, isUser: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Non-Streaming Chat</h2>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            Start a conversation with the AI assistant
          </div>
        )}
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg.text} isUser={msg.isUser} />
        ))}
        {loading && (
          <div className="chat-message ai">
            <div className="message-content loading">
              <span className="typing-indicator">Thinking...</span>
            </div>
          </div>
        )}
      </div>
      <div className="chat-input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={loading}
          className="chat-input"
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} className="send-button">
          Send
        </button>
      </div>
    </div>
  );
};

