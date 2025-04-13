import { NextResponse } from 'next/server';

const STATUS_URL = 'https://health.api.nvidia.com/v1/status';

interface NVIDIAError {
  message: string;
  code?: string;
  details?: any;
}

export async function GET(
  request: Request,
  { params }: { params: { reqId: string } }
) {
  try {
    const apiKey = process.env.NVCF_RUN_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'NVIDIA API key not configured',
          code: 'AUTH_ERROR',
          details: 'Please configure the NVCF_RUN_KEY environment variable'
        },
        { status: 500 }
      );
    }

    const { reqId } = params;
    if (!reqId || reqId.includes('/') || reqId.includes('\\')) {
      return NextResponse.json(
        { 
          error: 'Invalid request ID',
          code: 'VALIDATION_ERROR',
          details: 'A valid request ID must be provided'
        },
        { status: 400 }
      );
    }

    try {
      // Make request to NVIDIA API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${STATUS_URL}/${reqId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'NVCF-POLL-SECONDS': '5'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      let data;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse NVIDIA Status API response:', responseText);
        return NextResponse.json(
          {
            error: 'Invalid JSON response from NVIDIA Status API',
            code: 'NVIDIA_RESPONSE_ERROR',
            details: {
              responseText,
              parseError: e instanceof Error ? e.message : 'Unknown parsing error'
            }
          },
          { status: 502 }
        );
      }

      if (!response.ok) {
        const errorResponse: NVIDIAError = {
          message: data?.message || 'Failed to fetch prediction status',
          code: 'NVIDIA_API_ERROR',
          details: {
            responseData: data,
            statusCode: response.status,
            statusText: response.statusText
          }
        };

        // Handle specific NVIDIA API error cases
        if (response.status === 401) {
          errorResponse.code = 'NVIDIA_AUTH_ERROR';
          errorResponse.message = 'Invalid or expired NVIDIA API key';
        } else if (response.status === 404) {
          errorResponse.code = 'NVIDIA_NOT_FOUND';
          errorResponse.message = 'Prediction request not found';
        } else if (response.status === 429) {
          errorResponse.code = 'NVIDIA_RATE_LIMIT';
          errorResponse.message = 'NVIDIA API rate limit exceeded';
        } else if (response.status >= 500) {
          errorResponse.code = 'NVIDIA_SERVER_ERROR';
          errorResponse.message = 'NVIDIA API service unavailable';
        }

        console.error('NVIDIA Status API Error:', errorResponse);
        return NextResponse.json(errorResponse, { status: response.status });
      }

      if (response.status === 200 && data.pdb) {
        // Job completed successfully
        return NextResponse.json({
          status: 'completed',
          pdb: data.pdb,
          message: 'Prediction completed successfully'
        });
      } else if (response.status === 202) {
        // Job still running
        const progress = data.progress || 0;
        const stage = data.stage || 'Processing';
        return NextResponse.json({
          status: 'pending',
          progress,
          stage,
          message: `Prediction in progress: ${stage} (${Math.round(progress)}%)`
        });
      } else if (data.error) {
        // Prediction failed
        return NextResponse.json({
          status: 'failed',
          error: data.error,
          code: 'PREDICTION_FAILED',
          details: data
        });
      } else {
        throw new Error('Invalid response format from NVIDIA API');
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { 
            error: 'NVIDIA API request timed out',
            code: 'TIMEOUT_ERROR',
            details: 'The status check request took too long to complete'
          },
          { status: 504 }
        );
      }
      throw error;
    }

  } catch (error) {
    console.error('Error checking prediction status:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}