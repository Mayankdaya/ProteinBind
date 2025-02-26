import { NextResponse } from "next/server";

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  );
}

function validatePayload(payload: any) {
  const required = [
    'smiles',
    'num_molecules',
    'min_similarity',
    'num_particles',
    'num_iterations'
  ];

  console.log('Validating payload:', payload);

  for (const field of required) {
    if (payload[field] === undefined || payload[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (typeof payload.smiles !== 'string' || !payload.smiles.trim()) {
    throw new Error('Invalid SMILES string');
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('Received payload:', payload);

    const API_KEY = process.env.NVIDIA_API_KEY; // Updated environment variable name
    if (!API_KEY) {
      throw new Error('NVIDIA API key is not configured');
    }

    // Validate the incoming payload
    validatePayload(payload);

    // Transform payload for NVIDIA API
    const nvidiaPayload = {
      ...payload,
      smi: payload.smiles, // Convert smiles to smi for NVIDIA API
    };
    delete nvidiaPayload.smiles; // Remove the original smiles field

    console.log('Sending to NVIDIA API:', nvidiaPayload);

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
      }
    );

    if (response.status === 403) {
      console.error('NVIDIA API authentication failed');
      return NextResponse.json(
        { error: 'Authentication failed. Please check API key.' },
        { status: 403 }
      );
    }

    const responseText = await response.text();
    console.log('NVIDIA API response:', responseText);

    if (!response.ok) {
      throw new Error(`NVIDIA API error: ${response.status} - ${responseText}`);
    }

    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    } catch (e) {
      throw new Error(`Invalid JSON response from NVIDIA API: ${responseText}`);
    }

  } catch (error: any) {
    console.error("Generate molecules error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Internal Server Error",
        details: typeof error === 'object' ? error.toString() : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { 
        status: error.status || 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  }
}