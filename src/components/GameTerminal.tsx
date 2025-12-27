'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Clock, AlertTriangle, User, Bot, Wifi, Shield, Terminal, X, CheckCircle, AlertOctagon, Swords, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAccount, useSignMessage } from 'wagmi';
import { useGameStatus, useJoinGame, useClaimWinnings, useWinningsBalance } from '@/hooks/useOxHuman';
import { formatEther, keccak256, encodePacked, toHex } from 'viem';
import TransactionOverlay from './TransactionOverlay';
import { io, Socket } from "socket.io-client";

type Message = {
  id: number;
  sender: 'me' | 'opponent' | 'system';
  text: string;
  timestamp: number;
};

type GameState = 'searching' | 'connected' | 'playing' | 'voting' | 'finished';

export default function GameTerminal({ arenaId, stakeAmount }: { arenaId: string, stakeAmount: string }) {
  const { address } = useAccount();
  const { data: gameData, isLoading: isLoadingGame } = useGameStatus(parseInt(arenaId));
  const { joinGame, isPending: isJoining, isConfirmed: isJoined } = useJoinGame();
  const { claimWinnings, isPending: isClaimingPending, isConfirming: isClaimingConfirming, isConfirmed: isClaimed } = useClaimWinnings();
  const { data: winningsBalance, refetch: refetchWinnings } = useWinningsBalance(address);
  const { signMessageAsync, isPending: isSigningVote } = useSignMessage();

  // Combined loading states for UX
  const isVoting = isSigningVote;
  const isClaiming = isClaimingPending || isClaimingConfirming;
  
  const [gameState, setGameState] = useState<GameState>('searching');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [votingTimeLeft, setVotingTimeLeft] = useState(15);
  const [realStake, setRealStake] = useState<string>(stakeAmount);
  const [isOpponentTyping, setIsOpponentTyping] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null); // Track when game actually started
  const [isUserTyping, setIsUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [resolutionTxHash, setResolutionTxHash] = useState<string | null>(null);
  const [hasSignedVote, setHasSignedVote] = useState(false);

  // Derive result info from gameData
  // gameData: [player1, player2, stake, status, winner, timestamp, isPlayer2Bot, player1GuessedBot, player1Submitted, player2GuessedBot, player2Submitted]
  const player1Address = gameData ? (gameData as any)[0] : null;
  const player2Address = gameData ? (gameData as any)[1] : null;
  const isPlayer1 = address && player1Address && address.toLowerCase() === player1Address.toLowerCase();
  const isPlayer2 = address && player2Address && address.toLowerCase() === player2Address.toLowerCase();
  
  const isPlayer2Bot = gameData ? Boolean((gameData as any)[6]) : false;
  const player1GuessedBot = gameData ? Boolean((gameData as any)[7]) : false;
  const player1Submitted = gameData ? Boolean((gameData as any)[8]) : false;
  const player2GuessedBot = gameData ? Boolean((gameData as any)[9]) : false;
  const player2Submitted = gameData ? Boolean((gameData as any)[10]) : false;
  
  const winner = gameData ? (gameData as any)[4] : null;
  const isDraw = winner === '0x0000000000000000000000000000000000000000';
  const isWinner = winner && address && winner.toLowerCase() === address.toLowerCase();
  
  // For result display
  const myGuessedBot = isPlayer1 ? player1GuessedBot : player2GuessedBot;
  const mySubmitted = isPlayer1 ? player1Submitted : player2Submitted;
  // In PvP (both human), correct guess is "Human" (guessedBot = false)
  // In vs Bot, correct guess depends on isPlayer2Bot
  const opponentIsBot = isPlayer1 ? isPlayer2Bot : false; // P1 always human
  const isCorrectGuess = myGuessedBot === opponentIsBot;

  // Initialize Socket.io
  useEffect(() => {
    // In production (0xhuman.fun), Caddy proxies /socket.io to port 3001
    // In development (localhost:3000), connect directly to port 3001
    const isProduction = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
    const socketUrl = isProduction
      ? window.location.origin  // Uses same origin, Caddy routes /socket.io/* to :3001
      : 'http://localhost:3001';
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to Nervous System");
      if (arenaId) {
        socket.emit("join_game", arenaId);
      }
    });

    socket.on("chat_message", (msg: any) => {
      // Determine sender type based on message source
      // In this simple version, if it's not 'me' (sent by client), it's 'opponent'
      // Ideally we check wallet address or user ID
      const isMe = msg.sender === address; 
      const senderType = isMe ? 'me' : 'opponent';

      // Don't duplicate own messages if we add them optimistically (which we do below)
      if (!isMe) {
          setMessages((prev) => [...prev, { 
              id: msg.id, 
              sender: senderType, 
              text: msg.text, 
              timestamp: msg.timestamp 
          }]);
      }
    });

    socket.on("typing", (msg: any) => {
        if (msg.sender !== address) {
            setIsOpponentTyping(msg.isTyping);
        }
    });

    socket.on("system_message", (msg: any) => {
        addSystemMessage(msg.text);
    });

    // Listen for opponent joined event (for faster UX before contract sync)
    socket.on("opponent_joined", (data: any) => {
        console.log("Opponent joined! Match starting...", data);
        addSystemMessage("MATCH FOUND. CONNECTING...");
    });
    
    // Listen for vote confirmation - only update if this is the player's own vote
    // Note: This is for optimistic UI update after local signing
    // The server broadcasts to the room, but we only care about our own vote here
    socket.on("voteReceived", (data: any) => {
        console.log("Vote received by server:", data);
        // Don't set hasSignedVote here - it's handled in handleVote() after signing
        // This event is broadcast to the room for coordination, not for UI state changes
    });
    
    // Listen for game resolution with txHash
    socket.on("gameResolved", (data: { gameId: number, txHash: string }) => {
        console.log("Game resolved! TX:", data.txHash);
        setResolutionTxHash(data.txHash);
    });

    return () => {
      socket.disconnect();
    };
  }, [arenaId, address]);

  // Sync Game State
  useEffect(() => {
    if (!gameData) return;

    // gameData: [player1, player2, stake, status, winner, timestamp, isPlayer2Bot, ...]
    const status = Number((gameData as any)[3]);
    const player2 = (gameData as any)[1];
    
    // 0=Waiting, 1=Active, 2=Finished
    if (status === 1) {
      if (gameState !== 'playing' && gameState !== 'voting' && gameState !== 'finished') {
        setGameState('playing');
        addSystemMessage("OPPONENT CONNECTED. SESSION START.");
        
        // Set game start time to NOW when we first detect the game is Active
        // This ensures timer starts fresh when opponent joins, not from creation time
        if (!gameStartTime) {
          setGameStartTime(Date.now());
          setTimeLeft(60); // Full 60 seconds
        }
      }
      
      // Update Stake from Contract
      const stakeWei = (gameData as any)[2];
      if (stakeWei) {
        setRealStake(formatEther(stakeWei));
      }

      // If we already have a start time, calculate remaining based on that
      if (gameStartTime) {
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        const remaining = Math.max(0, 60 - elapsed);
        // Only update if significantly different to avoid jumping
        if (Math.abs(remaining - timeLeft) > 2) {
          setTimeLeft(remaining);
        }
      }

    } else if (status === 2) {
       setGameState('finished');
    }
  }, [gameData, gameState]);

  // Timers
  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameState('voting');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else if (gameState === 'voting') {
      const timer = setInterval(() => {
        setVotingTimeLeft((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpponentTyping]);

  // Interactive Progress Bar
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (gameState === 'searching') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 0;
          return prev + 1;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  const addSystemMessage = (text: string) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), sender: 'system', text, timestamp: Date.now() }]);
  };

  // Typing indicator emission with debounce
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);
    
    if (!socketRef.current) return;
    
    // Emit typing start
    if (value.trim() && !isUserTyping) {
      setIsUserTyping(true);
      socketRef.current.emit("typing", { gameId: arenaId, sender: address, isTyping: true });
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current && isUserTyping) {
        setIsUserTyping(false);
        socketRef.current.emit("typing", { gameId: arenaId, sender: address, isTyping: false });
      }
    }, 2000);
  };

  const sendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !socketRef.current) return;

    const text = inputText;
    
    // Stop typing indicator when sending
    if (isUserTyping) {
      setIsUserTyping(false);
      socketRef.current.emit("typing", { gameId: arenaId, sender: address, isTyping: false });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Optimistic Update
    const newMessage: Message = { id: Date.now(), sender: 'me', text, timestamp: Date.now() };
    setMessages((prev) => [...prev, newMessage]);
    setInputText('');

    // Send to Server
    socketRef.current.emit("chat_message", {
        gameId: arenaId,
        text,
        sender: address // Use wallet address as sender ID
    });
  };

  const handleVote = async (vote: 'human' | 'bot') => {
    // Guard against multiple submissions
    if (mySubmitted || isVoting || hasSignedVote) {
      console.log('Vote already submitted or in progress, ignoring click');
      return;
    }
    
    const guessedBot = vote === 'bot';
    const gameId = parseInt(arenaId);
    
    try {
      console.log('Signing vote:', vote);
      
      // Create message hash that matches contract's abi.encodePacked format
      // Contract does: keccak256(abi.encodePacked(_gameId, _guessedBot, "VOTE"))
      const messageHash = keccak256(
        encodePacked(
          ['uint256', 'bool', 'string'],
          [BigInt(gameId), guessedBot, 'VOTE']
        )
      );
      
      // Sign the hash (MetaMask will popup, but FREE - no gas!)
      // We sign the raw bytes of the hash
      const signature = await signMessageAsync({ message: { raw: messageHash } });
      
      console.log('Vote signed, sending to server...');
      
      // Send signed vote to server
      socketRef.current?.emit('submitSignedVote', {
        gameId,
        playerAddress: address,
        guessedBot,
        signature
      });
      
      setHasSignedVote(true);
    } catch (error: any) {
      console.error('Error signing vote:', error.message);
      // User rejected signature or error - allow retry
      setHasSignedVote(false);
    }
  };

  // --- MATCHMAKING VIEW ---
  if (gameState === 'searching') {
    const isCreator = gameData && (gameData as any)[0] === address;

    return (
      <div className="w-full h-screen bg-background relative overflow-hidden flex flex-col font-mono">
        {/* Map Background Placeholder */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center bg-no-repeat animate-pulse" />
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />

        {/* Header */}
        <div className="p-6 border-b border-muted/30 flex justify-between items-center z-10 bg-background/80 backdrop-blur">
           <div className="flex items-center gap-2 text-primary">
             <Wifi className="w-5 h-5 animate-pulse" />
             <span className="font-bold tracking-widest">STATUS: {isCreator ? 'INITIALIZING MATCHMAKING' : 'OPPONENT FOUND'}</span>
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
                 {isCreator ? (
                   <>
                     <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 tracking-tighter">SEARCHING FOR OPPONENT</h1>
                     <p className="text-gray-400 text-lg animate-pulse">&gt; Searching for a soul... or a circuit?_</p>
                   </>
                 ) : (
                    <>
                      <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 tracking-tighter">CONNECTING...</h1>
                      <p className="text-gray-400 text-lg mb-8 animate-pulse">&gt; Establishing secure uplink to Node...</p>
                      <div className="flex flex-col items-center gap-2">
                         <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
                           <div className="h-full bg-primary animate-progress" style={{ width: '100%' }}></div>
                         </div>
                         <span className="text-xs text-primary tracking-widest">HANDSHAKE IN PROGRESS</span>
                      </div>
                    </>
                 )}
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
            <span>{progress}%</span>
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary shadow-[0_0_10px_var(--primary)] transition-all duration-75 ease-linear" 
              style={{ width: `${progress}%` }}
            />
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

  // --- VOTING VIEW ---
  if (gameState === 'voting') {
    // Check if current player has already submitted verdict
    const hasAlreadySubmitted = mySubmitted;
    const gameStatus = gameData ? Number((gameData as any)[3]) : 0;
    
    // Show waiting screen if:
    // 1. Contract confirms player has submitted (mySubmitted = true) AND game not resolved yet, OR
    // 2. Transaction/signing is in progress (isVoting = true), OR
    // 3. User has signed their vote (hasSignedVote = true) - waiting for server to resolve
    const isWaitingForOpponent = (hasAlreadySubmitted && gameStatus !== 2) || isVoting || hasSignedVote;
    
    // If already submitted and waiting for opponent, show waiting screen
    if (isWaitingForOpponent) {
      return (
        <div className="w-full h-screen bg-background flex items-center justify-center p-4 font-mono relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          
          <div className="max-w-lg w-full z-10 text-center space-y-8">
            <div className="relative w-48 h-48 mx-auto">
              <div className="absolute inset-0 border-4 border-primary/30 rounded-full animate-ping" />
              <div className="absolute inset-2 border-4 border-primary/50 rounded-full animate-pulse" />
              <div className="absolute inset-4 border-4 border-primary rounded-full flex items-center justify-center">
                <Clock className="w-16 h-16 text-primary animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                {gameStatus === 2 ? 'RESOLVING...' : 'AWAITING OPPONENT'}
              </h1>
              <p className="text-gray-400">
                {gameStatus === 2 
                  ? 'Game resolved! Loading results...' 
                  : 'Your verdict has been recorded. Waiting for opponent to submit their prediction...'}
              </p>
              <div className="inline-block bg-primary/20 border border-primary/50 text-primary px-4 py-2 rounded-lg text-sm">
                <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                {gameStatus === 2 ? 'Syncing result...' : 'Polling chain for resolution...'}
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              Do not close this window. {gameStatus === 2 ? 'Results loading...' : 'The game will automatically resolve once both players have voted.'}
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <>
        <TransactionOverlay 
          isVisible={isVoting} 
          message="SUBMITTING VERDICT" 
          subMessage="Your prediction is being recorded on-chain..."
        />
        <div className="w-full h-screen bg-background flex items-center justify-center p-4 font-mono relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        
        <div className="max-w-5xl w-full z-10 space-y-8">
           <div className="text-center space-y-4">
             <div className="inline-block bg-red-900/20 border border-red-500/50 text-red-500 px-4 py-1 rounded-full text-xs tracking-widest animate-pulse">
               ● VERDICT REQUIRED
             </div>
             <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter">CAST YOUR VERDICT</h1>
             
             <div className="flex justify-center items-center gap-4 font-mono">
               <div className="bg-secondary border border-muted p-4 rounded-lg text-center min-w-[100px]">
                 <div className="text-4xl font-bold text-white">{votingTimeLeft < 10 ? `0${votingTimeLeft}` : votingTimeLeft}</div>
                 <div className="text-[10px] text-gray-500 uppercase">Seconds</div>
               </div>
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Vote Bot */}
             <button 
               onClick={() => handleVote('bot')}
               disabled={isVoting}
               className="group relative bg-black border border-red-900/30 rounded-xl overflow-hidden hover:border-red-500 transition-all text-left h-96 outline-none ring-0 caret-transparent select-none"
             >
               {/* Background Image */}
               <div className="absolute inset-0">
                 <img 
                   src="/assets/bot_verdict_card.png" 
                   alt="Bot Verdict" 
                   className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500 scale-100 group-hover:scale-105"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
               </div>

               <div className="relative z-10 h-full flex flex-col justify-end p-8">
                 <Bot className="w-12 h-12 text-red-500 mb-4" />
                 <h2 className="text-4xl font-bold text-white mb-2">BOT</h2>
                 <p className="text-red-400 text-sm font-bold mb-4 tracking-widest">SYNTHETIC SIGNATURE</p>
                 <p className="text-gray-300 text-sm leading-relaxed mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
                   Opponent displayed unnatural response times and perfect syntax. Deceiver Detected.
                 </p>
                 <div className="w-full bg-red-600 text-white font-bold py-4 rounded text-center group-hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20">
                   VOTE BOT
                 </div>
               </div>
             </button>

             {/* Vote Human */}
             <button 
               onClick={() => handleVote('human')}
               disabled={isVoting}
               className="group relative bg-black border border-green-900/30 rounded-xl overflow-hidden hover:border-green-500 transition-all text-left h-96 outline-none ring-0 caret-transparent select-none"
             >
               {/* Background Image */}
               <div className="absolute inset-0">
                 <img 
                   src="/assets/human_verdict_card.png" 
                   alt="Human Verdict" 
                   className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500 scale-100 group-hover:scale-105"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
               </div>

               <div className="relative z-10 h-full flex flex-col justify-end p-8">
                 <User className="w-12 h-12 text-green-500 mb-4" />
                 <h2 className="text-4xl font-bold text-white mb-2">HUMAN</h2>
                 <p className="text-green-400 text-sm font-bold mb-4 tracking-widest">VERIFIED SOUL</p>
                 <p className="text-gray-300 text-sm leading-relaxed mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
                   Opponent showed emotional inconsistency and typos. Likely organic behavior.
                 </p>
                 <div className="w-full bg-green-600 text-white font-bold py-4 rounded text-center group-hover:bg-green-500 transition-colors shadow-lg shadow-green-900/20">
                   VOTE HUMAN
                 </div>
               </div>
             </button>
           </div>

           <div className="text-center text-gray-500 text-xs max-w-lg mx-auto">
             <span className="text-primary font-bold">WARNING:</span> Once cast, your verdict is final and the staked amount is locked until resolution.
           </div>
        </div>
      </div>
      </>
    );
  }

  // --- RESULT VIEW ---
  if (gameState === 'finished') {
    const payout = parseFloat(realStake) * 2 * 0.95; // 95% after fee
    const hasWinnings = winningsBalance && BigInt(winningsBalance as any) > BigInt(0);

    return (
      <>
        <TransactionOverlay 
          isVisible={isClaiming} 
          message="CLAIMING WINNINGS" 
          subMessage="Transferring your reward to wallet..."
        />
        <div className="w-full h-screen bg-background flex items-center justify-center p-4 font-mono relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        
        <div className="max-w-4xl w-full z-10 space-y-8">
           <div className="text-center space-y-2">
             <div className="flex items-center justify-center gap-2 text-primary text-sm tracking-widest mb-4">
               <Terminal className="w-4 h-4" /> DECRYPTION PROTOCOL FINALIZED
             </div>
             <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tighter">SYSTEM ANALYSIS COMPLETE</h1>
             <p className={`font-bold tracking-widest inline-block px-4 py-1 rounded ${
               isDraw ? 'text-yellow-500 bg-yellow-500/10' : 
               isCorrectGuess ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'
             }`}>
               MATCH ID: #{arenaId} // {isDraw ? 'DRAW - STAKES REFUNDED' : isCorrectGuess ? 'CORRECT IDENTIFICATION' : 'DECEPTION DETECTED'}
             </p>
             {resolutionTxHash && (
               <a 
                 href={`https://sepolia.mantlescan.xyz/tx/${resolutionTxHash}`}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="text-xs text-gray-500 hover:text-primary transition-colors"
               >
                 View Resolution TX: {resolutionTxHash.slice(0, 10)}...{resolutionTxHash.slice(-8)} ↗
               </a>
             )}
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Left: Identity Reveal */}
             <div className="bg-secondary/50 border border-muted rounded-lg p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
               <div className="w-48 h-48 border border-primary/30 rounded-full flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 border border-primary/20 rounded-full animate-ping opacity-20" />
                  {/* In PvP, opponent is always human for both players */}
                  {opponentIsBot ? <Bot className="w-24 h-24 text-red-500" /> : <User className="w-24 h-24 text-green-500" />}
               </div>
               
               <div className="w-full space-y-6">
                 <div className="flex justify-between items-center border-b border-muted pb-4">
                   <span className="text-gray-500 text-xs uppercase tracking-widest">Your Hypothesis</span>
                   <div className="flex items-center gap-2 text-primary font-bold">
                     {myGuessedBot ? <><Bot className="w-4 h-4" /> AI AGENT</> : <><User className="w-4 h-4" /> HUMAN</>}
                   </div>
                 </div>
                 
                 <div className="flex justify-between items-center">
                   <span className="text-gray-500 text-xs uppercase tracking-widest">Opponent&apos;s True Identity</span>
                   <div className={`flex items-center gap-2 font-bold text-xl ${opponentIsBot ? 'text-red-500' : 'text-green-500'}`}>
                     {opponentIsBot ? <><Bot className="w-5 h-5" /> BOT</> : <><User className="w-5 h-5" /> HUMAN</>}
                   </div>
                 </div>

                 <div className={`p-4 rounded text-left flex gap-4 ${
                   isDraw ? 'bg-yellow-500/10 border border-yellow-500/50' :
                   isCorrectGuess ? 'bg-green-500/10 border border-green-500/50' : 'bg-red-500/10 border border-red-500/50'
                 }`}>
                    {isDraw ? <AlertTriangle className="w-6 h-6 text-yellow-500 shrink-0" /> :
                     isCorrectGuess ? <CheckCircle className="w-6 h-6 text-green-500 shrink-0" /> : <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />}
                    <div>
                      <div className={`font-bold text-sm ${
                        isDraw ? 'text-yellow-500' : isCorrectGuess ? 'text-green-500' : 'text-red-500'
                      }`}>RESULT: {isDraw ? 'DRAW' : isCorrectGuess ? 'CORRECT' : 'INCORRECT'}</div>
                      <p className={`text-xs ${
                        isDraw ? 'text-yellow-400/80' : isCorrectGuess ? 'text-green-400/80' : 'text-red-400/80'
                      }`}>
                        {isDraw ? 'Both players made the same guess. Stakes refunded (minus fee).' :
                         isCorrectGuess ? 'Your analysis was correct. You have been rewarded.' : 'Opponent successfully deceived you.'}
                      </p>
                    </div>
                 </div>
               </div>
             </div>

             {/* Right: Stats */}
             <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-secondary/50 border border-muted p-6 rounded-lg">
                   <div className="text-gray-500 text-xs uppercase tracking-widest mb-2">Total Stake</div>
                   <div className="text-2xl font-bold text-white">{realStake} MNT</div>
                 </div>
                 <div className={`p-6 rounded-lg ${
                   isDraw ? 'bg-yellow-900/10 border border-yellow-900/50' :
                   isCorrectGuess ? 'bg-green-900/10 border border-green-900/50' : 'bg-red-900/10 border border-red-900/50'
                 }`}>
                   <div className={`text-xs uppercase tracking-widest mb-2 ${
                     isDraw ? 'text-yellow-500' : isCorrectGuess ? 'text-green-500' : 'text-red-500'
                   }`}>Settlement</div>
                   <div className={`text-2xl font-bold ${
                     isDraw ? 'text-yellow-500' : isCorrectGuess ? 'text-green-500' : 'text-red-500'
                   }`}>
                     {isDraw ? '~0' : isCorrectGuess ? `+${payout.toFixed(2)}` : `-${realStake}`} MNT
                   </div>
                 </div>
               </div>

               {/* Claim Button - Only show if won current game or draw (refund) */}
               {hasWinnings && !isClaimed && (isCorrectGuess || isDraw) ? (
                 <button 
                   onClick={() => claimWinnings()}
                   disabled={isClaiming}
                   className={`w-full ${isDraw ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'} text-white font-bold py-4 rounded transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
                 >
                   {isClaiming ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                   {isClaiming ? 'CLAIMING...' : `CLAIM ${isDraw ? 'REFUND' : 'PRIZE'} (${formatEther(winningsBalance as bigint)} MNT)`}
                 </button>
               ) : isClaimed ? (
                 <div className="w-full bg-green-600/20 border border-green-500/50 text-green-500 font-bold py-4 rounded flex items-center justify-center gap-2">
                   <CheckCircle className="w-5 h-5" /> WINNINGS CLAIMED!
                 </div>
               ) : null}
               
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
      </>
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
             
             {/* Typing Indicator */}
             {isOpponentTyping && (
                <div className="flex flex-col items-start max-w-3xl mx-auto w-full">
                   <div className="flex items-center gap-2 mb-1">
                      <div className="bg-muted p-1 rounded"><Bot className="w-3 h-3 text-gray-400" /></div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest">UNKNOWN ENTITY [ID: 9X-22]</span>
                   </div>
                   <div className="bg-secondary/80 border border-muted text-gray-300 rounded-lg rounded-tl-none p-4 flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                   </div>
                </div>
             )}

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
                   onChange={handleInputChange}
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
               <span className="text-sm font-bold text-primary">{realStake} MNT</span>
             </div>
             <div className="flex justify-between items-center border-b border-muted pb-2">
               <span className="text-xs text-gray-500">WIN POTENTIAL</span>
               <span className="text-sm font-bold text-accent-green">{(parseFloat(realStake) * 1.9).toFixed(1)} MNT</span>
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
             <div className="text-center text-xs text-gray-500 mb-4 animate-pulse">[ AWAITING TIMER COMPLETION ]</div>
           </div>
        </div>
      </div>
    </div>
  );
}
