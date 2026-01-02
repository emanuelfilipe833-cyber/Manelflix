
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
        throw new Error('A lista foi carregada, mas está vazia ou o formato é incompatível.');
      }

      setItems(parsedItems);
      localStorage.setItem('manelflix_playlist', JSON.stringify(parsedItems));
      setView('Home');
    } catch (e: any) {
      setErrorMsg(e.message || 'Erro inesperado ao carregar lista.');
    } finally {
      setLoading(false);
    }
  };

  const liveItems = items.filter(i => i.group === 'Live');
  const movieItems = items.filter(i => i.group === 'Movie');
  const seriesItems = items.filter(i => i.group === 'Series');

  const renderSetup = () => (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-20">
      <div className="max-w-md w-full bg-zinc-900/80 p-8 rounded-2xl border border-zinc-800 backdrop-blur-md shadow-2xl">
        <h2 className="text-4xl font-black mb-1 text-center text-red-600 tracking-tighter uppercase">Manelflix</h2>
        <p className="text-gray-400 text-center mb-8 text-sm font-medium">IPTV Premium Experience</p>
        
        <div className="flex mb-8 bg-black/40 rounded-xl p-1 border border-zinc-800">
          <button 
            onClick={() => setSetupType('M3U')}
            className={`flex-1 py-3 rounded-lg text-xs font-black transition flex items-center justify-center gap-2 uppercase tracking-widest ${setupType === 'M3U' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <LinkIcon size={14} /> M3U
          </button>
          <button 
            onClick={() => setSetupType('XC')}
            className={`flex-1 py-3 rounded-lg text-xs font-black transition flex items-center justify-center gap-2 uppercase tracking-widest ${setupType === 'XC' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Database size={14} /> API XC
          </button>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="shrink-0" size={20} />
            <div>
              <p className="font-bold mb-1">Erro no Acesso</p>
              <p className="opacity-80 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {setupType === 'M3U' ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="URL da Lista M3U"
              className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-white outline-none"
              value={m3uUrl}
              onChange={(e) => setM3uUrl(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-5">
            <input
              type="text"
              placeholder="URL do Host (ex: http://servidor.com)"
              className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-white outline-none"
              value={xcCreds.host}
              onChange={(e) => setXcCreds({...xcCreds, host: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Usuário"
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-white outline-none"
                value={xcCreds.user}
                onChange={(e) => setXcCreds({...xcCreds, user: e.target.value})}
              />
              <input
                type="password"
                placeholder="Senha"
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-white outline-none"
                value={xcCreds.pass}
                onChange={(e) => setXcCreds({...xcCreds, pass: e.target.value})}
              />
            </div>
            <div 
              onClick={() => setXcCreds({...xcCreds, useProxy: !xcCreds.useProxy})}
              className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border transition-all ${xcCreds.useProxy ? 'bg-red-600/10 border-red-600/30' : 'bg-zinc-800/30 border-zinc-700/50'}`}
            >
              <div className="flex items-center gap-3 text-xs font-black uppercase">
                {xcCreds.useProxy ? <ShieldCheck className="text-red-500" size={20} /> : <ShieldAlert className="text-zinc-500" size={20} />}
                <span>Usar Proxy de Segurança</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative ${xcCreds.useProxy ? 'bg-red-600' : 'bg-zinc-700'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${xcCreds.useProxy ? 'left-4.5' : 'left-0.5'}`} />
              </div>
            </div>
          </div>
        )}
        
        <button
          onClick={() => handlePlaylistLoad(setupType)}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 font-black py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 mt-8 uppercase tracking-widest text-sm"
        >
          {loading ? <RefreshCw className="animate-spin" size={20} /> : 'Carregar Sistema'}
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (view === 'Setup') return renderSetup();

    switch (view) {
      case 'Live': return <div className="pt-24 pb-24"><ContentRow title="Canais ao Vivo" items={liveItems} onSelect={setSelectedItem} /></div>;
      case 'Movies': return <div className="pt-24 pb-24"><ContentRow title="Filmes" items={movieItems} onSelect={setSelectedItem} /></div>;
      case 'Series': return <div className="pt-24 pb-24"><ContentRow title="Séries" items={seriesItems} onSelect={setSelectedItem} /></div>;
      default:
        return (
          <div className="pb-24 pt-20">
            <ContentRow title="Favoritos Ao Vivo" items={liveItems.slice(0, 15)} onSelect={setSelectedItem} />
            <ContentRow title="Filmes Recentes" items={movieItems.slice(0, 15)} onSelect={setSelectedItem} />
            <ContentRow title="Séries em Destaque" items={seriesItems.slice(0, 15)} onSelect={setSelectedItem} />
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
        <VideoPlayer 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          creds={xcCreds}
        />
      )}
    </div>
  );
};

export default App;
