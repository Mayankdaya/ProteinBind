'use client';
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
  const [rdkitInitialized, setRdkitInitialized] = useState(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initializationAttempts = useRef(0);
  const maxRetries = 3;
  const retryDelay = 1000;

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
    let initializationTimeout: NodeJS.Timeout;

    const drawMolecule = async () => {
      if (!mounted) return;
      const moleculeString = smiles || structure || "";
      console.log('Drawing molecule:', { moleculeString, svgMode });
      
      if (!moleculeString) {
        console.log('No molecule string provided');
        setError('No molecule structure provided');
        setLoading(false);
        setProcessingState('ready');
        return;
      }

      setLoading(true);
      setProcessingState('initializing');
      setError(null);

      try {
        console.log('Attempting RDKit initialization...');
        const initializationPromise = initRDKit();
        const timeoutPromise = new Promise((_, reject) => {
          initializationTimeout = setTimeout(() => {
            reject(new Error('RDKit initialization timed out'));
          }, 15000);
        });

        rdkitInstance = await Promise.race([initializationPromise, timeoutPromise]);
        clearTimeout(initializationTimeout);
        
        if (!rdkitInstance?.get_mol) {
          throw new Error('Failed to initialize RDKit');
        }
        
        setRdkitInitialized(true);
        console.log('RDKit initialized successfully, processing molecule...');
        setProcessingState('processing');
  
        moleculeInstance = rdkitInstance.get_mol(moleculeString);
        console.log('Molecule instance created:', !!moleculeInstance);
  
        if (!moleculeInstance?.is_valid()) {
          throw new Error('Invalid molecule structure');
        }
  
        if (subStructure) {
          subStructureInstance = rdkitInstance.get_qmol(subStructure);
          console.log('Substructure instance created:', !!subStructureInstance);
        }
  
        if (svgMode && svgContainerRef.current) {
          svgContainerRef.current.innerHTML = '';
          console.log('Rendering in SVG mode...');
          const svg = moleculeInstance.get_svg_with_highlights(
            JSON.stringify({
              ...molDetails,
              ...(subStructureInstance?.is_valid() ? 
                JSON.parse(moleculeInstance.get_substruct_matches(subStructureInstance)) : {})
            })
          );
          if (!svg) {
            throw new Error('Failed to generate SVG');
          }
          svgContainerRef.current.innerHTML = svg;
          console.log('SVG rendered successfully');
        } else if (canvasRef.current) {
          console.log('Rendering in Canvas mode...');
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          if (!context) {
            throw new Error('Failed to get canvas context');
          }
          context.clearRect(0, 0, canvas.width, canvas.height);
          moleculeInstance.draw_to_canvas_with_highlights(
            canvas,
            JSON.stringify({
              ...molDetails,
              ...(subStructureInstance?.is_valid() ? 
                JSON.parse(moleculeInstance.get_substruct_matches(subStructureInstance)) : {})
            })
          );
          console.log('Canvas rendered successfully');
        }
        
        console.log('Molecule rendering completed');
        setProcessingState('ready');
        setLoading(false);
      } catch (error) {
        console.error('Error in drawMolecule:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to render molecule');
          setProcessingState('ready');
          setLoading(false);
        }
      } finally {
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
      }
    };

    if (drawingDelay) {
      setTimeout(drawMolecule, drawingDelay);
    } else {
      drawMolecule();
    }

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

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-transparent p-4 rounded-lg">
        <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px] bg-transparent p-4 rounded-lg">
        <div className="w-8 h-8 mb-4 border-t-2 border-primary border-solid rounded-full animate-spin" />
        <div className="text-gray-600 dark:text-gray-300 text-sm">
          {processingState === 'initializing' ? 'Initializing...' : 'Processing...'}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {svgMode ? (
        <div
          ref={svgContainerRef}
          className="flex items-center justify-center bg-white dark:bg-boxdark rounded-lg p-2 transition-all duration-200"
          style={{ width, height, minHeight: '200px' }}
        />
      ) : (
        <div className="flex items-center justify-center bg-white dark:bg-boxdark rounded-lg p-2 transition-all duration-200"
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