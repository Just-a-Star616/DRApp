import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import Button from '../components/Button';

const ApplicationConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const { branding, application } = useAppContext();

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <div className="bg-sky-900/70 p-8 rounded-2xl shadow-2xl border border-sky-800 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500 mb-6">
          <svg className="h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white">Application Submitted!</h1>
        <p className="mt-4 text-slate-300">
          Congratulations, {application?.firstName || 'applicant'}! We've received your application to join {branding.companyName}.
        </p>
        <p className="mt-2 text-slate-400">
          We'll review your details and be in touch shortly. You can track the progress of your application at any time from your personal dashboard.
        </p>
        <div className="mt-8">
          <Button onClick={() => navigate('/status')}>
            Track Your Application
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationConfirmation;
