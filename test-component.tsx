import React from 'react';

interface TestProps {
  label: string;
  value: string;
}

export function TestComponent({ label, value }: TestProps) {
  return (
    <div className="test-component">
      <label>{label}</label>
      <span>{value}</span>
    </div>
  );
}// Adding a comment
