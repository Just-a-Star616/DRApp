import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import TextInput from '../components/TextInput';
import Button from '../components/Button';
import PasswordStrength from '../components/PasswordStrength';
import { usePasswordValidation } from '../hooks/usePasswordValidation';

const SetPassword = () => {
  const navigate = useNavigate();
  const { application, setApplication, setIsAuthenticated } = useAppContext();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const passwordValidation = usePasswordValidation(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordValidation.score < 5) {
      setError('Password does not meet all requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (application) {
        setApplication({ ...application, passwordHash: 'simulated-hash-' + password });
        setIsAuthenticated(true);
      }
      setIsLoading(false);
      navigate('/status');
    }, 1000);
  };

  return (
    <div className="w-full max-w-md mx-auto">
        <div className="bg-sky-900/70 p-8 rounded-2xl shadow-2xl border border-sky-800 backdrop-blur-sm text-center">
            <h1 className="text-3xl font-bold text-white">Welcome, {application?.firstName}!</h1>
            <p className="mt-2 text-slate-300">
                Your application has been submitted. Create a secure password to track its status.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-6 text-left">
                <TextInput
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Password"
                />
                
                <PasswordStrength passwordValidation={passwordValidation} passwordEntered={password.length > 0} />

                <TextInput
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm Password"
                />
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <Button type="submit" isLoading={isLoading}>
                Set Password & Continue
                </Button>
            </form>
        </div>
    </div>
  );
};

export default SetPassword;