"use client";
import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/ComponentHeader/ComponentHeader";
import PredictionStatus from '@/components/MultimerPrediction/PredictionStatus';
import PDBViewer from '@/components/PDBViewer';
import { getUserByEmail } from "@/lib/actions/user.action";

interface SequenceEntry {
  id: number;
  sequence: string;
}

interface PredictionPayload {
  sequences: string[];
  algorithm: string;
  e_value: number;
  iterations: number;
  databases: string[];
  relax_prediction: boolean;
}

export default function Page() {
  const { user } = useUser();
  const [userId, setUserId] = useState<string | null>(null);
  const [sequences, setSequences] = useState<SequenceEntry[]>([{ id: 1, sequence: "" }]);
  const [algorithm] = useState("jackhmmer");
  const [eValue, setEValue] = useState(0.0001);
  const [iterations, setIterations] = useState(1);
  const [relaxPrediction, setRelaxPrediction] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdbStructure, setPdbStructure] = useState<string | null>(null);
  const [databases, setDatabases] = useState(["uniref90", "small_bfd", "mgnify"]);
  const [predictionId, setPredictionId] = useState<string | null>(null);


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

  const addSequence = () => {
    if (sequences.length < 5) {
      setSequences([...sequences, { id: sequences.length + 1, sequence: "" }]);
    }
  };

  const removeSequence = (id: number) => {
    if (sequences.length > 1) {
      setSequences(sequences.filter(seq => seq.id !== id));
    }
  };

  const validateSequence = (sequence: string): boolean => {
    const trimmed = sequence.trim().replace(/\s+/g, '');
    if (!trimmed) return false;
    if (!/^[ACDEFGHIKLMNPQRSTVWY\*\-]+$/i.test(trimmed)) {
      return false;
    }
    return trimmed.length >= 10 && trimmed.length <= 2000;
  };

  const updateSequence = (id: number, value: string) => {
    setSequences(sequences.map(seq => 
      seq.id === id ? { ...seq, sequence: value.toUpperCase() } : seq
    ));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setPdbStructure(null);
    setPredictionId(null);

    try {
      const validSequences = sequences
        .filter(seq => seq.sequence.trim().length > 0)
        .map(seq => seq.sequence.trim());

      if (validSequences.length === 0) {
        throw new Error("At least one protein sequence is required");
      }

      // Validate each sequence
      for (const sequence of validSequences) {
        if (!validateSequence(sequence)) {
          throw new Error("Invalid sequence detected. Only standard amino acid letters (A-Z), gaps (-) and terminations (*) are allowed, and length must be 10-2000 amino acids");
        }
        if (sequence.length < 10) {
          throw new Error("Sequences must be at least 10 amino acids long");
        }
        if (sequence.length > 2000) {
          throw new Error("Sequences must not exceed 2000 amino acids");
        }
      }

      if (databases.length === 0) {
        throw new Error("At least one database must be selected");
      }

      const payload: PredictionPayload = {
        sequences: validSequences,
        algorithm,
        e_value: eValue,
        iterations,
        databases,
        relax_prediction: relaxPrediction
      };

      const response = await fetch('/api/nvidia/multimer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.status === 202 && data.reqId) {
        // Request accepted, start polling
        setPredictionId(data.reqId);
      } else if (!response.ok) {
        throw new Error(data.error || 'Failed to start prediction');
      } else if (data.pdb) {
        // Immediate result
        setPdbStructure(data.pdb);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(!predictionId); // Only set loading false if we're not going to poll
    }
  };

  const handlePredictionComplete = (pdbData: string) => {
    setLoading(false);
    setPdbStructure(pdbData);
    setPredictionId(null);
  };

  const handlePredictionError = (errorMessage: string) => {
    setLoading(false);
    setError(errorMessage);
    setPredictionId(null);
  };

  return (
    <DefaultLayout>
      <div className="mx-auto max-w-270">
        <Breadcrumb pageName="AlphaFold2 Multimer" />
        {error && (
          <div className="mb-4 rounded-lg bg-danger-light p-4 text-danger">
            {error}
          </div>
        )

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="p-6.5">
            <form onSubmit={handleSubmit}>
              <div className="mb-4.5">
                <div className="flex justify-between items-center mb-2.5">
                  <label className="block text-black dark:text-white">
                    Protein Sequences
                  </label>
                  {sequences.length < 5 && (
                    <button
                      type="button"
                      onClick={addSequence}
                      className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-opacity-90"
                    >
                      Add Sequence
                    </button>
                  )}
                </div>

                {sequences.map((seq) => (
                  <div key={seq.id} className="mb-4 flex gap-4">
                    <textarea
                      rows={3}
                      placeholder="Enter protein sequence (A-Z letters only)"
                      value={seq.sequence}
                      onChange={(e) => updateSequence(seq.id, e.target.value)}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      required
                    />
                    {sequences.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSequence(seq.id)}
                        className="px-4 py-2 text-sm bg-danger text-white rounded hover:bg-opacity-90"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4.5">
                <div className="lg:col-span-2">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Databases
                  </label>
                  <div className="space-y-2">
                    {["uniref90", "small_bfd", "mgnify"].map((db) => (
                      <div key={db} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`db-${db}`}
                          checked={databases.includes(db)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDatabases([...databases, db]);
                            } else {
                              setDatabases(databases.filter(d => d !== db));
                            }
                          }}
                          className="mr-2"
                        />
                        <label htmlFor={`db-${db}`} className="text-black dark:text-white">
                          {db}
                        </label>
                      </div>
                    ))}
                  </div>
                  {databases.length > 0 && <DatabaseInfo selectedDatabases={databases} />}
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
                    <option value="jackhmmer">jackhmmer</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    E-value
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={eValue}
                    onChange={(e) => setEValue(Number(e.target.value))}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Iterations
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={iterations}
                    onChange={(e) => setIterations(Number(e.target.value))}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  />
                </div>
              </div>

              <div className="mb-4.5">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="relax"
                    checked={relaxPrediction}
                    onChange={(e) => setRelaxPrediction(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="relax" className="text-black dark:text-white">
                    Relax Prediction
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray disabled:opacity-50"
              >
                {loading ? "Predicting..." : "Predict Structure"}
              </button>
            </form>

            {predictionId && (
              <PredictionStatus
                reqId={predictionId}
                onComplete={handlePredictionComplete}
                onError={handlePredictionError}
              />
            )}

            {loading && !predictionId && (
              <div className="mt-4 p-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Starting prediction...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg bg-danger-light p-4 text-danger">
                <strong>Error:</strong> {error}
              </div>
            )}

            {pdbStructure && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Predicted Structure</h3>
                <div className="w-full aspect-square max-h-[600px] border rounded-lg overflow-hidden">
                  <PDBViewer
                    pdbString={pdbStructure}
                    width={600}
                    height={600}
                    backgroundColor="#ffffff"
                  />
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => {
                      const blob = new Blob([pdbStructure], { type: 'chemical/x-pdb' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'predicted_structure.pdb';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-opacity-90"
                  >
                    Download PDB
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}