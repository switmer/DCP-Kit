import React from 'react';

export interface AProps {
  children: string;
}

export function ComponentA({ children }: AProps) {
  return <div className="component-a">{children}</div>;
}