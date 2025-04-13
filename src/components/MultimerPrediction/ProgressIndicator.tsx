interface ProgressStage {
  name: string;
  description: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

interface ProgressIndicatorProps {
  currentStage: string;
  elapsedTime: number;
}

export default function ProgressIndicator({ currentStage, elapsedTime }: ProgressIndicatorProps) {
  const stages: ProgressStage[] = [
    {
      name: 'initialization',
      description: 'Setting up prediction environment',
      status: 'complete'
    },
    {
      name: 'search',
      description: 'Searching sequence databases',
      status: currentStage === 'search' ? 'active' : 
             currentStage === 'initialization' ? 'pending' : 'complete'
    },
    {
      name: 'fold',
      description: 'Predicting protein structure',
      status: currentStage === 'fold' ? 'active' :
             ['initialization', 'search'].includes(currentStage) ? 'pending' : 'complete'
    },
    {
      name: 'relax',
      description: 'Refining predicted structure',
      status: currentStage === 'relax' ? 'active' :
             ['initialization', 'search', 'fold'].includes(currentStage) ? 'pending' : 'complete'
    }
  ];

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium">Prediction Progress</h4>
        <span className="text-sm text-gray-600">Time: {formatTime(elapsedTime)}</span>
      </div>
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div key={stage.name} className="relative">
            {index > 0 && (
              <div 
                className={`absolute top-0 left-4 -ml-px h-full w-0.5 ${
                  stage.status === 'pending' ? 'bg-gray-200' : 'bg-primary'
                }`} 
                aria-hidden="true" 
              />
            )}
            <div className="relative flex items-center space-x-4">
              <div>
                <span 
                  className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                    ${stage.status === 'pending' ? 'bg-gray-200' :
                      stage.status === 'active' ? 'bg-blue-200' :
                      stage.status === 'complete' ? 'bg-primary' : 'bg-red-500'}`}
                >
                  {stage.status === 'active' ? (
                    <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : stage.status === 'complete' ? (
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : stage.status === 'error' ? (
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`text-sm font-medium ${
                  stage.status === 'pending' ? 'text-gray-500' :
                  stage.status === 'active' ? 'text-primary' : 'text-black'
                }`}>
                  {stage.description}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}