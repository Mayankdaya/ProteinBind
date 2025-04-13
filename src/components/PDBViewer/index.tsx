'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as NGL from 'ngl';
import MoleculeControls from './MoleculeControls';

// Extended type definitions for NGL
declare module 'ngl' {
  class Vector3 {
    constructor();
    set(x: number, y: number, z: number): void;
  }

  interface Animation {
    controls: {
      rotate: Vector3;
      position: Vector3;
    };
    spin(axis: { x: number; y: number; z: number }, angle: number): void;
  }

  interface Camera {
    position: {
      z: number;
    };
  }

  interface Viewer {
    camera: Camera;
  }

  interface StageParameters {
    impostor?: boolean;
    quality?: string;
    sampleLevel?: number;
    backgroundColor?: string;
    rotateSpeed?: number;
    zoomSpeed?: number;
    panSpeed?: number;
    clipNear?: number;
    clipFar?: number;
    clipDist?: number;
    fogNear?: number;
    fogFar?: number;
    cameraType?: string;
    cameraFov?: number;
    cameraEyeSep?: number;
    lightColor?: number;
    lightIntensity?: number;
    ambientColor?: number;
    ambientIntensity?: number;
    mousePreset?: 'default' | 'pymol' | 'astexviewer';
  }

  interface Stage {
    viewer: Viewer;
    animation: Animation;
    parameters: StageParameters;
    handleResize(): void;
    loadFile(file: Blob | string, params?: { ext?: string }): Promise<Component>;
    makeImage(params: {
      factor?: number;
      antialias?: boolean;
      trim?: boolean;
      transparent?: boolean;
    }): Promise<Blob>;
    dispose(): void;
    autoView(duration?: number): void;
    setParameters(params: StageParameters): void;
  }

  interface RepresentationParameters {
    colorScheme?: string;
    surfaceType?: string;
    quality?: string;
    aspectRatio?: number;
    radiusScale?: number;
    bondScale?: number;
    opacity?: number;
    sidechain?: boolean;
  }

  interface Component {
    removeAllRepresentations(): void;
    addRepresentation(type: string, params?: RepresentationParameters): void;
    autoView(duration?: number): void;
  }

  const Vector3: new () => Vector3;
}

interface PDBViewerProps {
  pdbString: string;
  width?: number;
  height?: number;
  initialBackground?: string;
}

