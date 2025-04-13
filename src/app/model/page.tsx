"use client";
import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Breadcrumb from "@/components/ComponentHeader/ComponentHeader";
import MoleculeStructure from "@/components/MoleculeStructure";
import { createMoleculeGenerationHistory, getMoleculeGenerationHistoryByUser } from "@/lib/actions/molecule-generation.action";
import { getUserByEmail } from "@/lib/actions/user.action";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import MoleculeViewer from '@/components/MoleculeViewer';

interface Molecule {
  structure?: string;
  smiles?: string;
  score?: number;
}

interface HistoryItem {
  userId: string;
  inputSmiles: string;
  parameters: any;
  results: Molecule[];
  timestamp: Date;
}

export default function Page() {
  const { user } = useUser();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [smiles, setSmiles] = useState(
    "[H][C@@]12Cc3c[nH]c4cccc(C1=C[C@H](NC(=O)N(CC)CC)CN2C)c34"
  );
  const [numMolecules, setNumMolecules] = useState(30);
  const [algorithm, setAlgorithm] = useState("CMA-ES");
  const [propertyName, setPropertyName] = useState("QED");
  const [minimize, setMinimize] = useState(false);
  const [minSimilarity, setMinSimilarity] = useState(0.3);
  const [particles, setParticles] = useState(30);
  const [iterations, setIterations] = useState(10);
  const [molecules, setMolecules] = useState<Molecule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [responseDebug, setResponseDebug] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.emailAddresses?.[0]?.emailAddress) {
        try {
          const userInfo = await getUserByEmail(user.emailAddresses[0].emailAddress);
          if (userInfo?._id) {
            setUserId(userInfo._id.toString());
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };
    fetchUserData();
  }, [user]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (userId) {
        const userHistory = await getMoleculeGenerationHistoryByUser(userId);
        setHistory(userHistory || []);
      }
    };
    fetchHistory();
  }, [userId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMolecules([]);
    setResponseDebug("");

    const payload = {
      algorithm: "CMA-ES",
      num_molecules: Number(numMolecules),
      property_name: "QED",
      minimize: Boolean(minimize),
      min_similarity: Number(minSimilarity),
      particles: Number(particles),
      iterations: Number(iterations),
      smiles: smiles.trim()
    };

    try {
      console.log("Sending payload:", payload);
      
      const response = await fetch('/api/nvidia/molmim', {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          smi: smiles.trim(),
          algorithm,
          numMolecules,
          propertyName,
          minimize,
          minSimilarity,
          particles,
          iterations
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        throw new Error("Server returned an invalid response");
      }

      if (!response.ok) {
        const errorMessage = data.details
          ? `${data.error}\n${typeof data.details === 'string' ? data.details : JSON.stringify(data.details)}`
          : data.error || `Server error: ${response.status}`;
          
        if (response.status === 429 && data.retryAfter) {
          throw new Error(`Rate limit exceeded. Please try again in ${data.retryAfter} seconds.`);
        } else if (response.status === 504) {
          throw new Error("Request timed out. Please try again later.");
        } else if (response.status === 502) {
          throw new Error("Error communicating with NVIDIA API. Please try again later.");
        }
        
        throw new Error(errorMessage);
      }

      // Handle different response formats
      let moleculesArray = [];
      
      if (data?.molecules && Array.isArray(data.molecules)) {
        moleculesArray = data.molecules;
      } else if (data?.raw_response) {
        console.log("Using raw_response data");
        // Try to extract molecules from raw_response
        if (Array.isArray(data.raw_response)) {
          moleculesArray = data.raw_response;
        } else if (data.raw_response.molecules && Array.isArray(data.raw_response.molecules)) {
          moleculesArray = data.raw_response.molecules;
        }
      }
      
      if (moleculesArray.length === 0) {
        console.error("No molecules found in response:", data);
        throw new Error('No valid molecules found in the response');
      }

      console.log("Received molecules:", moleculesArray);

      // Map response to consistent format
      const formattedMolecules = data.molecules.map((mol: any) => ({
        smiles: mol.sample || mol.smiles || '',
        structure: mol.sample || mol.smiles || '',
        score: mol.score || null
      }));

      if (formattedMolecules.length === 0) {
        throw new Error('No valid molecules were generated');
      }

      console.log("Formatted molecules:", formattedMolecules);
      setMolecules(formattedMolecules);

      if (userId) {
        try {
          await createMoleculeGenerationHistory({
            userId,
            inputSmiles: smiles,
            parameters: payload,
            results: formattedMolecules,
            timestamp: new Date(),
          });
        } catch (historyError) {
          console.error("Failed to save to history:", historyError);
        }
      }
    } catch (error: any) {
      console.error("Error generating molecules:", error);
      setError(error.message || "An unexpected error occurred");
      setMolecules([]);
    } finally {
      setLoading(false);
    }
  };

  const isValidSmiles = (smiles: string) => {
    return smiles && smiles.trim().length > 0;
  };

  const renderInputPreview = () => {
    if (!smiles || !isValidSmiles(smiles)) {
      return (
        <div className="p-4 text-center text-gray-500">
          Enter a valid SMILES string to see a preview
        </div>
      );
    }

    return (
      <div className="w-full aspect-square max-h-64 flex items-center justify-center">
        <div className="w-full h-full flex items-center justify-center">
          {error ? (
            <div className="p-4 text-center text-red-500">
              <p>Failed to render molecule structure</p>
              <p className="text-sm mt-2">Please check if the SMILES string is valid</p>
            </div>
          ) : (
            <MoleculeViewer
              smiles={smiles}
              width={280}
              height={280}
              onError={(err) => setError(err)}
            />
          )}
        </div>
      </div>
    );
  };

  const renderMoleculeGrid = () => {
    return molecules.map((molecule, index) => (
      <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="w-full aspect-square flex items-center justify-center">
          {!molecule.smiles && !molecule.structure ? (
            <div className="p-4 text-center text-red-500">
              <p>Invalid molecule structure</p>
              <p className="text-sm mt-2">Unable to render molecule</p>
            </div>
          ) : (
            <MoleculeViewer
              smiles={molecule.smiles || molecule.structure || ''}
              width={200}
              height={200}
              onError={(err) => setError(err)}
            />
          )}
        </div>
        {molecule.score !== undefined && (
          <p className="text-center mt-2 text-sm font-medium">
            Score: {molecule.score?.toFixed(3)}
          </p>
        )}
      </div>
    ));
  };

  return (
    <DefaultLayout>
      <div className="mx-auto max-w-270">
        <Breadcrumb pageName="Molecule Generator" />
        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
          <div className="max-w-full overflow-x-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    SMILES String
                  </label>
                  <input
                    type="text"
                    value={smiles}
                    onChange={(e) => setSmiles(e.target.value)}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Algorithm
                  </label>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value)}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  >
                    <option value="CMA-ES">CMA-ES</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Property Name
                  </label>
                  <select
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  >
                    <option value="QED">QED</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Number of Molecules
                  </label>
                  <input
                    type="number"
                    value={numMolecules.toString()}
                    onChange={(e) => setNumMolecules(Number(e.target.value) || 1)}
                    min="1"
                    max="100"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Minimum Similarity
                  </label>
                  <input
                    type="number"
                    value={minSimilarity.toString()}
                    onChange={(e) => setMinSimilarity(Number(e.target.value) || 0)}
                    step="0.1"
                    min="0"
                    max="1"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Particles
                  </label>
                  <input
                    type="number"
                    value={particles.toString()}
                    onChange={(e) => setParticles(Number(e.target.value) || 1)}
                    min="1"
                    max="100"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Iterations
                  </label>
                  <input
                    type="number"
                    value={iterations.toString()}
                    onChange={(e) => setIterations(Number(e.target.value) || 1)}
                    min="1"
                    max="50"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    required
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex cursor-pointer select-none items-center">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={minimize}
                        onChange={(e) => setMinimize(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`box mr-4 flex h-5 w-5 items-center justify-center rounded border ${minimize ? 'bg-primary border-primary' : 'border-stroke dark:border-strokedark'}`}>
                        <span className={`opacity-0 ${minimize ? '!opacity-100' : ''}`}>
                          ✓
                        </span>
                      </div>
                    </div>
                    Minimize Property
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-4.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90 disabled:opacity-50"
                >
                  {loading ? "Generating..." : "Generate Molecules"}
                </button>
              </div>
            </form>

            {loading && (
              <div className="mt-4 p-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating molecules... This may take a few moments.</span>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg bg-danger-light p-4 text-danger">
                <strong>Error:</strong> {error}
              </div>
            )}

            {Array.isArray(molecules) && molecules.length > 0 ? (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Generated Molecules ({molecules.length} of {numMolecules} requested)</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {molecules.map((molecule: Molecule, index: number) => (
                    <div key={index} className="rounded-lg border p-4 dark:border-strokedark bg-white">
                      <div className="w-full aspect-square flex items-center justify-center">
                        {molecule.smiles || molecule.structure ? (
                          <MoleculeStructure
                            structure={molecule.smiles || molecule.structure || ''}
                            width={280}
                            height={280}
                          />
                        ) : (
                          <div className="p-4 text-center text-red-500">
                            Invalid molecule structure
                          </div>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-medium">Score: {molecule.score?.toFixed(4)}</p>
                        <p className="text-xs break-all text-gray-500">{molecule.smiles || molecule.structure}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}