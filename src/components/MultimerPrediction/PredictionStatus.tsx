import { useEffect, useState } from 'react';
import ProgressIndicator from './ProgressIndicator';

interface PredictionStatusProps {
  reqId: string;
  onComplete: (pdbData: string) => void;
  onError: (error: string) => void;
}

export default function PredictionStatus({ reqId, onComplete, onError }: PredictionStatusProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPolling, setIsPolling] = useState(true);
  const [currentStage, setCurrentStage] = useState('initialization');

  useEffect(() => {
    const startTime = Date.now();
    let pollTimer: NodeJS.Timeout;
    let elapsedTimer: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/nvidia/alphafold/status/${reqId}`);
        const data = await response.json();

        if (response.status === 202) {
          // Update stage if available in response
          if (data.details?.stage) {
            setCurrentStage(data.details.stage.toLowerCase());
          }
          // Still processing, continue polling
          pollTimer = setTimeout(checkStatus, 5000);
        } else if (response.ok && data.status === 'complete' && data.pdb) {
          setIsPolling(false);
          onComplete(data.pdb);
        } else {
          setIsPolling(false);
          onError(data.error || 'Failed to get prediction result');
        }
      } catch (error) {
        setIsPolling(false);
        onError(error instanceof Error ? error.message : 'Failed to check prediction status');
      }
    };

    // Start polling
    checkStatus();

    // Update elapsed time every second
    elapsedTimer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      clearTimeout(pollTimer);
      clearInterval(elapsedTimer);
    };
  }, [reqId, onComplete, onError]);

  return isPolling ? (
    <div className="mt-4 p-4 rounded-lg border border-blue-200 bg-blue-50">
      <div className="flex items-center space-x-3">
        <svg className="animate-spin h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <div>
          <p className="font-medium text-blue-700">Prediction in progress...</p>
          <p className="text-sm mt-1 text-blue-600">This may take 15-30 minutes depending on sequence length and selected databases.</p>
        </div>
      </div>
      
      <ProgressIndicator 
        currentStage={currentStage}
        elapsedTime={elapsedTime}
      />
    </div>
  ) : null;
}