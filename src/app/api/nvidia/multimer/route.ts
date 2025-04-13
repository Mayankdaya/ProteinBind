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
} from "../utils";

interface MultiFoldPayload {
  sequences: string[];
  algorithm?: string;
  e_value?: number;
  iterations?: number;
  databases?: string[];
  relax_prediction?: boolean;
}

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

function validateSequences(sequences: string[]): void {
  if (!Array.isArray(sequences) || sequences.length === 0) {
    throw new Error("At least one protein sequence is required");
  }

  if (sequences.length > 5) {
    throw new Error("Maximum of 5 sequences allowed");
  }

  const validAminoAcids = /^[ACDEFGHIKLMNPQRSTVWY]+$/i;
  
  for (const [index, sequence] of sequences.entries()) {
    if (typeof sequence !== 'string' || !sequence.trim()) {
      throw new Error(`Invalid sequence at position ${index + 1}`);
    }

    if (sequence.length < 10 || sequence.length > 1500) {
      throw new Error(`Sequence ${index + 1} length must be between 10 and 1500 amino acids`);
    }

    if (!validAminoAcids.test(sequence)) {
      throw new Error(`Sequence ${index + 1} contains invalid characters. Only standard amino acid letters are allowed.`);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      sequences,
      algorithm = "jackhmmer",
      e_value = 0.0001,
      iterations = 1,
      databases = ["uniref90", "small_bfd", "mgnify"],
      relax_prediction = true
    } = await req.json() as MultiFoldPayload;

    // Validate sequences
    validateSequences(sequences);

    const nvcfKey = process.env.NVIDIA_MULTIMER_API_KEY;
    if (!nvcfKey) {
      console.error("NVIDIA API key not configured");
      return NextResponse.json(
        { error: "Internal server configuration error" },
        { status: 500 }
      );
    }

    const url = "https://health.api.nvidia.com/v1/biology/deepmind/alphafold2-multimer";
    
    const data = {
      sequences,
      algorithm,
      e_value,
      iterations,
      databases,
      relax_prediction
    };

    console.log("Sending request to NVIDIA Multimer API:", { 
      ...data, 
      sequences: sequences.map(seq => seq.slice(0, 20) + "...") 
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

    // Handle 202 Accepted response with polling
    if (response.status === 202) {
      const reqId = response.headers.get('nvcf-reqid');
      if (!reqId) {
        throw new Error('No request ID received for status polling');
      }

      // Return the polling URL and request ID
      return NextResponse.json({ 
        status: 'pending',
        reqId,
        message: 'Request accepted, structure prediction in progress'
      }, { status: 202 });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NVIDIA Multimer API error response:", errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        if (isRetryableError(response.status, errorJson.type)) {
          const retryAfter = response.headers.get('Retry-After');
          const retryDelay = retryAfter ? parseInt(retryAfter) * 1000 : INITIAL_RETRY_DELAY;
          
          return NextResponse.json(
            { 
              error: "NVIDIA Multimer API is temporarily unavailable. Please try again later.",
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
        throw new Error(errorJson.message || errorJson.error || errorJson.detail || 'NVIDIA Multimer API request failed');
      } catch {
        throw new Error(`NVIDIA Multimer API request failed: ${response.status} ${response.statusText}\n${errorText}`);
      }
    }

    const result = await response.json();
    
    if (!result.output?.structure) {
      console.error("No structure data in response:", result);
      throw new Error("No structure data in response");
    }

    return NextResponse.json({ pdb: result.output.structure });
  } catch (error) {
    console.error("AlphaFold2-Multimer API error:", error);
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