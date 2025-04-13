import { NextResponse } from 'next/server';

const NVIDIA_API_URL = 'https://health.api.nvidia.com/v1/biology/nvidia/esmfold';
const STATUS_URL = 'https://health.api.nvidia.com/v1/status';
const MAX_POLLING_ATTEMPTS = 60; // 5 minutes total with 5s intervals
const POLLING_INTERVAL = 5000; // 5 seconds

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollForResults(reqId: string, apiKey: string): Promise<any> {
  for (let attempt = 0; attempt < MAX_POLLING_ATTEMPTS; attempt++) {
    console.log(`Polling attempt ${attempt + 1}/${MAX_POLLING_ATTEMPTS}`);
    
    const statusResponse = await fetch(`${STATUS_URL}/${reqId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'NVCF-POLL-SECONDS': '5'
      }
    });

    console.log(`Poll status: ${statusResponse.status}`);
    console.log('Poll headers:', JSON.stringify(Object.fromEntries([...statusResponse.headers]), null, 2));

    if (!statusResponse.ok && statusResponse.status !== 202) {
      const errorText = await statusResponse.text();
      console.error(`Poll error response: ${errorText}`);
      throw new Error(`Failed to poll for results: ${statusResponse.status} ${errorText}`);
    }

    // Get response text first for better error handling
    const responseText = await statusResponse.text();
    console.log(`Poll response text (first 200 chars): ${responseText.substring(0, 200)}...`);
    
    let data;
    
    try {
      data = JSON.parse(responseText);
      console.log('Poll response structure:', JSON.stringify(Object.keys(data), null, 2));
    } catch (parseError) {
      // If it's not JSON but starts with ATOM, it might be raw PDB data
      if (responseText.trim().startsWith('ATOM')) {
        console.log('Detected raw PDB data in poll response');
        return { structure: responseText };
      }
      console.error('Failed to parse status response:', responseText.substring(0, 500));
      throw new Error('Invalid status response format');
    }

    // Check if the prediction is complete
    if (statusResponse.status === 200) {
      console.log('Poll status 200 - prediction should be complete');
      
      // If the response contains the result directly in the data object
      if (data.prediction || data.result || data.pdb_string || data.structure || data.pdb_file || data.pdb) {
        console.log('Found result directly in data object');
        return data;
      }
      
      // If the response is nested under a 'prediction' key
      if (data.output?.prediction) {
        console.log('Found result in output.prediction');
        return data.output.prediction;
      }
      
      // If it's wrapped in a results array
      if (Array.isArray(data.results) && data.results.length > 0) {
        console.log('Found result in results array');
        return data.results[0];
      }
      
      // If it's in the output directly
      if (data.output?.structure || data.output?.pdb_string || data.output?.pdb_file || data.output?.pdb) {
        console.log('Found result in output object');
        return data.output;
      }

      console.log('Returning complete data object as no specific structure was identified');
      return data;
    }

    await sleep(POLLING_INTERVAL);
  }

  throw new Error('Polling timeout: Structure prediction is taking too long');
}

export async function POST(request: Request) {
  try {
    const { sequence } = await request.json();

    if (!sequence) {
      return NextResponse.json(
        { error: 'Protein sequence is required' },
        { status: 400 }
      );
    }
    
    console.log(`Processing protein sequence of length: ${sequence.length}`);

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new Error('NVIDIA API key is not configured');
    }

    // Initial request to ESMfold API
    console.log('Sending request to ESMfold API...');
    const requestBody = {
      sequence,
      max_tokens: sequence.length * 2 // Ensure enough tokens for the sequence
    };
    console.log('Request payload:', JSON.stringify(requestBody));
    
    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'NVCF-POLL-SECONDS': '5'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`Response status: ${response.status}`);
    console.log('Response headers:', JSON.stringify(Object.fromEntries([...response.headers]), null, 2));

    if (!response.ok && response.status !== 202) {
      const errorText = await response.text();
      throw new Error(`NVIDIA API error: ${response.status} ${errorText}`);
    }

    // Handle both immediate and async responses
    let data;
    if (response.status === 202) {
      const reqId = response.headers.get('nvcf-reqid');
      if (!reqId) {
        throw new Error('No request ID received for async processing');
      }
      console.log('Received 202, polling for results with reqId:', reqId);
      data = await pollForResults(reqId, apiKey);
    } else {
      // Get response text first for better debugging
      const responseText = await response.text();
      console.log('ESMfold API raw response:', responseText.substring(0, 500) + '...');
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // Check if the response is raw PDB data
        if (responseText.trim().startsWith('ATOM')) {
          console.log('Detected raw PDB data in response');
          data = { structure: responseText };
        } else {
          console.error('Failed to parse NVIDIA API response:', responseText);
          throw new Error('Invalid response format from NVIDIA API');
        }
      }
      
      console.log('ESMfold API response structure:', JSON.stringify(Object.keys(data), null, 2));
      
      // Don't check for specific fields yet - we'll handle structure extraction more carefully below
    }

    // Extract structure from various possible locations in the response
    let structureData = null;
    let scores = {
      plddt: undefined,
      confidence: undefined
    };

    console.log('Extracting structure data from response...');
    console.log('Data type:', typeof data);
    
    // Handle raw string response (direct PDB data)
    if (typeof data === 'string') {
      console.log('Response is a raw string, checking if it contains PDB data');
      if (data.trim().startsWith('ATOM') || data.trim().startsWith('HEADER')) {
        console.log('Raw string contains PDB data');
        structureData = data;
      } else {
        console.log('Raw string does not contain PDB data, first 100 chars:', data.substring(0, 100));
      }
    } else if (data) {
      // Log the complete structure of the response for debugging
      console.log('Response data keys:', Object.keys(data));
      if (data.output) console.log('Output keys:', Object.keys(data.output));
      if (data.prediction) console.log('Prediction keys:', Object.keys(data.prediction));
      
      // Define all possible paths where structure data might be found
      const possiblePaths = [
        { path: 'pdb_string', value: data.pdb_string },
        { path: 'structure', value: data.structure },
        { path: 'pdb_file', value: data.pdb_file },
        { path: 'pdb', value: data.pdb },
        { path: 'prediction.pdb_string', value: data.prediction?.pdb_string },
        { path: 'prediction.structure', value: data.prediction?.structure },
        { path: 'prediction.pdb_file', value: data.prediction?.pdb_file },
        { path: 'prediction.pdb', value: data.prediction?.pdb },
        { path: 'result.pdb_string', value: data.result?.pdb_string },
        { path: 'result.structure', value: data.result?.structure },
        { path: 'result.pdb_file', value: data.result?.pdb_file },
        { path: 'result.pdb', value: data.result?.pdb },
        { path: 'output.pdb_string', value: data.output?.pdb_string },
        { path: 'output.structure', value: data.output?.structure },
        { path: 'output.pdb_file', value: data.output?.pdb_file },
        { path: 'output.pdb', value: data.output?.pdb },
        { path: 'output.prediction.pdb_string', value: data.output?.prediction?.pdb_string },
        { path: 'output.prediction.structure', value: data.output?.prediction?.structure },
        { path: 'output.prediction.pdb_file', value: data.output?.prediction?.pdb_file },
        { path: 'output.prediction.pdb', value: data.output?.prediction?.pdb },
        { path: 'results[0].structure', value: data.results?.[0]?.structure },
        { path: 'results[0].pdb_string', value: data.results?.[0]?.pdb_string },
        { path: 'results[0].pdb_file', value: data.results?.[0]?.pdb_file },
        { path: 'results[0].pdb', value: data.results?.[0]?.pdb }
      ];

      // Try to find a valid PDB structure in any of the possible paths
      for (const { path, value } of possiblePaths) {
        if (value && typeof value === 'string') {
          // Check if it's a valid PDB format (starts with ATOM or HEADER or contains PDB identifiers)
          const trimmedValue = value.trim();
          if (
            trimmedValue.startsWith('ATOM') || 
            trimmedValue.startsWith('HEADER') ||
            (trimmedValue.includes('ATOM') && trimmedValue.includes('HETATM'))
          ) {
            console.log(`Found structure data at path: ${path}`);
            structureData = value;
            break;
          }
        }
      }
      
      // If still not found, do a deeper search for any string that might be PDB data
      if (!structureData) {
        console.log('No structure found in known paths, performing deep search...');
        
        // Function to recursively search for PDB data in an object
        const findPdbInObject = (obj, path = '') => {
          if (!obj || typeof obj !== 'object') return null;
          
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            // Check if this property is a string that might contain PDB data
            if (typeof value === 'string' && value.length > 100) {
              if (
                value.includes('ATOM') || 
                value.includes('HEADER') ||
                (value.includes('HETATM') && value.includes('TER'))
              ) {
                console.log(`Deep search: Found potential PDB data at ${currentPath}`);
                return value;
              }
            }
            
            // Recursively check nested objects
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              const result = findPdbInObject(value, currentPath);
              if (result) return result;
            }
            
            // Check array items
            if (Array.isArray(value)) {
              for (let i = 0; i < value.length; i++) {
                const arrayPath = `${currentPath}[${i}]`;
                if (typeof value[i] === 'string' && value[i].length > 100) {
                  if (
                    value[i].includes('ATOM') || 
                    value[i].includes('HEADER') ||
                    (value[i].includes('HETATM') && value[i].includes('TER'))
                  ) {
                    console.log(`Deep search: Found potential PDB data in array at ${arrayPath}`);
                    return value[i];
                  }
                } else if (value[i] && typeof value[i] === 'object') {
                  const result = findPdbInObject(value[i], arrayPath);
                  if (result) return result;
                }
              }
            }
          }
          
          return null;
        };
        
        // Perform deep search
        const deepSearchResult = findPdbInObject(data);
        if (deepSearchResult) {
          console.log('Found structure data through deep search');
          structureData = deepSearchResult;
        }
      }
    }

    // Extract scores from various possible locations
    scores = {
      plddt: data.plddt_score ?? data.plddt ?? data.prediction?.plddt ?? data.result?.plddt ?? 
             data.output?.prediction?.plddt ?? data.output?.plddt ?? 
             data.results?.[0]?.plddt ?? undefined,
      confidence: data.confidence_score ?? data.confidence ?? data.prediction?.confidence ?? 
                 data.result?.confidence ?? data.output?.prediction?.confidence ?? 
                 data.output?.confidence ?? data.results?.[0]?.confidence ?? undefined
    };

    if (!structureData) {
      console.error('Failed to extract structure data from response');
      
      // Log the full response for debugging (limiting size to avoid excessive logging)
      const stringifiedData = JSON.stringify(data);
      console.error(
        'Response data (truncated):', 
        stringifiedData.length > 1000 ? 
          stringifiedData.substring(0, 1000) + '...' : 
          stringifiedData
      );
      
      // Try to extract any useful information from the response
      const responseInfo = {
        status: data?.status || 'unknown',
        message: data?.message || data?.error || 'No message provided',
        keys: data ? Object.keys(data) : ['<no data>'],
        outputKeys: data?.output ? Object.keys(data.output) : ['<no output>']
      };
      
      console.error('Response info:', responseInfo);
      throw new Error(`No structure data found in the response. API status: ${responseInfo.status}, message: ${responseInfo.message}`);
    }
    
    console.log('Successfully extracted structure data');

    // Validate the extracted structure data
    if (!structureData.includes('ATOM')) {
      console.error('Extracted data does not contain ATOM records, may not be valid PDB format');
      console.log('First 100 chars of extracted data:', structureData.substring(0, 100));
      throw new Error('Invalid PDB structure format in response');
    }

    // Count ATOM records as a basic validation
    const atomCount = (structureData.match(/ATOM/g) || []).length;
    console.log(`Structure data contains ${atomCount} ATOM records`);
    
    if (atomCount < 10) {
      console.warn('Very few ATOM records found, structure may be incomplete');
    }

    // Format the response
    const formattedResponse = {
      status: 'completed',
      structure: structureData,
      scores: scores
    };

    console.log('Successfully processed ESMfold prediction');
    return NextResponse.json(formattedResponse);

  } catch (error) {
    console.error('ESMfold API error:', error);
    
    // Create a more detailed error response
    const errorMessage = error instanceof Error ? error.message : 'Failed to predict protein structure';
    const errorDetails = error instanceof Error ? error.stack : undefined;
    
    console.error(`Returning error to client: ${errorMessage}`);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(2, 15)
      },
      { status: 500 }
    );
  }
}