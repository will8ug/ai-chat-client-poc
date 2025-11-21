import React, { useState, useEffect, useRef } from 'react';
import { sendStreamingChatMessage, StreamingChunk } from '../services/chatService';
import { ChatMessage } from './ChatMessage';
import { Subscription } from 'rxjs';

interface Message {
  text: string;
  reasoningText?: string;
  isUser: boolean;
}

export const StreamingChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const subscriptionRef = useRef<Subscription | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMessage, streamingReasoning]);

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
    setStreamingReasoning('');

    // Unsubscribe from previous subscription if exists
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    let accumulatedContent = '';
    let accumulatedReasoning = '';

    const subscription = sendStreamingChatMessage({ message: userMessage }).subscribe({
      next: (chunk: StreamingChunk) => {
        if (chunk.content !== undefined) {
          // Handle empty strings properly - don't show "null" or "undefined"
          accumulatedContent += chunk.content || '';
          setStreamingMessage(accumulatedContent);
        }
        if (chunk.reasoningContent !== undefined) {
          // Handle empty strings properly - don't show "null" or "undefined"
          accumulatedReasoning += chunk.reasoningContent || '';
          setStreamingReasoning(accumulatedReasoning);
        }
      },
      error: (error) => {
        setMessages((prev) => [
          ...prev,
          { text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, isUser: false },
        ]);
        setLoading(false);
        setStreamingMessage('');
        setStreamingReasoning('');
      },
      complete: () => {
        // Always save the message, even if both are empty (to show empty columns)
        setMessages((prev) => [...prev, { 
          text: accumulatedContent || '', 
          reasoningText: accumulatedReasoning || undefined,
          isUser: false 
        }]);
        setLoading(false);
        setStreamingMessage('');
        setStreamingReasoning('');
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
      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.length === 0 && streamingMessage === '' && streamingReasoning === '' && !loading && (
          <div className="empty-state">
            Start a conversation with the AI assistant (streaming mode)
          </div>
        )}
        {messages.map((msg, index) => (
          <ChatMessage 
            key={index} 
            message={msg.text} 
            reasoningText={msg.reasoningText}
            isUser={msg.isUser} 
          />
        ))}
        {(streamingMessage !== '' || streamingReasoning !== '' || loading) && (
          <div className="chat-message ai">
            <div className="message-columns">
              <div className="message-column content-column">
                <div className="column-label">Answer</div>
                {loading && streamingMessage === '' ? (
                  <div className="message-content loading">
                    <span className="typing-indicator">Thinking...</span>
                  </div>
                ) : (
                  <div className="message-content streaming">
                    {streamingMessage || ''}
                    {streamingMessage !== '' && <span className="cursor">▋</span>}
                  </div>
                )}
              </div>
              <div className="message-column reasoning-column">
                <div className="column-label">Reasoning</div>
                {loading && streamingReasoning === '' ? (
                  <div className="reasoning-content loading">
                    <span className="typing-indicator">Thinking...</span>
                  </div>
                ) : (
                  <div className="reasoning-content streaming">
                    {streamingReasoning || ''}
                    {streamingReasoning !== '' && <span className="cursor">▋</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
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

