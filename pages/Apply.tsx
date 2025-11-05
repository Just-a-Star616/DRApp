
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Application, ApplicationStatus } from '../types';
import TextInput from '../components/TextInput';
import Checkbox from '../components/Checkbox';
import FileUpload from '../components/FileUpload';
import Button from '../components/Button';
import PasswordStrength from '../components/PasswordStrength';
import { usePasswordValidation } from '../hooks/usePasswordValidation';
import { auth, db, storage } from '../services/firebase';
import { EmailAuthProvider, linkWithCredential } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAppContext } from '../contexts/AppContext';


const Apply: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, application } = useAppContext();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    area: '',
    isLicensedDriver: false,
    badgeNumber: '',
    badgeExpiry: '',
    issuingCouncil: '',
    drivingLicenseNumber: '',
    licenseExpiry: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleReg: '',
    insuranceExpiry: '',
  });
  const [documents, setDocuments] = useState<{ [key: string]: File | null }>({
    badgeDocument: null,
    drivingLicenseDocument: null,
    insuranceDocument: null,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const passwordValidation = usePasswordValidation(formData.password);
  
  const debounceTimeoutRef = useRef<number | null>(null);

  // Pre-fill form if a partial application exists
  useEffect(() => {
    if (application) {
        setFormData(prev => ({
            ...prev,
            ...application
        }));
    }
  }, [application]);

  const handleSavePartial = useCallback(async () => {
    if (!currentUser || !currentUser.isAnonymous) return;
    if (!formData.firstName && !formData.email) return; // Don't save empty forms

    const partialData = {
        ...formData,
        id: currentUser.uid,
        status: ApplicationStatus.Submitted, // Placeholder status
        createdAt: application?.createdAt || Date.now(), // Preserve original creation date
        isPartial: true,
    };
    // Don't save passwords in partials
    delete partialData.password;
    delete partialData.confirmPassword;

    try {
        await setDoc(doc(db, 'applications', currentUser.uid), partialData, { merge: true });
    } catch (error) {
        console.error("Failed to save partial application", error);
    }
  }, [currentUser, formData, application]);

  const debouncedSave = useCallback(() => {
    if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = window.setTimeout(() => {
        handleSavePartial();
    }, 1500); // Auto-save 1.5s after user stops editing
  }, [handleSavePartial]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const { checked } = e.target as HTMLInputElement;

    setFormData(prev => ({
      ...prev,
      [id]: isCheckbox ? checked : value,
    }));
    debouncedSave();
  };

  const handleFileChange = (id: string) => (file: File | null) => {
    setDocuments(prev => ({ ...prev, [id]: file }));
    // Note: Files are not saved in partials, only on final submission.
  };
  
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email address is invalid';
    if (!formData.phone) newErrors.phone = 'Mobile number is required';
    else if (!/^07\d{9}$/.test(formData.phone.replace(/[\s-()]/g, ''))) newErrors.phone = 'Please enter a valid 11-digit UK mobile number starting with 07';
    if (!formData.area) newErrors.area = 'Area / City of work is required';
    if (passwordValidation.score < 5) newErrors.password = 'Password does not meet all requirements.';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !currentUser) return;
    
    setIsLoading(true);
    setErrors({});

    try {
      // 1. Upgrade anonymous account to permanent email/password account
      if (currentUser.isAnonymous) {
          const credential = EmailAuthProvider.credential(formData.email, formData.password);
          await linkWithCredential(currentUser, credential);
      }
      
      const user = auth.currentUser;
      if (!user) throw new Error("User not found after linking.");

      // 2. Upload documents to Cloud Storage
      const documentUrls: { [key: string]: string } = {};
      for (const key in documents) {
        const file = documents[key];
        if (file) {
          const storageRef = ref(storage, `applications/${user.uid}/${key}-${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          documentUrls[`${key}Url`] = await getDownloadURL(snapshot.ref);
        }
      }

      // 3. Create/update final application document in Firestore
      const applicationData: Application = {
        id: user.uid,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        area: formData.area,
        isLicensedDriver: formData.isLicensedDriver,
        badgeNumber: formData.badgeNumber,
        badgeExpiry: formData.badgeExpiry,
        issuingCouncil: formData.issuingCouncil,
        drivingLicenseNumber: formData.drivingLicenseNumber,
        licenseExpiry: formData.licenseExpiry,
        vehicleMake: formData.vehicleMake,
        vehicleModel: formData.vehicleModel,
        vehicleReg: formData.vehicleReg,
        insuranceExpiry: formData.insuranceExpiry,
        documents: {
            badgeDocumentUrl: documentUrls.badgeDocumentUrl || application?.documents?.badgeDocumentUrl,
            drivingLicenseDocumentUrl: documentUrls.drivingLicenseDocumentUrl || application?.documents?.drivingLicenseDocumentUrl,
            insuranceDocumentUrl: documentUrls.insuranceDocumentUrl || application?.documents?.insuranceDocumentUrl,
        },
        status: ApplicationStatus.Submitted,
        createdAt: application?.createdAt || Date.now(),
        isPartial: false, // Mark as complete
      };

      await setDoc(doc(db, 'applications', user.uid), applicationData);

      navigate('/status');

    } catch (error: any) {
      console.error("Application submission error:", error);
      const newErrors: { [key: string]: string } = {};
      if (error.code === 'auth/email-already-in-use') {
        newErrors.email = 'This email address is already in use by another account.';
      } else if (error.code === 'auth/credential-already-in-use') {
         newErrors.email = 'This email address is already linked to another account.';
      } else {
        newErrors.form = 'An unexpected error occurred. Please try again.';
      }
      setErrors(newErrors);
    } finally {
        setIsLoading(false);
    }
  };

  const councils = [ 'Aberdeen City', 'Other' ]; // Truncated for brevity

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8 bg-sky-900/70 p-8 rounded-2xl shadow-2xl border border-sky-800 backdrop-blur-sm">
        <div className="text-left">
          <h1 className="text-3xl font-bold text-white">Driver Application</h1>
          <p className="mt-2 text-slate-300">Join our team by filling out the form below.</p>
        </div>
        
        <div className="border-t border-sky-800 pt-8">
            <h3 className="text-lg font-semibold text-white mb-4">Your Details</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <TextInput id="firstName" value={formData.firstName} onChange={handleChange} onBlur={handleSavePartial} error={errors.firstName} required placeholder="First Name" />
                <TextInput id="lastName" value={formData.lastName} onChange={handleChange} onBlur={handleSavePartial} error={errors.lastName} required placeholder="Last Name" />
                <TextInput id="email" type="email" value={formData.email} onChange={handleChange} onBlur={handleSavePartial} error={errors.email} required placeholder="Email Address" />
                <TextInput id="phone" type="tel" value={formData.phone} onChange={handleChange} onBlur={handleSavePartial} error={errors.phone} required placeholder="Mobile Number" />
                 <div className="sm:col-span-2">
                    <TextInput id="area" value={formData.area} onChange={handleChange} onBlur={handleSavePartial} error={errors.area} required placeholder="Area / City of Work" />
                </div>
            </div>
        </div>

        <div className="border-t border-sky-800 pt-8">
             <h3 className="text-lg font-semibold text-white mb-4">Create Your Password</h3>
             <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <TextInput id="password" type="password" value={formData.password} onChange={handleChange} error={errors.password} required placeholder="Password" />
                <TextInput id="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} required placeholder="Confirm Password" />
                <div className="sm:col-span-2">
                    <PasswordStrength passwordValidation={passwordValidation} passwordEntered={formData.password.length > 0} />
                </div>
            </div>
        </div>

        <div className="border-t border-sky-800 pt-8">
          <div className="rounded-md border border-slate-600 bg-slate-800/50 p-4">
            <Checkbox id="isLicensedDriver" label="I am an existing licensed Taxi or Private Hire driver." checked={formData.isLicensedDriver} onChange={handleChange} onBlur={handleSavePartial} />
          </div>
        </div>

        {formData.isLicensedDriver && (
            <div className="border-t border-sky-800 pt-8">
                <h3 className="text-lg font-semibold text-white">License & Vehicle Details (Optional)</h3>
                <p className="text-sm text-slate-400 mb-4">Please provide as much information as you can.</p>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <TextInput id="badgeNumber" value={formData.badgeNumber} onChange={handleChange} onBlur={handleSavePartial} placeholder="Badge Number" />
                    <TextInput id="badgeExpiry" type="date" value={formData.badgeExpiry} onChange={handleChange} onBlur={handleSavePartial} placeholder="Badge Expiry" />
                    <div>
                        <select id="issuingCouncil" value={formData.issuingCouncil} onChange={handleChange} onBlur={handleSavePartial} className="block w-full rounded-md shadow-sm sm:text-sm bg-slate-800 text-white placeholder-slate-400 border-slate-600 focus:border-cyan-500 focus:ring-cyan-500 h-[42px]">
                            <option value="">Issuing Council</option>
                            {councils.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <FileUpload id="badgeDocument" label="Badge Document" file={documents.badgeDocument} onFileChange={handleFileChange('badgeDocument')} />
                    <TextInput id="drivingLicenseNumber" value={formData.drivingLicenseNumber} onChange={handleChange} onBlur={handleSavePartial} placeholder="Driving License Number" />
                    <TextInput id="licenseExpiry" type="date" value={formData.licenseExpiry} onChange={handleChange} onBlur={handleSavePartial} placeholder="License Expiry" />
                    <div className="sm:col-span-2">
                        <FileUpload id="drivingLicenseDocument" label="Driving License Document" file={documents.drivingLicenseDocument} onFileChange={handleFileChange('drivingLicenseDocument')} />
                    </div>
                    <TextInput id="vehicleMake" value={formData.vehicleMake} onChange={handleChange} onBlur={handleSavePartial} placeholder="Vehicle Make" />
                    <TextInput id="vehicleModel" value={formData.vehicleModel} onChange={handleChange} onBlur={handleSavePartial} placeholder="Vehicle Model" />
                    <TextInput id="vehicleReg" value={formData.vehicleReg} onChange={handleChange} onBlur={handleSavePartial} placeholder="Vehicle Registration" />
                    <FileUpload id="insuranceDocument" label="Insurance Document" file={documents.insuranceDocument} onFileChange={handleFileChange('insuranceDocument')} />
                    <TextInput id="insuranceExpiry" type="date" value={formData.insuranceExpiry} onChange={handleChange} onBlur={handleSavePartial} placeholder="Insurance Expiry Date" />
                </div>
            </div>
        )}
        
        {errors.form && <p className="text-sm text-red-500 text-center">{errors.form}</p>}
        
        <div className="flex items-center justify-between pt-6 border-t border-sky-800">
          <Link to="/home" className="text-sm font-medium text-slate-300 hover:text-white">
            &larr; Back to Home
          </Link>
          <div className="w-1/2">
            <Button type="submit" isLoading={isLoading}>Submit Application</Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Apply;