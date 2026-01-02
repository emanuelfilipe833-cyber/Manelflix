
import React from 'react';
import { IPTVItem, ViewState, XCCredentials } from './types';
import { parseM3U } from './utils/m3uParser';
import { fetchXtreamCodes } from './utils/xtreamCodes';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ContentRow from './components/ContentRow';
import VideoPlayer from './components/VideoPlayer';
import ManelAI from './components/ManelAI';
import { Play, Info, Database, Link as LinkIcon } from 'lucide-react';

const App: React.FC = () => {
  const [items, setItems] = React.useState<IPTVItem[]>([]);
  const [view, setView] = React.useState<ViewState>('Home');
  const [selectedItem, setSelectedItem] = React.useState<IPTVItem | null>(null);
  const [setupType, setSetupType] = React.useState<'M3U' | 'XC'>('M3U');
  
  // Setup inputs
  const [m3uUrl, setM3uUrl] = React.useState('');
  const [xcCreds, setXcCreds] = React.useState<XCCredentials>({ host: '', user: '', pass: '' });
  
  const [loading, setLoading] = React.useState(false);

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
    try {
      let parsedItems: IPTVItem[] = [];
      if (type === 'M3U') {
        const response = await fetch(m3uUrl);
        const content = await response.text();
        parsedItems = parseM3U(content);
      } else {
        parsedItems = await fetchXtreamCodes(xcCreds);
      }
      
      setItems(parsedItems);
      localStorage.setItem('manelflix_playlist', JSON.stringify(parsedItems));
      setView('Home');
    } catch (e) {
      alert('Erro ao carregar lista. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const liveItems = items.filter(i => i.group === 'Live');
  const movieItems = items.filter(i => i.group === 'Movie');
  const seriesItems = items.filter(i => i.group === 'Series');

  const renderSetup = () => (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-20">
      <div className="max-w-md w-full bg-zinc-900/50 p-8 rounded-xl border border-zinc-800 backdrop-blur-sm">
        <h2 className="text-3xl font-bold mb-6 text-center">Entrar no Manelflix</h2>
        
        <div className="flex mb-6 bg-black rounded-lg p-1">
          <button 
            onClick={() => setSetupType('M3U')}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition flex items-center justify-center gap-2 ${setupType === 'M3U' ? 'bg-zinc-800 text-white' : 'text-gray-500'}`}
          >
            <LinkIcon size={16} /> M3U
          </button>
          <button 
            onClick={() => setSetupType('XC')}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition flex items-center justify-center gap-2 ${setupType === 'XC' ? 'bg-zinc-800 text-white' : 'text-gray-500'}`}
          >
            <Database size={16} /> API Code
          </button>
        </div>

        {setupType === 'M3U' ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="URL da Lista M3U"
              className="w-full bg-zinc-800 border-none rounded p-4 text-white focus:ring-2 focus:ring-red-600 outline-none"
              value={m3uUrl}
              onChange={(e) => setM3uUrl(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Host (ex: http://exemplo.com:8080)"
              className="w-full bg-zinc-800 border-none rounded p-4 text-white focus:ring-2 focus:ring-red-600 outline-none"
              value={xcCreds.host}
              onChange={(e) => setXcCreds({...xcCreds, host: e.target.value})}
            />
            <input
              type="text"
              placeholder="Usuário"
              className="w-full bg-zinc-800 border-none rounded p-4 text-white focus:ring-2 focus:ring-red-600 outline-none"
              value={xcCreds.user}
              onChange={(e) => setXcCreds({...xcCreds, user: e.target.value})}
            />
            <input
              type="password"
              placeholder="Senha"
              className="w-full bg-zinc-800 border-none rounded p-4 text-white focus:ring-2 focus:ring-red-600 outline-none"
              value={xcCreds.pass}
              onChange={(e) => setXcCreds({...xcCreds, pass: e.target.value})}
            />
          </div>
        )}
        
        <button
          onClick={() => handlePlaylistLoad(setupType)}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 font-bold py-4 rounded transition active:scale-95 flex items-center justify-center gap-2 mt-6"
        >
          {loading ? 'Entrando...' : 'Acessar Agora'}
        </button>

        <p className="mt-6 text-center text-xs text-gray-500">
          Ao entrar, você concorda com os termos do Manelflix.
        </p>
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
        const featured = items[Math.floor(Math.random() * items.length)] || null;
        return (
          <>
            {featured && (
              <div className="relative w-full h-[85vh] md:h-[90vh]">
                <div className="absolute inset-0">
                  <img src={featured.logo} className="w-full h-full object-cover" alt="Featured" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/10 to-transparent" />
                </div>
                <div className="absolute bottom-[20%] left-4 md:left-12 max-w-xl">
                  <h2 className="text-4xl md:text-6xl font-black mb-4 drop-shadow-xl">{featured.name}</h2>
                  <div className="flex gap-3">
                    <button onClick={() => setSelectedItem(featured)} className="bg-white text-black px-6 md:px-10 py-2.5 rounded font-bold flex items-center gap-2 hover:bg-white/90 transition active:scale-95">
                      <Play size={24} fill="black" /> Assistir
                    </button>
                    <button className="bg-gray-500/50 text-white px-6 md:px-10 py-2.5 rounded font-bold flex items-center gap-2 hover:bg-gray-500/40 transition">
                      <Info size={24} /> Info
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="relative z-20 -mt-20 space-y-4 pb-24">
              <ContentRow title="Canais Populares" items={liveItems.slice(0, 15)} onSelect={setSelectedItem} />
              <ContentRow title="Filmes Recomendados" items={movieItems.slice(0, 15)} onSelect={setSelectedItem} />
              <ContentRow title="Séries de Sucesso" items={seriesItems.slice(0, 15)} onSelect={setSelectedItem} />
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-600/30">
      <Header onSearch={() => alert('Em breve!')} />
      <main>{renderContent()}</main>
      {view !== 'Setup' && (
        <>
          <BottomNav activeView={view} setView={setView} />
          {/* Manel AI integrated here to help users find content from their lists */}
          <ManelAI playlistItems={items} />
        </>
      )}
      {selectedItem && <VideoPlayer item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );
};

export default App;
