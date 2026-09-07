import React, { useEffect, useState, useCallback, useRef, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

export const ModalContext = createContext({
  closeModal: () => {},
  isClosing: false
});

export const useModalClose = () => useContext(ModalContext);

// Global modal stack reference counter to prevent race conditions & stuck scroll
let openModalsCount = 0;

export function lockBodyScroll() {
  openModalsCount++;
  if (openModalsCount === 1) {
    document.body.style.overflow = 'hidden';
  }
}

export function unlockBodyScroll(force = false) {
  if (force) {
    openModalsCount = 0;
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    return;
  }
  openModalsCount = Math.max(0, openModalsCount - 1);
  if (openModalsCount === 0) {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }
}

export default function ModalPortal({ children, onClose, maxWidth = 'max-w-lg' }) {
  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    setTimeout(() => {
      onCloseRef.current?.();
    }, 180);
  }, []);

  useEffect(() => {
    lockBodyScroll();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onCloseRef.current) {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unlockBodyScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose]);

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
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] overflow-y-auto font-sans"
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
