import { Observable } from 'rxjs';
import { ChatRequest, ChatResponse } from '../types/api';

const API_BASE_URL = '/api';

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
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`Streaming chat API error: ${response.status} ${errorText}`);
        }

        // Verify content type
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('text/event-stream')) {
          console.warn(`Unexpected content-type: ${contentType}, expected text/event-stream`);
        }

        const responseBody = response.body;
        if (!responseBody) {
          subscriber.error(new Error('No response body'));
          return;
        }

        reader = responseBody.getReader();
        const decoder = new TextDecoder();

        let buffer = '';
        let processedIndex = 0; // Track how much of the buffer we've processed

        // Find and parse complete JSON objects in the buffer
        const extractAndEmitJSON = (text: string, startFrom: number = 0): number => {
          let lastProcessed = startFrom;
          
          // Look for complete JSON objects starting from startFrom
          let searchStart = text.indexOf('{', startFrom);
          
          while (searchStart !== -1 && searchStart < text.length) {
            // Skip if it's part of a comment or metadata line
            if (text.lastIndexOf('\n', searchStart) !== -1) {
              const lineStart = text.lastIndexOf('\n', searchStart) + 1;
              const linePrefix = text.substring(lineStart, searchStart).trim();
              if (linePrefix.startsWith(':') || 
                  linePrefix.startsWith('event:') || 
                  linePrefix.startsWith('id:') || 
                  linePrefix.startsWith('retry:')) {
                searchStart = text.indexOf('{', searchStart + 1);
                continue;
              }
            }
            
            // Find the end of this JSON object
            let depth = 0;
            let end = searchStart;
            let inString = false;
            let escapeNext = false;
            
            for (let i = searchStart; i < text.length; i++) {
              const char = text[i];
              
              if (escapeNext) {
                escapeNext = false;
                continue;
              }
              
              if (char === '\\') {
                escapeNext = true;
                continue;
              }
              
              if (char === '"') {
                inString = !inString;
                continue;
              }
              
              if (!inString) {
                if (char === '{') {
                  depth++;
                } else if (char === '}') {
                  depth--;
                  if (depth === 0) {
                    end = i + 1;
                    break;
                  }
                }
              }
            }
            
            // If we found a complete JSON object
            if (depth === 0 && end > searchStart) {
              try {
                // Extract the JSON string
                const jsonStr = text.substring(searchStart, end);
                
                const parsed = JSON.parse(jsonStr) as ChatResponse;
                if (parsed && typeof parsed === 'object' && parsed.content) {
                  const content = parsed.content;
                  
                  // Emit content immediately for token-level streaming
                  // If backend sends large chunks, we still emit them as-is since
                  // the real-time processing (not waiting for newlines) ensures
                  // we get content as soon as it arrives
                  subscriber.next(content);
                  lastProcessed = end;
                }
              } catch (e) {
                // Not valid JSON, skip this position
                lastProcessed = searchStart + 1;
              }
            } else {
              // Incomplete JSON, stop processing for now
              break;
            }
            
            // Look for the next JSON object
            searchStart = text.indexOf('{', end);
          }
          
          return lastProcessed;
        };

        try {
          while (!cancelled) {
            const { done, value } = await reader.read();

            if (done) {
              // Process any remaining data in buffer
              if (buffer.length > processedIndex) {
                extractAndEmitJSON(buffer, processedIndex);
              }
              subscriber.complete();
              break;
            }

            // Decode the chunk and add to buffer immediately
            buffer += decoder.decode(value, { stream: true });
            
            // Try to extract and emit complete JSON objects as soon as they're available
            // This allows token-level streaming instead of waiting for complete lines
            const newProcessedIndex = extractAndEmitJSON(buffer, processedIndex);
            
            // Clean up processed data from buffer (keep only recent unprocessed data)
            // Keep a reasonable buffer size (last 10KB) to avoid memory issues
            if (buffer.length > 10000 && newProcessedIndex > 5000) {
              buffer = buffer.substring(newProcessedIndex);
              processedIndex = 0;
            } else {
              processedIndex = newProcessedIndex;
            }
          }
        } catch (error) {
          if (!cancelled) {
            console.error('Streaming error:', error);
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
          console.error('Fetch error:', error);
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

