import React from 'react';
import { useAppContext } from '../contexts/AppContext';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

const Button: React.FC<ButtonProps> = ({ children, isLoading = false, variant = 'primary', className, ...props }) => {
  const { branding } = useAppContext();

  const baseClasses = 'flex w-full justify-center rounded-md py-2.5 px-4 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200';
  
  const variantClasses = {
    primary: `border border-transparent bg-${branding.primaryColor}-600 text-white hover:bg-${branding.primaryColor}-700 focus:ring-${branding.primaryColor}-500 focus:ring-offset-slate-900`,
    secondary: `border border-slate-600 bg-slate-900/50 text-slate-100 hover:bg-slate-800 focus:ring-${branding.primaryColor}-500 focus:ring-offset-slate-900`,
    ghost: `text-slate-300 hover:text-white hover:bg-slate-800`,
  };

  return (
    <button
      {...props}
      disabled={isLoading || props.disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {isLoading ? (
        <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;