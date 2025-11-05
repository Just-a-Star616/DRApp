
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import TextInput from '../components/TextInput';
import Button from '../components/Button';
import { auth } from '../services/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

const ForgotPassword = () => {
  const { branding } = useAppContext();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        setError("Please enter a valid email address.");
        setIsLoading(false);
        return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('If an account with that email exists, a password reset link has been sent.');
    } catch (error: any) {
      console.error(error);
      // We show a generic message for security reasons, even on error.
      setMessage('If an account with that email exists, a password reset link has been sent.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
        <div className="bg-sky-900/70 p-8 rounded-2xl shadow-2xl border border-sky-800 backdrop-blur-sm text-center">
        <img className="mx-auto h-16 w-16 rounded-md mb-4" src={branding.logoUrl} alt={`${branding.companyName} Logo`} />
        <h1 className="text-3xl font-bold text-white">Reset Password</h1>
        <p className="mt-2 text-slate-300">
            Enter your email to receive a link to reset your password.
        </p>

        {message ? (
            <div className="mt-8 text-center bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-md">
                <p>{message}</p>
                 <div className="text-center text-sm mt-4">
                    <Link to="/login" className={`font-medium text-${branding.primaryColor}-400 hover:text-${branding.primaryColor}-300`}>
                        &larr; Back to Login
                    </Link>
                </div>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6 text-left">
                <TextInput
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email Address"
                />
                
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                <Button type="submit" isLoading={isLoading}>
                Send Reset Link
                </Button>
                <div className="text-center text-sm">
                    <Link to="/login" className={`font-medium text-${branding.primaryColor}-400 hover:text-${branding.primaryColor}-300`}>
                        Back to Login
                    </Link>
                </div>
            </form>
        )}
        </div>
    </div>
  );
};

export default ForgotPassword;
