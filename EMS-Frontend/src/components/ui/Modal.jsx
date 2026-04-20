import React from 'react';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  footer
}) => {
  if (!isOpen) return null;

  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'modal-sm';
      case 'lg': return 'modal-lg';
      case 'xl': return 'modal-xl';
      default: return 'modal-md';
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${getSizeClass()}`} style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          {title && <h2>{title}</h2>}
          <button className="icon-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
        {footer && (
          <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
