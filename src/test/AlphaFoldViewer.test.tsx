import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AlphaFoldViewer from '../components/AlphaFold/AlphaFoldViewer';

// Mock NGL
jest.mock('ngl', () => {
  return {
    Stage: jest.fn().mockImplementation(() => ({
      loadFile: jest.fn().mockResolvedValue({
        addRepresentation: jest.fn(),
        autoView: jest.fn(),
      }),
      removeAllComponents: jest.fn(),
      setSize: jest.fn(),
      handleResize: jest.fn(),
      dispose: jest.fn(),
    })),
  };
});

describe('AlphaFoldViewer Component', () => {
  const mockPDBString = `
    ATOM      1  N   ALA A   1      -0.525   1.362   0.000  1.00  0.00           N  
    ATOM      2  CA  ALA A   1       0.000   0.000   0.000  1.00  0.00           C  
    ATOM      3  C   ALA A   1       1.520   0.000   0.000  1.00  0.00           C  
    ATOM      4  O   ALA A   1       2.197   0.995   0.000  1.00  0.00           O  
    ATOM      5  CB  ALA A   1      -0.507  -0.785  -1.207  1.00  0.00           C  
  `;

  it('renders without crashing', () => {
    render(<AlphaFoldViewer />);
    expect(screen.getByText('No structure data provided')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<AlphaFoldViewer pdbStructure={mockPDBString} />);
    expect(screen.getByText('Loading structure...')).toBeInTheDocument();
  });

  it('handles invalid PDB structure', async () => {
    render(<AlphaFoldViewer pdbStructure="invalid data" />);
    await waitFor(() => {
      expect(screen.getByText('Invalid PDB structure format')).toBeInTheDocument();
    });
  });

  it('handles empty PDB structure', async () => {
    render(<AlphaFoldViewer pdbStructure="" />);
    await waitFor(() => {
      expect(screen.getByText('No structure data available')).toBeInTheDocument();
    });
  });

  it('handles valid PDB structure', async () => {
    render(<AlphaFoldViewer pdbStructure={mockPDBString} />);
    await waitFor(() => {
      expect(screen.queryByText('Loading structure...')).not.toBeInTheDocument();
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  it('handles JSON formatted PDB structure', async () => {
    const jsonPDB = JSON.stringify({
      pdbs: [mockPDBString]
    });
    render(<AlphaFoldViewer pdbStructure={jsonPDB} />);
    await waitFor(() => {
      expect(screen.queryByText('Loading structure...')).not.toBeInTheDocument();
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  it('handles window resize', async () => {
    render(<AlphaFoldViewer pdbStructure={mockPDBString} />);
    window.dispatchEvent(new Event('resize'));
    await waitFor(() => {
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });
});