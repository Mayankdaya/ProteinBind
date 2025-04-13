import initRDKitModule from "@rdkit/rdkit";

let rdkitInstance: any = null;
let rdkitPromise: Promise<any> | null = null;
let scriptLoaded = false;

const DEBUG = true;
const debugLog = (message: string, ...args: any[]) => {
  if (DEBUG) {
    console.log(`[RDKit Debug] ${message}`, ...args);
  }
};

const MAX_RETRIES = 5; // Increased from 3
const TIMEOUT_MS = 180000; // 180 seconds (increased from 120)
const RETRY_DELAY = 2000; // 2 seconds (increased from 1)
const SCRIPT_LOAD_TIMEOUT = 10000; // 10 seconds

type RDKitLoader = () => Promise<any>;

declare global {
  interface Window {
    RDKitCustomPaths?: CustomPaths;
    initRDKitModule: RDKitLoader;
    RDKit: any;
    Module?: any;
    RDKitModuleIsReady?: boolean;
  }
}

interface CustomPaths {
  wasmPath?: string;
  jsPath?: string;
}

// Function to dynamically load the RDKit JS script
const loadRDKitScript = (jsPath: string): Promise<void> => {
  if (scriptLoaded) return Promise.resolve();
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = jsPath;
    script.async = true;
    
    const timeoutId = setTimeout(() => {
      reject(new Error(`Script load timed out: ${jsPath}`));
    }, SCRIPT_LOAD_TIMEOUT);
    
    script.onload = () => {
      debugLog(`Script loaded successfully: ${jsPath}`);
      clearTimeout(timeoutId);
      scriptLoaded = true;
      resolve();
    };
    
    script.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to load script: ${jsPath}`));
    };
    
    document.head.appendChild(script);
  });
};

export const initRDKit = async () => {
  debugLog("initRDKit called");
  
  if (rdkitInstance) {
    debugLog("Returning existing rdkitInstance");
    return rdkitInstance;
  }
  
  if (!rdkitPromise) {
    debugLog("Creating new rdkitPromise");
    
    rdkitPromise = new Promise(async (resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error("RDKit initialization called in non-browser environment"));
        return;
      }

      debugLog("Running in browser environment");

      // Check if Module is already available (from RDKit_minimal.js)
      if (window.Module) {
        debugLog("Found existing Module, using it directly");
        rdkitInstance = window.Module;
        resolve(rdkitInstance);
        return;
      }
      
      const customPaths = window.RDKitCustomPaths || {};
      const wasmPath = customPaths.wasmPath ?? '/static/wasm/RDKit_minimal.wasm';
      const jsPath = customPaths.jsPath ?? '/static/wasm/RDKit_minimal.js';
      
      debugLog(`WASM Path: ${wasmPath}`);
      debugLog(`JS Path: ${jsPath}`);
      
      // Try to load the script first if initRDKitModule is not available
      if (typeof window.initRDKitModule !== 'function') {
        try {
          debugLog("Loading RDKit script dynamically");
          await loadRDKitScript(jsPath);
        } catch (scriptError) {
          debugLog(`Script loading error: ${scriptError.message}`);
          // Continue anyway, as the script might be loaded through other means
        }
      }
      
      let attempts = 0;
      while (attempts < MAX_RETRIES) {
        attempts++;
        try {
          // Check if initRDKitModule is available
          if (typeof window.initRDKitModule !== 'function') {
            debugLog(`initRDKitModule not found, waiting... (attempt ${attempts}/${MAX_RETRIES})`);
            await new Promise(r => setTimeout(r, RETRY_DELAY));
            continue;
          }

          const initStartTime = Date.now();
          debugLog(`Calling initRDKitModule (attempt ${attempts}/${MAX_RETRIES})`);
          
          const result = await Promise.race([
            window.initRDKitModule(),
            new Promise((_, reject) => {
              setTimeout(() => {
                const elapsed = (Date.now() - initStartTime) / 1000;
                reject(new Error(`RDKit initialization timed out after ${elapsed.toFixed(1)}s`));
              }, TIMEOUT_MS);
            })
          ]);
          
          if (!result) {
            throw new Error("RDKit initialization returned null or undefined");
          }
          
          // Verify that the RDKit instance has the expected methods
          if (!result.version || typeof result.version !== 'function') {
            throw new Error("Invalid RDKit instance: missing version method");
          }

          rdkitInstance = result;
          window.RDKitModuleIsReady = true;
          window.RDKit = result; // Make RDKit available globally for convenience
          debugLog("RDKit initialized successfully");
          resolve(rdkitInstance);
          return;
          
        } catch (error) {
          debugLog(`Initialization attempt ${attempts} failed:`, error);
          
          // Check if we've reached max retries
          if (attempts >= MAX_RETRIES) {
            const errorMessage = `RDKit initialization failed after ${MAX_RETRIES} attempts. Please check your network connection and try refreshing the page.`;
            debugLog(errorMessage);
            reject(new Error(errorMessage));
            rdkitPromise = null; // Reset promise to allow future retries
            return;
          }
          
          // Exponential backoff for retries
          const backoffDelay = RETRY_DELAY * Math.pow(1.5, attempts - 1);
          debugLog(`Retrying in ${backoffDelay}ms...`);
          await new Promise(r => setTimeout(r, backoffDelay));
          attempts++;
        }
      }
    });
  }

  try {
    return await rdkitPromise;
  } catch (error) {
    rdkitPromise = null; // Reset promise on error
    throw error;
  }
};

// Alternative paths configuration
export const configureRDKitPaths = (wasmPath: string, jsPath: string) => {
  if (typeof window !== 'undefined') {
    window.RDKitCustomPaths = { wasmPath, jsPath };
    rdkitInstance = null;
    rdkitPromise = null;
    debugLog(`RDKit paths configured to WASM: ${wasmPath}, JS: ${jsPath}`);
  }
};

export const renderMoleculeFromSmiles = async (
  smiles: string, 
  elementId: string, 
  width: number = 300, 
  height: number = 200
): Promise<boolean> => {
  debugLog(`Rendering molecule from SMILES: "${smiles}" to element: "${elementId}"`);
  
  try {
    const RDKit = await initRDKit();
    debugLog("RDKit initialized, creating molecule");
    
    const mol = RDKit.get_mol(smiles);
    if (!mol) {
      debugLog(`Failed to create molecule from SMILES: ${smiles}`);
      const element = document.getElementById(elementId);
      if (element) {
        element.innerHTML = `<div style="color: red; border: 1px solid red; padding: 10px;">
          Error: Invalid SMILES string: ${smiles}
        </div>`;
      }
      return false;
    }
    
    debugLog("Molecule created, generating image");
    
    const svg = mol.get_svg(width, height);
    mol.delete();
    
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(svg);
    
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = '';
      element.appendChild(img);
      debugLog("Image inserted successfully");
    } else {
      debugLog(`Element with ID "${elementId}" not found in DOM`);
      return false;
    }
    
    return true;
  } catch (error) {
    debugLog("Error rendering molecule", error);
    
    try {
      const element = document.getElementById(elementId);
      if (element) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        element.innerHTML = `<div style="color: red; border: 1px solid red; padding: 10px;">
          Error rendering molecule: ${errorMessage}
        </div>`;
      }
    } catch (e) {
    }
    
    return false;
  }
};

export const createMoleculeElement = async (smiles: string, width: number = 300, height: number = 200) => {
  debugLog(`Creating standalone molecule element for SMILES: "${smiles}"`);
  
  try {
    const RDKit = await initRDKit();
    const mol = RDKit.get_mol(smiles);
    
    if (!mol) {
      debugLog(`Failed to create molecule from SMILES: ${smiles}`);
      return document.createTextNode(`Invalid SMILES: ${smiles}`);
    }
    
    const svg = mol.get_svg(width, height);
    mol.delete();
    
    const container = document.createElement('div');
    container.innerHTML = svg;
    
    debugLog("Created standalone molecule element");
    return container;
  } catch (error) {
    debugLog("Error creating molecule element", error);
    const errorElement = document.createElement('div');
    errorElement.style.color = 'red';
    errorElement.style.border = '1px solid red';
    errorElement.style.padding = '10px';
    errorElement.textContent = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
    return errorElement;
  }
};

export const testRDKitSetup = async () => {
  try {
    debugLog("Testing RDKit setup");
    
    const RDKit = await initRDKit();
    debugLog("RDKit initialized");
    
    const testSmiles = ["C", "CC", "CCC", "c1ccccc1", "CC(=O)OC1=CC=CC=C1C(=O)O"];
    
    for (const smiles of testSmiles) {
      try {
        debugLog(`Testing SMILES: ${smiles}`);
        const mol = RDKit.get_mol(smiles);
        
        if (mol) {
          const svg = mol.get_svg(100, 100);
          debugLog(`Successfully created ${smiles} - SVG length: ${svg.length}`);
          mol.delete();
        } else {
          debugLog(`Failed to create molecule from SMILES: ${smiles}`);
        }
      } catch (e) {
        debugLog(`Error processing SMILES ${smiles}:`, e);
      }
    }
    
    return "RDKit tests completed. Check console for details.";
  } catch (error) {
    debugLog("RDKit test failed", error);
    return `RDKit test failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
};

