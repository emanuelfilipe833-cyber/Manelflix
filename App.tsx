
import React from 'react';
import { IPTVItem, ViewState, XCCredentials } from './types';
import { parseM3U } from './utils/m3uParser';
import { fetchXtreamCodes } from './utils/xtreamCodes';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ContentRow from './components/ContentRow';
import VideoPlayer from './components/VideoPlayer';
import SeriesDetails from './components/SeriesDetails';
import { AlertCircle, Trash2, Loader2, Play, Power, Signal, Search } from 'lucide-react';

const App: React.FC = () => {
  const [items, setItems] = React.useState<IPTVItem[]>([]);
  const [view, setView] = React.useState<ViewState>('Home');
  const [selectedItem, setSelectedItem] = React.useState<IPTVItem | null>(null);
  const [selectedSeries, setSelectedSeries] = React.useState<IPTVItem | null>(null);
  const [episodeToPlay, setEpisodeToPlay] = React.useState<{url: string, title: string} | null>(null);
  
  const [setupType, setSetupType] = React.useState<'M3U' | 'XC'>('XC');
  const [loadingStatus, setLoadingStatus] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const [m3uUrl, setM3uUrl] = React.useState('');
  const [xcCreds, setXcCreds] = React.useState<XCCredentials>(() => {
    const saved = localStorage.getItem('manelflix_creds');
    return saved ? JSON.parse(saved) : { host: '', user: '', pass: '', useProxy: true };
  });
  
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    const saved = localStorage.getItem('manelflix_playlist');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        } else {
          setView('Setup');
        }
      } catch (e) {
        setView('Setup');
      }
    } else {
      setView('Setup');
    }
  }, []);

  const handlePlaylistLoad = async () => {
    setLoading(true);
    setErrorMsg(null);
    setLoadingStatus('Conectando ao servidor...');
    
    try {
      let data: IPTVItem[] = [];
      if (setupType === 'M3U') {
        const res = await fetch(m3uUrl);
        data = parseM3U(await res.text());
      } else {
        setLoadingStatus('Baixando catálogo...');
        data = await fetchXtreamCodes(xcCreds);
        localStorage.setItem('manelflix_creds', JSON.stringify(xcCreds));
      }
      
      if (data.length === 0) throw new Error('O servidor não enviou nenhum canal.');
      
      setItems(data);
      localStorage.setItem('manelflix_playlist', JSON.stringify(data));
      setView('Home');
    } catch (e: any) {
      setErrorMsg(e.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  const handleItemSelect = (item: IPTVItem) => {
    if (item.group === 'Series') {
      setSelectedSeries(item);
    } else {
      setSelectedItem(item);
    }
  };

  const clearCache = () => {
    localStorage.clear();
    setItems([]);
    setView('Setup');
  };

  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items;
    const lowerQuery = searchQuery.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) || 
      item.category.toLowerCase().includes(lowerQuery)
    );
  }, [items, searchQuery]);

  const liveItems = filteredItems.filter(i => i.group === 'Live');
  const movieItems = filteredItems.filter(i => i.group === 'Movie');
  const seriesItems = filteredItems.filter(i => i.group === 'Series');

  if (view === 'Setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6">
        <div className="w-full max-w-md space-y-8 bg-zinc-900/50 p-10 rounded-[3rem] border border-zinc-800 backdrop-blur-3xl shadow-2xl">
          <div className="text-center">
            <h1 className="text-5xl font-black text-red-600 tracking-tighter italic uppercase">Manelflix</h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2 flex items-center justify-center gap-2">
              <Signal size={10} className="text-green-500" /> Motor Blink 2024
            </p>
          </div>

          <div className="flex bg-black p-1 rounded-2xl border border-zinc-800">
            <button onClick={() => setSetupType('M3U')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${setupType === 'M3U' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500'}`}>Link M3U</button>
            <button onClick={() => setSetupType('XC')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${setupType === 'XC' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500'}`}>API Xtream</button>
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-600/10 border border-red-600/20 rounded-2xl text-red-500 text-[11px] font-black uppercase flex items-center gap-3">
              <AlertCircle size={18} /> {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            {setupType === 'M3U' ? (
              <input type="text" placeholder="URL M3U" className="w-full bg-black/60 border border-zinc-800 p-5 rounded-2xl outline-none focus:border-red-600 text-xs font-bold uppercase transition-all" value={m3uUrl} onChange={e => setM3uUrl(e.target.value)} />
            ) : (
              <>
                <input type="text" placeholder="URL OU HOST (EX: HTTP://...)" className="w-full bg-black/60 border border-zinc-800 p-5 rounded-2xl outline-none focus:border-red-600 text-xs font-bold uppercase transition-all" value={xcCreds.host} onChange={e => setXcCreds({...xcCreds, host: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="USER" className="w-full bg-black/60 border border-zinc-800 p-5 rounded-2xl outline-none focus:border-red-600 text-xs font-bold uppercase transition-all" value={xcCreds.user} onChange={e => setXcCreds({...xcCreds, user: e.target.value})} />
                  <input type="password" placeholder="PASS" className="w-full bg-black/60 border border-zinc-800 p-5 rounded-2xl outline-none focus:border-red-600 text-xs font-bold uppercase transition-all" value={xcCreds.pass} onChange={e => setXcCreds({...xcCreds, pass: e.target.value})} />
                </div>
              </>
            )}
          </div>

          <button onClick={handlePlaylistLoad} disabled={loading} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 py-6 rounded-2xl font-black uppercase text-[11px] tracking-widest flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-2xl shadow-red-900/30">
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span className="text-[8px] opacity-70 tracking-widest">{loadingStatus}</span>
              </>
            ) : <><Play size={18} fill="white"/> Conectar Agora</>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header onSearch={setSearchQuery} />
      <main className="pt-24 pb-32 space-y-16 animate-in fade-in duration-500">
        {searchQuery ? (
          <div className="px-4 md:px-12 pt-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-red-600 rounded-2xl shadow-lg shadow-red-900/40">
                <Search size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter italic">Resultados</h2>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Encontrados {filteredItems.length} itens para "{searchQuery}"</p>
              </div>
            </div>
            
            <div className="space-y-12">
              {liveItems.length > 0 && <ContentRow title="Canais Encontrados" items={liveItems} onSelect={handleItemSelect} />}
              {movieItems.length > 0 && <ContentRow title="Filmes Encontrados" items={movieItems} onSelect={handleItemSelect} />}
              {seriesItems.length > 0 && <ContentRow title="Séries Encontradas" items={seriesItems} onSelect={handleItemSelect} />}
            </div>
          </div>
        ) : (
          <>
            {view === 'Home' && (
              <>
                <ContentRow title="Canais Sugeridos" items={liveItems.slice(0, 30)} onSelect={handleItemSelect} />
                <ContentRow title="Filmes Populares" items={movieItems.slice(0, 30)} onSelect={handleItemSelect} />
                <ContentRow title="Séries em Destaque" items={seriesItems.slice(0, 30)} onSelect={handleItemSelect} />
              </>
            )}
            {view === 'Live' && <ContentRow title="Grade de Canais" items={liveItems} onSelect={handleItemSelect} />}
            {view === 'Movies' && <ContentRow title="Todos os Filmes" items={movieItems} onSelect={handleItemSelect} />}
            {view === 'Series' && <ContentRow title="Catálogo de Séries" items={seriesItems} onSelect={handleItemSelect} />}
          </>
        )}

        <div className="flex justify-center p-12">
          <button onClick={clearCache} className="group flex items-center gap-4 bg-zinc-900/30 hover:bg-red-600/10 border border-zinc-800 p-6 rounded-[2rem] transition-all">
            <Power size={20} className="text-zinc-600 group-hover:text-red-600" />
            <div className="text-left">
              <span className="block text-[10px] font-black uppercase text-zinc-500 group-hover:text-red-500 tracking-[0.2em]">Sair da Conta</span>
              <span className="block text-[8px] font-bold text-zinc-700 uppercase">Limpar cache do servidor</span>
            </div>
          </button>
        </div>
      </main>
      
      <BottomNav activeView={view} setView={setView} />

      {/* Series Selection View */}
      {selectedSeries && (
        <SeriesDetails 
          item={selectedSeries} 
          creds={xcCreds} 
          onClose={() => setSelectedSeries(null)} 
          onPlayEpisode={(url, title) => {
            setEpisodeToPlay({ url, title });
            setSelectedItem({ ...selectedSeries, url, name: title });
          }}
        />
      )}

      {/* Main Video Player */}
      {selectedItem && (
        <VideoPlayer 
          item={selectedItem} 
          onClose={() => {
            setSelectedItem(null);
            setEpisodeToPlay(null);
          }} 
          creds={xcCreds} 
        />
      )}
    </div>
  );
};

export default App;
