
import React from 'react';
import { ApplicationStatus } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface StatusBarProps {
  currentStatus: ApplicationStatus;
}

const StatusBar: React.FC<StatusBarProps> = ({ currentStatus }) => {
  const { statusSteps } = useAppContext();
  const currentIndex = statusSteps.findIndex(s => s.status === currentStatus);

  if (!statusSteps || statusSteps.length === 0) {
    return null; // Or a loading indicator
  }

  return (
    <nav aria-label="Progress">
      <ol role="list" className="space-y-6">
        {statusSteps.map((step, stepIdx) => (
          <li key={step.title} className="relative flex items-start">
             {stepIdx !== statusSteps.length - 1 ? (
              <div className="absolute left-4 top-5 -ml-px mt-0.5 h-full w-0.5 bg-slate-700" aria-hidden="true" />
            ) : null}
            {stepIdx <= currentIndex ? (
               <>
                <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-600">
                    <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                    </svg>
                </div>
                <div className="ml-4">
                  <h3 className={`text-sm font-semibold text-white`}>{step.title}</h3>
                  <p className="text-sm text-slate-400">{step.description}</p>
                </div>
              </>
            ) : (
                <>
                <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-slate-600 bg-slate-800">
                    <span className="h-2.5 w-2.5 rounded-full bg-transparent" aria-hidden="true" />
                </div>
                <div className="ml-4">
                    <h3 className="text-sm font-semibold text-slate-500">{step.title}</h3>
                    <p className="text-sm text-slate-500">{step.description}</p>
                </div>
                </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default StatusBar;
