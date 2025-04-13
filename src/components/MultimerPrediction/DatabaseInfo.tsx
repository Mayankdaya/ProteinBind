interface DatabaseInfoProps {
  selectedDatabases: string[];
}

export default function DatabaseInfo({ selectedDatabases }: DatabaseInfoProps) {
  const databaseInfo = {
    'uniref90': {
      description: 'UniRef90 is a comprehensive database that clusters UniProt sequences at 90% sequence identity.',
      time: 'medium'
    },
    'small_bfd': {
      description: 'A smaller version of the BFD (Big Fantastic Database) containing filtered protein sequences.',
      time: 'fast'
    },
    'mgnify': {
      description: 'A database of protein sequences from metagenomics data.',
      time: 'slow'
    }
  };

  const getEstimatedTime = (dbs: string[]) => {
    if (dbs.includes('mgnify')) return 'May take 30+ minutes';
    if (dbs.includes('uniref90')) return 'May take 15-30 minutes';
    return 'May take 10-15 minutes';
  };

  return (
    <div className="mt-4 p-4 rounded-lg border border-stroke bg-meta-2 dark:bg-meta-4 dark:border-strokedark">
      <h4 className="text-sm font-medium mb-2">Selected Databases:</h4>
      <div className="space-y-2">
        {selectedDatabases.map(db => (
          <div key={db} className="text-sm">
            <span className="font-medium">{db}</span>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {databaseInfo[db as keyof typeof databaseInfo]?.description}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 text-sm text-blue-600 dark:text-blue-400">
        ⏱️ {getEstimatedTime(selectedDatabases)}
      </div>
    </div>
  );
}