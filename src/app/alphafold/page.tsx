'use client';

import { useState } from 'react';
import DefaultLayout from '@/components/Layouts/DefaultLayout';
import ComponentHeader from '@/components/ComponentHeader/ComponentHeader';
import AlphaFoldViewer from '@/components/AlphaFold/AlphaFoldViewer';

interface ESMFoldResponse {
  status: string;
  message?: string;
  structure: string;
  scores?: {
    plddt?: number;
    confidence?: number;
  };
}

export default function AlphaFoldPage() {
  const [sequence, setSequence] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ESMFoldResponse | null>(null);

  const validateSequence = (sequence: string): boolean => {
    const validChars = /^[ACDEFGHIKLMNPQRSTVWY\*\-\s]+$/i;
    return validChars.test(sequence);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    // Validate sequence
    if (!sequence.trim()) {
      setError('Protein sequence is required');
      return;
    }

    // Validate sequence characters
    if (!validateSequence(sequence)) {
      setError('Invalid sequence. Only standard amino acid letters, gaps (-) and terminations (*) are allowed.');
      return;
    }

    const cleanSequence = sequence.trim();
    if (cleanSequence.length < 10 || cleanSequence.length > 2000) {
      setError(`Sequence length must be between 10-2000 amino acids. Current length: ${cleanSequence.length}`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/esmfold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sequence: cleanSequence
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to predict structure');
      }

      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to predict structure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DefaultLayout>
      <div className="mx-auto max-w-screen-2xl">
        <ComponentHeader pageName="Protein Structure Predictor" />
        
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="p-6.5">
            <form onSubmit={handleSubmit}>
              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Protein Sequence
                </label>
                <textarea
                  rows={6}
                  placeholder="Enter protein sequence"
                  value={sequence}
                  onChange={(e) => setSequence(e.target.value)}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90 disabled:opacity-50"
              >
                {loading ? 'Predicting...' : 'Predict Structure'}
              </button>
            </form>

            {loading && (
              <div className="mt-4 flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Predicting protein structure...
                </span>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 rounded-lg bg-danger bg-opacity-10 text-danger">
                {error}
              </div>
            )}

            {result && result.structure && (
              <div className="mt-6">
                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.scores?.plddt !== undefined && (
                    <div className="p-4 rounded-lg border border-stroke dark:border-strokedark">
                      <h3 className="text-sm font-medium mb-1">pLDDT Score</h3>
                      <p className="text-2xl font-semibold text-primary">
                        {result.scores.plddt.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Predicted Local Distance Difference Test score
                      </p>
                    </div>
                  )}
                  
                  {result.scores?.confidence !== undefined && (
                    <div className="p-4 rounded-lg border border-stroke dark:border-strokedark">
                      <h3 className="text-sm font-medium mb-1">Confidence Score</h3>
                      <p className="text-2xl font-semibold text-primary">
                        {result.scores.confidence.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Overall prediction confidence
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-4 rounded-lg border border-stroke dark:border-strokedark">
                  <h3 className="text-lg font-medium mb-4">3D Structure Visualization</h3>
                  <div className="w-full flex justify-center">
                    <AlphaFoldViewer 
                      pdbStructure={result.structure}
                      width={800}
                      height={600}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Note: ESMfold generates protein structure predictions using machine learning. 
                Results may not be 100% accurate and should be validated experimentally. 
                Do not upload confidential sequences or personal data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}