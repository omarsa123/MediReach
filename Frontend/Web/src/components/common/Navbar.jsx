import './common.css';

export default function Navbar({ title, subtitle, rightContent }) {
  return (
    <header className="mr-navbar">
      <div>
        <span className="mr-navbar__title">{title}</span>
        {subtitle && <span className="mr-navbar__subtitle">{subtitle}</span>}
      </div>
      {rightContent && <div className="mr-navbar__actions">{rightContent}</div>}
    </header>
  );
}
