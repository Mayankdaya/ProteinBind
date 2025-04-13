// Common API utilities and constants

// Retry configuration
export const MAX_RETRIES = 3;
export const INITIAL_RETRY_DELAY = 1000; // 1 second
export const MAX_RETRY_DELAY = 10000; // 10 seconds
export const REQUEST_TIMEOUT = 30000; // 30 seconds

// Queue for rate limiting
class RequestQueue {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;
  private rateLimit = 3; // requests per second
  private interval = 1000 / this.rateLimit;
  private lastRequestTime = 0;

  async enqueue<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.executeWithRateLimit(request);
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

  private async executeWithRateLimit<T>(request: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.interval) {
      await new Promise(resolve => setTimeout(resolve, this.interval - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
    return request();
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        await request();
      }
    }
    this.processing = false;
  }
}

export const requestQueue = new RequestQueue();

// Utility for handling retries with exponential backoff
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const calculateBackoff = (attempt: number, initial = INITIAL_RETRY_DELAY, max = MAX_RETRY_DELAY) => {
  const backoff = Math.min(initial * Math.pow(2, attempt), max);
  const jitter = Math.random() * 100;
  return backoff + jitter;
};

export const isRetryableError = (error: any): boolean => {
  if (error?.response?.status) {
    const status = error.response.status;
    return status === 429 || (status >= 500 && status <= 599);
  }
  return true;
};

export const fetchWithTimeout = async (url: string, options: RequestInit & { timeout?: number } = {}) => {
  const { timeout = REQUEST_TIMEOUT, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};