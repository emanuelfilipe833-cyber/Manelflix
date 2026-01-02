
import React from 'react';
import { IPTVItem, ViewState, XCCredentials } from './types';
import { parseM3U } from './utils/m3uParser';
import { fetchXtreamCodes } from './utils/xtreamCodes';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ContentRow from './components/ContentRow';
import VideoPlayer from './components/VideoPlayer';
import { AlertCircle, Trash2, Loader2, Play, Power } from 'lucide-react';

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
        setView('Setup');
      }
    } else {
      setView('Setup');
    }
  }, []);

  const handlePlaylistLoad = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let data: IPTVItem[] = [];
      if (setupType === 'M3U') {
        const res = await fetch(m3uUrl);
        data = parseM3U(await res.text());
      } else {
        data = await fetchXtreamCodes(xcCreds);
        localStorage.setItem('manelflix_creds', JSON.stringify(xcCreds));
      }
      
      if (data.length === 0) throw new Error('Nenhum canal encontrado nesta lista.');
      
      setItems(data);
      localStorage.setItem('manelflix_playlist', JSON.stringify(data));
      setView('Home');
    } catch (e: any) {
      setErrorMsg(e.message || 'Erro ao carregar servidor.');
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

  if (view === 'Setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6">
        <div className="w-full max-w-md space-y-8 bg-zinc-900/40 p-10 rounded-[3rem] border border-zinc-800 backdrop-blur-3xl shadow-2xl">
          <div className="text-center">
            <h1 className="text-5xl font-black text-red-600 tracking-tighter italic uppercase">Manelflix</h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Tecnologia Blink v8.0</p>
          </div>

          <div className="flex bg-black p-1.5 rounded-2xl border border-zinc-800">
            <button onClick={() => setSetupType('M3U')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${setupType === 'M3U' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500'}`}>Link M3U</button>
            <button onClick={() => setSetupType('XC')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${setupType === 'XC' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500'}`}>API Xtream</button>
          </div>

          {errorMsg && (
            <div className="p-5 bg-red-600/10 border border-red-600/20 rounded-2xl text-red-500 text-[11px] font-black uppercase flex items-center gap-4 animate-pulse">
              <AlertCircle size={20} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            {setupType === 'M3U' ? (
              <input type="text" placeholder="URL M3U COMPLETA" className="w-full bg-black/60 border border-zinc-800 p-5 rounded-2xl outline-none focus:border-red-600 text-xs font-bold uppercase transition-all" value={m3uUrl} onChange={e => setM3uUrl(e.target.value)} />
            ) : (
              <>
                <input type="text" placeholder="HOST (URL DO SERVIDOR)" className="w-full bg-black/60 border border-zinc-800 p-5 rounded-2xl outline-none focus:border-red-600 text-xs font-bold uppercase transition-all" value={xcCreds.host} onChange={e => setXcCreds({...xcCreds, host: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="USUÁRIO" className="w-full bg-black/60 border border-zinc-800 p-5 rounded-2xl outline-none focus:border-red-600 text-xs font-bold uppercase transition-all" value={xcCreds.user} onChange={e => setXcCreds({...xcCreds, user: e.target.value})} />
                  <input type="password" placeholder="SENHA" className="w-full bg-black/60 border border-zinc-800 p-5 rounded-2xl outline-none focus:border-red-600 text-xs font-bold uppercase transition-all" value={xcCreds.pass} onChange={e => setXcCreds({...xcCreds, pass: e.target.value})} />
                </div>
              </>
            )}
          </div>

          <button onClick={handlePlaylistLoad} disabled={loading} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 py-6 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl shadow-red-900/30">
            {loading ? <Loader2 className="animate-spin" size={24} /> : <><Play size={18} fill="white"/> Conectar Conta</>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-600/40">
      <Header onSearch={() => {}} />
      <main className="pt-24 pb-32 space-y-16 animate-in fade-in duration-700">
        {view === 'Home' && (
          <>
            <ContentRow title="TV Ao Vivo" items={liveItems.slice(0, 25)} onSelect={setSelectedItem} />
            <ContentRow title="Filmes Recomendados" items={movieItems.slice(0, 25)} onSelect={setSelectedItem} />
            <ContentRow title="Séries em Destaque" items={seriesItems.slice(0, 25)} onSelect={setSelectedItem} />
          </>
        )}
        {view === 'Live' && <ContentRow title="Todos os Canais" items={liveItems} onSelect={setSelectedItem} />}
        {view === 'Movies' && <ContentRow title="Catálogo de Filmes" items={movieItems} onSelect={setSelectedItem} />}
        {view === 'Series' && <ContentRow title="Séries Completas" items={seriesItems} onSelect={setSelectedItem} />}

        <div className="flex justify-center p-12">
          <button onClick={clearCache} className="group flex items-center gap-4 bg-zinc-900/30 hover:bg-red-600/10 border border-zinc-800 p-6 rounded-[2rem] transition-all">
            <Power size={20} className="text-zinc-600 group-hover:text-red-600" />
            <div className="text-left">
              <span className="block text-[10px] font-black uppercase text-zinc-500 group-hover:text-red-500 tracking-[0.2em]">Desconectar</span>
              <span className="block text-[8px] font-bold text-zinc-700 uppercase">Limpar sessão atual</span>
            </div>
          </button>
        </div>
      </main>
      <BottomNav activeView={view} setView={setView} />
      {selectedItem && <VideoPlayer item={selectedItem} onClose={() => setSelectedItem(null)} creds={xcCreds} />}
    </div>
  );
};

export default App;
