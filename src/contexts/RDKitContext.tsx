'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { initRDKit } from '@/lib/rdkit';

interface RDKitContextType {
  RDKit: any;
  isLoading: boolean;
  error: string | null;
}

const RDKitContext = createContext<RDKitContextType>({
  RDKit: null,
  isLoading: true,
  error: null,
});

export const useRDKit = () => useContext(RDKitContext);

export const RDKitProvider = ({ children }: { children: React.ReactNode }) => {
  const [RDKit, setRDKit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    const initializeRDKit = async () => {
      try {
        if (typeof window === 'undefined') return;

        const rdkit = await initRDKit();
        
        if (!rdkit) {
          throw new Error('RDKit initialization failed - WASM files not found');
        }

        setRDKit(rdkit);
        setError(null);
        console.log('RDKit initialized successfully');
      } catch (err) {
        console.error('Failed to initialize RDKit:', err);
        if (retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            setError(`Retrying RDKit initialization (${retryCount + 1}/${maxRetries})...`);
          }, 1000 * (retryCount + 1));
        } else {
          setError(
            err instanceof Error
              ? `Failed to initialize RDKit: ${err.message}`
              : 'Failed to initialize RDKit. Please check if WASM files are properly loaded.'
          );
        }
      } finally {
        if (retryCount >= maxRetries) {
          setIsLoading(false);
        }
      }
    };

    initializeRDKit();
  }, [retryCount]);

  return (
    <RDKitContext.Provider value={{ RDKit, isLoading, error }}>
      {children}
    </RDKitContext.Provider>
  );
};