export const getSvgStringFromSmiles = async (
  smiles: string,
  width: number = 300,
  height: number = 200
): Promise<string> => {
  try {
    const RDKit = await initRDKit();
    const mol = RDKit.get_mol(smiles);
    
    if (!mol) {
      return `<svg width="${width}" height="${height}"><text x="10" y="20" fill="red">Invalid SMILES: ${smiles}</text></svg>`;
    }
    
    const svg = mol.get_svg(width, height);
    mol.delete();
    
    return svg;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return `<svg width="${width}" height="${height}"><text x="10" y="20" fill="red">Error: ${errorMessage}</text></svg>`;
  }
};

export const checkRDKitStatus = () => {
  if (typeof window === 'undefined') {
    return 'Not in browser environment';
  }
  
  return {
    rdkitInstance: rdkitInstance ? 'Initialized' : 'Not initialized',
    rdkitPromise: rdkitPromise ? 'Pending' : 'Not created',
    RDKitModuleIsReady: !!window.RDKitModuleIsReady,
    windowHasRDKit: !!window.RDKit,
    windowHasInitModule: !!window.initRDKitModule,
    hasModule: !!window.Module
  };
};

export const tryDirectImport = async () => {
  try {
    debugLog("Trying direct import of RDKit");
    const RDKitModule = await initRDKitModule;
    if (typeof RDKitModule !== 'object' || RDKitModule === null) {
      throw new Error('RDKit module did not initialize correctly');
    }
    rdkitInstance = RDKitModule;
    debugLog("Direct import successful");
    return RDKitModule;
  } catch (error) {
    debugLog("Direct import failed", error);
    throw error;
  }
};

