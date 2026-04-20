import React from 'react';

const Input = ({ 
  label, 
  error, 
  id, 
  type = 'text', 
  className = '', 
  containerStyle = {},
  ...props 
}) => {
  return (
    <div className="form-group" style={containerStyle}>
      {label && <label className="form-label" htmlFor={id}>{label}</label>}
      <input
        id={id}
        type={type}
        className={`form-control ${error ? 'is-invalid' : ''} ${className}`}
        {...props}
      />
      {error && <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', display: 'block' }}>{error}</span>}
    </div>
  );
};

export default Input;
