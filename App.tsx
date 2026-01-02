
import React from 'react';
import { IPTVItem, ViewState, XCCredentials } from './types';
import { parseM3U } from './utils/m3uParser';
import { fetchXtreamCodes } from './utils/xtreamCodes';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ContentRow from './components/ContentRow';
import VideoPlayer from './components/VideoPlayer';
import { Play, Info, Database, Link as LinkIcon, AlertCircle, ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';

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
      setItems(JSON.parse(saved));
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
        throw new Error('Nenhum item encontrado. Verifique se sua lista/conta está ativa.');
      }

      setItems(parsedItems);
      localStorage.setItem('manelflix_playlist', JSON.stringify(parsedItems));
      setView('Home');
    } catch (e: any) {
      setErrorMsg(e.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const liveItems = items.filter(i => i.group === 'Live');
  const movieItems = items.filter(i => i.group === 'Movie');
  const seriesItems = items.filter(i => i.group === 'Series');

  const renderContent = () => {
    if (view === 'Setup') return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-20">
        <div className="max-w-md w-full bg-zinc-900/80 p-8 rounded-2xl border border-zinc-800 backdrop-blur-md shadow-2xl">
          <h2 className="text-4xl font-black mb-1 text-center text-red-600 tracking-tighter uppercase italic">Manelflix</h2>
          <p className="text-zinc-500 text-center mb-8 text-[10px] font-black uppercase tracking-[0.3em]">Player Premium v3.0</p>
          
          <div className="flex mb-8 bg-black/40 rounded-xl p-1 border border-zinc-800">
            <button onClick={() => setSetupType('M3U')} className={`flex-1 py-3 rounded-lg text-xs font-black transition ${setupType === 'M3U' ? 'bg-red-600 text-white' : 'text-zinc-500'}`}>M3U</button>
            <button onClick={() => setSetupType('XC')} className={`flex-1 py-3 rounded-lg text-xs font-black transition ${setupType === 'XC' ? 'bg-red-600 text-white' : 'text-zinc-500'}`}>API XC</button>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-600/10 border border-red-600/30 rounded-xl text-red-500 text-xs font-bold flex gap-3">
              <AlertCircle size={16} className="shrink-0" />
              {errorMsg}
            </div>
          )}

          {setupType === 'M3U' ? (
            <input type="text" placeholder="URL M3U" className="w-full bg-zinc-800 border-none rounded-xl p-4 text-white mb-4 outline-none" value={m3uUrl} onChange={(e) => setM3uUrl(e.target.value)} />
          ) : (
            <div className="space-y-4">
              <input type="text" placeholder="Servidor (Ex: http://host.com)" className="w-full bg-zinc-800 border-none rounded-xl p-4 text-white outline-none" value={xcCreds.host} onChange={(e) => setXcCreds({...xcCreds, host: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Usuário" className="w-full bg-zinc-800 border-none rounded-xl p-4 text-white outline-none" value={xcCreds.user} onChange={(e) => setXcCreds({...xcCreds, user: e.target.value})} />
                <input type="password" placeholder="Senha" className="w-full bg-zinc-800 border-none rounded-xl p-4 text-white outline-none" value={xcCreds.pass} onChange={(e) => setXcCreds({...xcCreds, pass: e.target.value})} />
              </div>
              <button onClick={() => setXcCreds({...xcCreds, useProxy: !xcCreds.useProxy})} className={`w-full p-4 rounded-xl border text-[10px] font-black uppercase transition-all flex items-center justify-between ${xcCreds.useProxy ? 'bg-red-600/10 border-red-600/40 text-red-500' : 'bg-zinc-800 border-transparent text-zinc-500'}`}>
                {xcCreds.useProxy ? 'Proxy Ativado (Recomendado)' : 'Proxy Desativado'}
                <div className={`w-3 h-3 rounded-full ${xcCreds.useProxy ? 'bg-red-600 shadow-[0_0_8px_#dc2626]' : 'bg-zinc-600'}`} />
              </button>
            </div>
          )}
          
          <button onClick={() => handlePlaylistLoad(setupType)} disabled={loading} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 font-black py-5 rounded-xl transition shadow-xl mt-8 flex items-center justify-center gap-3 uppercase text-xs tracking-widest">
            {loading ? <RefreshCw className="animate-spin" size={18} /> : 'Acessar Lista'}
          </button>
        </div>
      </div>
    );

    switch (view) {
      case 'Live': return <div className="pt-24 pb-24"><ContentRow title="Canais ao Vivo" items={liveItems} onSelect={setSelectedItem} /></div>;
      case 'Movies': return <div className="pt-24 pb-24"><ContentRow title="Filmes" items={movieItems} onSelect={setSelectedItem} /></div>;
      case 'Series': return <div className="pt-24 pb-24"><ContentRow title="Séries" items={seriesItems} onSelect={setSelectedItem} /></div>;
      default:
        return (
          <div className="pb-24 pt-24 space-y-8">
            <ContentRow title="Canais Sugeridos" items={liveItems.slice(0, 20)} onSelect={setSelectedItem} />
            <ContentRow title="Filmes Adicionados" items={movieItems.slice(0, 20)} onSelect={setSelectedItem} />
            <ContentRow title="Séries em Alta" items={seriesItems.slice(0, 20)} onSelect={setSelectedItem} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
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
