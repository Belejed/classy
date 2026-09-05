import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ModalPortal({ children, onClose, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto font-sans">
      {/* Fullscreen Dark Dimming Backdrop with smooth fade */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-classy-backdrop cursor-pointer"
        onClick={onClose}
      />
      {/* Centered Modal Content Card with smooth pop-in & fade */}
      <div className={`relative z-10 w-full ${maxWidth} my-auto animate-classy-modal`}>
        {children}
      </div>
    </div>,
    document.body
  );
}
