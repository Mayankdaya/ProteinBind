declare global {
  interface Window {
    initRDKitModule: () => Promise<any>;
    RDKit: any;
  }
}

export {};