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
  const rdkitRef = useRef<any>(null);
  const molRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isRocking, setIsRocking] = useState(false);
  const animationFrameRef = useRef<number>();

  const toggleSpin = () => {
    setIsSpinning(prev => !prev);
    setIsRocking(false); // Stop rocking when spinning
  };

  const toggleRock = () => {
    setIsRocking(prev => !prev);
    setIsSpinning(false); // Stop spinning when rocking
  };

  const resetView = () => {
    if (molRef.current && rdkitRef.current) {
      try {
        // Reset the molecule to its original orientation
        molRef.current.delete();
        const mol = rdkitRef.current.get_mol(smiles);
        if (mol && mol.is_valid()) {
          molRef.current = mol;
          drawMolecule(mol);
        }
      } catch (err) {
        console.error('Error resetting view:', err);
      }
    }
  };

  const drawMolecule = (mol: any) => {
    if (!containerRef.current) return;
    const svg = mol.get_svg(width, height);
    containerRef.current.innerHTML = svg;
  };

  const animate = () => {
    if (!molRef.current || !rdkitRef.current) return;

    try {
      if (isSpinning) {
        molRef.current.rotate(2, 0, 0); // Rotate around Y axis
      } else if (isRocking) {
        const time = Date.now() * 0.001;
        const angle = Math.sin(time) * 20; // Rock back and forth 20 degrees
        molRef.current.rotate(0, angle, 0);
      }
      drawMolecule(molRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    } catch (err) {
      console.error('Animation error:', err);
      setIsSpinning(false);
      setIsRocking(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initMolecule = async () => {
      if (!smiles || !containerRef.current) return;

      try {
        const initializationTimeout = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('RDKit initialization timed out'));
          }, 15000);
        });

        const rdkit = await Promise.race([
          initRDKit(),
          initializationTimeout
        ]);

        clearTimeout(timeoutId);

        if (!rdkit || !mounted) return;

        rdkitRef.current = rdkit;
        const mol = rdkit.get_mol(smiles);
        
        if (mol && mol.is_valid()) {
          molRef.current = mol;
          drawMolecule(mol);
          setError(null);
        } else {
          throw new Error('Invalid molecule structure');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to render molecule';
        if (mounted) {
          setError(errorMessage);
          if (onError) onError(errorMessage);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initMolecule();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (molRef.current) {
        molRef.current.delete();
        molRef.current = null;
      }
    };
  }, [smiles, width, height, onError]);

  useEffect(() => {
    if ((isSpinning || isRocking) && molRef.current) {
      animate();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpinning, isRocking]);

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
    <div className="flex flex-col items-center space-y-4">
      <div 
        ref={containerRef}
        className="flex items-center justify-center bg-white dark:bg-boxdark rounded-lg transition-all duration-200"
        style={{ 
          width, 
          height,
          minHeight: '200px'
        }}
      />
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleSpin}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            isSpinning 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          {isSpinning ? 'Stop Spin' : 'Spin'}
        </button>
        <button
          onClick={toggleRock}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            isRocking 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          {isRocking ? 'Stop Rock' : 'Rock'}
        </button>
        <button
          onClick={resetView}
          className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 transition-colors"
        >
          Reset View
        </button>
      </div>
    </div>
  );
};

export default MoleculeViewer;