import initRDKitModule from "@rdkit/rdkit";

let rdkitInstance: any = null;
let rdkitPromise: Promise<any> | null = null;

export const initRDKit = async () => {
  if (rdkitInstance) return rdkitInstance;
  
  if (!rdkitPromise) {
    rdkitPromise = new Promise((resolve) => {
      if (typeof window !== 'undefined') {
        const script = document.createElement('script');
        script.src = '/RDKit_minimal.js';
        script.onload = async () => {
          try {
            // @ts-ignore
            const RDKit = await window.initRDKitModule();
            rdkitInstance = RDKit;
            resolve(RDKit);
          } catch (error) {
            console.error('Failed to initialize RDKit:', error);
            resolve(null);
          }
        };
        script.onerror = () => {
          console.error('Failed to load RDKit script');
          resolve(null);
        };
        document.head.appendChild(script);
      } else {
        resolve(null);
      }
    });
  }

  return rdkitPromise;
};

// Add a check function to verify WASM loading
export function checkRDKitAvailability() {
  if (typeof window === 'undefined') return false;
  return !!window.RDKit;
}

// Add TypeScript interface for window object
declare global {
  interface Window {
    RDKit: any;
    initRDKitModule?: () => Promise<any>;
  }
}
