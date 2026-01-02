
import React from 'react';
import { IPTVItem, IPTVCategory, ViewState, XCCredentials } from './types';
import { fetchXtreamData } from './utils/xtreamCodes';
import { saveIPTVData, getIPTVData } from './utils/db';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ContentRow from './components/ContentRow';
import VideoPlayer from './components/VideoPlayer';
import SeriesDetails from './components/SeriesDetails';
import { AlertCircle, Trash2, Loader2, Play, Power, Signal, Search, ChevronRight, LayoutGrid, List } from 'lucide-react';

const App: React.FC = () => {
  const [items, setItems] = React.useState<IPTVItem[]>([]);
  const [categories, setCategories] = React.useState<IPTVCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [view, setView] = React.useState<ViewState>('Home');
  const [selectedItem, setSelectedItem] = React.useState<IPTVItem | null>(null);
  const [selectedSeries, setSelectedSeries] = React.useState<IPTVItem | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const [setupType, setSetupType] = React.useState<'XC'>('XC');
  const [loadingStatus, setLoadingStatus] = React.useState('');
  const [xcCreds, setXcCreds] = React.useState<XCCredentials>(() => {
    const saved = localStorage.getItem('manelflix_creds');
    return saved ? JSON.parse(saved) : { host: '', user: '', pass: '', useProxy: true };
  });
  
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function init() {
      const data = await getIPTVData();
      if (data.items.length > 0) {
        setItems(data.items);
        setCategories(data.categories);
      } else {
        setView('Setup');
      }
    }
    init();
  }, []);

  const handlePlaylistLoad = async () => {
    setLoading(true);
    setErrorMsg(null);
    setLoadingStatus('Handshake com Servidor...');
    try {
      const data = await fetchXtreamData(xcCreds);
      setLoadingStatus('Sincronizando Banco Local...');
      await saveIPTVData(data.items, data.categories);
      setItems(data.items);
      setCategories(data.categories);
      localStorage.setItem('manelflix_creds', JSON.stringify(xcCreds));
      setView('Home');
    } catch (e: any) {
      setErrorMsg(e.message || 'Erro ao conectar.');
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (item: IPTVItem) => {
    if (item.group === 'Series') setSelectedSeries(item);
    else setSelectedItem(item);
  };

  const clearCache = () => {
    localStorage.clear();
    indexedDB.deleteDatabase('ManelflixDB');
    window.location.reload();
  };

  const currentGroup = view === 'Home' ? 'Live' : 
                     view === 'Live' ? 'Live' : 
                     view === 'Movies' ? 'Movie' : 'Series';

  const groupCategories = categories.filter(c => c.group === currentGroup);

  const filteredItems = React.useMemo(() => {
    let base = items.filter(i => i.group === currentGroup);
    if (selectedCategory !== 'all') {
      base = base.filter(i => i.category_id === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(i => i.name.toLowerCase().includes(q));
    }
    return base;
  }, [items, view, selectedCategory, searchQuery]);

  if (view === 'Setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] p-6">
        <div className="w-full max-w-md space-y-8 bg-zinc-900/40 p-12 rounded-[2.5rem] border border-zinc-800 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <h1 className="text-5xl font-black text-red-600 tracking-tighter italic uppercase">Manelflix</h1>
            <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.5em] mt-3">Smart IPTV Engine v12.0</p>
          </div>
          <div className="space-y-4">
            <input type="text" placeholder="HOST/DNS" className="w-full bg-black/40 border border-zinc-800 p-5 rounded-2xl outline-none focus:border-red-600 text-xs font-bold uppercase" value={xcCreds.host} onChange={e => setXcCreds({...xcCreds, host: e.target.value})} />
            <input type="text" placeholder="USUÁRIO" className="w-full bg-black/40 border border-zinc-800 p-5 rounded-2xl outline-none focus:border-red-600 text-xs font-bold uppercase" value={xcCreds.user} onChange={e => setXcCreds({...xcCreds, user: e.target.value})} />
            <input type="password" placeholder="SENHA" className="w-full bg-black/40 border border-zinc-800 p-5 rounded-2xl outline-none focus:border-red-600 text-xs font-bold uppercase" value={xcCreds.pass} onChange={e => setXcCreds({...xcCreds, pass: e.target.value})} />
          </div>
          <button onClick={handlePlaylistLoad} disabled={loading} className="w-full bg-red-600 hover:bg-red-700 py-6 rounded-2xl font-black uppercase text-[11px] tracking-widest flex flex-col items-center gap-1 transition-all active:scale-95">
            {loading ? <><Loader2 className="animate-spin" size={20} /> <span className="text-[8px] opacity-60">{loadingStatus}</span></> : 'Acessar Catálogo'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Header onSearch={setSearchQuery} />
      
      <div className="flex flex-1 pt-20">
        {/* Sidebar Categorias - Estilo iptvplayer.stream */}
        <aside className="hidden md:flex flex-col w-72 bg-black/40 border-r border-zinc-900 overflow-y-auto hide-scrollbar sticky top-20 h-[calc(100vh-80px)]">
          <div className="p-6">
            <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-6">Categorias</h3>
            <button 
              onClick={() => setSelectedCategory('all')}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all mb-2 ${selectedCategory === 'all' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-900'}`}
            >
              Todos os Itens
            </button>
            {groupCategories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all mb-1 truncate ${selectedCategory === cat.id ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-900'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Grid de Conteúdo */}
        <main className="flex-1 p-4 md:p-8 pb-32">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter italic">
                {view === 'Home' ? 'Live TV' : view}
              </h2>
              <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                {filteredItems.length} Itens Encontrados
              </p>
            </div>
            
            {/* Mobile Category Dropdown */}
            <select 
              className="md:hidden bg-zinc-900 text-white p-3 rounded-xl text-[10px] font-black uppercase outline-none border border-zinc-800"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="all">Todas Categorias</option>
              {groupCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
            {filteredItems.slice(0, 200).map(item => (
              <div 
                key={item.id} 
                onClick={() => handleItemSelect(item)}
                className="group relative bg-zinc-900/40 rounded-2xl overflow-hidden cursor-pointer border border-zinc-800/50 hover:border-red-600/50 transition-all hover:-translate-y-1"
              >
                <div className="aspect-[3/4] overflow-hidden relative">
                  <img src={item.logo} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" onError={(e) => (e.target as any).src = 'https://via.placeholder.com/300x450/000000/FFFFFF?text=MANELFLIX'} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-2xl">
                      <Play size={20} fill="white" className="ml-1" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="text-[11px] font-black uppercase truncate tracking-tight">{item.name}</h4>
                  <p className="text-[8px] text-zinc-600 font-bold uppercase mt-1 truncate">{item.category_name}</p>
                </div>
              </div>
            ))}
          </div>
          
          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-40 text-zinc-800">
              <Search size={64} className="mb-4" />
              <p className="font-black uppercase text-xs tracking-[0.3em]">Nada nesta categoria</p>
            </div>
          )}
        </main>
      </div>

      <BottomNav activeView={view} setView={(v) => { setView(v); setSelectedCategory('all'); }} />

      {selectedSeries && (
        <SeriesDetails item={selectedSeries} creds={xcCreds} onClose={() => setSelectedSeries(null)} onPlayEpisode={(url, title) => setSelectedItem({...selectedSeries, url, name: title})} />
      )}
      {selectedItem && (
        <VideoPlayer item={selectedItem} onClose={() => setSelectedItem(null)} creds={xcCreds} />
      )}
    </div>
  );
};

export default App;
