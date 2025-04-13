interface MoleculeControlsProps {
  onChangeRepresentation: (rep: string) => void;
  onChangeColorScheme: (scheme: string) => void;
  onChangeBackground: (color: string) => void;
  onTakeScreenshot: () => void;
  currentRepresentation: string;
  currentColorScheme: string;
  currentBackground: string;
}

export default function MoleculeControls({
  onChangeRepresentation,
  onChangeColorScheme,
  onChangeBackground,
  onTakeScreenshot,
  currentRepresentation,
  currentColorScheme,
  currentBackground
}: MoleculeControlsProps) {
  const representations = [
    { value: 'cartoon', label: 'Cartoon' },
    { value: 'surface', label: 'Surface' },
    { value: 'spacefill', label: 'Spacefill' },
    { value: 'ball+stick', label: 'Ball & Stick' }
  ];

  const colorSchemes = [
    { value: 'chainid', label: 'Chain' },
    { value: 'residueindex', label: 'Residue Index' },
    { value: 'sstruc', label: 'Secondary Structure' },
    { value: 'bfactor', label: 'B-factor' }
  ];

  const backgrounds = [
    { value: '#ffffff', label: 'White' },
    { value: '#000000', label: 'Black' },
    { value: '#e5e7eb', label: 'Gray' }
  ];

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-lg">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium mb-2 text-black dark:text-white">
          Style
        </label>
        <select
          value={currentRepresentation}
          onChange={(e) => onChangeRepresentation(e.target.value)}
          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input"
        >
          {representations.map(rep => (
            <option key={rep.value} value={rep.value}>
              {rep.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium mb-2 text-black dark:text-white">
          Color
        </label>
        <select
          value={currentColorScheme}
          onChange={(e) => onChangeColorScheme(e.target.value)}
          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input"
        >
          {colorSchemes.map(scheme => (
            <option key={scheme.value} value={scheme.value}>
              {scheme.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium mb-2 text-black dark:text-white">
          Background
        </label>
        <select
          value={currentBackground}
          onChange={(e) => onChangeBackground(e.target.value)}
          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input"
        >
          {backgrounds.map(bg => (
            <option key={bg.value} value={bg.value}>
              {bg.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium mb-2 text-black dark:text-white">
          Actions
        </label>
        <button
          onClick={onTakeScreenshot}
          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 font-medium outline-none transition hover:bg-gray-100 dark:hover:bg-gray-900 focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark"
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Take Screenshot
          </div>
        </button>
      </div>
    </div>
  );
}