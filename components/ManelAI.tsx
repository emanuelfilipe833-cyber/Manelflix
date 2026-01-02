
import React from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageSquare, Send, X, Bot } from 'lucide-react';
import { IPTVItem, ChatMessage } from '../types';

interface ManelAIProps {
  playlistItems: IPTVItem[];
}

const ManelAI: React.FC<ManelAIProps> = ({ playlistItems }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { role: 'model', text: 'Olá! Sou o Manel AI. Posso te ajudar a encontrar o que assistir na sua lista Manelflix. O que você gosta?' }
  ]);
  const [isTyping, setIsTyping] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Provide a summary of the playlist for context
      const playlistSummary = playlistItems.slice(0, 50).map(i => `${i.name} (${i.group})`).join(', ');
      
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `Você é o Manel AI, um assistente virtual para o app Manelflix. 
          Seu objetivo é ajudar o usuário a encontrar filmes, séries e canais.
          Aqui estão alguns itens da lista do usuário: ${playlistSummary}.
          Seja descontraído, use gírias brasileiras leves e seja um expert em cinema. 
          Se o usuário perguntar algo que não está na lista, sugira algo parecido que possivelmente ele tenha.`,
        },
      });

      const response = await chat.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { role: 'model', text: response.text || 'Desculpe, deu um erro aqui.' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Opa, meu sinal caiu. Tenta de novo!' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 bg-red-600 text-white p-4 rounded-full shadow-2xl z-40 hover:scale-110 transition active:scale-95"
      >
        <Bot size={28} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-24 md:right-8 md:w-96 md:h-[500px] bg-zinc-900 border border-zinc-800 md:rounded-2xl z-50 flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-black md:rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                <Bot size={18} />
              </div>
              <span className="font-bold">Manel AI</span>
            </div>
            <button onClick={() => setIsOpen(false)}><X size={24} /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-900/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' ? 'bg-red-600 text-white rounded-tr-none' : 'bg-zinc-800 text-gray-200 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 p-3 rounded-2xl rounded-tl-none animate-pulse text-xs text-gray-400">
                  Manel está pensando...
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-black md:rounded-b-2xl">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Pergunte ao Manel..."
                className="w-full bg-zinc-800 border-none rounded-full py-3 pl-4 pr-12 text-sm outline-none focus:ring-1 focus:ring-red-600"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button
                onClick={handleSend}
                className="absolute right-2 p-2 text-red-600 hover:text-red-500"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManelAI;
