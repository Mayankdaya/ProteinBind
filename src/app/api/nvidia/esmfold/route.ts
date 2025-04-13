import { NextResponse } from 'next/server';

const ESMFOLD_API_URL = 'https://health.api.nvidia.com/v1/biology/nvidia/esmfold';
const API_KEY = process.env.NVCF_RUN_KEY || process.env.NVIDIA_API_KEY;

export async function POST(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  try {
    const { sequence } = await request.json();

    if (!sequence) {
      return NextResponse.json(
        { error: 'Protein sequence is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate sequence length
    if (sequence.length < 10 || sequence.length > 2000) {
      return NextResponse.json(
        { error: 'Sequence length must be between 10 and 2000 amino acids' },
        { status: 400, headers: corsHeaders }
      );
    }

    const response = await fetch(ESMFOLD_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sequence })
    });

    if (!response.ok) {
      // Get error details from response
      let errorMessage = 'ESMfold API request failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If we can't parse the error response, use status text
        errorMessage = `${errorMessage}: ${response.statusText}`;
      }

      // Handle specific status codes
      switch (response.status) {
        case 401:
          errorMessage = 'API key is invalid or expired';
          break;
        case 429:
          errorMessage = 'Rate limit exceeded. Please try again later';
          break;
        case 500:
          errorMessage = 'ESMfold server error. Please try again later';
          break;
        case 503:
          errorMessage = 'ESMfold service is currently unavailable';
          break;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status, headers: corsHeaders }
      );
    }

    // Get the raw response text for debugging
    const responseText = await response.text();
    console.log('ESMfold API raw response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse ESMfold response:', parseError);
      return NextResponse.json(
        { error: 'Invalid response format from ESMfold API' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Check if the response contains the expected structure data
    if (!data.pdb_file && !data.structure) {
      console.error('No structure data in response from NVIDIA API:', data);
      return NextResponse.json(
        { error: 'No structure data in response from NVIDIA API' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Normalize the response to match our expected format
    const normalizedResponse = {
      status: 'SUCCEEDED',
      results: {
        ...data,
        // Ensure consistent field names
        pdb_file: data.pdb_file || data.structure,
        structure: data.pdb_file || data.structure, // Ensure structure field is always present
        scores: {
          plddt: data.plddt || (data.plddts && data.plddts[0]) || null,
          ptm: data.ptm || null,
          iptm: data.iptm || null,
          confidence: data.plddt || (data.plddts && data.plddts[0]) || null // Add confidence for UI
        }
      }
    };

    return NextResponse.json(normalizedResponse, { headers: corsHeaders });

  } catch (error) {
    console.error('ESMfold prediction error:', error);
    return NextResponse.json(
      { error: 'Failed to predict protein structure' },
      { status: 500, headers: corsHeaders }
    );
  }
}