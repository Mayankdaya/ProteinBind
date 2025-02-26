'use client';
import React, { useEffect, useRef, useState } from 'react';

interface MoleculeViewerProps {
  smiles: string;
  size?: number;
}

const MoleculeViewer: React.FC<MoleculeViewerProps> = ({ smiles, size = 300 }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderMolecule = async () => {
      if (!smiles || !divRef.current) return;

      try {
        setLoading(true);
        // Generate a unique ID for the SVG
        const svgId = `mol-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create the SVG URL using PubChem's structure service
        const encodedSmiles = encodeURIComponent(smiles);
        const svgUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodedSmiles}/SVG?image_size=${size}`;

        // Create an SVG container with proper sizing
        const img = new Image();
        img.onload = () => {
          if (divRef.current) {
            divRef.current.innerHTML = `
              <div style="width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
                <img 
                  src="${svgUrl}" 
                  alt="Molecule structure" 
                  style="max-width: 100%; max-height: 100%; object-fit: contain;"
                />
              </div>
            `;
          }
          setLoading(false);
        };
        img.onerror = () => {
          setError('Invalid structure');
          setLoading(false);
        };
        img.src = svgUrl;
        
        setError(null);
      } catch (err) {
        console.error('Error rendering molecule:', err);
        setError('Failed to render molecule');
      }
    };

    renderMolecule();
  }, [smiles, size]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-gray-50 rounded-lg">
        <div className="w-8 h-8 border-t-2 border-primary border-solid rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-gray-50 rounded-lg">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={divRef}
      className="molecule-viewer bg-white rounded-lg shadow-sm overflow-hidden"
      style={{ width: size, height: size, minHeight: '200px' }}
    >
      <div className="flex items-center justify-center w-full h-full">
        <div className="animate-pulse">Loading...</div>
      </div>
    </div>
  );
};

export default MoleculeViewer;