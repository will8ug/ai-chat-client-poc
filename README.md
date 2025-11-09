# AI Chat Client PoC

A simple React + TypeScript frontend application for chatting with AI, supporting both streaming and non-streaming responses.

## Features

- **Non-streaming Chat**: Traditional request-response chat interface
- **Streaming Chat**: Real-time streaming chat using RxJS and Server-Sent Events (SSE)
- **Modern UI**: Clean, responsive design with gradient themes

## Technology Stack

- **TypeScript**: Type-safe development
- **React**: UI framework
- **RxJS**: Reactive programming for streaming responses
- **Vite**: Fast build tool and development server

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Backend API running on `http://localhost:8080`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

