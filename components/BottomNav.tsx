
import React from 'react';
import { Home, Tv, Film, MonitorPlay, MoreHorizontal } from 'lucide-react';
import { ViewState } from '../types';

interface BottomNavProps {
  activeView: ViewState;
  setView: (view: ViewState) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeView, setView }) => {
  const navItems = [
    { id: 'Home', icon: Home, label: 'Home' },
    { id: 'Live', icon: Tv, label: 'Live TV' },
    { id: 'Movies', icon: Film, label: 'Movies' },
    { id: 'Series', icon: MonitorPlay, label: 'Series' },
    { id: 'Setup', icon: MoreHorizontal, label: 'Settings' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-black/95 border-t border-gray-800 flex justify-around items-center py-2 px-1 z-50">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setView(item.id as ViewState)}
          className={`flex flex-col items-center gap-1 transition-colors duration-200 ${
            activeView === item.id ? 'text-white' : 'text-gray-500'
          }`}
        >
          <item.icon size={20} className={activeView === item.id ? 'scale-110' : ''} />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default BottomNav;
