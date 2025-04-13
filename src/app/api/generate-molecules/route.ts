import { NextResponse } from "next/server";

interface GenerateMoleculesPayload {
  smiles: string;
  num_molecules: number;
  property_name: string;
  minimize: boolean;
  min_similarity: number;
  particles: number;
  iterations: number;
  algorithm: string;
}

interface NVIDIAPayload {
  smi: string;
  algorithm: string;
  num_molecules: number;
  property_name: string;
  minimize: boolean;
  min_similarity: number;
  particles: number;
  iterations: number;
}

interface NVIDIAMolecule {
  smi?: string;
  smiles?: string;
  score?: number;
}

interface NVIDIAResponse {
  molecules: NVIDIAMolecule[];
  message?: string;
  error?: string;
}

interface NVIDIAErrorResponse {
  message?: string;
  error?: string;
  type?: string;
  detail?: string;
}

interface NormalizedMolecule {
  smiles: string;
  structure: string;
  score: number | null;
}

interface NormalizedResponse {
  molecules: NormalizedMolecule[];
}

function validatePayload(payload: GenerateMoleculesPayload): void {
  // Check required fields with proper types
  if (typeof payload.smiles !== 'string' || !payload.smiles.trim()) {
    throw new Error('Invalid SMILES string');
  }
  
  if (typeof payload.num_molecules !== 'number' || !Number.isInteger(payload.num_molecules)) {
    throw new Error('num_molecules must be an integer');
  }
  
  if (typeof payload.min_similarity !== 'number' || isNaN(payload.min_similarity)) {
    throw new Error('min_similarity must be a number');
  }
  
  if (typeof payload.particles !== 'number' || !Number.isInteger(payload.particles)) {
    throw new Error('particles must be an integer');
  }
  
  if (typeof payload.iterations !== 'number' || !Number.isInteger(payload.iterations)) {
    throw new Error('iterations must be an integer');
  }
  
  // Algorithm and property_name are optional since we hardcode them
  payload.algorithm = "CMA-ES";
  payload.property_name = "QED";
  
  // Ensure minimize is boolean
  payload.minimize = Boolean(payload.minimize);
}

export async function OPTIONS() {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
  
  return new NextResponse(null, { status: 204, headers });
}

export async function POST(request: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  try {
    const payload = await request.json() as GenerateMoleculesPayload;
    console.log('Received payload:', payload);

    const API_KEY = process.env.NVCF_RUN_KEY;
    if (!API_KEY) {
      throw new Error('NVIDIA API key is not configured');
    }

    // Validate the incoming payload
    validatePayload(payload);

    // Transform payload for NVIDIA API - only include fields that NVIDIA API expects
    const nvidiaPayload: NVIDIAPayload = {
      smi: payload.smiles,
      algorithm: "CMA-ES",  // hardcode since it's the only supported option
      num_molecules: parseInt(String(payload.num_molecules)),
      property_name: "QED",  // hardcode since it's the only supported option
      minimize: Boolean(payload.minimize),
      min_similarity: parseFloat(String(payload.min_similarity)),
      particles: parseInt(String(payload.particles)),
      iterations: parseInt(String(payload.iterations))
    };

    // Validate numeric values
    if (nvidiaPayload.num_molecules < 1 || nvidiaPayload.num_molecules > 100) {
      return NextResponse.json(
        { error: "Number of molecules must be between 1 and 100" },
        { status: 400, headers }
      );
    }

    if (nvidiaPayload.min_similarity < 0 || nvidiaPayload.min_similarity > 1) {
      return NextResponse.json(
        { error: "Minimum similarity must be between 0 and 1" },
        { status: 400, headers }
      );
    }

    if (nvidiaPayload.particles < 1) {
      return NextResponse.json(
        { error: "Number of particles must be at least 1" },
        { status: 400, headers }
      );
    }

    if (nvidiaPayload.iterations < 1) {
      return NextResponse.json(
        { error: "Number of iterations must be at least 1" },
        { status: 400, headers }
      );
    }

    // Validate SMILES string
    if (!/^[A-Za-z0-9@\[\]\(\)\{\}\\\/.=#\-+\s]*$/.test(nvidiaPayload.smi)) {
      return NextResponse.json(
        { error: "Invalid SMILES string format" },
        { status: 400, headers }
      );
    }

    console.log('Sending to NVIDIA API:', nvidiaPayload);
    
    let responseText;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

    try {
      const response = await fetch(
        "https://health.api.nvidia.com/v1/biology/nvidia/molmim/generate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": "ProteinBind/1.0",
          },
          body: JSON.stringify(nvidiaPayload),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      // Get response text first
      responseText = await response.text();
      console.log('NVIDIA API raw response:', responseText);

      let data: NVIDIAResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse NVIDIA API response:', parseError);
        return NextResponse.json(
          { 
            error: "Invalid response from NVIDIA API",
            details: responseText?.substring(0, 1000) || 'No response text available'
          },
          { status: 502, headers }
        );
      }

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const retryDelay = retryAfter ? parseInt(retryAfter) : 30;
          const responseHeaders = {
            ...headers,
            'Retry-After': String(retryDelay)
          };
          
          return NextResponse.json(
            { 
              error: "Rate limit exceeded. Please try again later.",
              retryAfter: retryDelay
            },
            { 
              status: 429,
              headers: responseHeaders
            }
          );
        }

        // For other error responses, parse as error response type
        const errorData = data as NVIDIAErrorResponse;
        return NextResponse.json(
          { 
            error: errorData.message || errorData.error || errorData.detail || `NVIDIA API error: ${response.status}`,
            details: errorData
          },
          { status: response.status, headers }
        );
      }

      // For successful responses, validate and normalize the data
      if (!data.molecules || !Array.isArray(data.molecules)) {
        console.error('Invalid response structure:', data);
        return NextResponse.json(
          { 
            error: 'Invalid response format from NVIDIA API',
            details: 'Response is missing required molecules array'
          },
          { status: 502, headers }
        );
      }

      // Normalize response
      const normalizedResponse: NormalizedResponse = {
        molecules: data.molecules.map((mol: NVIDIAMolecule) => {
          // Extract SMILES from either smi or smiles field
          const smiles = mol.smi || mol.smiles || '';
          return {
            smiles,
            structure: smiles, // Use the SMILES as structure since that's what we have
            score: typeof mol.score === 'number' ? mol.score : null
          };
        }).filter(mol => mol.smiles) // Only keep molecules with valid SMILES
      };

      if (normalizedResponse.molecules.length === 0) {
        return NextResponse.json(
          { 
            error: 'No valid molecules in response',
            details: 'The API response contained no valid molecule structures'
          },
          { status: 422, headers }
        );
      }

      return NextResponse.json(normalizedResponse, { headers });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { 
            error: 'Request timed out',
            details: 'The NVIDIA API request exceeded the timeout limit'
          },
          { status: 504, headers }
        );
      }

      console.error('NVIDIA API request failed:', error);
      return NextResponse.json(
        { 
          error: 'Failed to communicate with NVIDIA API',
          details: error.message || 'Unknown error occurred'
        },
        { status: 502, headers }
      );
    }
  } catch (error: any) {
    console.error("Generate molecules error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Internal Server Error",
        details: typeof error === 'object' ? error.toString() : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: error.status || 500, headers }
    );
  }
}