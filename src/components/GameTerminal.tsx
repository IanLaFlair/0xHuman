'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Clock, AlertTriangle, User, Bot, Wifi, Shield, Terminal, X, CheckCircle, AlertOctagon } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Message = {
  id: number;
  sender: 'me' | 'opponent' | 'system';
  text: string;
  timestamp: number;
};

type GameState = 'searching' | 'connected' | 'playing' | 'voting' | 'finished';

export default function GameTerminal({ arenaId }: { arenaId: string }) {
  const [gameState, setGameState] = useState<GameState>('searching');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Mock Game Loop
  useEffect(() => {
    if (gameState === 'searching') {
      setTimeout(() => {
        setGameState('connected');
        addSystemMessage('UPLINK ESTABLISHED. IDENTIFY THE ENTITY.');
        setTimeout(() => {
          setGameState('playing');
        }, 2000);
      }, 5000);
    }
  }, [gameState]);

  // Timer
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('voting');
    }
  }, [gameState, timeLeft]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addSystemMessage = (text: string) => {
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'system', text, timestamp: Date.now() }]);
  };

  const sendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: Message = { id: Date.now(), sender: 'me', text: inputText, timestamp: Date.now() };
    setMessages((prev) => [...prev, newMessage]);
    setInputText('');

    // Mock Opponent Reply
    setTimeout(() => {
      const replies = [
        "I assure you, my neural patterns are biological.",
        "That is an impossible task for any finite system.",
        "Are you testing my logic or my patience?",
        "Orange flakes upon the steel, Time's slow bite is what I feel.",
        "Greetings. I am ready to begin the interaction."
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      setMessages((prev) => [...prev, { id: Date.now(), sender: 'opponent', text: randomReply, timestamp: Date.now() }]);
    }, 1000 + Math.random() * 2000);
  };

  const handleVote = (vote: 'human' | 'bot') => {
    setGameState('finished');
  };

  // --- MATCHMAKING VIEW ---
  if (gameState === 'searching') {
    return (
      <div className="w-full h-screen bg-background relative overflow-hidden flex flex-col font-mono">
        {/* Map Background Placeholder */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center bg-no-repeat animate-pulse" />
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />

        {/* Header */}
        <div className="p-6 border-b border-muted/30 flex justify-between items-center z-10 bg-background/80 backdrop-blur">
           <div className="flex items-center gap-2 text-primary">
             <Wifi className="w-5 h-5 animate-pulse" />
             <span className="font-bold tracking-widest">STATUS: INITIALIZING MATCHMAKING</span>
           </div>
           <div className="border border-primary/30 px-3 py-1 rounded text-primary text-xs">
             0x83...F41
           </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center z-10">
          <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
            {/* System Log */}
            <div className="border border-muted bg-secondary/50 p-4 rounded-lg h-64 md:h-96 font-mono text-xs text-gray-400 overflow-hidden flex flex-col">
              <div className="text-primary font-bold mb-4 border-b border-muted pb-2">SYSTEM LOG</div>
              <div className="space-y-2 flex-1 overflow-y-auto">
                <p>[14:02:01] &gt; Initializing handshake protocol...</p>
                <p>[14:02:02] &gt; Connecting to Mantle Node #882...</p>
                <p className="text-green-500">[14:02:02] &gt; Secure connection established.</p>
                <p>[14:02:03] &gt; Encrypting user payload...</p>
                <p>[14:02:04] &gt; Scanning pool for matches [Rating: 1200-1400]...</p>
                <p>[14:02:05] &gt; Filtering bots...</p>
                <p className="animate-pulse">&gt; Awaiting candidate response...</p>
              </div>
            </div>

            {/* Map/Radar Center */}
            <div className="md:col-span-2 border border-muted bg-secondary/30 rounded-lg p-1 relative flex items-center justify-center overflow-hidden">
               <div className="absolute inset-0 bg-grid-pattern opacity-20" />
               <div className="relative z-10 text-center">
                 <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 tracking-tighter">SEARCHING FOR OPPONENT</h1>
                 <p className="text-gray-400 text-lg animate-pulse">&gt; Searching for a soul... or a circuit?_</p>
               </div>
               
               {/* Radar Circles */}
               <div className="absolute w-[500px] h-[500px] border border-primary/20 rounded-full animate-ping opacity-20" />
               <div className="absolute w-[300px] h-[300px] border border-primary/30 rounded-full" />
            </div>
          </div>
        </div>

        {/* Footer Progress */}
        <div className="p-8 z-10">
          <div className="flex justify-between text-xs text-primary mb-2 uppercase tracking-widest">
            <span>Establishing Handshake...</span>
            <span>45%</span>
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary w-[45%] animate-pulse shadow-[0_0_10px_var(--primary)]" />
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 mt-2 uppercase tracking-widest">
            <span>Node: US-EAST-1</span>
            <span>Protocol: v2.4.1-ALPHA</span>
            <span>Encrypted: YES</span>
          </div>
        </div>
      </div>
    );
  }

  // --- RESULT VIEW ---
  if (gameState === 'finished') {
    return (
      <div className="w-full h-screen bg-background flex items-center justify-center p-4 font-mono relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        
        <div className="max-w-4xl w-full z-10 space-y-8">
           <div className="text-center space-y-2">
             <div className="flex items-center justify-center gap-2 text-primary text-sm tracking-widest mb-4">
               <Terminal className="w-4 h-4" /> DECRYPTION PROTOCOL FINALIZED
             </div>
             <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tighter">SYSTEM ANALYSIS COMPLETE</h1>
             <p className="text-red-500 font-bold tracking-widest bg-red-500/10 inline-block px-4 py-1 rounded">MATCH ID: #9X82 // DECEPTION DETECTED</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Left: Identity Reveal */}
             <div className="bg-secondary/50 border border-muted rounded-lg p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
               <div className="w-48 h-48 border border-primary/30 rounded-full flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 border border-primary/20 rounded-full animate-ping opacity-20" />
                  <User className="w-24 h-24 text-white" />
               </div>
               
               <div className="w-full space-y-6">
                 <div className="flex justify-between items-center border-b border-muted pb-4">
                   <span className="text-gray-500 text-xs uppercase tracking-widest">Your Hypothesis</span>
                   <div className="flex items-center gap-2 text-primary font-bold">
                     <Bot className="w-4 h-4" /> AI AGENT
                   </div>
                 </div>
                 
                 <div className="flex justify-between items-center">
                   <span className="text-gray-500 text-xs uppercase tracking-widest">True Identity</span>
                   <div className="flex items-center gap-2 text-white font-bold text-xl">
                     <User className="w-5 h-5" /> HUMAN
                   </div>
                 </div>

                 <div className="bg-red-500/10 border border-red-500/50 p-4 rounded text-left flex gap-4">
                    <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                    <div>
                      <div className="text-red-500 font-bold text-sm">RESULT: INCORRECT</div>
                      <p className="text-red-400/80 text-xs">Opponent successfully mimicked AI behavior protocols.</p>
                    </div>
                 </div>
               </div>
             </div>

             {/* Right: Stats */}
             <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-secondary/50 border border-muted p-6 rounded-lg">
                   <div className="text-gray-500 text-xs uppercase tracking-widest mb-2">Total Stake</div>
                   <div className="text-2xl font-bold text-white">50 MNT</div>
                 </div>
                 <div className="bg-red-900/10 border border-red-900/50 p-6 rounded-lg">
                   <div className="text-red-500 text-xs uppercase tracking-widest mb-2">Settlement</div>
                   <div className="text-2xl font-bold text-red-500">-50 MNT <span className="text-xs opacity-70">-100%</span></div>
                 </div>
               </div>
               
               <button 
                 onClick={() => router.push('/arena')}
                 className="w-full bg-primary text-black font-bold py-4 rounded hover:bg-blue-400 transition-all flex items-center justify-center gap-2"
               >
                 <Terminal className="w-5 h-5" />
                 INITIALIZE NEW PROTOCOL
               </button>
               
               <button 
                 onClick={() => router.push('/')}
                 className="w-full border border-muted text-gray-400 font-bold py-4 rounded hover:bg-secondary hover:text-white transition-all flex items-center justify-center gap-2"
               >
                 <X className="w-5 h-5" />
                 ABORT TO MAINFRAME
               </button>
             </div>
           </div>
        </div>
      </div>
    );
  }

  // --- ACTIVE GAME VIEW ---
  return (
    <div className="w-full h-screen bg-background flex flex-col font-mono overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-muted flex items-center justify-between px-6 bg-secondary/50 backdrop-blur z-10">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-2 rounded text-primary font-bold tracking-widest flex items-center gap-2">
            <Terminal className="w-4 h-4" /> 0XHUMAN_UPLINK
          </div>
          <div className="h-4 w-px bg-muted" />
          <div className="text-xs text-gray-500">SESSION: 0x4A9...B2</div>
          <div className="text-xs text-accent-green">STATUS: ACTIVE_INTERROGATION</div>
        </div>
        <button className="border border-red-900/50 text-red-500 px-4 py-2 rounded text-xs hover:bg-red-900/20 transition-colors flex items-center gap-2">
          <AlertOctagon className="w-3 h-3" /> ABORT LINK
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: System Logs */}
        <div className="w-64 border-r border-muted bg-secondary/20 hidden md:flex flex-col p-4">
          <div className="text-xs font-bold text-gray-500 mb-4 flex items-center gap-2">
            <Terminal className="w-3 h-3" /> SYSTEM LOGS
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 text-[10px] text-gray-600 font-mono">
             <p>&gt; initializing handshake...</p>
             <p>&gt; packet_loss: 0.002%</p>
             <p>&gt; verifying hash: 23f...a90 [OK]</p>
             <p>&gt; neural_pattern_check: inconclusive</p>
             <p>&gt; analyzing response latency...</p>
             <p>&gt; connection_stable</p>
             <p>&gt; encryption: AES-256-GCM</p>
             <p>&gt; buffer_size: 1024</p>
             <p>&gt; ping: 24ms</p>
             <p className="text-primary animate-pulse">&gt; awaiting_input...</p>
          </div>
          {/* Audio Visualizer Placeholder */}
          <div className="h-24 flex items-end justify-between gap-1 mt-4 opacity-50">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="w-full bg-primary/50 animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDuration: `${0.5 + Math.random()}s` }} />
            ))}
          </div>
        </div>

        {/* Center: Chat Interface */}
        <div className="flex-1 flex flex-col relative bg-background">
          <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
             {messages.map((msg) => (
               <div key={msg.id} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'} max-w-3xl mx-auto w-full`}>
                 {msg.sender === 'system' ? (
                   <div className="w-full flex justify-center my-4">
                     <div className="bg-primary/10 border border-primary/30 text-primary px-4 py-2 rounded text-xs tracking-widest uppercase">
                       {msg.text}
                     </div>
                   </div>
                 ) : (
                   <>
                     <div className="flex items-center gap-2 mb-1">
                       {msg.sender === 'opponent' ? (
                         <div className="bg-muted p-1 rounded"><Bot className="w-3 h-3 text-gray-400" /></div>
                       ) : null}
                       <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                         {msg.sender === 'me' ? 'OPERATOR (YOU)' : `UNKNOWN ENTITY [ID: 9X-22]`}
                       </span>
                       <span className="text-[10px] text-gray-600">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                       {msg.sender === 'me' ? (
                         <div className="bg-primary p-1 rounded"><User className="w-3 h-3 text-black" /></div>
                       ) : null}
                     </div>
                     
                     <div className={`max-w-[80%] p-4 rounded-lg text-sm leading-relaxed shadow-lg backdrop-blur-sm border ${
                       msg.sender === 'me' 
                         ? 'bg-primary/10 border-primary/30 text-white rounded-tr-none' 
                         : 'bg-secondary/80 border-muted text-gray-300 rounded-tl-none'
                     }`}>
                       {msg.text}
                     </div>
                   </>
                 )}
               </div>
             ))}
             <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-muted bg-secondary/30 backdrop-blur">
             <div className="max-w-3xl mx-auto w-full">
               <form onSubmit={sendMessage} className="relative group">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">&gt;</div>
                 <input
                   type="text"
                   value={inputText}
                   onChange={(e) => setInputText(e.target.value)}
                   placeholder="Input query here..."
                   className="w-full bg-black/50 border border-primary/30 rounded-lg py-4 pl-10 pr-12 text-white font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-gray-600"
                   autoFocus
                 />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 hidden group-focus-within:block">
                   [ENTER] to send
                 </div>
               </form>
             </div>
          </div>
        </div>

        {/* Right Sidebar: Stats & Timer */}
        <div className="w-72 border-l border-muted bg-secondary/20 hidden lg:flex flex-col p-6">
           <div className="text-center mb-8">
             <div className="text-xs text-gray-500 uppercase tracking-widest mb-4">Time Remaining</div>
             <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
               <svg className="absolute inset-0 w-full h-full -rotate-90">
                 <circle cx="64" cy="64" r="60" stroke="#1e293b" strokeWidth="4" fill="none" />
                 <circle 
                   cx="64" cy="64" r="60" stroke="#3b82f6" strokeWidth="4" fill="none" 
                   strokeDasharray={377} 
                   strokeDashoffset={377 - (377 * timeLeft) / 60}
                   className="transition-all duration-1000 ease-linear"
                 />
               </svg>
               <div className="text-center">
                 <div className="text-4xl font-bold text-white">{timeLeft}</div>
                 <div className="text-[10px] text-primary uppercase">Seconds</div>
               </div>
             </div>
           </div>

           <div className="space-y-6">
             <div className="flex justify-between items-center border-b border-muted pb-2">
               <span className="text-xs text-gray-500">STAKE AMOUNT</span>
               <span className="text-sm font-bold text-primary">50 MNT</span>
             </div>
             <div className="flex justify-between items-center border-b border-muted pb-2">
               <span className="text-xs text-gray-500">WIN POTENTIAL</span>
               <span className="text-sm font-bold text-accent-green">95 MNT</span>
             </div>
             <div className="flex justify-between items-center border-b border-muted pb-2">
               <span className="text-xs text-gray-500">LATENCY</span>
               <div className="flex items-center gap-1">
                 <div className="w-1 h-3 bg-accent-green" />
                 <div className="w-1 h-3 bg-accent-green" />
                 <div className="w-1 h-3 bg-accent-green" />
                 <div className="w-1 h-3 bg-gray-700" />
                 <span className="text-xs text-gray-400 ml-1">24ms</span>
               </div>
             </div>
           </div>

           <div className="mt-auto">
             <div className="text-center text-xs text-gray-500 mb-4">[ FINAL VERDICT REQUIRED ]</div>
             <div className="space-y-3">
               <button 
                 onClick={() => handleVote('human')}
                 className="w-full bg-accent-green/10 border border-accent-green text-accent-green py-3 rounded hover:bg-accent-green hover:text-black transition-all font-bold flex items-center justify-center gap-2 group"
               >
                 <User className="w-4 h-4" /> ACCUSE HUMAN <span className="text-[10px] opacity-50 group-hover:text-black ml-auto">PRESS H</span>
               </button>
               <button 
                 onClick={() => handleVote('bot')}
                 className="w-full bg-secondary border border-muted text-gray-400 py-3 rounded hover:border-primary hover:text-white transition-all font-bold flex items-center justify-center gap-2 group"
               >
                 <Bot className="w-4 h-4" /> ACCUSE AI BOT <span className="text-[10px] opacity-50 ml-auto">PRESS B</span>
               </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
