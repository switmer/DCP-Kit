import React from 'react';

// Component with edge cases that might break parsing
export interface ProblematicComponentProps {
  // Dynamic prop types
  [key: string]: any;
  // Required props
  id: string;
  // Union with complex types
  variant?: 'a' | 'b' | 'c' | string;
  // Function prop with complex signature
  onComplexEvent?: (data: { id: string; value: any }, meta?: Record<string, unknown>) => Promise<void>;
  // Generic prop
  data?: Record<string, any>;
  // Computed prop with default
  computed?: string;
}

// Arrow function component with destructuring
export const ProblematicComponent = ({
  id,
  variant = 'a',
  onComplexEvent,
  data = {},
  computed = `computed-${Date.now()}`,
  ...restProps
}: ProblematicComponentProps) => {
  // Complex logic that might confuse parsers
  const derivedValue = React.useMemo(() => {
    return Object.keys(data).length > 0 ? 'has-data' : 'no-data';
  }, [data]);
  
  return (
    <div 
      id={id}
      className={`problematic problematic--${variant} problematic--${derivedValue}`}
      {...restProps}
    >
      <span>{computed}</span>
      {data && Object.keys(data).map(key => (
        <div key={key}>{key}: {String(data[key])}</div>
      ))}
    </div>
  );
};

// Class component for testing different patterns
export class ClassComponent extends React.Component<{ title: string; children?: React.ReactNode }> {
  render() {
    const { title, children } = this.props;
    return (
      <div className="class-component">
        <h1>{title}</h1>
        {children}
      </div>
    );
  }
}

// Component with no explicit props interface
export const NoPropsInterface = (props: any) => {
  return <div {...props}>No explicit props</div>;
};

// Higher-order component
export const withHOC = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => <Component {...props} />;
};

export default ProblematicComponent;