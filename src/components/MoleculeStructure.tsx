'use client';
import React, { useEffect, useRef, useState } from 'react';
import { initRDKit } from '@/lib/rdkit';

interface MoleculeStructureProps {
  smiles: string;
  options?: {
    width?: number;
    height?: number;
  };
}

const MoleculeStructure: React.FC<MoleculeStructureProps> = ({ 
  smiles, 
  options = { width: 300, height: 300 } 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const drawMolecule = async () => {
      if (!smiles || !containerRef.current) return;

      try {
        const rdkit = await initRDKit();
        if (!rdkit) {
          throw new Error('Failed to initialize RDKit');
        }

        containerRef.current.innerHTML = '';
        const mol = rdkit.get_mol(smiles);
        
        if (mol && mol.is_valid()) {
          const svg = mol.get_svg(options.width, options.height);
          containerRef.current.innerHTML = svg;
          mol.delete();
          setError(null);
        } else {
          throw new Error('Invalid molecule structure');
        }
      } catch (err) {
        console.error('Error rendering molecule:', err);
        setError('Failed to render molecule');
      } finally {
        setLoading(false);
      }
    };

    drawMolecule();
  }, [smiles, options.width, options.height]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-gray-50">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-gray-50 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-center bg-white rounded"
      style={{ 
        width: options.width, 
        height: options.height,
        minHeight: '200px'
      }}
    />
  );
};

export default MoleculeStructure;
