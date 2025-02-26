(async () => {
  const fetch = (await import('node-fetch')).default;

async function testNvidiaAPI() {
  const testPayload = {
    algorithm: "CMA-ES",
    num_molecules: 30,
    property_name: "QED",
    minimize: false,
    min_similarity: 0.3,
    particles: 30,
    iterations: 10,
    smi: "[H][C@@]12Cc3c[nH]c4cccc(C1=C[C@H](NC(=O)N(CC)CC)CN2C)c34"
  };

  try {
    console.log('Testing NVIDIA API integration...');
    console.log('Sending request with payload:', JSON.stringify(testPayload, null, 2));

    const response = await fetch('http://localhost:3000/api/generate-molecules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ API test successful!');
      console.log('Response data:', JSON.stringify(data, null, 2));
    } else {
      console.log('\n❌ API test failed!');
      console.log('Error:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('\n❌ Test execution error:', error);
  }
}

testNvidiaAPI();
})();