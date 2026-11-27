import './common.css';

export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`mr-btn mr-btn--${variant} ${className}`.trim()}
      {...props}
    >
      {loading ? 'Please wait...' : children}
    </button>
  );
}
