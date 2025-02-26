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

export default function Page() {
  const { user } = useUser();
  const [history, setHistory] = useState([]);
  const [userId, setUserId] = useState(null);
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

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.emailAddresses?.[0]?.emailAddress) {
        try {
          const userInfo = await getUserByEmail(user.emailAddresses[0].emailAddress);
          if (userInfo?._id) {
            setUserId(userInfo._id);
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
        setHistory(userHistory);
      }
    };
    fetchHistory();
  }, [userId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMolecules([]);

    const payload = {
      algorithm,
      num_molecules: numMolecules,
      property_name: propertyName,
      minimize,
      min_similarity: minSimilarity,
      particles,
      iterations,
      smi: smiles
    };

    try {
      const response = await fetch('/api/nvidia', {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate molecules');
      }

      if (!Array.isArray(data.molecules)) {
        throw new Error('Invalid response format from server');
      }

      const formattedMolecules = data.molecules.map((mol: any) => ({
        structure: mol.smiles || mol.structure,
        score: mol.score || 0
      }));

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
      console.error("Error:", error);
      setError(error.message || "An unexpected error occurred");
      setMolecules([]);
    } finally {
      setLoading(false);
    }
  };

  const moleculesContent = Array.isArray(molecules) && molecules.length > 0 ? (
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {molecules.map((molecule: Molecule, index: number) => (
        <div key={index} className="rounded-lg border p-4 dark:border-strokedark bg-white">
          <div className="w-full aspect-square flex items-center justify-center">
            <MoleculeStructure
              id={`mol-${index}`}
              structure={molecule.smiles || molecule.structure || ''}
              width={280}
              height={280}
              scores={molecule.score}
            />
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-sm font-medium">Score: {molecule.score?.toFixed(4)}</p>
            <p className="text-xs break-all text-gray-500">{molecule.smiles || molecule.structure}</p>
          </div>
        </div>
      ))}
    </div>
  ) : null;

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

            {error && (
              <div className="mt-4 rounded-lg bg-danger-light p-4 text-danger">
                {error}
              </div>
            )}

            {moleculesContent}
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}