import React from 'react';

export interface BProps {
  children: string;
}

export function ComponentB({ children }: BProps) {
  return <div className="component-b">{children}</div>;
}