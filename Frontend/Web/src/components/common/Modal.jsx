import { useEffect } from 'react';
import './common.css';

export default function Modal({ isOpen, title, onClose, children, footer }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="mr-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className="mr-modal" onClick={(event) => event.stopPropagation()}>
        <div className="mr-modal__header">
          <h3 className="mr-modal__title">{title}</h3>
          <button
            type="button"
            className="mr-modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div className="mr-modal__body">{children}</div>
        {footer && <div className="mr-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