const PDBViewer: React.FC<PDBViewerProps> = ({
  pdbString,
  width = 600,
  height = 600,
  initialBackground = '#ffffff'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<NGL.Stage | null>(null);
  const componentRef = useRef<NGL.Component | null>(null);
  const [representation, setRepresentation] = useState('cartoon');
  const [colorScheme, setColorScheme] = useState('chainid');
  const [backgroundColor, setBackgroundColor] = useState(initialBackground);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize event handlers to prevent recreation on each render
  const handleResize = useCallback(() => {
    if (stageRef.current && containerRef.current) {
      stageRef.current.handleResize();
    }
  }, []);

  const takeScreenshot = useCallback(() => {
    if (stageRef.current) {
      try {
        const canvas = stageRef.current.viewer.renderer.domElement;
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'protein-structure.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      } catch (error) {
        console.error('Failed to take screenshot:', error);
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        takeScreenshot();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [takeScreenshot]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!stageRef.current) return;

    const rotateSpeed = 1;
    const zoomSpeed = 0.1;

    switch (e.key) {
      case 'ArrowLeft':
        stageRef.current.animation.spin({ x: 0, y: 1, z: 0 }, -rotateSpeed);
        break;
      case 'ArrowRight':
        stageRef.current.animation.spin({ x: 0, y: 1, z: 0 }, rotateSpeed);
        break;
      case 'ArrowUp':
        stageRef.current.animation.spin({ x: 1, y: 0, z: 0 }, -rotateSpeed);
        break;
      case 'ArrowDown':
        stageRef.current.animation.spin({ x: 1, y: 0, z: 0 }, rotateSpeed);
        break;
      case '+':
      case '=':
        stageRef.current.viewer.camera.position.z -= zoomSpeed;
        break;
      case '-':
      case '_':
        stageRef.current.viewer.camera.position.z += zoomSpeed;
        break;
      case 'r':
        stageRef.current.autoView(1000);
        break;
      case 's':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          takeScreenshot();
        }
        break;
      default:
        return;
    }
    e.preventDefault();
  }, [takeScreenshot]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!stageRef.current) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      stageRef.current.animation.spin({ x: 0, y: 0, z: 0 }, 0);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || !pdbString) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    const initViewer = async () => {
      try {
        if (!containerRef.current) return;

        // Create NGL Stage
        const stage = new NGL.Stage(containerRef.current, { backgroundColor }) as NGL.Stage;
        stageRef.current = stage;

        // Add event listeners
        window.addEventListener('resize', handleResize);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Load and display structure
        const blob = new Blob([pdbString], { type: 'text/plain' });
        const component = await stage.loadFile(blob, { ext: 'pdb' });

        if (!mounted) return;

        componentRef.current = component;
        updateRepresentation(representation, colorScheme);
        component.autoView();
        setLoading(false);

        // Add mouse and keyboard controls info
        if (containerRef.current) {
          const tooltip = document.createElement('div');
          tooltip.className = 'absolute bottom-2 right-2 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-boxdark p-2 rounded-lg shadow-sm space-y-1';
          tooltip.innerHTML = `
            <div>Mouse: Left = Rotate, Middle = Zoom, Right = Pan</div>
            <div>Keyboard: Arrows = Rotate, +/- = Zoom, R = Reset View, Ctrl+S = Screenshot</div>
          `;
          containerRef.current.appendChild(tooltip);
        }

      } catch (err) {
        console.error('Error initializing PDB viewer:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize structure viewer');
          setLoading(false);
        }
      }
    };

    initViewer();

    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (stageRef.current) {
        stageRef.current.dispose();
        stageRef.current = null;
      }
      componentRef.current = null;
    };
  }, [pdbString, backgroundColor, handleResize, handleKeyDown, handleKeyUp]);

  const updateRepresentation = (rep: string, color: string) => {
    if (!componentRef.current) return;

    try {
      // Remove existing representations
      componentRef.current.removeAllRepresentations();

      // Add new representation with color scheme
      componentRef.current.addRepresentation(rep, {
        colorScheme: color,
        surfaceType: 'ms', // For surface representation
        quality: 'high', // For surface and spacefill
        aspectRatio: 2.0, // For cartoon representation
        radiusScale: 0.8, // For spacefill and ball+stick
        bondScale: 0.3, // For ball+stick
        opacity: 1.0,
        sidechain: true // Show sidechains in cartoon representation
      });

      // Update camera position with smooth transition
      if (stageRef.current) {
        stageRef.current.autoView(1000); // Smooth transition in 1 second
      }
    } catch (err) {
      console.error('Error updating representation:', err);
      setError('Failed to update structure visualization');
    }
  };

  const handleRepresentationChange = (newRep: string) => {
    setRepresentation(newRep);
    updateRepresentation(newRep, colorScheme);
  };

  const handleColorSchemeChange = (newScheme: string) => {
    setColorScheme(newScheme);
    updateRepresentation(representation, newScheme);
  };

  const handleBackgroundChange = (newColor: string) => {
    setBackgroundColor(newColor);
    if (stageRef.current) {
      stageRef.current.setParameters({ backgroundColor: newColor });
    }
  };

  const handleTakeScreenshot = () => {
    if (!stageRef.current) return;

    try {
      // Get blob from stage
      stageRef.current.makeImage({
        factor: 1,
        antialias: true,
        trim: false,
        transparent: false
      }).then((blob: Blob) => {
        // Convert blob to URL
        const url = URL.createObjectURL(blob);

        // Create temporary link and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'protein-structure.png';
        document.body.appendChild(a);
        a.click();

        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }).catch((err: Error) => {
        console.error('Failed to take screenshot:', err);
        setError('Failed to take screenshot');
      });
    } catch (err) {
      console.error('Error taking screenshot:', err);
      setError('Failed to take screenshot');
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 rounded-lg border border-danger bg-danger-light text-danger" style={{ width, height }}>
        <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-center">{error}</p>
        <button 
          onClick={() => {
            setError(null);
            setLoading(true);
            // Re-initialize the viewer
            if (stageRef.current) {
              stageRef.current.dispose();
              stageRef.current = null;
            }
            componentRef.current = null;
          }}
          className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <MoleculeControls
        currentRepresentation={representation}
        currentColorScheme={colorScheme}
        currentBackground={backgroundColor}
        onChangeRepresentation={handleRepresentationChange}
        onChangeColorScheme={handleColorSchemeChange}
        onChangeBackground={handleBackgroundChange}
        onTakeScreenshot={handleTakeScreenshot}
      />
      <div className="relative">
        <div
          ref={containerRef}
          style={{ width, height }}
          className="rounded-lg overflow-hidden border border-stroke dark:border-strokedark"
        />
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={takeScreenshot}
            className="bg-white/90 hover:bg-white text-gray-800 px-3 py-1 rounded shadow-lg flex items-center gap-2"
            title="Take Screenshot (Ctrl/Cmd + S)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Screenshot
          </button>
        </div>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-boxdark bg-opacity-75 dark:bg-opacity-75">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-t-2 border-primary border-solid rounded-full animate-spin" />
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading structure...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDBViewer;