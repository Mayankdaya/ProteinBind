import { NextResponse } from "next/server";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const API_KEY = process.env.NVIDIA_API_KEY;

    if (!API_KEY) {
      console.error('NVIDIA API key is missing');
      return NextResponse.json(
        { error: 'API key configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Request payload:', JSON.stringify(body, null, 2));

    const response = await fetch('https://health.api.nvidia.com/v1/biology/nvidia/molmim/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'curl/7.64.1'
      },
      body: JSON.stringify({
        algorithm: body.algorithm || "CMA-ES",
        num_molecules: parseInt(body.num_molecules) || 30,
        property_name: body.property_name || "QED",
        minimize: Boolean(body.minimize),
        min_similarity: parseFloat(body.min_similarity) || 0.3,
        particles: parseInt(body.particles) || 30,
        iterations: parseInt(body.iterations) || 10,
        smi: body.smi
      })
    });

    const responseText = await response.text();
    console.log('Raw NVIDIA API Response:', responseText);

    if (!response.ok) {
      return NextResponse.json(
        { error: `NVIDIA API Error: ${response.status}` },
        { status: response.status, headers: corsHeaders }
      );
    }

    let rawData;
    try {
      rawData = JSON.parse(responseText);
      // The molecules field is a string that needs to be parsed again
      if (typeof rawData.molecules === 'string') {
        rawData.molecules = JSON.parse(rawData.molecules);
      }
    } catch (e) {
      console.error('Failed to parse NVIDIA API response:', e);
      return NextResponse.json(
        { error: 'Invalid JSON response from NVIDIA API' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Transform the data to match expected format
    const molecules = Array.isArray(rawData.molecules) 
      ? rawData.molecules.map((mol: any) => ({
          smiles: mol.sample || '',  // NVIDIA API uses 'sample' for SMILES
          structure: mol.sample || '',
          score: typeof mol.score === 'number' ? mol.score : 0
        }))
      : [];

    console.log('Transformed molecules:', molecules);

    if (molecules.length === 0) {
      return NextResponse.json(
        { error: 'No molecules generated' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({ molecules }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Error in NVIDIA API proxy:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error.message
      },
      { status: 500, headers: corsHeaders }
    );
  }
}