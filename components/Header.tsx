
import React from 'react';
import { Search, Bell, User, X } from 'lucide-react';

interface HeaderProps {
  onSearch: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchToggle = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isSearchOpen) {
      setQuery('');
      onSearch('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onSearch(val);
  };

  return (
    <header className={`fixed top-0 z-[60] w-full transition-all duration-500 flex items-center justify-between px-4 md:px-12 py-4 ${isScrolled || isSearchOpen ? 'bg-black shadow-2xl' : 'bg-gradient-to-b from-black/90 to-transparent'}`}>
      <div className={`flex items-center gap-8 transition-opacity duration-300 ${isSearchOpen ? 'opacity-0 pointer-events-none w-0' : 'opacity-100'}`}>
        <h1 className="text-red-600 text-3xl font-black tracking-tighter italic uppercase select-none">Manelflix</h1>
        <nav className="hidden lg:flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">
          <a href="#" className="hover:text-white transition">Início</a>
          <a href="#" className="hover:text-white transition">TV Ao Vivo</a>
          <a href="#" className="hover:text-white transition">Filmes</a>
          <a href="#" className="hover:text-white transition">Séries</a>
        </nav>
      </div>

      <div className={`flex-1 flex items-center transition-all duration-500 ${isSearchOpen ? 'max-w-4xl opacity-100' : 'max-w-0 opacity-0 overflow-hidden'}`}>
        <div className="relative w-full">
          <input
            type="text"
            placeholder="O QUE VOCÊ QUER ASSISTIR HOJE?"
            className="w-full bg-zinc-900/50 border border-zinc-800 text-white px-6 py-3 rounded-2xl outline-none focus:border-red-600 text-xs font-bold uppercase tracking-widest transition-all"
            value={query}
            onChange={handleInputChange}
            autoFocus={isSearchOpen}
          />
          <Search size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500" />
        </div>
      </div>

      <div className="flex items-center gap-6 text-white ml-4">
        <button onClick={handleSearchToggle} className="hover:text-red-600 transition-colors p-2 bg-zinc-900/40 rounded-xl border border-zinc-800/50">
          {isSearchOpen ? <X size={22} /> : <Search size={22} />}
        </button>
        <button className="hidden sm:block hover:text-red-600 transition-colors"><Bell size={22} /></button>
        <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center cursor-pointer hover:scale-105 transition shadow-lg shadow-red-900/20">
          <User size={20} />
        </div>
      </div>
    </header>
  );
};

export default Header;
