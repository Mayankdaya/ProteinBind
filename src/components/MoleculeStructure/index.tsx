"use client";
import React, { useEffect, useRef, useState } from 'react';
import { initRDKit } from '@/lib/rdkit';

interface MoleculeStructureProps {
  smiles?: string;
  structure?: string;
  width?: number;
  height?: number;
  id?: string;
  scores?: number;
  svgMode?: boolean;
  subStructure?: string;
  extraDetails?: Record<string, any>;
  drawingDelay?: number;
}

const MoleculeStructure: React.FC<MoleculeStructureProps> = ({
  smiles,
  structure,
  width = 300,
  height = 200,
  id = "mol",
  scores,
  svgMode = false,
  subStructure = "",
  extraDetails = {},
  drawingDelay,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingState, setProcessingState] = useState<'initializing' | 'processing' | 'ready'>('initializing');
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const molDetails = {
    width,
    height,
    bondLineWidth: 1,
    addStereoAnnotation: true,
    ...extraDetails,
  };

  useEffect(() => {
    let mounted = true;
    let rdkitInstance: any = null;
    let moleculeInstance: any = null;
    let subStructureInstance: any = null;

    const drawMolecule = async () => {
      if (!svgContainerRef.current || !mounted) return;
      setLoading(true);
      setProcessingState('initializing');
      setError(null);

      const draw = () => {
        try {
          const moleculeString = smiles || structure || "";
          if (!moleculeString) {
            throw new Error('No molecule structure provided');
          }

          moleculeInstance = rdkitInstance.get_mol(moleculeString);
          subStructureInstance = rdkitInstance.get_qmol(subStructure || "invalid");

          if (!moleculeInstance || !moleculeInstance.is_valid()) {
            throw new Error('Invalid molecule structure');
          }

          if (svgMode) {
            const svg = moleculeInstance.get_svg_with_highlights(
              JSON.stringify({
                ...molDetails,
                ...(subStructureInstance && subStructureInstance.is_valid() ? 
                  JSON.parse(moleculeInstance.get_substruct_matches(subStructureInstance)) : {})
              })
            );
            if (!svg) {
              throw new Error('Failed to generate SVG');
            }
            if (mounted && svgContainerRef.current) {
              svgContainerRef.current.innerHTML = svg;
            }
          } else {
            const canvas = canvasRef.current;
            if (!canvas) {
              throw new Error('Canvas element not found');
            }
            const context = canvas.getContext('2d');
            if (!context) {
              throw new Error('Failed to get canvas context');
            }
            context.clearRect(0, 0, canvas.width, canvas.height);
            moleculeInstance.draw_to_canvas_with_highlights(
              canvas,
              JSON.stringify({
                ...molDetails,
                ...(subStructureInstance && subStructureInstance.is_valid() ? 
                  JSON.parse(moleculeInstance.get_substruct_matches(subStructureInstance)) : {})
              })
            );
          }
        } catch (error) {
          console.error('Error drawing molecule:', error);
          if (mounted) {
            setError(error instanceof Error ? error.message : 'Failed to render molecule');
          }
        }
      };

      try {
        rdkitInstance = await initRDKit();
        if (!rdkitInstance) {
          throw new Error('RDKit initialization failed');
        }
        setProcessingState('processing');

        if (drawingDelay) {
          setTimeout(draw, drawingDelay);
        } else {
          draw();
        }
        
        setProcessingState('ready');
      } catch (error) {
        console.error('Error initializing RDKit:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to initialize RDKit');
          setProcessingState('ready');
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
      if (moleculeInstance) {
        try {
          moleculeInstance.delete();
        } catch (err) {
          console.error('Error cleaning up molecule instance:', err);
        }
      }
      if (subStructureInstance) {
        try {
          subStructureInstance.delete();
        } catch (err) {
          console.error('Error cleaning up substructure instance:', err);
        }
      }
      if (svgContainerRef.current) {
        svgContainerRef.current.innerHTML = '';
      }
    };
  }, [smiles, structure, width, height, svgMode, subStructure, extraDetails, drawingDelay]);

  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px] bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      <div className="w-8 h-8 mb-4 border-t-2 border-primary border-solid rounded-full animate-spin" />
      <div className="text-gray-600 dark:text-gray-300">
        {processingState === 'initializing' ? 'Initializing RDKit...' : 'Processing molecule...'}
      </div>
    </div>
  );

  const renderError = () => (
    <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-red-50 dark:bg-red-900/20 p-4 rounded-lg shadow-sm">
      <div className="flex items-center text-red-600 dark:text-red-400">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{error}</span>
      </div>
    </div>
  );

  if (loading) {
    return renderLoadingState();
  }

  if (error) {
    return renderError();
  }

  return (
    <div className="relative">
      {svgMode ? (
        <div
          ref={svgContainerRef}
          className="flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 transition-all duration-200"
          style={{ width, height, minHeight: '200px' }}
        />
      ) : (
        <div className="flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 transition-all duration-200"
          style={{ width, height, minHeight: '200px' }}>
          <canvas
            ref={canvasRef}
            id={id}
            width={width}
            height={height}
          />
        </div>
      )}
      {scores !== undefined && (
        <div className="absolute top-2 right-2 bg-primary text-white px-3 py-1 rounded-full text-sm font-medium shadow-sm">
          Score: {scores.toFixed(2)}
        </div>
      )}
    </div>
  );
};

export default MoleculeStructure;