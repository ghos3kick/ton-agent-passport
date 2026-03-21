import { NavLink } from 'react-router-dom';
import { Home, Search, PlusCircle, Compass } from 'lucide-react';

export default function Navigation() {
  return (
    <nav className="tab-bar">
      <NavLink to="/" className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`} end>
        <Home className="tab-icon" />
        Home
      </NavLink>
      <NavLink to="/verify" className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}>
        <Search className="tab-icon" />
        Search
      </NavLink>
      <NavLink to="/explorer" className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}>
        <Compass className="tab-icon" />
        Explore
      </NavLink>
      <NavLink to="/mint" className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}>
        <PlusCircle className="tab-icon" />
        Mint
      </NavLink>
    </nav>
  );
}
