'use client';

import React, { useState } from 'react';

interface ESMFoldScores {
  plddt?: number;
  confidence?: number;
}

interface ESMFoldResponse {
  status: string;
  message?: string;
  structure?: string;
  scores?: ESMFoldScores;
  error?: string;
  details?: string;
}

const ESMFold: React.FC = () => {
  const [sequence, setSequence] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ESMFoldResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/esmfold', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sequence: sequence
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to predict structure');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to predict protein structure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow dark:bg-[#181818]">
      <h1 className="text-2xl font-bold mb-6 text-black dark:text-white">Protein Structure Prediction</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sequence" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Protein Sequence
          </label>
          <textarea
            id="sequence"
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
            className="w-full h-32 p-2 border rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100"
            placeholder="Enter protein sequence..."
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-opacity-90 disabled:opacity-50"
        >
          {loading ? 'Predicting...' : 'Predict Structure'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 border rounded-lg dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-2 text-black dark:text-white">Prediction Result</h2>
          <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-[#1e1e1e] p-4 rounded text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Note: AI models generate responses based on complex algorithms and machine learning techniques. 
          Results may be inaccurate. Do not upload confidential information or personal data unless expressly permitted.
        </p>
      </div>
    </div>
  );
};

export default ESMFold;