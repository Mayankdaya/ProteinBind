'use client';
import Script from 'next/script';
import React, { useEffect } from 'react';

declare global {
  interface Window {
    RDKit: any;
    RDKitModuleIsReady?: boolean;
  }
}

const RDKitScript = () => {
  useEffect(() => {
    // Pre-fetch WASM file on component mount
    const preFetchWasm = async () => {
      try {
        const baseUrl = window.location.origin;
        const wasmPath = `${baseUrl}/static/wasm/RDKit_minimal.wasm`;
        const response = await fetch(wasmPath);
        if (!response.ok) {
          throw new Error(`WASM file not found (status: ${response.status})`);
        }
        
        // Pre-load the wasm file into browser cache
        await response.arrayBuffer();
        console.log('WASM file pre-fetched successfully');
      } catch (error) {
        console.error('Failed to pre-fetch WASM file:', error);
      }
    };

    if (typeof window !== 'undefined') {
      preFetchWasm();
    }
  }, []);

  return (
    <>
      <Script
        id="rdkit-script"
        src="/static/wasm/RDKit_minimal.js"
        strategy="beforeInteractive"
        onLoad={() => {
          if (typeof window !== 'undefined') {
            try {
              const baseUrl = window.location.origin;
              const wasmPath = `${baseUrl}/static/wasm/RDKit_minimal.wasm`;
              const jsPath = `${baseUrl}/static/wasm/RDKit_minimal.js`;

              // Ensure Module is properly initialized
              if (!window.Module) {
                window.Module = {
                  locateFile: (path: string) => {
                    if (path.endsWith('.wasm')) {
                      return wasmPath;
                    }
                    return jsPath;
                  }
                };
              }

              // Set up proper initialization promise
              if (typeof window.initRDKitModule === 'function') {
                window.initRDKitModule()
                  .then((RDKit) => {
                    window.RDKit = RDKit;
                    window.RDKitModuleIsReady = true;
                    console.log('RDKit initialized successfully');
                  })
                  .catch(error => {
                    console.error('Failed to initialize RDKit:', error);
                    window.RDKitModuleIsReady = false;
                  });
              }
            } catch (error) {
              console.error('Error in RDKit initialization:', error);
              window.RDKitModuleIsReady = false;
            }
          }
        }}
        onError={(e) => {
          console.error('Failed to load RDKit script:', e);
        }}
      />
    </>
  );
};

export default RDKitScript;
