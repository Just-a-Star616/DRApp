
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import StatusBar from '../components/StatusBar';
import Button from '../components/Button';
import NotificationBell from '../components/NotificationBell';
import DocumentPreview from '../components/DocumentPreview';
import FileUpload from '../components/FileUpload';
import { auth, db, storage } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { logActivity } from '../services/activityLog';
import { ActivityType, ActivityActor } from '../types';

const InfoRow: React.FC<{ label: string, value?: string, children?: React.ReactNode }> = ({ label, value, children }) => {
    if (!value && !children) return null;
    return (
        <div className="grid grid-cols-3 gap-4 py-3 border-b border-sky-800">
            <dt className="text-sm font-medium text-slate-400">{label}</dt>
            <dd className="col-span-2 text-sm text-white">
                {children || value || <span className="text-slate-500">N/A</span>}
            </dd>
        </div>
    );
}

const Status = () => {
  const { application, setIsAuthenticated, currentUser } = useAppContext();
  const navigate = useNavigate();

  // State for file uploads
  const [badgeFile, setBadgeFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [v5cFile, setV5cFile] = useState<File | null>(null);
  const [phvFile, setPhvFile] = useState<File | null>(null);
  const [dbsFile, setDbsFile] = useState<File | null>(null);
  const [medicalFile, setMedicalFile] = useState<File | null>(null);
  const [knowledgeTestFile, setKnowledgeTestFile] = useState<File | null>(null);

  // State for additional fields
  const [dbsCheckNumber, setDbsCheckNumber] = useState(application?.dbsCheckNumber || '');
  const [vehicleMake, setVehicleMake] = useState(application?.vehicleMake || '');
  const [vehicleModel, setVehicleModel] = useState(application?.vehicleModel || '');
  const [vehicleReg, setVehicleReg] = useState(application?.vehicleReg || '');
  const [insuranceExpiry, setInsuranceExpiry] = useState(application?.insuranceExpiry || '');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [showVehicleForm, setShowVehicleForm] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/home');
  };

  const handleFileUpload = async (file: File, path: string) => {
    if (!currentUser) return null;
    const storageRef = ref(storage, `documents/${currentUser.uid}/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSaveChanges = async () => {
    if (!currentUser || !application) return;

    setIsUploading(true);
    setUploadMessage('Saving changes...');

    try {
      const updates: any = {};
      const uploadedDocuments: string[] = [];
      const applicantName = `${application.firstName} ${application.lastName}`;

      // Upload files if provided
      if (badgeFile) {
        const url = await handleFileUpload(badgeFile, 'badge');
        updates['documents.badgeDocumentUrl'] = url;
        uploadedDocuments.push('Badge Document');
      }
      if (licenseFile) {
        const url = await handleFileUpload(licenseFile, 'license');
        updates['documents.drivingLicenseDocumentUrl'] = url;
        uploadedDocuments.push('Driving License');
      }
      if (insuranceFile) {
        const url = await handleFileUpload(insuranceFile, 'insurance');
        updates['documents.insuranceDocumentUrl'] = url;
        uploadedDocuments.push('Insurance Certificate');
      }
      if (v5cFile) {
        const url = await handleFileUpload(v5cFile, 'v5c');
        updates['documents.v5cDocumentUrl'] = url;
        uploadedDocuments.push('V5C Logbook');
      }
      if (phvFile) {
        const url = await handleFileUpload(phvFile, 'phv');
        updates['documents.phvLicenceDocumentUrl'] = url;
        uploadedDocuments.push('PHV Licence');
      }

      // Unlicensed driver documents
      if (dbsFile) {
        const url = await handleFileUpload(dbsFile, 'dbs');
        updates['unlicensedProgress.dbsDocumentUrl'] = url;
        uploadedDocuments.push('DBS Certificate');
      }
      if (medicalFile) {
        const url = await handleFileUpload(medicalFile, 'medical');
        updates['unlicensedProgress.medicalDocumentUrl'] = url;
        uploadedDocuments.push('Medical Certificate');
      }
      if (knowledgeTestFile) {
        const url = await handleFileUpload(knowledgeTestFile, 'knowledge');
        updates['unlicensedProgress.knowledgeTestDocumentUrl'] = url;
        uploadedDocuments.push('Knowledge Test Certificate');
      }

      // Add text fields
      let dbsNumberAdded = false;
      if (dbsCheckNumber && dbsCheckNumber !== application.dbsCheckNumber) {
        updates.dbsCheckNumber = dbsCheckNumber;
        dbsNumberAdded = true;
      }

      // Vehicle details if adding vehicle
      let vehicleAdded = false;
      if (showVehicleForm || (vehicleMake && vehicleModel)) {
        if (vehicleMake) updates.vehicleMake = vehicleMake;
        if (vehicleModel) updates.vehicleModel = vehicleModel;
        if (vehicleReg) updates.vehicleReg = vehicleReg;
        if (insuranceExpiry) updates.insuranceExpiry = insuranceExpiry;
        updates.hasOwnVehicle = true;
        vehicleAdded = true;
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'applications', currentUser.uid), updates);
        setUploadMessage('Changes saved successfully!');

        // Log activities
        if (uploadedDocuments.length > 0) {
          await logActivity({
            applicationId: currentUser.uid,
            applicantName,
            applicantEmail: application.email,
            activityType: ActivityType.DocumentUploadedByApplicant,
            actor: ActivityActor.Applicant,
            actorId: currentUser.uid,
            actorName: applicantName,
            details: `Uploaded ${uploadedDocuments.length} document(s): ${uploadedDocuments.join(', ')}`,
            metadata: {
              documentType: uploadedDocuments.join(', '),
              documentCount: uploadedDocuments.length,
            },
          });
        }

        if (dbsNumberAdded) {
          await logActivity({
            applicationId: currentUser.uid,
            applicantName,
            applicantEmail: application.email,
            activityType: ActivityType.DBSNumberAdded,
            actor: ActivityActor.Applicant,
            actorId: currentUser.uid,
            actorName: applicantName,
            details: 'Added DBS check number for validation',
            metadata: {
              dbsCheckNumber: dbsCheckNumber,
            },
          });
        }

        if (vehicleAdded) {
          await logActivity({
            applicationId: currentUser.uid,
            applicantName,
            applicantEmail: application.email,
            activityType: ActivityType.VehicleAdded,
            actor: ActivityActor.Applicant,
            actorId: currentUser.uid,
            actorName: applicantName,
            details: `Added vehicle: ${vehicleMake || ''} ${vehicleModel || ''} (${vehicleReg || 'N/A'})`,
            metadata: {
              vehicleMake,
              vehicleModel,
              vehicleReg,
              insuranceExpiry,
            },
          });
        }

        // If no specific activity type but other fields updated, log general update
        if (uploadedDocuments.length === 0 && !dbsNumberAdded && !vehicleAdded) {
          await logActivity({
            applicationId: currentUser.uid,
            applicantName,
            applicantEmail: application.email,
            activityType: ActivityType.InformationUpdated,
            actor: ActivityActor.Applicant,
            actorId: currentUser.uid,
            actorName: applicantName,
            details: 'Updated application information',
            metadata: updates,
          });
        }

        // Clear file inputs
        setBadgeFile(null);
        setLicenseFile(null);
        setInsuranceFile(null);
        setV5cFile(null);
        setPhvFile(null);
        setDbsFile(null);
        setMedicalFile(null);
        setKnowledgeTestFile(null);

        setTimeout(() => setUploadMessage(''), 3000);
      } else {
        setUploadMessage('No changes to save');
        setTimeout(() => setUploadMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      setUploadMessage('Error saving changes. Please try again.');
      setTimeout(() => setUploadMessage(''), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  if (!application) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-sky-900/70 p-8 rounded-2xl">
            <h2 className="text-xl font-bold text-white">Application Loading...</h2>
            <p className="mt-2 text-slate-300">If you have just applied, please wait a moment for the data to sync. If you see this for a long time, please contact support.</p>
            <div className="mt-6">
                 <Button onClick={() => navigate('/apply')}>Start a New Application</Button>
            </div>
        </div>
      </div>
    );
  }

  // For unlicensed drivers, redirect to their dashboard
  if (application && !application.isLicensedDriver) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-sky-900/70 p-8 rounded-2xl shadow-2xl border border-sky-800 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">Your Licensing Progress</h1>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <button onClick={handleLogout} className="text-sm font-semibold text-slate-300 hover:text-white flex items-center gap-2">
                <span>Log Out</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>

          <div className="mb-8 p-6 bg-slate-900/50 rounded-lg border border-sky-800">
            <p className="text-slate-300">
              You're on your journey to becoming a licensed taxi/PHV driver!
              Complete the checklist below and upload required documents as you progress.
            </p>
          </div>

          {/* Progress Checklist */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Licensing Checklist Progress</h2>

            {/* Step 1: Eligibility */}
            <div className={`p-4 rounded-lg border ${application.unlicensedProgress?.eligibilityChecked ? 'bg-green-900/20 border-green-700' : 'bg-slate-900/50 border-sky-800'}`}>
              <div className="flex items-center gap-3">
                {application.unlicensedProgress?.eligibilityChecked ? (
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="text-white font-medium">1. Eligibility Check</span>
              </div>
            </div>

            {/* Step 2: DBS */}
            <div className={`p-4 rounded-lg border ${application.unlicensedProgress?.dbsApplied ? 'bg-green-900/20 border-green-700' : 'bg-slate-900/50 border-sky-800'}`}>
              <div className="flex items-center gap-3">
                {application.unlicensedProgress?.dbsApplied ? (
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="text-white font-medium">2. Enhanced DBS Check</span>
                {application.unlicensedProgress?.dbsDocumentUrl && (
                  <span className="ml-auto text-xs text-green-400">Document uploaded</span>
                )}
              </div>
            </div>

            {/* Step 3: Medical */}
            <div className={`p-4 rounded-lg border ${application.unlicensedProgress?.medicalBooked ? 'bg-green-900/20 border-green-700' : 'bg-slate-900/50 border-sky-800'}`}>
              <div className="flex items-center gap-3">
                {application.unlicensedProgress?.medicalBooked ? (
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="text-white font-medium">3. Medical Examination</span>
                {application.unlicensedProgress?.medicalDocumentUrl && (
                  <span className="ml-auto text-xs text-green-400">Document uploaded</span>
                )}
              </div>
            </div>

            {/* Step 4: Knowledge Test */}
            <div className={`p-4 rounded-lg border ${application.unlicensedProgress?.knowledgeTestPassed ? 'bg-green-900/20 border-green-700' : 'bg-slate-900/50 border-sky-800'}`}>
              <div className="flex items-center gap-3">
                {application.unlicensedProgress?.knowledgeTestPassed ? (
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="text-white font-medium">4. Knowledge & Safeguarding Test</span>
                {application.unlicensedProgress?.knowledgeTestDocumentUrl && (
                  <span className="ml-auto text-xs text-green-400">Certificate uploaded</span>
                )}
              </div>
            </div>

            {/* Step 5: Council Application */}
            <div className={`p-4 rounded-lg border ${application.unlicensedProgress?.councilApplicationSubmitted ? 'bg-green-900/20 border-green-700' : 'bg-slate-900/50 border-sky-800'}`}>
              <div className="flex items-center gap-3">
                {application.unlicensedProgress?.councilApplicationSubmitted ? (
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="text-white font-medium">5. Council Application Submitted</span>
              </div>
            </div>

            {/* Progress Summary */}
            <div className="mt-6 p-4 bg-cyan-900/30 rounded-lg border border-cyan-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-medium">Overall Progress</span>
                <span className="text-cyan-400 font-bold">
                  {[
                    application.unlicensedProgress?.eligibilityChecked,
                    application.unlicensedProgress?.dbsApplied,
                    application.unlicensedProgress?.medicalBooked,
                    application.unlicensedProgress?.knowledgeTestPassed,
                    application.unlicensedProgress?.councilApplicationSubmitted
                  ].filter(Boolean).length} / 5 Complete
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-sky-500 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${([
                      application.unlicensedProgress?.eligibilityChecked,
                      application.unlicensedProgress?.dbsApplied,
                      application.unlicensedProgress?.medicalBooked,
                      application.unlicensedProgress?.knowledgeTestPassed,
                      application.unlicensedProgress?.councilApplicationSubmitted
                    ].filter(Boolean).length / 5) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Personal Info Section */}
          <div className="mt-8 p-6 bg-slate-900/50 rounded-lg border border-sky-800">
            <h2 className="text-lg font-semibold text-white mb-4">Your Information</h2>
            <dl>
              <InfoRow label="First Name" value={application.firstName} />
              <InfoRow label="Last Name" value={application.lastName} />
              <InfoRow label="Email" value={application.email} />
              <InfoRow label="Mobile" value={application.phone} />
              <InfoRow label="Area" value={application.area} />
            </dl>
          </div>

          {/* Document Upload Section for Unlicensed */}
          <div className="mt-8 p-6 bg-slate-900/50 rounded-lg border border-sky-800">
            <h2 className="text-lg font-semibold text-white mb-4">Upload Documents (Optional)</h2>
            <p className="text-sm text-slate-400 mb-4">
              Upload your documents here if available. All documents will be validated by staff before details are entered into the dispatch system. Documents can also be provided via email or in person during face-to-face meetings.
            </p>

            <div className="space-y-4">
              {/* DBS Document */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  DBS Check Certificate (Optional) {application.unlicensedProgress?.dbsDocumentUrl && <span className="text-green-400">(Uploaded ✓)</span>}
                </label>
                <FileUpload
                  label="Choose DBS Certificate"
                  id="dbs-upload"
                  file={dbsFile}
                  onFileChange={setDbsFile}
                />
              </div>

              {/* Medical Document */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Medical Examination Certificate (Optional) {application.unlicensedProgress?.medicalDocumentUrl && <span className="text-green-400">(Uploaded ✓)</span>}
                </label>
                <FileUpload
                  label="Choose Medical Certificate"
                  id="medical-upload"
                  file={medicalFile}
                  onFileChange={setMedicalFile}
                />
              </div>

              {/* Knowledge Test Document */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Knowledge & Safeguarding Test Certificate (Optional) {application.unlicensedProgress?.knowledgeTestDocumentUrl && <span className="text-green-400">(Uploaded ✓)</span>}
                </label>
                <FileUpload
                  label="Choose Test Certificate"
                  id="knowledge-upload"
                  file={knowledgeTestFile}
                  onFileChange={setKnowledgeTestFile}
                />
              </div>
            </div>

            {/* Vehicle Section for Unlicensed who chose fleet initially */}
            {!application.hasOwnVehicle && (
              <div className="mt-6 pt-6 border-t border-sky-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-semibold text-white">Vehicle Details</h3>
                  {!showVehicleForm && (
                    <button
                      onClick={() => setShowVehicleForm(true)}
                      className="text-sm text-cyan-400 hover:text-cyan-300"
                    >
                      + Add Your Own Vehicle
                    </button>
                  )}
                </div>

                {showVehicleForm && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-400 mb-4">
                      If you've purchased your own vehicle, add the details below:
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Vehicle Make</label>
                      <input
                        type="text"
                        value={vehicleMake}
                        onChange={(e) => setVehicleMake(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-600 focus:border-cyan-500 focus:ring-cyan-500"
                        placeholder="e.g., Toyota"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Vehicle Model</label>
                      <input
                        type="text"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-600 focus:border-cyan-500 focus:ring-cyan-500"
                        placeholder="e.g., Prius"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Vehicle Registration</label>
                      <input
                        type="text"
                        value={vehicleReg}
                        onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-600 focus:border-cyan-500 focus:ring-cyan-500"
                        placeholder="e.g., AB12 CDE"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Insurance Expiry Date</label>
                      <input
                        type="date"
                        value={insuranceExpiry}
                        onChange={(e) => setInsuranceExpiry(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-600 focus:border-cyan-500 focus:ring-cyan-500"
                      />
                    </div>

                    {/* Vehicle Documents */}
                    <div className="pt-4 border-t border-sky-800">
                      <h4 className="text-sm font-semibold text-white mb-3">Vehicle Documents (Optional)</h4>
                      <p className="text-xs text-slate-400 mb-3">
                        All documents will be validated by staff before being entered into the dispatch system.
                      </p>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Insurance Certificate (Optional) {application.documents?.insuranceDocumentUrl && <span className="text-green-400">(Uploaded ✓)</span>}
                          </label>
                          <FileUpload
                            label="Choose Insurance Certificate"
                            id="insurance-vehicle-upload"
                            file={insuranceFile}
                            onFileChange={setInsuranceFile}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            V5C Logbook (Optional) {application.documents?.v5cDocumentUrl && <span className="text-green-400">(Uploaded ✓)</span>}
                          </label>
                          <FileUpload
                            label="Choose V5C Logbook"
                            id="v5c-vehicle-upload"
                            file={v5cFile}
                            onFileChange={setV5cFile}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            PHV Licence (Optional) {application.documents?.phvLicenceDocumentUrl && <span className="text-green-400">(Uploaded ✓)</span>}
                          </label>
                          <FileUpload
                            label="Choose PHV Licence"
                            id="phv-vehicle-upload"
                            file={phvFile}
                            onFileChange={setPhvFile}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Save Button */}
            <div className="mt-6">
              <Button onClick={handleSaveChanges} disabled={isUploading}>
                {isUploading ? 'Saving...' : 'Save Changes'}
              </Button>
              {uploadMessage && (
                <p className={`mt-2 text-sm ${uploadMessage.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                  {uploadMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
        <div className="bg-sky-900/70 p-8 rounded-2xl shadow-2xl border border-sky-800 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Your Application</h1>
                <div className="flex items-center gap-4">
                    <NotificationBell />
                    <button onClick={handleLogout} className="text-sm font-semibold text-slate-300 hover:text-white flex items-center gap-2">
                        <span>Log Out</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 p-6 bg-slate-900/50 rounded-lg border border-sky-800">
                    <h2 className="text-lg font-semibold text-white mb-6">Application Status</h2>
                    <StatusBar currentStatus={application.status} />
                </div>
                <div className="md:col-span-2 p-6 bg-slate-900/50 rounded-lg border border-sky-800 max-h-[70vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-white">Submitted Information</h2>
                    </div>

                    <dl>
                        <InfoRow label="First Name" value={application.firstName} />
                        <InfoRow label="Last Name" value={application.lastName} />
                        <InfoRow label="Email" value={application.email} />
                        <InfoRow label="Mobile" value={application.phone} />
                        <InfoRow label="Area" value={application.area} />
                        <InfoRow label="Existing License" value={application.isLicensedDriver ? 'Yes' : 'No'} />
                        {application.isLicensedDriver && <>
                            <div className="h-px bg-sky-800 my-4"></div>
                            <InfoRow label="Badge Number" value={application.badgeNumber} />
                            <InfoRow label="Badge Expiry" value={application.badgeExpiry} />
                            <InfoRow label="Issuing Council" value={application.issuingCouncil} />
                            <InfoRow label="Driving License No." value={application.drivingLicenseNumber} />
                            <InfoRow label="License Expiry" value={application.licenseExpiry} />
                            <div className="h-px bg-sky-800 my-4"></div>
                            <InfoRow label="Vehicle Make" value={application.vehicleMake} />
                            <InfoRow label="Vehicle Model" value={application.vehicleModel} />
                            <InfoRow label="Vehicle Reg" value={application.vehicleReg} />
                             <InfoRow label="Insurance Expiry" value={application.insuranceExpiry} />
                            <div className="h-px bg-sky-800 my-4"></div>
                            <h3 className="text-sm font-semibold text-white mb-3 mt-6">Uploaded Documents</h3>
                            <DocumentPreview label="Badge Document" url={application.documents?.badgeDocumentUrl} />
                            <DocumentPreview label="Driving License" url={application.documents?.drivingLicenseDocumentUrl} />
                            <DocumentPreview label="Insurance Certificate" url={application.documents?.insuranceDocumentUrl} />
                        </>}
                    </dl>

                </div>
            </div>

            {/* Additional Information & Document Upload Section for Licensed Drivers */}
            <div className="mt-8 p-6 bg-slate-900/50 rounded-lg border border-sky-800">
              <h2 className="text-lg font-semibold text-white mb-4">Additional Information & Documents</h2>

              {/* DBS Check Number */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  DBS Check Number {application.dbsCheckNumber && <span className="text-green-400">(Added ✓)</span>}
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Providing your DBS check number allows companies and councils to verify your DBS status
                </p>
                <input
                  type="text"
                  value={dbsCheckNumber}
                  onChange={(e) => setDbsCheckNumber(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-600 focus:border-cyan-500 focus:ring-cyan-500"
                  placeholder="Enter DBS check number"
                />
              </div>

              {/* Document Uploads */}
              <div className="mb-6">
                <h3 className="text-md font-semibold text-white mb-3">Upload Documents (Optional)</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Upload any documents you didn't provide during signup. All documents will be validated by staff before details are entered into the dispatch system. Documents can also be provided via email or in person during face-to-face meetings.
                </p>

                <div className="space-y-4">
                  {/* Badge Document */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Badge Document (Optional) {application.documents?.badgeDocumentUrl && <span className="text-green-400">(Uploaded ✓)</span>}
                    </label>
                    <FileUpload
                      label="Choose Badge Document"
                      id="badge-upload-licensed"
                      file={badgeFile}
                      onFileChange={setBadgeFile}
                    />
                  </div>

                  {/* Driving License */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Driving License (Optional) {application.documents?.drivingLicenseDocumentUrl && <span className="text-green-400">(Uploaded ✓)</span>}
                    </label>
                    <FileUpload
                      label="Choose Driving License"
                      id="license-upload-licensed"
                      file={licenseFile}
                      onFileChange={setLicenseFile}
                    />
                  </div>

                  {/* Insurance Certificate */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Insurance Certificate (Optional) {application.documents?.insuranceDocumentUrl && <span className="text-green-400">(Uploaded ✓)</span>}
                    </label>
                    <FileUpload
                      label="Choose Insurance Certificate"
                      id="insurance-upload-licensed"
                      file={insuranceFile}
                      onFileChange={setInsuranceFile}
                    />
                  </div>

                  {/* V5C Document (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      V5C Logbook (Optional) {application.documents?.v5cDocumentUrl && <span className="text-green-400">(Uploaded ✓)</span>}
                    </label>
                    <FileUpload
                      label="Choose V5C Logbook"
                      id="v5c-upload-licensed"
                      file={v5cFile}
                      onFileChange={setV5cFile}
                    />
                  </div>

                  {/* PHV Licence (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      PHV Licence (Optional) {application.documents?.phvLicenceDocumentUrl && <span className="text-green-400">(Uploaded ✓)</span>}
                    </label>
                    <FileUpload
                      label="Choose PHV Licence"
                      id="phv-upload-licensed"
                      file={phvFile}
                      onFileChange={setPhvFile}
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Section for Licensed drivers who chose fleet */}
              {!application.hasOwnVehicle && (
                <div className="mb-6 pt-6 border-t border-sky-800">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-md font-semibold text-white">Vehicle Details</h3>
                    {!showVehicleForm && (
                      <button
                        onClick={() => setShowVehicleForm(true)}
                        className="text-sm text-cyan-400 hover:text-cyan-300"
                      >
                        + Add Your Own Vehicle
                      </button>
                    )}
                  </div>

                  {showVehicleForm && (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-400 mb-4">
                        If you've purchased your own vehicle, add the details below:
                      </p>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Vehicle Make</label>
                        <input
                          type="text"
                          value={vehicleMake}
                          onChange={(e) => setVehicleMake(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-600 focus:border-cyan-500 focus:ring-cyan-500"
                          placeholder="e.g., Toyota"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Vehicle Model</label>
                        <input
                          type="text"
                          value={vehicleModel}
                          onChange={(e) => setVehicleModel(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-600 focus:border-cyan-500 focus:ring-cyan-500"
                          placeholder="e.g., Prius"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Vehicle Registration</label>
                        <input
                          type="text"
                          value={vehicleReg}
                          onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                          className="w-full px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-600 focus:border-cyan-500 focus:ring-cyan-500"
                          placeholder="e.g., AB12 CDE"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Insurance Expiry Date</label>
                        <input
                          type="date"
                          value={insuranceExpiry}
                          onChange={(e) => setInsuranceExpiry(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-600 focus:border-cyan-500 focus:ring-cyan-500"
                        />
                      </div>

                      {/* Vehicle Documents */}
                      <div className="pt-4 border-t border-sky-800">
                        <h4 className="text-sm font-semibold text-white mb-3">Vehicle Documents (Optional)</h4>
                        <p className="text-xs text-slate-400 mb-3">
                          All documents will be validated by staff before being entered into the dispatch system.
                        </p>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Insurance Certificate (Optional) {application.documents?.insuranceDocumentUrl && <span className="text-green-400">(Uploaded ✓)</span>}
                            </label>
                            <FileUpload
                              label="Choose Insurance Certificate"
                              id="insurance-vehicle-licensed-upload"
                              file={insuranceFile}
                              onFileChange={setInsuranceFile}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              V5C Logbook (Optional) {application.documents?.v5cDocumentUrl && <span className="text-green-400">(Uploaded ✓)</span>}
                            </label>
                            <FileUpload
                              label="Choose V5C Logbook"
                              id="v5c-vehicle-licensed-upload"
                              file={v5cFile}
                              onFileChange={setV5cFile}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              PHV Licence (Optional) {application.documents?.phvLicenceDocumentUrl && <span className="text-green-400">(Uploaded ✓)</span>}
                            </label>
                            <FileUpload
                              label="Choose PHV Licence"
                              id="phv-vehicle-licensed-upload"
                              file={phvFile}
                              onFileChange={setPhvFile}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Save Button */}
              <div className="mt-6">
                <Button onClick={handleSaveChanges} disabled={isUploading}>
                  {isUploading ? 'Saving...' : 'Save Changes'}
                </Button>
                {uploadMessage && (
                  <p className={`mt-2 text-sm ${uploadMessage.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                    {uploadMessage}
                  </p>
                )}
              </div>
            </div>
        </div>
    </div>
  );
};

export default Status;
