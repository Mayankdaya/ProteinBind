"use client";
import React, { useState, useEffect } from "react";
import MoleculeStructure from "@/components/MoleculeStructure";

interface GeneratedMolecule {
  structure: string;
  score: number;
}

const moleculeBank = [
  {
    moleculeName: "Aspirin",
    smilesStructure: "CC(=O)OC1=CC=CC=C1C(O)=O",
    molecularWeight: 180.16,
    categoryUsage: "Pain reliever/NSAID",
  },
  {
    moleculeName: "Caffeine",
    smilesStructure: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
    molecularWeight: 194.19,
    categoryUsage: "Stimulant",
  },
  {
    moleculeName: "Benzene",
    smilesStructure: "C1=CC=CC=C1",
    molecularWeight: 78.11,
    categoryUsage: "Industrial solvent",
  },
  {
    moleculeName: "Glucose",
    smilesStructure: "C(C1C(C(C(C(O1)O)O)O)O)O",
    molecularWeight: 180.16,
    categoryUsage: "Energy source/sugar",
  },
  {
    moleculeName: "Penicillin",
    smilesStructure: "CC1(C2C(C(C(O2)N1C(=O)COC(=O)C)C)S)C=O",
    molecularWeight: 334.39,
    categoryUsage: "Antibiotic",
  },
  {
    moleculeName: "Ibuprofen",
    smilesStructure: "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O",
    molecularWeight: 206.28,
    categoryUsage: "Pain reliever/NSAID",
  },
  {
    moleculeName: "Acetaminophen",
    smilesStructure: "CC(=O)NC1=CC=C(O)C=C1",
    molecularWeight: 151.16,
    categoryUsage: "Pain reliever/Antipyretic",
  },
  {
    moleculeName: "Morphine",
    smilesStructure: "CN1CCC23C4C1CC(C2C3O)OC5=CC=CC=C45",
    molecularWeight: 285.34,
    categoryUsage: "Pain reliever/Opiate",
  },
  {
    moleculeName: "Nicotine",
    smilesStructure: "CN1CCCC1C2=CN=CC=C2",
    molecularWeight: 162.23,
    categoryUsage: "Stimulant",
  },
  {
    moleculeName: "Ethanol",
    smilesStructure: "CCO",
    molecularWeight: 46.07,
    categoryUsage: "Alcohol/Disinfectant",
  },
];

const TableOne = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMolecules, setFilteredMolecules] = useState(moleculeBank);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedMolecules, setGeneratedMolecules] = useState<GeneratedMolecule[]>([]);

  const generateMolecules = async () => {
    setLoading(true);
    setError("");

    const payload = {
      smiles: "C124CN3C1.S3(=O)(=O)CC.C4C#N.[*{20-20}]",
      num_molecules: 30,
      temperature: 1,
      noise: 0,
      step_size: 1,
      scoring: "QED"
    };

    try {
      const response = await fetch("https://health.api.nvidia.com/v1/biology/nvidia/genmol/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NVIDIA_API_KEY || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const molecules = data.molecules.map((mol: any) => ({
        structure: mol.smiles,
        score: mol.score
      }));

      setGeneratedMolecules(molecules);
    } catch (err: any) {
      setError(err.message || "Failed to generate molecules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filteredData = moleculeBank.filter((molecule) =>
      molecule.moleculeName.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredMolecules(filteredData);
  }, [searchQuery]);

  return (
    <div className="rounded-lg border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-[#181818] dark:bg-[#181818] sm:px-7.5 xl:pb-1">
      <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
        Molecules
      </h4>

      <input
        type="search"
        placeholder="Search molecule"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="border-gray-300 text-gray-700 placeholder-gray-400 dark:border-gray-600 dark:placeholder-gray-500 text-md mb-4 w-full rounded-lg border bg-white px-4 py-3 shadow-sm outline-none focus:border-primary focus:ring-primary dark:bg-[#181818] dark:text-white"
      />
      {error && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}

      <button
        onClick={generateMolecules}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate New Molecules"}
      </button>

      <div className="flex flex-col">
        <div className="grid grid-cols-3 rounded-lg bg-gray-2 dark:bg-[#121212] sm:grid-cols-4">
          <div className="p-2.5 xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Molecule name
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Smile Structure Image
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Molecular Weights (g/mol)
            </h5>
          </div>
          <div className="hidden p-2.5 text-center sm:block xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Category Usage
            </h5>
          </div>
        </div>

        {[...filteredMolecules, ...generatedMolecules.map((mol, index) => ({
          moleculeName: `Generated Molecule ${index + 1}`,
          smilesStructure: mol.structure,
          molecularWeight: 0,
          categoryUsage: `Score: ${mol.score.toFixed(2)}`
        }))].map((molecule, key) => (
          <div
            className={`grid grid-cols-3 sm:grid-cols-4 ${
              key === filteredMolecules.length - 1
                ? ""
                : "border-b border-stroke dark:border-strokedark"
            }`}
            key={key}
          >
            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <p className="text-black dark:text-white">
                {molecule.moleculeName}
              </p>
            </div>

            <div className="flex items-center gap-3 p-2.5 xl:p-5">
              <div className="flex-shrink-0">
                <MoleculeStructure
                  structure={molecule.smilesStructure}
                  width={200}
                  height={200}
                />
              </div>
            </div>

            <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
              <p className="text-black dark:text-white">
                {molecule.molecularWeight}
              </p>
            </div>

            <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
              <p className="text-black dark:text-white">
                {molecule.categoryUsage}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableOne;
