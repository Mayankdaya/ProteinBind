'use client';
import React, { useEffect, useRef, useState } from 'react';
import { initRDKit } from '@/lib/rdkit';

interface MoleculeStructureProps {
  smiles?: string;
  structure?: string;
  width?: number;
  height?: number;
  options?: {
    width?: number;
    height?: number;
    is3D?: boolean;
  };
}

const MoleculeStructure: React.FC<MoleculeStructureProps> = ({ 
  smiles, 
  structure,
  width = 300,
  height = 300,
  options = { width: 300, height: 300, is3D: false } 
}) => {
  const moleculeString = structure || smiles || '';
  const finalWidth = width || options?.width || 300;
  const finalHeight = height || options?.height || 300;
  const [svg, setSvg] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rdkitRef = useRef<any>(null);
  const molRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let mounted = true;

    const renderMolecule = async () => {
      if (!moleculeString || moleculeString.trim().length === 0) {
        setError('No molecule structure provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const RDKit = await initRDKit();
        if (!mounted) return;

        rdkitRef.current = RDKit;
        const mol = RDKit.get_mol(moleculeString);
        if (!mol) {
          throw new Error('Invalid molecule structure');
        }

        molRef.current = mol;

        if (options.is3D && canvasRef.current) {
          // 3D rendering
          mol.add_hs();
          const result = mol.embed_molecule();
          if (result === -1) {
            throw new Error('Failed to generate 3D coordinates');
          }
          mol.compute_2d_coords();
          mol.draw_to_canvas_with_highlights(canvasRef.current, JSON.stringify({
            width: finalWidth,
            height: finalHeight,
            legend: '',
            bondLineWidth: 1,
            rotate: 30,
            clearBackground: true
          }));
        } else {
          // 2D rendering
          const svgString = mol.get_svg(finalWidth, finalHeight);
          if (mounted) {
            setSvg(svgString);
          }
        }

        if (mounted) {
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error('Error rendering molecule:', err);
          setError(err instanceof Error ? err.message : 'Failed to render molecule');
          setLoading(false);
        }
      } finally {
        if (molRef.current && mounted) {
          molRef.current.delete();
          molRef.current = null;
        }
      }
    };

    renderMolecule();

    return () => {
      mounted = false;
      if (molRef.current) {
        molRef.current.delete();
        molRef.current = null;
      }
    };
  }, [moleculeString, finalWidth, finalHeight, options.is3D]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-gray-50" data-testid="molecule-structure">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
          <div className="text-sm text-gray-600">Loading molecule...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px] bg-gray-50 p-4" data-testid="molecule-structure">
        <div className="text-red-500 font-medium mb-2">Error</div>
        <div className="text-red-500 text-sm text-center">{error}</div>
      </div>
    );
  }

  return options.is3D ? (
    <canvas
      ref={canvasRef}
      className="flex items-center justify-center bg-white rounded"
      data-testid="molecule-structure"
      width={finalWidth}
      height={finalHeight}
      style={{ 
        width: finalWidth, 
        height: finalHeight,
        minHeight: '200px',
        margin: 'auto'
      }}
    />
  ) : (
    <div 
      className="flex items-center justify-center bg-white rounded"
      data-testid="molecule-structure"
      style={{ 
        width: finalWidth, 
        height: finalHeight,
        minHeight: '200px',
        margin: 'auto'
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default MoleculeStructure;
