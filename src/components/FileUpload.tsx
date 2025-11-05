import React, { useRef } from 'react';

interface FileUploadProps {
  label: string;
  id: string;
  file: File | null | undefined;
  onFileChange: (file: File | null) => void;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ label, id, file, onFileChange, error }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    onFileChange(selectedFile);
  };
  
  const handleButtonClick = () => {
    inputRef.current?.click();
  }

  return (
    <div>
      <div className={`flex items-center justify-between w-full rounded-md shadow-sm bg-slate-800 border ${error ? 'border-red-500' : 'border-slate-600'} text-white placeholder-slate-400 p-2`}>
        <span className="text-sm text-slate-300 truncate pr-2">{file ? file.name : label}</span>
        <input 
            id={id} 
            name={id} 
            type="file" 
            className="sr-only" 
            onChange={handleFileChange}
            ref={inputRef} 
        />
        <button
            type="button"
            onClick={handleButtonClick}
            className="flex-shrink-0 flex items-center justify-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default FileUpload;