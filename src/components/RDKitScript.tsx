'use client';
import Script from 'next/script';
import React from 'react';

const RDKitScript = () => {
  return (
    <>
      <Script
        src="/_next/static/chunks/RDKit_minimal.js"
        strategy="beforeInteractive"
        onLoad={() => {
          if (typeof window !== 'undefined' && window.RDKit) {
            window.initRDKitModule = window.RDKit;
            console.log('RDKit loaded successfully');
          } else {
            console.error('RDKit not found in window object');
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
