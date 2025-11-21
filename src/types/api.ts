export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  content: string;
  reasoningContent?: string;
}

