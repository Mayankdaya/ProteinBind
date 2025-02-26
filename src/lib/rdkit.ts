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
        
        // Use the correct path from public directory
        const wasmPath = window.RDKitCustomPaths?.wasmPath || '/static/wasm/RDKit_minimal.wasm';
        const jsPath = window.RDKitCustomPaths?.jsPath || '/static/wasm/RDKit_minimal.js';
        
        // Ensure paths are absolute
        const baseUrl = window.location.origin;
        const absoluteWasmPath = wasmPath.startsWith('http') ? wasmPath : `${baseUrl}${wasmPath}`;
        const absoluteJsPath = jsPath.startsWith('http') ? jsPath : `${baseUrl}${jsPath}`;
        
        debugLog(`Checking WASM file at: ${wasmPath}`);
        
        // First check if WASM file exists
        fetch(wasmPath)
          .then(response => {
            if (!response.ok) {
              debugLog(`WASM file not found at ${wasmPath}`, response.status);
              throw new Error(`WASM file not found (status: ${response.status})`);
            }
            
            debugLog("WASM file found, now loading JS");
            
            // Remove any existing script to avoid conflicts
            const existingScript = document.querySelector('script[src*="RDKit_minimal.js"]');
            if (existingScript) {
              debugLog("Removing existing RDKit script");
              existingScript.remove();
            }
            
            const script = document.createElement('script');
            script.src = jsPath;
            script.async = true;
            
            // Set up more detailed event handlers
            script.onload = async () => {
              debugLog("Script loaded, initializing RDKit module");
              try {
                // Add a global function to check if initialization is working
                window.RDKitModuleIsReady = false;
                window.initRDKitModule = initRDKitModule;
                
                debugLog("Calling initRDKitModule");
                const RDKit = await initRDKitModule();
                
                if (!RDKit) {
                  debugLog("RDKit initialization returned null/undefined");
                  throw new Error('RDKit initialization failed - returned null');
                }
                
                // Test if RDKit is working by creating a simple molecule
                try {
                  const testMol = RDKit.get_mol("C");
                  if (testMol) {
                    debugLog("Successfully created test molecule");
                    testMol.delete();
                  } else {
                    debugLog("Failed to create test molecule");
                  }
                } catch (testError) {
                  debugLog("Error testing RDKit functionality", testError);
                }
                
                window.RDKitModuleIsReady = true;
                rdkitInstance = RDKit;
                debugLog("RDKit initialized successfully");
                resolve(RDKit);
              } catch (error) {
                debugLog("Failed to initialize RDKit", error);
                reject(error);
              }
            };
            
            script.onerror = (error) => {
              debugLog("Failed to load RDKit script", error);
              reject(new Error('Failed to load RDKit script'));
            };
            
            // Add more detailed progress tracking
            debugLog("Appending script to document head");
            document.head.appendChild(script);
          })
          .catch(error => {
            debugLog("Failed during WASM loading or script execution", error);
            reject(error);
          });
      } else {
        debugLog("Window is not defined (not in browser)");
        reject(new Error('Window is not defined'));
      }
    }).catch(error => {
      debugLog("RDKit initialization error, clearing promise", error);
      rdkitPromise = null;
      throw error;
    });
  } else {
    debugLog("Using existing rdkitPromise");
  }

  return rdkitPromise;
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
        element.innerHTML = `<div style="color: red; border: 1px solid red; padding: 10px;">
          Error rendering molecule: ${error.message || "Unknown error"}
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
    errorElement.textContent = `Error: ${error.message || "Unknown error"}`;
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
    return `RDKit test failed: ${error.message || "Unknown error"}`;
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
    return `<svg width="${width}" height="${height}"><text x="10" y="20" fill="red">Error: ${error.message || "Unknown error"}</text></svg>`;
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
    const RDKit = await initRDKitModule();
    rdkitInstance = RDKit;
    debugLog("Direct import successful");
    return RDKit;
  } catch (error) {
    debugLog("Direct import failed", error);
    throw error;
  }
};

declare global {
  interface Window {
    RDKit: () => Promise<any>;
    initRDKitModule: typeof initRDKitModule;
    RDKitModuleIsReady: boolean;
    RDKitCustomPaths?: {
      wasmPath: string;
      jsPath: string;
    };
  }
}