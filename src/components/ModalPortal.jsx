import React, { useEffect, useState, useCallback, useRef, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

export const ModalContext = createContext({
  closeModal: () => {},
  isClosing: false
});

export const useModalClose = () => useContext(ModalContext);

export default function ModalPortal({ children, onClose, maxWidth = 'max-w-lg' }) {
  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = useRef(false);

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    setTimeout(() => {
      onClose?.();
    }, 180);
  }, [onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose, onClose]);

  const handleCaptureClick = useCallback((e) => {
    if (isClosingRef.current) return;

    const closeBtn = e.target.closest('button, [data-modal-close="true"]');
    if (!closeBtn) return;

    // Explicit flag or aria-label
    if (closeBtn.getAttribute('data-modal-close') === 'true' || closeBtn.getAttribute('aria-label')?.toLowerCase() === 'close') {
      e.preventDefault();
      e.stopPropagation();
      handleClose();
      return;
    }

    // Do not intercept form submits
    if (closeBtn.type === 'submit') return;

    // Check text for close/cancel keywords
    const text = (closeBtn.innerText || closeBtn.textContent || '').trim().toLowerCase();
    if (text === 'tutup' || text === 'batal' || text === 'close' || text === 'cancel') {
      e.preventDefault();
      e.stopPropagation();
      handleClose();
      return;
    }

    // Check if it contains an X close icon (lucide-x)
    const hasXIcon = closeBtn.querySelector('svg.lucide-x') !== null;
    if (hasXIcon) {
      e.preventDefault();
      e.stopPropagation();
      handleClose();
      return;
    }
  }, [handleClose]);

  return createPortal(
    <ModalContext.Provider value={{ closeModal: handleClose, isClosing }}>
      <div 
        onClickCapture={handleCaptureClick}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto font-sans"
      >
        {/* Fullscreen Dark Dimming Backdrop with smooth fade in & fade out */}
        <div 
          className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer ${
            isClosing ? 'animate-classy-backdrop-out' : 'animate-classy-backdrop'
          }`}
          onClick={handleClose}
        />
        {/* Centered Modal Content Card with smooth pop-in & pop-out */}
        <div className={`relative z-10 w-full ${maxWidth} my-auto ${
          isClosing ? 'animate-classy-modal-out' : 'animate-classy-modal'
        }`}>
          {children}
        </div>
      </div>
    </ModalContext.Provider>,
    document.body
  );
}
