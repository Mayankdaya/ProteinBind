'use client';
import React, { useState } from 'react';

const ESMFoldViewer = () => {
  const [sequence, setSequence] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sequence.trim()) {
      setError('Please enter a protein sequence');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/esmfold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to predict structure');
      }

      const data = await response.json();
      
      // TODO: Implement structure visualization with the response data
      console.log('Structure prediction successful:', data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to predict structure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label 
            htmlFor="sequence" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Protein Sequence
          </label>
          <textarea
            id="sequence"
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
            placeholder="Enter protein sequence..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            rows={4}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 text-white bg-primary rounded-md hover:bg-opacity-90 disabled:opacity-50"
        >
          {loading ? 'Predicting...' : 'Predict Structure'}
        </button>
      </form>

      {error && (
        <div className="p-4 text-red-500 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}

      <div className="mt-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Predicting structure...</p>
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400">
            Structure visualization will appear here
          </div>
        )}
      </div>
    </div>
  );
};

export default ESMFoldViewer;