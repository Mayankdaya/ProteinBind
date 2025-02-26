import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import MoleculeStructure from '@/components/MoleculeStructure';
import { RDKitProvider } from '@/contexts/RDKitContext';

describe('MoleculeStructure Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render the molecule structure container', () => {
    render(
      <RDKitProvider>
        <MoleculeStructure smiles="CC(=O)OC1=CC=CC=C1C(=O)O" />
      </RDKitProvider>
    );
    const container = screen.getByTestId('molecule-structure');
    expect(container).toBeInTheDocument();
  });

  it('should handle invalid SMILES string', () => {
    render(
      <RDKitProvider>
        <MoleculeStructure smiles="invalid-smiles" />
      </RDKitProvider>
    );
    const errorMessage = screen.getByText(/Error rendering molecule/i);
    expect(errorMessage).toBeInTheDocument();
  });

  it('should render with custom dimensions', () => {
    const width = 400;
    const height = 300;
    render(
      <RDKitProvider>
        <MoleculeStructure 
          smiles="CC(=O)OC1=CC=CC=C1C(=O)O"
          width={width}
          height={height}
        />
      </RDKitProvider>
    );
    const container = screen.getByTestId('molecule-structure');
    expect(container).toHaveStyle({
      width: `${width}px`,
      height: `${height}px`
    });
  });

  it('should update when SMILES string changes', () => {
    const { rerender } = render(
      <RDKitProvider>
        <MoleculeStructure smiles="CC(=O)OC1=CC=CC=C1C(=O)O" />
      </RDKitProvider>
    );

    const newSmiles = 'CC(=O)CC';
    rerender(
      <RDKitProvider>
        <MoleculeStructure smiles={newSmiles} />
      </RDKitProvider>
    );

    const container = screen.getByTestId('molecule-structure');
    expect(container).toBeInTheDocument();
  });
});