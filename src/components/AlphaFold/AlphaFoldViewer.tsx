'use client';
import React, { useEffect, useRef, useState } from 'react';
import * as NGL from 'ngl';

interface AlphaFoldViewerProps {
  pdbStructure?: string;
  width?: number;
  height?: number;
}

const AlphaFoldViewer: React.FC<AlphaFoldViewerProps> = ({ 
  pdbStructure, 
  width = 800, 
  height = 600 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isRocking, setIsRocking] = useState(false);

  // Initialize NGL Stage
  useEffect(() => {
    if (!containerRef.current) return;

    const initStage = async () => {
      try {
        if (!containerRef.current) {
          throw new Error('Container element not found');
        }

        // Clean up any existing viewer
        if (viewerRef.current) {
          viewerRef.current.dispose();
          viewerRef.current = null;
        }

        console.log('Initializing NGL Stage with container dimensions:', 
          containerRef.current.offsetWidth, 
          containerRef.current.offsetHeight);

        // Create NGL Stage
        const stage = new NGL.Stage(containerRef.current, {
          backgroundColor: 'white',
          quality: 'medium', // Try medium instead of high to reduce initial load
          impostor: true,
          webgl: { preserveDrawingBuffer: true } // May help with rendering issues
        });

        // Wait for DOM to update
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (!stage || !stage.viewer) {
          throw new Error('Failed to initialize viewer');
        }

        // Set size explicitly
        stage.setSize(width, height);
        
        // Explicitly trigger a resize after initialization
        stage.handleResize();
        
        viewerRef.current = stage;
        setInitialized(true);
        console.log('NGL Stage successfully initialized');

        // Add resize listener
        const handleResize = () => {
          if (stage && stage.handleResize) {
            stage.handleResize();
          }
        };

        window.addEventListener('resize', handleResize);
        return () => {
          window.removeEventListener('resize', handleResize);
          if (stage && stage.dispose) {
            try {
              stage.dispose();
            } catch (e) {
              console.error('Error disposing stage:', e);
            }
          }
          viewerRef.current = null;
        };
      } catch (err) {
        console.error('Error initializing NGL Stage:', err);
        setError('Failed to initialize 3D viewer');
        setLoading(false);
        return undefined;
      }
    };

    initStage();
  }, [width, height]);

  // Reset animation states when loading new structure
  useEffect(() => {
    setIsSpinning(false);
    setIsRocking(false);
  }, [pdbStructure]);

  // Handle structure loading - only run when both initialized and pdbStructure exists
  useEffect(() => {
    if (!viewerRef.current || !pdbStructure || !initialized) {
      if (!pdbStructure) {
        setError('No structure data provided');
        setLoading(false);
      }
      return;
    }

    const loadStructure = async () => {
      let component = null;
      try {
        setError(null);
        setLoading(true);

        // Clear existing components
        viewerRef.current.removeAllComponents();
        
        // Get structure data
        let structureData: string;
        
        console.log('Processing PDB structure data');
        
        // Try parsing as JSON if it starts with { or [
        if (typeof pdbStructure === 'string' && 
           (pdbStructure.trim().startsWith('{') || pdbStructure.trim().startsWith('['))) {
          try {
            const parsed = JSON.parse(pdbStructure);
            structureData = Array.isArray(parsed.pdbs) ? parsed.pdbs[0] : parsed;
            console.log('Parsed PDB from JSON format');
          } catch (e) {
            console.log('Not valid JSON, using as raw PDB');
            structureData = pdbStructure;
          }
        } else {
          structureData = pdbStructure;
        }
        
        // Validate data
        if (!structureData || typeof structureData !== 'string') {
          throw new Error('Invalid or empty structure data');
        }
        
        // Log data info
        console.log('Structure data length:', structureData.length);
        console.log('First 100 chars:', structureData.substring(0, 100));
        
        // Check basic PDB format
        if (!structureData.includes('ATOM')) {
          throw new Error('Invalid PDB format - missing ATOM records');
        }

        // Create blob with structure data
        const blob = new Blob([structureData], { type: 'text/plain' });
        
        // Load structure with explicit ext parameter
        component = await viewerRef.current.loadFile(blob, { 
          ext: 'pdb',
          defaultRepresentation: false
        });

        if (!component) {
          throw new Error('Failed to create component');
        }

        // Wait for structure to be processed
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!component.structure) {
          throw new Error('No structure data loaded');
        }

        console.log('Structure loaded successfully');
        
        // Add representations one by one
        component.addRepresentation('cartoon', {
          color: 'chainid',
          smoothSheet: true
        });
        
        // Add other representations only if cartoon one succeeded
        component.addRepresentation('ball+stick', {
          sele: 'hetero',
          colorValue: 'lightgray'
        });
        
        component.addRepresentation('surface', {
          sele: 'polymer',
          opacity: 0.3,
          colorScheme: 'residueindex'
        });

        // Center view on structure and explicitly trigger animation/rendering
        component.autoView();
        viewerRef.current.handleResize();
        viewerRef.current.viewer.requestRender();
        
        setError(null);
        console.log('Structure rendering complete');
      } catch (err) {
        console.error('Error loading structure:', err);
        setError(err instanceof Error ? err.message : 'Failed to load structure');
        
        // Clean up failed component
        if (component && component.dispose) {
          try {
            component.dispose();
          } catch (e) {
            console.error('Error disposing component:', e);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadStructure();
  }, [pdbStructure, initialized]);

  return (
    <div className="flex flex-col items-center">
      <div 
        ref={containerRef}
        className="relative rounded-lg overflow-hidden bg-white shadow-md border border-gray-200"
        style={{ 
          width: width + 'px',
          height: height + 'px',
          margin: '0 auto'
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <div className="text-gray-600">Loading structure...</div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-red-500 p-4 text-center max-w-md">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}
        
        {!loading && !error && !pdbStructure && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-gray-500 p-4 text-center max-w-md">
              <p>No protein structure data provided</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Add controls below the viewer */}
      {initialized && !loading && !error && pdbStructure && (
        <div className="mt-4 flex space-x-2">
          <button 
            onClick={() => {
              if (viewerRef.current) {
                const newSpinState = !isSpinning;
                viewerRef.current.spin(newSpinState ? 1 : 0);
                setIsSpinning(newSpinState);
              }
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {isSpinning ? 'Stop Spin' : 'Start Spin'}
          </button>
          <button 
            onClick={() => {
              if (viewerRef.current) {
                const newRockState = !isRocking;
                viewerRef.current.rock(newRockState ? 1 : 0);
                setIsRocking(newRockState);
              }
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {isRocking ? 'Stop Rock' : 'Start Rock'}
          </button>
          <button 
            onClick={() => {
              if (viewerRef.current) {
                viewerRef.current.spin(0);
                viewerRef.current.rock(0);
                viewerRef.current.autoView();
                setIsSpinning(false);
                setIsRocking(false);
              }
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reset View
          </button>
        </div>
      )}
    </div>
  );
};

export default AlphaFoldViewer;