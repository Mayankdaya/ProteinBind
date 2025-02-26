'use client';
import React, { useEffect, useRef, useState } from 'react';
import { initRDKit } from '@/lib/rdkit';

interface MoleculeStructureProps {
  smiles?: string;
  structure?: string;
  id?: string;
  width?: number;
  height?: number;
  options?: {
    width?: number;
    height?: number;
  };
}

const MoleculeStructure: React.FC<MoleculeStructureProps> = ({ 
  smiles, 
  structure,
  width = 300,
  height = 300,
  options = { width: 300, height: 300 } 
}) => {
  const moleculeString = structure || smiles;
  const finalWidth = width || options.width;
  const finalHeight = height || options.height;
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initializationProgress, setInitializationProgress] = useState<string>('Starting');

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const drawMolecule = async () => {
      if (!moleculeString || !containerRef.current) return;

      try {
        setInitializationProgress('Initializing RDKit...');
        console.log('Initializing RDKit...');
        
        const initializationTimeout = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('RDKit initialization timed out. Please check your network connection and try again.'));
          }, 15000);
        });

        setInitializationProgress('Loading WASM files...');
        const rdkit = await Promise.race([
          initRDKit(),
          initializationTimeout
        ]);

        clearTimeout(timeoutId);

        if (!rdkit) {
          throw new Error('RDKit initialization failed - WASM files not found. Please check if RDKit_minimal.js and RDKit_minimal.wasm are present in the public directory.');
        }

        setInitializationProgress('Rendering molecule...');
        console.log('RDKit initialized, rendering molecule...');
        containerRef.current.innerHTML = '';
        const mol = rdkit.get_mol(moleculeString);
        if (mol && mol.is_valid()) {
          const svg = mol.get_svg(finalWidth, finalHeight);
          containerRef.current.innerHTML = svg;
          mol.delete();
          setError(null);
        } else {
          throw new Error(`Invalid molecule structure: ${moleculeString}. Please check if the SMILES/structure string is correct.`);
        }
      } catch (err) {
        console.error('Error rendering molecule:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred while rendering the molecule');
      } finally {
        setLoading(false);
        setInitializationProgress('Complete');
      }
    };

    drawMolecule();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [moleculeString, finalWidth, finalHeight]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
          <div className="text-sm text-gray-600">{initializationProgress}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px] bg-gray-50 p-4">
        <div className="text-red-500 font-medium mb-2">Error</div>
        <div className="text-red-500 text-sm text-center">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-center bg-white rounded"
      style={{ 
        width: finalWidth, 
        height: finalHeight,
        minHeight: '200px',
        margin: 'auto'
      }}
    />
  );
};

export default MoleculeStructure;
