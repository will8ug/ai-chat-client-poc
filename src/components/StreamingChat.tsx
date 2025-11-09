import React, { useState, useEffect, useRef } from 'react';
import { sendStreamingChatMessage } from '../services/chatService';
import { ChatMessage } from './ChatMessage';
import { Subscription } from 'rxjs';

interface Message {
  text: string;
  isUser: boolean;
}

export const StreamingChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const subscriptionRef = useRef<Subscription | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup subscription on unmount
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  const handleSend = () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { text: userMessage, isUser: true }]);
    setLoading(true);
    setStreamingMessage('');

    // Unsubscribe from previous subscription if exists
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    let accumulatedContent = '';

    const subscription = sendStreamingChatMessage({ message: userMessage }).subscribe({
      next: (content) => {
        accumulatedContent += content;
        setStreamingMessage(accumulatedContent);
      },
      error: (error) => {
        setMessages((prev) => [
          ...prev,
          { text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, isUser: false },
        ]);
        setLoading(false);
        setStreamingMessage('');
      },
      complete: () => {
        if (accumulatedContent) {
          setMessages((prev) => [...prev, { text: accumulatedContent, isUser: false }]);
        }
        setLoading(false);
        setStreamingMessage('');
      },
    });

    subscriptionRef.current = subscription;
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
        <h2>Streaming Chat</h2>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && !streamingMessage && (
          <div className="empty-state">
            Start a conversation with the AI assistant (streaming mode)
          </div>
        )}
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg.text} isUser={msg.isUser} />
        ))}
        {streamingMessage && (
          <div className="chat-message ai">
            <div className="message-content streaming">
              {streamingMessage}
              <span className="cursor">▋</span>
            </div>
          </div>
        )}
        {loading && !streamingMessage && (
          <div className="chat-message ai">
            <div className="message-content loading">
              <span className="typing-indicator">Connecting...</span>
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

