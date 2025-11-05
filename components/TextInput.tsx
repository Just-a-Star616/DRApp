import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
  error?: string;
}

const TextInput: React.FC<TextInputProps> = ({ label, id, error, ...props }) => {
  const isDate = props.type === 'date';
  const errorClasses = 'border-red-500 focus:border-red-500 focus:ring-red-500';
  const normalClasses = `border-slate-600 focus:border-cyan-500 focus:ring-cyan-500`;

  return (
    <div className="w-full">
      {label && 
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">
          {label}
        </label>
      }
      <div className="relative">
        <input
          id={id}
          {...props}
          placeholder={props.placeholder || label}
          className={`block w-full rounded-md shadow-sm sm:text-sm bg-slate-800 text-white placeholder-slate-400 ${error ? errorClasses : normalClasses} ${isDate ? 'pr-10' : ''}`}
        />
        {isDate && (
           <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
             </svg>
           </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default TextInput;