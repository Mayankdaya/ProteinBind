'use client';

export interface ESMFoldResponse {
  pdb_string: string;
  error?: string;
}

export class ESMFoldClient {
  private static readonly API_URL = 'https://health.api.nvidia.com/v1/biology/nvidia/esmfold';

  constructor(private apiKey: string) {}

  async predictStructure(sequence: string): Promise<ESMFoldResponse> {
    try {
      // Validate sequence
      if (!sequence || sequence.trim() === '') {
        throw new Error('Protein sequence is required');
      }

      // Prepare request
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sequence: sequence.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return {
        pdb_string: data.pdb_string || '',
        error: data.error
      };
    } catch (error) {
      return {
        pdb_string: '',
        error: error instanceof Error ? error.message : 'Failed to predict structure'
      };
    }
  }
}