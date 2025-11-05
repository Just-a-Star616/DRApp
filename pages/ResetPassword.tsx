
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import TextInput from '../components/TextInput';
import Button from '../components/Button';
import PasswordStrength from '../components/PasswordStrength';
import { usePasswordValidation } from '../hooks/usePasswordValidation';
import { auth } from '../services/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';

// Helper to parse query params from URL
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ResetPassword = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const oobCode = query.get('oobCode');

  const { branding } = useAppContext();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  const passwordValidation = usePasswordValidation(password);

  useEffect(() => {
    const checkCode = async () => {
      if (!oobCode) {
        setIsValidToken(false);
        return;
      }
      try {
        await verifyPasswordResetCode(auth, oobCode);
        setIsValidToken(true);
      } catch (error) {
        setIsValidToken(false);
        setError("This password reset link is invalid or has expired. Please request a new one.");
        console.error(error);
      }
    };
    checkCode();
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;
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

    try {
      await confirmPasswordReset(auth, oobCode, password);
      // You could try to auto-login here, but it's simpler to redirect.
      navigate('/login');
    } catch (error) {
      setError("Failed to reset password. The link may have expired.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidToken === null) {
      return (
        <div className="w-full max-w-md mx-auto text-center">
            <div className="bg-sky-900/70 p-8 rounded-2xl">
                 <h2 className="text-xl font-bold text-white">Validating link...</h2>
            </div>
        </div>
      );
  }

  if (!isValidToken) {
    return (
        <div className="w-full max-w-md mx-auto text-center">
            <div className="bg-sky-900/70 p-8 rounded-2xl">
                <h2 className="text-xl font-bold text-white text-red-400">Invalid or Expired Link</h2>
                <p className="mt-2 text-slate-300">{error || "This password reset link is no longer valid. Please request a new one."}</p>
                <div className="mt-6">
                    <Button onClick={() => navigate('/forgot-password')}>Request New Link</Button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
        <div className="bg-sky-900/70 p-8 rounded-2xl shadow-2xl border border-sky-800 backdrop-blur-sm text-center">
            <h1 className="text-3xl font-bold text-white">Create New Password</h1>
            <p className="mt-2 text-slate-300">
                Please enter your new secure password below.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-6 text-left">
                <TextInput
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="New Password"
                />
                
                <PasswordStrength passwordValidation={passwordValidation} passwordEntered={password.length > 0} />

                <TextInput
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm New Password"
                />
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <Button type="submit" isLoading={isLoading}>
                    Reset Password
                </Button>
            </form>
        </div>
    </div>
  );
};

export default ResetPassword;
