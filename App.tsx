
import React from 'react';
import { IPTVItem, ViewState, XCCredentials } from './types';
import { parseM3U } from './utils/m3uParser';
import { fetchXtreamCodes } from './utils/xtreamCodes';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ContentRow from './components/ContentRow';
import VideoPlayer from './components/VideoPlayer';
import { Play, Info, Database, Link as LinkIcon, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

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
        setItems(JSON.parse(saved));
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
        throw new Error('Lista vazia ou servidor não retornou dados.');
      }

      setItems(parsedItems);
      localStorage.setItem('manelflix_playlist', JSON.stringify(parsedItems));
      setView('Home');
    } catch (e: any) {
      setErrorMsg(e.message || 'Erro de conexão.');
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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black">
        <div className="max-w-md w-full bg-zinc-900/60 p-8 rounded-3xl border border-zinc-800 backdrop-blur-xl shadow-2xl">
          <h2 className="text-5xl font-black mb-1 text-center text-red-600 tracking-tighter uppercase italic">Manelflix</h2>
          <p className="text-zinc-500 text-center mb-10 text-[9px] font-black uppercase tracking-[0.4em]">Extreme Streaming v4.0</p>
          
          <div className="flex mb-8 bg-black/50 rounded-2xl p-1.5 border border-zinc-800">
            <button onClick={() => setSetupType('M3U')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${setupType === 'M3U' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>M3U</button>
            <button onClick={() => setSetupType('XC')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${setupType === 'XC' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>API XC</button>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-600/10 border border-red-600/30 rounded-2xl text-red-500 text-[11px] font-black uppercase flex gap-3 items-center italic">
              <AlertCircle size={18} className="shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            {setupType === 'M3U' ? (
              <input type="text" placeholder="URL DA LISTA M3U" className="w-full bg-black/40 border border-zinc-800 rounded-2xl p-5 text-white outline-none focus:border-red-600 transition-all font-medium text-sm" value={m3uUrl} onChange={(e) => setM3uUrl(e.target.value)} />
            ) : (
              <>
                <input type="text" placeholder="SERVIDOR (EX: HTTP://HOST.COM)" className="w-full bg-black/40 border border-zinc-800 rounded-2xl p-5 text-white outline-none focus:border-red-600 transition-all font-medium text-sm" value={xcCreds.host} onChange={(e) => setXcCreds({...xcCreds, host: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="USUÁRIO" className="w-full bg-black/40 border border-zinc-800 rounded-2xl p-5 text-white outline-none focus:border-red-600 transition-all font-medium text-sm" value={xcCreds.user} onChange={(e) => setXcCreds({...xcCreds, user: e.target.value})} />
                  <input type="password" placeholder="SENHA" className="w-full bg-black/40 border border-zinc-800 rounded-2xl p-5 text-white outline-none focus:border-red-600 transition-all font-medium text-sm" value={xcCreds.pass} onChange={(e) => setXcCreds({...xcCreds, pass: e.target.value})} />
                </div>
                <button onClick={() => setXcCreds({...xcCreds, useProxy: !xcCreds.useProxy})} className={`w-full p-5 rounded-2xl border transition-all flex items-center justify-between text-[10px] font-black uppercase tracking-widest ${xcCreds.useProxy ? 'bg-red-600/10 border-red-600/40 text-red-500 shadow-[inset_0_0_20px_rgba(220,38,38,0.05)]' : 'bg-black/40 border-zinc-800 text-zinc-500'}`}>
                  {xcCreds.useProxy ? 'Proxy Ativado' : 'Proxy Desativado'}
                  <div className={`w-3.5 h-3.5 rounded-full transition-all ${xcCreds.useProxy ? 'bg-red-600 shadow-[0_0_12px_#dc2626]' : 'bg-zinc-700'}`} />
                </button>
              </>
            )}
          </div>
          
          <button onClick={() => handlePlaylistLoad(setupType)} disabled={loading} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-black py-5 rounded-2xl transition-all shadow-2xl shadow-red-900/40 mt-10 flex items-center justify-center gap-3 uppercase text-[11px] tracking-[0.2em] active:scale-95">
            {loading ? <RefreshCw className="animate-spin" size={20} /> : 'Iniciar Sessão'}
          </button>
        </div>
      </div>
    );

    switch (view) {
      case 'Live': return <div className="pt-28 pb-28"><ContentRow title="TV Ao Vivo" items={liveItems} onSelect={setSelectedItem} /></div>;
      case 'Movies': return <div className="pt-28 pb-28"><ContentRow title="Filmes" items={movieItems} onSelect={setSelectedItem} /></div>;
      case 'Series': return <div className="pt-28 pb-28"><ContentRow title="Séries" items={seriesItems} onSelect={setSelectedItem} /></div>;
      case 'Setup': return null;
      default:
        return (
          <div className="pb-28 pt-28 space-y-12">
            <ContentRow title="Continue Assistindo" items={liveItems.slice(0, 12)} onSelect={setSelectedItem} />
            <ContentRow title="Lançamentos em Filmes" items={movieItems.slice(0, 12)} onSelect={setSelectedItem} />
            <ContentRow title="Séries Recomendadas" items={seriesItems.slice(0, 12)} onSelect={setSelectedItem} />
            <div className="px-6 md:px-12 flex justify-center pb-8">
              <button onClick={clearCache} className="bg-zinc-900 text-zinc-500 hover:text-red-500 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-zinc-800 flex items-center gap-3">
                <Trash2 size={16} /> Limpar Todos os Dados
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-600/40">
      <Header onSearch={() => {}} />
      <main className="animate-in fade-in duration-700">{renderContent()}</main>
      {view !== 'Setup' && <BottomNav activeView={view} setView={setView} />}
      {selectedItem && (
        <VideoPlayer item={selectedItem} onClose={() => setSelectedItem(null)} creds={xcCreds} />
      )}
    </div>
  );
};

export default App;
