import { NextRequest, NextResponse } from "next/server";
import { 
  REQUEST_TIMEOUT,
  fetchWithTimeout,
  isRetryableError,
  makeRequestWithRetry,
  INITIAL_RETRY_DELAY
} from '../../../utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { reqId: string } }
) {
  try {
    const { reqId } = params;
    const API_KEY = process.env.NVIDIA_MULTIMER_API_KEY;

    if (!API_KEY) {
      return NextResponse.json(
        { error: "NVIDIA Multimer API key not configured" },
        { status: 500 }
      );
    }

    const statusUrl = `https://health.api.nvidia.com/v1/status/${reqId}`;
    
    const requestOptions = {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Accept": "application/json",
        "NVCF-POLL-SECONDS": "5"
      },
      timeout: REQUEST_TIMEOUT
    };

    const response = await makeRequestWithRetry(statusUrl, requestOptions);

    const responseText = await response.text();
    
    try {
      const data = JSON.parse(responseText);
      
      if (response.status === 202) {
        // Still processing
        return NextResponse.json({
          status: 'pending',
          message: 'Structure prediction in progress',
          details: data
        }, { status: 202 });
      }
      
      if (!response.ok) {
        if (isRetryableError(response.status, data.type)) {
          const retryAfter = response.headers.get('Retry-After');
          const retryDelay = retryAfter ? parseInt(retryAfter) * 1000 : INITIAL_RETRY_DELAY;
          
          return NextResponse.json(
            { 
              error: "NVIDIA API is temporarily unavailable. Please try again later.",
              details: data,
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
        return NextResponse.json({
          error: data.message || data.error || 'Failed to check prediction status',
          details: data
        }, { status: response.status });
      }
      
      if (!data.output?.structure) {
        return NextResponse.json({
          error: 'Invalid response format: missing structure data',
          details: data
        }, { status: 422 });
      }
      
      return NextResponse.json({
        status: 'complete',
        pdb: data.output.structure
      });
      
    } catch (parseError) {
      console.error('Failed to parse status response:', parseError);
      return NextResponse.json({
        error: 'Invalid response from NVIDIA API',
        details: responseText
      }, { status: 502 });
    }
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to check prediction status',
      details: error
    }, { status: 500 });
  }
}