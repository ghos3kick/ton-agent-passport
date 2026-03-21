import { X } from 'lucide-react';
import HolographicPassportCard from './HolographicPassportCard';
import type { ExplorerPassport } from '../hooks/useExplorer';

interface PassportProfileProps {
  isOpen: boolean;
  onClose: () => void;
  passport: ExplorerPassport | null;
  onSearch?: (address: string) => void;
  onVerify?: (address: string) => void;
}

const PassportProfile = ({ isOpen, onClose, passport }: PassportProfileProps) => {
  if (!isOpen || !passport) return null;

  return (
    <div className="profile-overlay" style={{ alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 16px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button className="profile-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <HolographicPassportCard passport={passport} />
      </div>
    </div>
  );
};

export default PassportProfile;
