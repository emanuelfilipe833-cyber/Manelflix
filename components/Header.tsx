
import React from 'react';
import { Search, Bell, User } from 'lucide-react';

interface HeaderProps {
  onSearch: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 z-50 w-full transition-colors duration-300 flex items-center justify-between px-4 md:px-12 py-4 ${isScrolled ? 'bg-black' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
      <div className="flex items-center gap-8">
        <h1 className="text-red-600 text-3xl font-extrabold tracking-tighter uppercase select-none">Manelflix</h1>
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-200">
          <a href="#" className="hover:text-white transition">Home</a>
          <a href="#" className="hover:text-white transition">Live TV</a>
          <a href="#" className="hover:text-white transition">Movies</a>
          <a href="#" className="hover:text-white transition">Series</a>
        </nav>
      </div>

      <div className="flex items-center gap-5 text-white">
        <button onClick={onSearch} className="hover:text-gray-300"><Search size={22} /></button>
        <button className="hidden sm:block hover:text-gray-300"><Bell size={22} /></button>
        <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center cursor-pointer">
          <User size={18} />
        </div>
      </div>
    </header>
  );
};

export default Header;
