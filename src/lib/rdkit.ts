import initRDKitModule from "@rdkit/rdkit";

// RDKit module will be initialized and its methods will be available through the instance
// We don't need to import Chem and Draw directly as they'll be accessible via the RDKit instance

// Add more comprehensive debugging
let rdkitInstance: any = null;
let rdkitPromise: Promise<any> | null = null;

// Debug configuration
const DEBUG = true;
const debugLog = (message: string, ...args: any[]) => {
  if (DEBUG) {
    console.log(`[RDKit Debug] ${message}`, ...args);
  }
};

export const initRDKit = async () => {
  debugLog("initRDKit called");
  
  if (rdkitInstance) {
    debugLog("Returning existing rdkitInstance");
    return rdkitInstance;
  }
  
  if (!rdkitPromise) {
    debugLog("Creating new rdkitPromise");
    
    rdkitPromise = new Promise((resolve, reject) => {
      if (typeof window !== 'undefined') {
        debugLog("Running in browser environment");
        
        // Use custom paths if configured, otherwise use defaults
        const customPaths = window.RDKitCustomPaths || {};
        const wasmPath = customPaths.wasmPath || '/static/wasm/RDKit_minimal.wasm';
        const jsPath = customPaths.jsPath || '/static/wasm/RDKit_minimal.js';
        
        debugLog(`WASM Path: ${wasmPath}`);
        debugLog(`JS Path: ${jsPath}`);
        
        // Pre-check WASM file availability
        fetch(wasmPath)
          .then(response => {
            if (!response.ok) {
              throw new Error(`WASM file not found (status: ${response.status})`);
            }
            debugLog("WASM file verified");
            
            // Set the locateFile function for RDKit module
            const RDKitModule = {
              locateFile: (file: string) => {
                if (file.endsWith('.wasm')) {
                  return wasmPath;
                }
                return jsPath;
              }
            };
            
            // Initialize RDKit with proper WASM location
            return initRDKitModule(RDKitModule);
          })
          .then((RDKit) => {
            debugLog("RDKit module initialized successfully");
            rdkitInstance = RDKit;
            resolve(RDKit);
          })
          .catch((error) => {
            debugLog("Failed to initialize RDKit module", error);
            reject(new Error(`Failed to initialize RDKit: ${error.message}`));
          });
      } else {
        reject(new Error('RDKit initialization is only supported in browser environment'));
      }
    });
  }
  
  try {
    const instance = await rdkitPromise;
    return instance;
  } catch (error) {
    debugLog("Error in initRDKit", error);
    rdkitPromise = null; // Reset promise to allow retry
    throw error;
  }
};

// Alternative paths configuration
export const configureRDKitPaths = (wasmPath: string, jsPath: string) => {
  // Allow override of paths for environments with different file structures
  window.RDKitCustomPaths = {
    wasmPath,
    jsPath
  };
  
  // Reset any existing initialization
  rdkitInstance = null;
  rdkitPromise = null;
  
  debugLog(`RDKit paths configured to WASM: ${wasmPath}, JS: ${jsPath}`);
};

// Enhanced rendering function with better error handling
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
    
    // Create a molecule object from SMILES
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
    
    // Generate an SVG of the molecule
    const svg = mol.get_svg(width, height);
    mol.delete();
    
    // Create an image element from the SVG
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(svg);
    
    // Insert the image into the DOM
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
    
    // Display error in the element
    try {
      const element = document.getElementById(elementId);
      if (element) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        element.innerHTML = `<div style="color: red; border: 1px solid red; padding: 10px;">
          Error rendering molecule: ${errorMessage}
        </div>`;
      }
    } catch (e) {
      // Ignore errors in error handling
    }
    
    return false;
  }
};

// Alternative HTML-based approach that doesn't rely on existing elements
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

// Example debugging helper
export const testRDKitSetup = async () => {
  try {
    debugLog("Testing RDKit setup");
    
    // Test basic initialization
    const RDKit = await initRDKit();
    debugLog("RDKit initialized");
    
    // Test SMILES parsing
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

// Direct SVG string generation without DOM manipulation
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

// Public API check for easier debugging
export const checkRDKitStatus = () => {
  if (typeof window === 'undefined') {
    return 'Not in browser environment';
  }
  
  return {
    rdkitInstance: rdkitInstance ? 'Initialized' : 'Not initialized',
    rdkitPromise: rdkitPromise ? 'Pending' : 'Not created',
    RDKitModuleIsReady: window.RDKitModuleIsReady || false,
    windowHasRDKit: !!window.RDKit,
    windowHasInitModule: !!window.initRDKitModule
  };
};

// Fallback to direct import for environments that support it
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

declare global {
  type RDKitLoader = () => Promise<any>;

  interface Window {
    RDKit: RDKitLoader;
    initRDKitModule: RDKitLoader;
    RDKitModuleIsReady: boolean;
    RDKitCustomPaths?: {
      wasmPath: string;
      jsPath: string;
    };
  }
}

