import { NextResponse } from "next/server";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const NGC_API_KEY = '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';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { sequence } = await req.json();
    
    if (!sequence) {
      return NextResponse.json(
        { error: 'Protein sequence is required' },
        { status: 400 }
      );
    }

    const nimUrl = 'http://localhost:8000/protein-structure/alphafold2/predict-structure-from-sequence';
    
    const response = await fetch(nimUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NGC_API_KEY}`,
      },
      body: JSON.stringify({
        sequence,
        databases: ["small_bfd"],
        e_value: 0.000001,
        algorithm: "mmseqs2",
        relax_prediction: false,
        max_template_date: "2024-01-01", // Current date for latest templates
        num_multimer_predictions_per_model: 1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NIM service error: ${error}`);
    }

    const data = await response.json();
    return NextResponse.json(data, { headers: corsHeaders });

  } catch (error) {
    console.error('AlphaFold2 prediction error:', error);
    return NextResponse.json(
      { error: 'Failed to predict protein structure' },
      { status: 500, headers: corsHeaders }
    );
  }
}