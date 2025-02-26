'use client';
import React, { useEffect, useRef, useState } from 'react';
import { initRDKit } from '@/lib/rdkit';

interface MoleculeViewerProps {
  smiles: string;
  width?: number;
  height?: number;
  onError?: (error: string) => void;
}

const MoleculeViewer: React.FC<MoleculeViewerProps> = ({
  smiles,
  width = 300,
  height = 300,
  onError
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const drawMolecule = async () => {
      if (!smiles || !containerRef.current) return;

      try {
        // Set a timeout for RDKit initialization
        const initializationTimeout = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('RDKit initialization timed out'));
          }, 15000); // 15 seconds timeout
        });

        // Race between RDKit initialization and timeout
        const rdkit = await Promise.race([
          initRDKit(),
          initializationTimeout
        ]);

        clearTimeout(timeoutId);

        if (!rdkit) {
          throw new Error('Failed to initialize RDKit');
        }

        if (mounted && containerRef.current) {
          containerRef.current.innerHTML = '';
          const mol = rdkit.get_mol(smiles);
          
          if (mol && mol.is_valid()) {
            const svg = mol.get_svg(width, height);
            containerRef.current.innerHTML = svg;
            mol.delete();
            setError(null);
          } else {
            throw new Error('Invalid molecule structure');
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to render molecule';
        if (mounted) {
          setError(errorMessage);
          if (onError) {
            onError(errorMessage);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    drawMolecule();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [smiles, width, height, onError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-transparent">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-t-2 border-primary border-solid rounded-full animate-spin" />
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-transparent">
        <div className="text-red-500 text-sm text-center">{error}</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-center bg-white dark:bg-boxdark rounded-lg transition-all duration-200"
      style={{ 
        width, 
        height,
        minHeight: '200px'
      }}
    />
  );
};

export default MoleculeViewer;