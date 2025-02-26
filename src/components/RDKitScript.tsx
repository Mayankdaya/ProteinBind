'use client';
import Script from 'next/script';
import React from 'react';

const RDKitScript = () => {
  return (
    <>
      <Script
        src="https://unpkg.com/@rdkit/rdkit/Code/MinimalLib/dist/RDKit_minimal.js"
        strategy="beforeInteractive"
        onLoad={() => {
          window.initRDKitModule = window.RDKit;
          console.log('RDKit loaded successfully');
        }}
      />
    </>
  );
};

export default RDKitScript;
