import { NextResponse } from "next/server";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function makeRequestWithRetry(url: string, options: RequestInit, retries: number = MAX_RETRIES): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      // If we get a 429 (Too Many Requests) or 503 (Service Unavailable), retry
      if (response.status === 429 || response.status === 503) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY * Math.pow(2, i);
        console.log(`Attempt ${i + 1} failed, retrying after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Attempt ${i + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries reached');
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('Received payload:', payload);

    const API_KEY = process.env.NVCF_RUN_KEY;
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'NVIDIA API key is not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const response = await makeRequestWithRetry(
      "https://health.api.nvidia.com/v1/biology/nvidia/molmim/generate",
      {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          smi: payload.smi,
          algorithm: "CMA-ES",
          num_molecules: payload.numMolecules || 30,
          property_name: "QED",
          minimize: payload.minimize || false,
          min_similarity: payload.minSimilarity || 0.3,
          particles: payload.particles || 30,
          iterations: payload.iterations || 10
        })
      }
    );

    // Get response text first for debugging
    const responseText = await response.text();
    console.log('NVIDIA API raw response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse NVIDIA API response:', parseError);
      return NextResponse.json(
        { 
          error: "Invalid response from NVIDIA API",
          details: responseText?.substring(0, 1000) || 'No response text available'
        },
        { status: 502, headers: corsHeaders }
      );
    }

    if (!response.ok) {
      const errorMessage = data.message || data.error || `NVIDIA API error: ${response.status}`;
      return NextResponse.json(
        { error: errorMessage, details: data },
        { status: response.status, headers: corsHeaders }
      );
    }

    // Handle different response formats
    let moleculesArray = [];
    
    if (typeof data.molecules === 'string') {
      try {
        moleculesArray = JSON.parse(data.molecules);
      } catch (parseError) {
        console.error('Failed to parse molecules string:', parseError);
        return NextResponse.json(
          { 
            error: 'Invalid molecules format from NVIDIA API',
            details: 'Failed to parse molecules string'
          },
          { status: 502, headers: corsHeaders }
        );
      }
    } else if (data.molecules && Array.isArray(data.molecules)) {
      moleculesArray = data.molecules;
    } else {
      console.error('Invalid response structure:', data);
      return NextResponse.json(
        { 
          error: 'Invalid response format from NVIDIA API',
          details: 'Response is missing required molecules array'
        },
        { status: 502, headers: corsHeaders }
      );
    }

    // Transform molecules into consistent format
    const molecules = moleculesArray.map((mol: any) => ({
      smiles: mol.sample || mol.smiles || mol.smi || '',
      structure: mol.sample || mol.smiles || mol.smi || '',
      score: typeof mol.score === 'number' ? mol.score : null
    })).filter(mol => mol.smiles); // Only keep molecules with valid SMILES

    if (molecules.length === 0) {
      console.error('No valid molecules in response:', data);
      return NextResponse.json(
        { 
          error: 'No valid molecules generated',
          details: 'The API response contained no valid molecule structures'
        },
        { status: 422, headers: corsHeaders }
      );
    }

    return NextResponse.json({ molecules }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Generate molecules error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal Server Error',
        details: error.toString()
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
