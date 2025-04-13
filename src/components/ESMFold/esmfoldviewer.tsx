'use client';
import React, { useState, useEffect, useRef } from 'react';
import * as NGL from 'ngl';

interface ESMFoldViewerProps {
  apiKey: string;
  width?: number;
  height?: number;
}

const ESMFoldViewer: React.FC<ESMFoldViewerProps> = ({
  apiKey,
  width = 800,
  height = 600
}) => {
  const [sequence, setSequence] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [structure, setStructure] = useState<string | null>(null);
  const [scores, setScores] = useState<ESMFoldScores | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Initialize NGL viewer when component mounts
  useEffect(() => {
    if (containerRef.current && !viewerRef.current) {
      try {
        const stage = new NGL.Stage(containerRef.current, { 
          backgroundColor: 'white',
          quality: 'medium',
        });
        
        // Set size after initialization
        stage.viewer.container.style.width = '100%';
        stage.viewer.container.style.height = '400px';
        stage.handleResize();
        
        viewerRef.current = stage;
      } catch (err) {
        console.error('Failed to initialize NGL viewer:', err);
        setError('Failed to initialize 3D viewer');
      }
    }

    // Cleanup function
    return () => {
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, []);

  // Handle structure updates
  useEffect(() => {
    if (!structure || !viewerRef.current) return;

    const loadStructure = async () => {
      try {
        // Clear existing representations
        viewerRef.current.removeAllComponents();

        // Create a blob from the PDB data and validate it
        const trimmedStructure = structure.trim();
        if (!trimmedStructure || !trimmedStructure.length) {
          throw new Error('Empty structure data');
        }
        
        // Look for ATOM or HEADER records anywhere in the structure
        if (!trimmedStructure.includes('ATOM') && !trimmedStructure.includes('HEADER')) {
          throw new Error('Invalid PDB structure format');
        }

        const blob = new Blob([trimmedStructure], { type: 'text/plain' });
        
        // Load the structure with proper error handling
        const component = await viewerRef.current.loadFile(blob, { ext: 'pdb' })
          .catch((err: Error) => {
            throw new Error(`Failed to load structure: ${err.message}`);
          });
        
        if (!component || typeof component.addRepresentation !== 'function') {
          throw new Error('Failed to create valid structure component');
        }

        // Add multiple representations for better visualization
        component.addRepresentation('cartoon', {
          color: scores?.plddt ? 'plddt' : 'chainid',
          smoothSheet: true,
          quality: 'high'
        });

        component.addRepresentation('ball+stick', {
          sele: 'hetero',
          colorValue: 'lightgray',
          multipleBond: true
        });

        component.addRepresentation('surface', {
          sele: 'polymer',
          opacity: 0.3,
          colorScheme: scores?.plddt ? 'plddt' : 'residueindex'
        });

        // Center and zoom to show the whole structure
        component.autoView(1000);
        setError(null);
      } catch (err) {
        console.error('Error loading structure:', err);
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
          setTimeout(loadStructure, 1000); // Retry after 1 second
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load protein structure');
        }
      }
    };

    loadStructure();
  }, [structure, scores, retryCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sequence.trim()) {
      setError('Please enter a protein sequence');
      return;
    }

    setLoading(true);
    setError(null);
    setRetryCount(0);
    setScores(null);

    try {
      const response = await fetch('/api/esmfold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ sequence: sequence.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Extract and validate PDB structure from the response
      if (!data.pdbs || !Array.isArray(data.pdbs) || data.pdbs.length === 0) {
        throw new Error('No structure data received');
      }

      const pdbString = data.pdbs[0];
      if (!pdbString || typeof pdbString !== 'string') {
        throw new Error('Invalid structure data format');
      }

      const trimmedPDB = pdbString.trim();
      if (!trimmedPDB.length) {
        throw new Error('Empty structure data');
      }

      // Look for ATOM or HEADER records anywhere in the structure
      if (!trimmedPDB.includes('ATOM') && !trimmedPDB.includes('HEADER')) {
        throw new Error('Invalid PDB structure format');
      }

      // Set the validated structure
      setStructure(trimmedPDB);
      setScores(data.scores || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to predict structure');
      setStructure(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sequence" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

      {scores && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Prediction Scores</h3>
          <div className="space-y-2">
            {scores.plddt !== undefined && (
              <div className="flex justify-between">
                <span>pLDDT Score:</span>
                <span className="font-mono">{scores.plddt.toFixed(2)}</span>
              </div>
            )}
            {scores.confidence !== undefined && (
              <div className="flex justify-between">
                <span>Confidence:</span>
                <span className="font-mono">{scores.confidence.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-4" style={{ height: '400px' }}>
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Predicting structure...</p>
          </div>
        ) : (
          <div 
            ref={containerRef} 
            className="w-full h-full rounded-lg overflow-hidden"
            style={{ border: error ? '1px solid #ef4444' : '1px solid #e5e7eb' }}
          >
            {!structure && !error && (
              <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                Enter a protein sequence and click "Predict Structure" to visualize
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ESMFoldViewer;