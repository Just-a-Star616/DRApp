import { useMemo } from 'react';

export const usePasswordValidation = (password: string) => {
  const validation = useMemo(() => {
    const validations = {
        length: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
    };
    const score = Object.values(validations).filter(Boolean).length;
    let strength = 'Weak';
    if (score >= 5) strength = 'Strong';
    else if (score >= 3) strength = 'Medium';

    // Password is valid if all 5 requirements are met
    const isValid = score === 5;

    return { ...validations, score, strength, isValid };
  }, [password]);

  return validation;
};
