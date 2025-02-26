require('@testing-library/jest-dom');

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.structuredClone = (val) => JSON.parse(JSON.stringify(val));

class MockCanvas {
  getContext() {
    return {
      drawImage: jest.fn(),
      fillRect: jest.fn(),
      clearRect: jest.fn(),
    };
  }
}

jest.mock('@rdkit/rdkit', () => ({
  __esModule: true,
  default: {
    useRDKit: jest.fn(() => ({
      RDKit: {
        getMoleculeFromSmiles: jest.fn(),
        getCanvas: jest.fn(() => new MockCanvas()),
        drawMoleculeOnCanvas: jest.fn(),
      },
      isLoaded: true,
    })),
  },
}));