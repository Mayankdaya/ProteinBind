import { NVIDIA_API_URL } from '@/lib/utils';

(async () => {
  const fetch = (await import('node-fetch')).default;

  async function testGenerateMolecules(payload: any) {
    try {
      console.log('Testing with payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('http://localhost:3000/api/generate-molecules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log(`\nStatus: ${response.status}`);
      if (response.ok) {
        console.log('✅ Test passed');
        if (data.molecules?.length) {
          console.log(`Generated ${data.molecules.length} molecules`);
          console.log('First molecule:', data.molecules[0]);
        }
      } else {
        console.log('❌ Test failed');
        console.log('Error:', data.error);
        if (data.details) {
          console.log('Details:', data.details);
        }
        if (data.retryAfter) {
          console.log(`Retry after: ${data.retryAfter} seconds`);
        }
      }
      console.log('\n-------------------\n');
    } catch (error) {
      console.log('❌ Test failed');
      console.log('Error:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Test 1: Valid payload
  await testGenerateMolecules({
    algorithm: "CMA-ES",
    num_molecules: 30,
    property_name: "QED",
    minimize: false,
    min_similarity: 0.3,
    particles: 30,
    iterations: 10,
    smiles: "[H][C@@]12Cc3c[nH]c4cccc(C1=C[C@H](NC(=O)N(CC)CC)CN2C)c34"
  });

  // Test 2: Missing required field
  await testGenerateMolecules({
    algorithm: "CMA-ES",
    num_molecules: 30,
    property_name: "QED",
    minimize: false,
    min_similarity: 0.3,
    iterations: 10,
    smiles: "[H][C@@]12Cc3c[nH]c4cccc(C1=C[C@H](NC(=O)N(CC)CC)CN2C)c34"
    // particles missing
  });

  // Test 3: Invalid SMILES
  await testGenerateMolecules({
    algorithm: "CMA-ES",
    num_molecules: 30,
    property_name: "QED",
    minimize: false,
    min_similarity: 0.3,
    particles: 30,
    iterations: 10,
    smiles: "invalid smiles string"
  });

})();