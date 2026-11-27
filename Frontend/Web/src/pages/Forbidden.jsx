import { Link } from 'react-router-dom';

export default function Forbidden() {
  return (
    <main style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Access denied</h1>
      <p>Your account does not have permission to open this workspace.</p>
      <Link to="/login">Return to login</Link>
    </main>
  );
}
