'use client';
import Script from 'next/script';
import React from 'react';

const RDKitScript = () => {
  return (
    <>
      <Script
        src="/static/wasm/RDKit_minimal.js"
        strategy="beforeInteractive"
        onLoad={() => {
          if (typeof window !== 'undefined') {
            try {
              // Configure custom paths for RDKit files
              const baseUrl = window.location.origin;
              window.RDKitCustomPaths = {
                wasmPath: `${baseUrl}/static/wasm/RDKit_minimal.wasm`,
                jsPath: `${baseUrl}/static/wasm/RDKit_minimal.js`
              };

              // Pre-fetch WASM file to ensure it's available
              fetch(window.RDKitCustomPaths.wasmPath)
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`WASM file not found (status: ${response.status})`);
                  }
                  console.log('WASM file pre-fetched successfully');
                })
                .catch(error => {
                  console.error('Failed to pre-fetch WASM file:', error);
                });

              if (window.RDKit) {
                window.initRDKitModule = window.RDKit;
                console.log('RDKit loaded successfully');
              } else {
                console.warn('RDKit not found in window object, will attempt initialization later');
              }
            } catch (error) {
              console.error('Error during RDKit initialization:', error);
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
