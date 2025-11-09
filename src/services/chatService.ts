import { Observable } from 'rxjs';
import { ChatRequest, ChatResponse } from '../types/api';

const API_BASE_URL = '/api';

/**
 * Non-streaming chat API
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Streaming chat API using RxJS Observable
 * Handles Server-Sent Events (SSE) format from the backend
 */
export function sendStreamingChatMessage(request: ChatRequest): Observable<string> {
  return new Observable<string>((subscriber) => {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let cancelled = false;

    fetch(`${API_BASE_URL}/chat/streaming`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Streaming chat API error: ${response.statusText}`);
        }

        reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          subscriber.error(new Error('No response body'));
          return;
        }

        let buffer = '';

        try {
          while (!cancelled) {
            const { done, value } = await reader.read();

            if (done) {
              // Process any remaining buffer
              if (buffer.trim()) {
                const lines = buffer.split('\n');
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = line.substring(6).trim();
                      if (data) {
                        const parsed: ChatResponse = JSON.parse(data);
                        subscriber.next(parsed.content);
                      }
                    } catch (e) {
                      // Skip invalid JSON lines
                    }
                  }
                }
              }
              subscriber.complete();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            // Keep the last incomplete line in buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = line.substring(6).trim();
                  if (data) {
                    const parsed: ChatResponse = JSON.parse(data);
                    subscriber.next(parsed.content);
                  }
                } catch (e) {
                  // Skip invalid JSON lines
                }
              }
            }
          }
        } catch (error) {
          if (!cancelled) {
            subscriber.error(error);
          }
        } finally {
          if (reader) {
            try {
              reader.releaseLock();
            } catch (e) {
              // Ignore errors when releasing lock
            }
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          subscriber.error(error);
        }
      });

    // Cleanup function
    return () => {
      cancelled = true;
      if (reader) {
        reader.cancel().catch(() => {
          // Ignore cancel errors
        });
      }
    };
  });
}

