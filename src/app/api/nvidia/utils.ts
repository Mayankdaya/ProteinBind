export const MAX_RETRIES = 3;
export const INITIAL_RETRY_DELAY = 1000; // 1 second
export const MAX_RETRY_DELAY = 10000; // 10 seconds
export const REQUEST_TIMEOUT = 300000; // 5 minutes

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeout?: number;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function calculateBackoff(attempt: number, initialDelay: number, maxDelay: number): number {
  const backoff = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
  // Add some randomness to prevent multiple retries from syncing
  return backoff + Math.random() * 1000;
}

export function isRetryableError(status: number, errorType?: string): boolean {
  // Network errors or server errors (5xx)
  if (status >= 500) return true;
  
  // Rate limiting (429)
  if (status === 429) return true;
  
  // Specific error types that should be retried
  const retryableTypes = [
    'ServiceUnavailable',
    'InternalError',
    'TemporaryFailure',
    'NetworkError',
    'TimeoutError'
  ];
  
  return errorType ? retryableTypes.includes(errorType) : false;
}

export function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;
  
  return Promise.race([
    fetch(url, fetchOptions),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), timeout)
    )
  ]);
}

// Simple request queue to prevent overwhelming the API
class RequestQueue {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;

  async enqueue<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Error processing queued request:', error);
        }
        // Add a small delay between requests
        await delay(100);
      }
    }
    this.processing = false;
  }
}

export const requestQueue = new RequestQueue();