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
    let mounted = true;
    const timeoutIds: NodeJS.Timeout[] = [];

    const initializeRDKit = async () => {
      try {
        if (typeof window === 'undefined') return;

        // Wait a short time to ensure RDKitScript has loaded
        await new Promise(resolve => {
          const timeoutId = setTimeout(resolve, 500);
          timeoutIds.push(timeoutId);
        });

        const rdkit = await initRDKit();
        
        if (!rdkit) {
          throw new Error('RDKit initialization failed - WASM files not found');
        }

        if (mounted) {
          setRDKit(rdkit);
          setError(null);
          setIsLoading(false);
          console.log('RDKit initialized successfully');
        }
      } catch (err) {
        console.error('Failed to initialize RDKit:', err);
        if (mounted) {
          if (retryCount < maxRetries) {
            const timeoutId = setTimeout(() => {
              if (mounted) {
                setRetryCount(prev => prev + 1);
                setError(`Retrying RDKit initialization (${retryCount + 1}/${maxRetries})...`);
              }
            }, 1000 * (retryCount + 1));
            timeoutIds.push(timeoutId);
          } else {
            setError(
              err instanceof Error
                ? `Failed to initialize RDKit: ${err.message}`
                : 'Failed to initialize RDKit. Please check if WASM files are properly loaded.'
            );
            setIsLoading(false);
          }
        }
      }
    };

    initializeRDKit();

    return () => {
      mounted = false;
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [retryCount]);

  return (
    <RDKitContext.Provider value={{ RDKit, isLoading, error }}>
      {children}
    </RDKitContext.Provider>
  );
};
