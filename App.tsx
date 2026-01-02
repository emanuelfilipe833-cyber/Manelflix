
import React from 'react';
import { IPTVItem, ViewState, XCCredentials } from './types';
import { parseM3U } from './utils/m3uParser';
import { fetchXtreamCodes } from './utils/xtreamCodes';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ContentRow from './components/ContentRow';
import VideoPlayer from './components/VideoPlayer';
import { Play, Info, Database, Link as LinkIcon, AlertCircle, RefreshCw, Trash2, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [items, setItems] = React.useState<IPTVItem[]>([]);
  const [view, setView] = React.useState<ViewState>('Home');
  const [selectedItem, setSelectedItem] = React.useState<IPTVItem | null>(null);
  const [setupType, setSetupType] = React.useState<'M3U' | 'XC'>('XC');
  
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
        localStorage.removeItem('manelflix_playlist');
        setView('Setup');
      }
    } else {
      setView('Setup');
    }
  }, []);

  const handlePlaylistLoad = async (type: 'M3U' | 'XC') => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let parsedItems: IPTVItem[] = [];
      if (type === 'M3U') {
        const response = await fetch(m3uUrl);
        const content = await response.text();
        parsedItems = parseM3U(content);
      } else {
        parsedItems = await fetchXtreamCodes(xcCreds);
        localStorage.setItem('manelflix_creds', JSON.stringify(xcCreds));
      }
      
      if (parsedItems.length === 0) {
        throw new Error('Servidor não retornou nenhum item. Verifique sua conta.');
      }

      setItems(parsedItems);
      localStorage.setItem('manelflix_playlist', JSON.stringify(parsedItems));
      setView('Home');
    } catch (e: any) {
      setErrorMsg(e.message || 'Erro ao conectar no servidor.');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    localStorage.removeItem('manelflix_playlist');
    setItems([]);
    setView('Setup');
  };

  const liveItems = items.filter(i => i.group === 'Live');
  const movieItems = items.filter(i => i.group === 'Movie');
  const seriesItems = items.filter(i => i.group === 'Series');

  const renderContent = () => {
    if (view === 'Setup') return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-20 bg-black">
        <div className="max-w-md w-full bg-zinc-900/40 p-10 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-3xl shadow-2xl">
          <h2 className="text-5xl font-black mb-2 text-center text-red-600 tracking-tighter uppercase italic">Manelflix</h2>
          <p className="text-zinc-500 text-center mb-12 text-[10px] font-black uppercase tracking-[0.4em]">Streaming v5.0</p>
          
          <div className="flex mb-10 bg-black/40 rounded-2xl p-1.5 border border-zinc-800">
            <button onClick={() => setSetupType('M3U')} className={`flex-1 py-4 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${setupType === 'M3U' ? 'bg-red-600 text-white shadow-xl' : 'text-zinc-500 hover:text-white'}`}>Link M3U</button>
            <button onClick={() => setSetupType('XC')} className={`flex-1 py-4 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${setupType === 'XC' ? 'bg-red-600 text-white shadow-xl' : 'text-zinc-500 hover:text-white'}`}>API Xtream</button>
          </div>

          {errorMsg && (
            <div className="mb-8 p-5 bg-red-600/10 border border-red-600/20 rounded-2xl text-red-500 text-[11px] font-black uppercase flex gap-4 items-center">
              <AlertCircle size={20} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-5">
            {setupType === 'M3U' ? (
              <input type="text" placeholder="URL M3U" className="w-full bg-black/40 border border-zinc-800/80 rounded-2xl p-5 text-white outline-none focus:border-red-600 transition-all font-bold text-xs uppercase" value={m3uUrl} onChange={(e) => setM3uUrl(e.target.value)} />
            ) : (
              <>
                <input type="text" placeholder="SERVIDOR (HTTP://HOST:PORT)" className="w-full bg-black/40 border border-zinc-800/80 rounded-2xl p-5 text-white outline-none focus:border-red-600 transition-all font-bold text-xs uppercase" value={xcCreds.host} onChange={(e) => setXcCreds({...xcCreds, host: e.target.value})} />
                <div className="grid grid-cols-2 gap-5">
                  <input type="text" placeholder="USUÁRIO" className="w-full bg-black/40 border border-zinc-800/80 rounded-2xl p-5 text-white outline-none focus:border-red-600 transition-all font-bold text-xs uppercase" value={xcCreds.user} onChange={(e) => setXcCreds({...xcCreds, user: e.target.value})} />
                  <input type="password" placeholder="SENHA" className="w-full bg-black/40 border border-zinc-800/80 rounded-2xl p-5 text-white outline-none focus:border-red-600 transition-all font-bold text-xs uppercase" value={xcCreds.pass} onChange={(e) => setXcCreds({...xcCreds, pass: e.target.value})} />
                </div>
                <button onClick={() => setXcCreds({...xcCreds, useProxy: !xcCreds.useProxy})} className={`w-full p-5 rounded-2xl border transition-all flex items-center justify-between text-[10px] font-black uppercase tracking-widest ${xcCreds.useProxy ? 'bg-red-600/10 border-red-600/30 text-red-500' : 'bg-black/40 border-zinc-800 text-zinc-500'}`}>
                  {xcCreds.useProxy ? 'Proxy Ativado (Recomendado)' : 'Proxy Desativado'}
                  <div className={`w-3 h-3 rounded-full ${xcCreds.useProxy ? 'bg-red-600 shadow-[0_0_10px_#dc2626]' : 'bg-zinc-800'}`} />
                </button>
              </>
            )}
          </div>
          
          <button onClick={() => handlePlaylistLoad(setupType)} disabled={loading} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-black py-6 rounded-2xl transition-all shadow-2xl shadow-red-900/40 mt-12 flex items-center justify-center gap-4 uppercase text-[11px] tracking-widest active:scale-95">
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Acessar Catálogo'}
          </button>
        </div>
      </div>
    );

    return (
      <div className="pb-32 pt-24 space-y-16 animate-in fade-in duration-1000">
        {view === 'Home' && (
          <>
            <ContentRow title="Canais ao Vivo" items={liveItems.slice(0, 15)} onSelect={setSelectedItem} />
            <ContentRow title="Filmes Adicionados" items={movieItems.slice(0, 15)} onSelect={setSelectedItem} />
            <ContentRow title="Séries em Destaque" items={seriesItems.slice(0, 15)} onSelect={setSelectedItem} />
          </>
        )}
        {view === 'Live' && <ContentRow title="Lista de Canais" items={liveItems} onSelect={setSelectedItem} />}
        {view === 'Movies' && <ContentRow title="Filmes Disponíveis" items={movieItems} onSelect={setSelectedItem} />}
        {view === 'Series' && <ContentRow title="Catálogo de Séries" items={seriesItems} onSelect={setSelectedItem} />}
        
        <div className="flex justify-center px-6">
          <button onClick={clearCache} className="group flex items-center gap-4 bg-zinc-900/50 hover:bg-red-900/20 border border-zinc-800 p-6 rounded-3xl transition-all">
            <Trash2 size={20} className="text-zinc-600 group-hover:text-red-500" />
            <div className="text-left">
              <span className="block text-[10px] font-black uppercase text-zinc-500 group-hover:text-red-500 tracking-widest">Ajustes</span>
              <span className="block text-[9px] font-bold text-zinc-700 uppercase">Sair da Conta / Limpar</span>
            </div>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-600/40">
      <Header onSearch={() => {}} />
      <main>{renderContent()}</main>
      {view !== 'Setup' && <BottomNav activeView={view} setView={setView} />}
      {selectedItem && (
        <VideoPlayer item={selectedItem} onClose={() => setSelectedItem(null)} creds={xcCreds} />
      )}
    </div>
  );
};

export default App;
