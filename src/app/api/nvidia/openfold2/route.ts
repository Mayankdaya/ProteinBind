import { NextRequest, NextResponse } from "next/server";
import { 
  MAX_RETRIES, 
  INITIAL_RETRY_DELAY, 
  MAX_RETRY_DELAY,
  REQUEST_TIMEOUT,
  delay,
  isRetryableError,
  calculateBackoff,
  fetchWithTimeout,
  requestQueue
} from '../utils';

async function makeRequestWithRetry(url: string, options: RequestInit, retries: number = 0): Promise<Response> {
  return requestQueue.enqueue(async () => {
    try {
      const response = await fetchWithTimeout(url, options);
      let errorType: string | undefined;
      
      if (!response.ok) {
        try {
          const errorJson = await response.clone().json();
          errorType = errorJson.type;
        } catch {}
        
        if (isRetryableError(response.status, errorType) && retries < MAX_RETRIES) {
          const backoffDelay = calculateBackoff(retries, INITIAL_RETRY_DELAY, MAX_RETRY_DELAY);
          console.log(`Attempt ${retries + 1} failed, retrying in ${backoffDelay/1000} seconds...`);
          await delay(backoffDelay);
          return makeRequestWithRetry(url, options, retries + 1);
        }
      }
      
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      if (retries < MAX_RETRIES) {
        const backoffDelay = calculateBackoff(retries, INITIAL_RETRY_DELAY, MAX_RETRY_DELAY);
        console.log(`Network error on attempt ${retries + 1}, retrying in ${backoffDelay/1000} seconds...`);
        await delay(backoffDelay);
        return makeRequestWithRetry(url, options, retries + 1);
      }
      throw error;
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const { sequence } = await req.json();

    // Validate sequence
    if (!sequence || typeof sequence !== 'string') {
      return NextResponse.json(
        { error: "A valid protein sequence is required" },
        { status: 400 }
      );
    }

    // Validate sequence length (NVIDIA API limits)
    if (sequence.length > 1500 || sequence.length < 10) {
      return NextResponse.json(
        { error: "Sequence length must be between 10 and 1500 amino acids" },
        { status: 400 }
      );
    }

    // Validate sequence format (only contains valid amino acid characters)
    const validAminoAcids = /^[ACDEFGHIKLMNPQRSTVWY]+$/i;
    if (!validAminoAcids.test(sequence)) {
      return NextResponse.json(
        { error: "Sequence contains invalid characters. Only standard amino acid letters are allowed." },
        { status: 400 }
      );
    }

    const nvcfKey = process.env.NVIDIA_API_KEY;
    if (!nvcfKey) {2
      console.error("NVIDIA API key not configured");
      return NextResponse.json(
        { error: "Internal server configuration error" },
        { status: 500 }
      );
    }

    const url = "https://health.api.nvidia.com/v1/biology/openfold/openfold2/predict-structure-from-msa-and-template";
    
    const data = {
      sequence
    };

    console.log("Sending request to NVIDIA OpenFold2 API:", { 
      sequence: sequence.slice(0, 20) + "..." 
    });

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${nvcfKey}`,
        "NVCF-POLL-SECONDS": "300"
      },
      body: JSON.stringify(data),
      timeout: REQUEST_TIMEOUT
    };

    const response = await makeRequestWithRetry(url, requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NVIDIA OpenFold2 API error response:", errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        if (isRetryableError(response.status, errorJson.type)) {
          const retryAfter = response.headers.get('Retry-After');
          const retryDelay = retryAfter ? parseInt(retryAfter) * 1000 : INITIAL_RETRY_DELAY;
          
          return NextResponse.json(
            { 
              error: "NVIDIA OpenFold2 API is temporarily unavailable. Please try again later.",
              details: errorJson,
              retryAfter: Math.ceil(retryDelay/1000)
            },
            { 
              status: 503,
              headers: {
                'Retry-After': String(Math.ceil(retryDelay/1000))
              }
            }
          );
        }
        throw new Error(errorJson.message || errorJson.error || errorJson.detail || 'NVIDIA OpenFold2 API request failed');
      } catch {
        throw new Error(`NVIDIA OpenFold2 API request failed: ${response.status} ${response.statusText}\n${errorText}`);
      }
    }

    const result = await response.json();
    
    if (!result.output?.structure) {
      console.error("No structure data in response:", result);
      throw new Error("No structure data in response");
    }

    return NextResponse.json({ pdb: result.output.structure });
  } catch (error) {
    console.error("OpenFold2 API error:", error);
    const message = error instanceof Error ? error.message : "Failed to predict structure";
    const status = message.includes('timed out') ? 504 : 500;
    
    return NextResponse.json(
      { 
        error: message,
        retryAfter: Math.ceil(INITIAL_RETRY_DELAY/1000)
      },
      { 
        status,
        headers: {
          'Retry-After': String(Math.ceil(INITIAL_RETRY_DELAY/1000))
        }
      }
    );
  }
}