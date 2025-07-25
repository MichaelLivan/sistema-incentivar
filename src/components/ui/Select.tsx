import React from 'react';

interface SelectProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  className = '',
  required = false,
  disabled = false,
  id,
  name,
  children,
}) => {
  return (
    <select
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      id={id}
      name={name}
      className={`w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-200 bg-white/90 ${className}`}
    >
      {children}
    </select>
  );
};