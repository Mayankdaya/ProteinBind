const drawMolecule = async () => {
    if (!mounted) return;
    if (!moleculeString) {
      setError('No molecule structure provided');
      setLoading(false);
      return;
    }

    try {
      const rdkit = await initRDKit();
      if (!rdkit) {
        setError('Failed to initialize RDKit');
        setLoading(false);
        return;
      }

      const mol = rdkit.get_mol(moleculeString);
      if (!mol || !mol.is_valid()) {
        setError('Invalid molecule structure');
        setLoading(false);
        mol?.delete();
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        setError('Canvas element not found');
        setLoading(false);
        mol.delete();
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('Failed to get canvas context');
        setLoading(false);
        mol.delete();
        return;
      }

      // Clear previous canvas content
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the molecule
      mol.draw_to_canvas(canvas);
      mol.delete();
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Error drawing molecule:', err);
      setError(err instanceof Error ? err.message : 'Failed to draw molecule');
      setLoading(false);
    }
  };

  return (
    <div className="molecule-structure-container relative" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute top-0 left-0"
      />
      {loading && (
        <div className="loading-overlay absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-100 bg-opacity-75">
          <div className="loading-spinner animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent" />
          <div className="loading-text ml-3 text-gray-700">Loading molecule...</div>
        </div>
      )}
      {error && (
        <div className="error-overlay absolute top-0 left-0 w-full h-full flex items-center justify-center bg-red-100 bg-opacity-75">
          <div className="error-message text-red-600 text-center p-4">{error}</div>
        </div>
      )}
    </div>
  );