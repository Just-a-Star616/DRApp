import React from 'react';

interface PasswordRequirementProps {
  isValid: boolean;
  text: string;
}

const PasswordRequirement: React.FC<PasswordRequirementProps> = ({isValid, text}) => (
    <li className={`flex items-center text-sm ${isValid ? 'text-green-400' : 'text-red-400'}`}>
        {isValid ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
        )}
        {text}
    </li>
);

interface PasswordStrengthProps {
    passwordValidation: {
        length: boolean;
        lowercase: boolean;
        uppercase: boolean;
        number: boolean;
        special: boolean;
        strength: string;
    },
    passwordEntered: boolean;
}

const PasswordStrength: React.FC<PasswordStrengthProps> = ({ passwordValidation, passwordEntered }) => {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 relative">
        <ul className="space-y-1">
            <PasswordRequirement isValid={passwordValidation.length} text="At least 8 characters" />
            <PasswordRequirement isValid={passwordValidation.uppercase} text="An uppercase letter" />
            <PasswordRequirement isValid={passwordValidation.special} text="A special character" />
        </ul>
        <ul className="space-y-1">
            <PasswordRequirement isValid={passwordValidation.lowercase} text="A lowercase letter" />
            <PasswordRequirement isValid={passwordValidation.number} text="A number" />
        </ul>
        {passwordEntered && 
            <span className={`absolute -bottom-5 right-0 text-xs font-bold ${passwordValidation.strength === 'Strong' ? 'text-green-400' : passwordValidation.strength === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                {passwordValidation.strength}
            </span>
        }
    </div>
  );
};

export default PasswordStrength;
