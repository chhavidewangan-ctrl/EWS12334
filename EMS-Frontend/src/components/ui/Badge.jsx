import React from 'react';

const Badge = ({ children, variant = 'secondary', className = '', ...props }) => {
  return (
    <span className={`tag tag-${variant} ${className}`} {...props}>
      {children}
    </span>
  );
};

export default Badge;
