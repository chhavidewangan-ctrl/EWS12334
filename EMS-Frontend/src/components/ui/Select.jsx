import React from 'react';

const Select = ({ 
  label, 
  options = [], 
  error, 
  id, 
  placeholder,
  className = '', 
  containerStyle = {},
  ...props 
}) => {
  return (
    <div className="form-group" style={containerStyle}>
      {label && <label className="form-label" htmlFor={id}>{label}</label>}
      <select
        id={id}
        className={`form-control ${error ? 'is-invalid' : ''} ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value || opt} value={opt.value || opt}>
            {opt.label || opt}
          </option>
        ))}
      </select>
      {error && <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', display: 'block' }}>{error}</span>}
    </div>
  );
};

export default Select;
