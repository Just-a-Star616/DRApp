import React from 'react';
import { useAppContext } from '../contexts/AppContext';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, id, ...props }) => {
  const { branding } = useAppContext();
  return (
    <div className="flex items-center">
      <input
        id={id}
        type="checkbox"
        {...props}
        className={`h-4 w-4 rounded border-slate-600 bg-slate-800 text-${branding.primaryColor}-500 focus:ring-${branding.primaryColor}-500 focus:ring-offset-slate-900`}
      />
      <label htmlFor={id} className="ml-3 block text-sm text-slate-300">
        {label}
      </label>
    </div>
  );
};

export default Checkbox;