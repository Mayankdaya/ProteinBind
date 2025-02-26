import { NextResponse } from 'next/server';

const NVIDIA_API_URL = 'https://health.api.nvidia.com/v1/biology/nvidia/esmfold';

export async function POST(request: Request) {
  try {
    const { sequence } = await request.json();

    if (!sequence) {
      return NextResponse.json(
        { error: 'Protein sequence is required' },
        { status: 400 }
      );
    }

    if (!process.env.NVIDIA_API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sequence }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NVIDIA API error: ${error}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('ESMFold API error:', error);
    return NextResponse.json(
      { error: 'Failed to predict protein structure' },
      { status: 500 }
    );
  }
}