import { Truck, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import '../styles/header.css';

export function Header({ onBrandClick, onMobileMenuClick }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBrandClick = () => {
    // Primero actualiza el estado a Recorridos
    onBrandClick();
    // Luego abre en nueva pestaña
    window.open(window.location.pathname, '_blank');
  };

  return (
    <header className="app-header">
      {isMobile && (
        <button
          className="mobile-menu-btn"
          onClick={onMobileMenuClick}
          title="Abrir menú"
          aria-label="Abrir menú"
        >
          <Menu size={24} />
        </button>
      )}

      <button
        className="brand-button"
        onClick={handleBrandClick}
        title="Ir a Recorridos (abre en nueva pestaña)"
      >
        <Truck size={28} strokeWidth={2} className="brand-icon" />
        <h1 className="brand-text">Logística Hogareño</h1>
      </button>
    </header>
  );
}
