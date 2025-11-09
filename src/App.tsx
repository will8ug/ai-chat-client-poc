import React, { useState } from 'react';
import { NonStreamingChat } from './components/NonStreamingChat';
import { StreamingChat } from './components/StreamingChat';
import './App.css';

type ChatMode = 'non-streaming' | 'streaming';

function App() {
  const [mode, setMode] = useState<ChatMode>('non-streaming');

  return (
    <div className="app">
      <div className="app-header">
        <h1>AI Chat Client</h1>
        <div className="mode-selector">
          <button
            className={`mode-button ${mode === 'non-streaming' ? 'active' : ''}`}
            onClick={() => setMode('non-streaming')}
          >
            Non-Streaming
          </button>
          <button
            className={`mode-button ${mode === 'streaming' ? 'active' : ''}`}
            onClick={() => setMode('streaming')}
          >
            Streaming
          </button>
        </div>
      </div>
      <div className="app-content">
        {mode === 'non-streaming' ? <NonStreamingChat /> : <StreamingChat />}
      </div>
    </div>
  );
}

export default App;

