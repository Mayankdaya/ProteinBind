import { NextResponse } from 'next/server';

const NVIDIA_API_URL = 'https://health.api.nvidia.com/v1/biology/deepmind/alphafold2-multimer';

interface NVIDIAError {
  message: string;
  code?: string;
  details?: any;
}

export async function POST(request: Request) {
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

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body',
          code: 'JSON_PARSE_ERROR',
          details: e instanceof Error ? e.message : 'Failed to parse request body'
        },
        { status: 400 }
      );
    }

    const { sequences, algorithm, e_value, iterations, databases, relax_prediction } = body;

    // Enhanced input validation
    if (!sequences || !Array.isArray(sequences)) {
      return NextResponse.json(
        { 
          error: 'Invalid sequences format',
          code: 'VALIDATION_ERROR',
          details: 'Sequences must be provided as an array'
        },
        { status: 400 }
      );
    }

    if (sequences.length === 0) {
      return NextResponse.json(
        { 
          error: 'Empty sequences array',
          code: 'VALIDATION_ERROR',
          details: 'At least one protein sequence is required'
        },
        { status: 400 }
      );
    }

    // Validate sequence format
    const invalidSequences = sequences.filter(seq => !/^[ACDEFGHIKLMNPQRSTVWY\*\-\s]+$/i.test(seq));
    if (invalidSequences.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid sequence format',
          code: 'VALIDATION_ERROR',
          details: 'Sequences must only contain valid amino acid letters, gaps (-) or terminations (*)'
        },
        { status: 400 }
      );
    }

    // Validate sequence length
    const invalidLengthSequences = sequences.filter(seq => seq.length < 10 || seq.length > 2000);
    if (invalidLengthSequences.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid sequence length',
          code: 'VALIDATION_ERROR',
          details: 'Sequence length must be between 10 and 2000 amino acids'
        },
        { status: 400 }
      );
    }

    try {
      const requestBody = JSON.stringify({
        sequences,
        algorithm: algorithm || 'jackhmmer',
        e_value: e_value || 0.0001,
        iterations: iterations || 1,
        databases: databases || ['uniref90', 'small_bfd', 'mgnify'],
        relax_prediction: relax_prediction !== undefined ? relax_prediction : true
      });

      // Make request to NVIDIA API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(NVIDIA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'NVCF-POLL-SECONDS': '1'
        },
        body: requestBody,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      let responseData;
      const responseText = await response.text();
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse NVIDIA API response:', responseText);
        return NextResponse.json(
          {
            error: 'Invalid JSON response from NVIDIA API',
            code: 'NVIDIA_RESPONSE_ERROR',
            details: {
              responseText,
              parseError: e instanceof Error ? e.message : 'Unknown parsing error'
            }
          },
          { status: 502 }
        );
      }

      // Enhanced error handling for NVIDIA API responses
      if (!response.ok) {
        const errorResponse: NVIDIAError = {
          message: responseData?.message || 'NVIDIA API request failed',
          code: 'NVIDIA_API_ERROR',
          details: {
            responseData,
            statusCode: response.status,
            statusText: response.statusText
          }
        };

        // Handle specific NVIDIA API error cases
        if (response.status === 401) {
          errorResponse.code = 'NVIDIA_AUTH_ERROR';
          errorResponse.message = 'Invalid or expired NVIDIA API key';
        } else if (response.status === 429) {
          errorResponse.code = 'NVIDIA_RATE_LIMIT';
          errorResponse.message = 'NVIDIA API rate limit exceeded';
        } else if (response.status >= 500) {
          errorResponse.code = 'NVIDIA_SERVER_ERROR';
          errorResponse.message = 'NVIDIA API service unavailable';
        }

        console.error('NVIDIA API Error:', errorResponse);
        return NextResponse.json(errorResponse, { status: response.status });
      }

      // Get the request ID from headers
      const reqId = response.headers.get('nvcf-reqid');
      
      if (response.status === 200 && responseData.pdb) {
        // Immediate response with PDB data
        return NextResponse.json({ 
          status: 'completed',
          pdb: responseData.pdb 
        });
      } else if (response.status === 202 && reqId) {
        // Async job started
        return NextResponse.json({ 
          status: 'pending',
          reqId,
          message: 'Prediction started successfully'
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
            details: 'The request took too long to complete'
          },
          { status: 504 }
        );
      }
      throw error;
    }

  } catch (error) {
    console.error('Error in AlphaFold API:', error);
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