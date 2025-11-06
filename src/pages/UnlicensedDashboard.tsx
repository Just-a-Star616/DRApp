import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { UnlicensedProgress } from '../types';
import { db, storage } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Button from '../components/Button';

const UnlicensedDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, application, branding } = useAppContext();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const progress = application?.unlicensedProgress || {
    eligibilityChecked: false,
    dbsApplied: false,
    medicalBooked: false,
    knowledgeTestPassed: false,
    councilApplicationSubmitted: false,
    badgeReceived: false,
  };

  const area = application?.area || 'your area';
  const council = application?.issuingCouncil || 'your local council';

  const handleCheckboxChange = async (field: keyof UnlicensedProgress) => {
    if (!currentUser || !application) return;

    setIsSaving(true);
    try {
      const updatedProgress = {
        ...progress,
        [field]: !progress[field],
      };

      await updateDoc(doc(db, 'applications', currentUser.uid), {
        unlicensedProgress: updatedProgress,
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('Failed to save progress. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (field: string, file: File) => {
    if (!currentUser || !application) return;

    setUploadingDoc(field);
    try {
      const timestamp = Date.now();
      const storageRef = ref(
        storage,
        `documents/${currentUser.uid}/${timestamp}-${file.name}`
      );
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const updatedProgress = {
        ...progress,
        [`${field}Url`]: downloadURL,
      };

      await updateDoc(doc(db, 'applications', currentUser.uid), {
        unlicensedProgress: updatedProgress,
      });

      alert('Document uploaded successfully!');
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleBadgeReceived = () => {
    // This will redirect them to complete the licensed driver flow
    navigate('/apply?convertToLicensed=true');
  };

  const allStepsComplete =
    progress.eligibilityChecked &&
    progress.dbsApplied &&
    progress.medicalBooked &&
    progress.knowledgeTestPassed &&
    progress.councilApplicationSubmitted;

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-sky-900/70 p-8 rounded-2xl shadow-2xl border border-sky-800 backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-white mb-2">
          Your Roadmap to {council} Licence
        </h1>
        <p className="text-slate-300 mb-6">
          You've chosen to work in <span className="font-semibold text-cyan-400">{area}</span>.
          In the UK, all licensing is handled by the local council for that area.
          We'll guide you through the specific steps for getting your taxi/PHV licence.
        </p>

        <div className="space-y-6">
          {/* Step 1: Eligibility */}
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="eligibility"
                checked={progress.eligibilityChecked}
                onChange={() => handleCheckboxChange('eligibilityChecked')}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                disabled={isSaving}
              />
              <div className="flex-1">
                <label htmlFor="eligibility" className="text-xl font-semibold text-white cursor-pointer">
                  1. Check Eligibility
                </label>
                <p className="text-slate-300 mt-2">
                  Most councils require you to be 21+, have the right to work in the UK,
                  and have held a full driving licence for at least 1-3 years.
                </p>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(council + ' taxi licence eligibility')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
                >
                  Check {council} Eligibility →
                </a>
              </div>
            </div>
          </div>

          {/* Step 2: DBS Check */}
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="dbs"
                checked={progress.dbsApplied}
                onChange={() => handleCheckboxChange('dbsApplied')}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                disabled={isSaving}
              />
              <div className="flex-1">
                <label htmlFor="dbs" className="text-xl font-semibold text-white cursor-pointer">
                  2. Enhanced DBS Check
                </label>
                <p className="text-slate-300 mt-2">
                  You need an enhanced criminal record (DBS) check. This is mandatory for all taxi/PHV drivers.
                </p>
                <a
                  href="https://www.gov.uk/request-copy-criminal-record"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
                >
                  Apply for DBS Check →
                </a>
                {progress.dbsApplied && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Upload your DBS certificate (optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('dbsDocument', file);
                      }}
                      disabled={uploadingDoc === 'dbsDocument'}
                      className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"
                    />
                    {progress.dbsDocumentUrl && (
                      <p className="text-green-400 text-sm mt-2">✓ Document uploaded</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Medical Examination */}
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="medical"
                checked={progress.medicalBooked}
                onChange={() => handleCheckboxChange('medicalBooked')}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                disabled={isSaving}
              />
              <div className="flex-1">
                <label htmlFor="medical" className="text-xl font-semibold text-white cursor-pointer">
                  3. Medical Examination
                </label>
                <p className="text-slate-300 mt-2">
                  You must pass a Group 2 (HGV/Bus) standard medical exam. Your GP or a private service can do this.
                </p>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(council + ' taxi medical examination form')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
                >
                  Find Medical Form →
                </a>
                {progress.medicalBooked && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Upload your completed medical form
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('medicalDocument', file);
                      }}
                      disabled={uploadingDoc === 'medicalDocument'}
                      className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"
                    />
                    {progress.medicalDocumentUrl && (
                      <p className="text-green-400 text-sm mt-2">✓ Document uploaded</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 4: Knowledge & Safeguarding Test */}
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="knowledge"
                checked={progress.knowledgeTestPassed}
                onChange={() => handleCheckboxChange('knowledgeTestPassed')}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                disabled={isSaving}
              />
              <div className="flex-1">
                <label htmlFor="knowledge" className="text-xl font-semibold text-white cursor-pointer">
                  4. Knowledge & Safeguarding Test
                </label>
                <p className="text-slate-300 mt-2">
                  This is the main test. It covers local routes, landmarks, fares, and safeguarding rules for {area}.
                </p>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(council + ' taxi knowledge test booking')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
                >
                  Book Your Test →
                </a>
                {progress.knowledgeTestPassed && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Upload your pass certificate
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('knowledgeTestDocument', file);
                      }}
                      disabled={uploadingDoc === 'knowledgeTestDocument'}
                      className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"
                    />
                    {progress.knowledgeTestDocumentUrl && (
                      <p className="text-green-400 text-sm mt-2">✓ Document uploaded</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 5: Submit Council Application */}
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="councilApp"
                checked={progress.councilApplicationSubmitted}
                onChange={() => handleCheckboxChange('councilApplicationSubmitted')}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                disabled={isSaving}
              />
              <div className="flex-1">
                <label htmlFor="councilApp" className="text-xl font-semibold text-white cursor-pointer">
                  5. Submit Your Council Application
                </label>
                <p className="text-slate-300 mt-2">
                  Once you have your DBS, Medical, and Test Pass, you can submit your final application to {council}.
                </p>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(council + ' taxi licence application')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
                >
                  Go to Council Portal →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Badge Received Section */}
        {allStepsComplete && (
          <div className="mt-8 p-6 bg-gradient-to-r from-cyan-900/50 to-sky-900/50 rounded-lg border-2 border-cyan-500">
            <h2 className="text-2xl font-bold text-white mb-3">
              🎉 Congratulations on completing all the steps!
            </h2>
            <p className="text-slate-300 mb-4">
              Once your official licence (badge) arrives in the post, you'll be ready for the final step
              to join {branding.companyName}.
            </p>
            <Button
              onClick={handleBadgeReceived}
              className="w-full bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600"
            >
              I've Received My Badge! →
            </Button>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mt-8 pt-6 border-t border-slate-700">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Progress</span>
            <span>
              {Object.values(progress).filter(Boolean).length - 1} / 5 steps complete
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-cyan-500 to-sky-500 h-3 rounded-full transition-all duration-500"
              style={{
                width: `${((Object.values(progress).filter(Boolean).length - 1) / 5) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnlicensedDashboard;
