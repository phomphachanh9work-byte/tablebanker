import React, { useState, useEffect, useCallback } from 'react';

// Simple storage wrapper (uses localStorage for web)
const storage = {
  async get(key, shared = false) {
    try {
      const prefix = shared ? 'shared_' : 'local_';
      const value = localStorage.getItem(prefix + key);
      return value ? { value } : null;
    } catch (e) {
      return null;
    }
  },
  async set(key, value, shared = false) {
    try {
      const prefix = shared ? 'shared_' : 'local_';
      localStorage.setItem(prefix + key, value);
      return { key, value };
    } catch (e) {
      return null;
    }
  },
  async delete(key, shared = false) {
    try {
      const prefix = shared ? 'shared_' : 'local_';
      localStorage.removeItem(prefix + key);
      return { deleted: true };
    } catch (e) {
      return null;
    }
  }
};

// Constants
const CURRENCIES = {
  LAK: { symbol: '₭', name: 'Lao Kip', step: 1000 },
  THB: { symbol: '฿', name: 'Thai Baht', step: 100 },
  USD: { symbol: '$', name: 'US Dollar', step: 1 }
};

const GAME_MODES = {
  DIRECT: { name: 'Direct Pay', desc: 'Losers pay winners directly' },
  POT: { name: 'Pot-Based', desc: 'Players bet to central pot' },
  SPLIT: { name: 'Split Pot', desc: 'Pot splits between winners' }
};

// Utility functions
const formatAmount = (amount, currency) => {
  const curr = CURRENCIES[currency] || CURRENCIES.LAK;
  return `${curr.symbol}${amount.toLocaleString()}`;
};

const generateId = () => Math.random().toString(36).substr(2, 9);
const generateRoomCode = () => Math.random().toString(36).substr(2, 6).toUpperCase();

// Seat Component
const Seat = ({ seat, player, isCurrentUser, isAdmin, onSelect, currency, totalChips }) => {
  const isEmpty = !player;
  const stackHeight = player ? Math.min(100, Math.max(20, (player.balance / (totalChips || 1)) * 100)) : 0;
  
  return (
    <div 
      className={`seat ${isEmpty ? 'empty' : 'occupied'} ${isCurrentUser ? 'current-user' : ''} ${player?.isAdmin ? 'admin-seat' : ''}`}
      onClick={() => onSelect(seat)}
      style={{ '--stack-height': `${stackHeight}%` }}
    >
      {isEmpty ? (
        <div className="empty-seat">
          <span className="seat-number">{seat}</span>
          <span className="tap-hint">Tap to sit</span>
        </div>
      ) : (
        <div className="player-info">
          <div className="avatar">
            {player.name.charAt(0).toUpperCase()}
            {player.isAdmin && <span className="admin-badge">👑</span>}
          </div>
          <div className="player-name">{player.name}</div>
          <div className="player-balance">{formatAmount(player.balance, currency)}</div>
          <div className="chip-stack" style={{ height: `${stackHeight}px` }}>
            {[...Array(Math.min(5, Math.ceil(stackHeight / 20)))].map((_, i) => (
              <div key={i} className="chip-layer" style={{ bottom: i * 4 }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Central Pot Component
const CentralPot = ({ amount, currency, mode, onTap, glowing }) => (
  <div 
    className={`central-pot ${glowing ? 'glowing' : ''} ${mode}`}
    onClick={onTap}
  >
    <div className="pot-icon">🏆</div>
    <div className="pot-amount">{formatAmount(amount, currency)}</div>
    <div className="pot-label">POT</div>
    {mode !== 'DIRECT' && <div className="pot-hint">Tap to bet</div>}
  </div>
);

// Transaction Item Component
const TransactionItem = ({ tx, currency }) => {
  const icons = {
    MINT: '🏦',
    BURN: '🔥',
    TRANSFER: '💸',
    POT_IN: '⬇️',
    POT_OUT: '⬆️',
    ADJUST: '⚠️',
    UNDO: '↩️'
  };

  return (
    <div className={`transaction-item ${tx.type.toLowerCase()}`}>
      <span className="tx-icon">{icons[tx.type] || '💰'}</span>
      <div className="tx-details">
        <span className="tx-description">{tx.description}</span>
        <span className="tx-time">{new Date(tx.timestamp).toLocaleTimeString()}</span>
      </div>
      <span className={`tx-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
        {tx.amount > 0 ? '+' : ''}{formatAmount(tx.amount, currency)}
      </span>
    </div>
  );
};

// Transfer Modal Component
const TransferModal = ({ from, to, currency, step, onConfirm, onCancel }) => {
  const [amount, setAmount] = useState(step);
  const [sliding, setSliding] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);
  const maxAmount = from?.balance || 0;

  const quickAmounts = [step, step * 5, step * 10, step * 50, step * 100].filter(a => a <= maxAmount);

  const handleSlide = (e) => {
    if (!sliding) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const progress = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setSlideProgress(progress);
    if (progress >= 95) {
      setSliding(false);
      onConfirm(amount);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="transfer-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Transfer Chips</h3>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>
        
        <div className="transfer-parties">
          <div className="party from">
            <div className="party-avatar">{from?.name?.charAt(0)}</div>
            <div className="party-name">{from?.name}</div>
            <div className="party-balance">{formatAmount(from?.balance || 0, currency)}</div>
          </div>
          <div className="transfer-arrow">→</div>
          <div className="party to">
            <div className="party-avatar">{to?.name?.charAt(0) || '🏆'}</div>
            <div className="party-name">{to?.name || 'POT'}</div>
          </div>
        </div>

        <div className="amount-input">
          <button 
            className="amount-btn"
            onClick={() => setAmount(Math.max(step, amount - step))}
          >−</button>
          <div className="amount-display">
            <span className="currency-symbol">{CURRENCIES[currency].symbol}</span>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(Math.max(step, Math.min(maxAmount, Math.floor(e.target.value / step) * step)))}
              step={step}
            />
          </div>
          <button 
            className="amount-btn"
            onClick={() => setAmount(Math.min(maxAmount, amount + step))}
          >+</button>
        </div>

        <div className="quick-amounts">
          {quickAmounts.map(a => (
            <button 
              key={a} 
              className={`quick-btn ${amount === a ? 'active' : ''}`}
              onClick={() => setAmount(a)}
            >
              {formatAmount(a, currency)}
            </button>
          ))}
          <button 
            className="quick-btn all"
            onClick={() => setAmount(maxAmount)}
          >
            ALL IN
          </button>
        </div>

        <div 
          className="slide-to-pay"
          onMouseDown={() => setSliding(true)}
          onMouseUp={() => { setSliding(false); setSlideProgress(0); }}
          onMouseLeave={() => { setSliding(false); setSlideProgress(0); }}
          onMouseMove={handleSlide}
          onTouchStart={() => setSliding(true)}
          onTouchEnd={() => { setSliding(false); setSlideProgress(0); }}
          onTouchMove={handleSlide}
        >
          <div className="slide-track">
            <div className="slide-progress" style={{ width: `${slideProgress}%` }} />
            <div className="slide-thumb" style={{ left: `${slideProgress}%` }}>
              💰
            </div>
            <span className="slide-text">Slide to Pay</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mint Modal Component
const MintModal = ({ players, currency, step, onMint, onCancel }) => {
  const activePlayers = players.filter(p => p);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [amount, setAmount] = useState(step * 10);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="mint-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header admin-header">
          <h3>🏦 The Mint</h3>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>

        {!selectedPlayer ? (
          <>
            <p className="mint-subtitle">Select a player to add chips</p>
            <div className="player-select">
              {activePlayers.length === 0 ? (
                <div className="empty-players">No players in room yet</div>
              ) : (
                activePlayers.map(player => (
                  <button
                    key={player.id}
                    className="player-option"
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <span className="player-avatar">{player.name.charAt(0)}</span>
                    <div className="player-info-text">
                      <span className="player-name">{player.name} {player.isAdmin && '👑'}</span>
                      <span className="player-seat">Seat {player.seat + 1}</span>
                    </div>
                    <span className="player-balance">{formatAmount(player.balance, currency)}</span>
                    <span className="select-arrow">→</span>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <button className="back-to-list" onClick={() => setSelectedPlayer(null)}>
              ← Back to player list
            </button>
            
            <div className="selected-player-display">
              <div className="player-avatar large">{selectedPlayer.name.charAt(0)}</div>
              <div className="player-name">{selectedPlayer.name} {selectedPlayer.isAdmin && '👑'}</div>
              <div className="player-balance">Current: {formatAmount(selectedPlayer.balance, currency)}</div>
            </div>

            <div className="amount-input">
              <button onClick={() => setAmount(Math.max(step, amount - step * 10))}>−</button>
              <div className="amount-display">
                <span className="currency-symbol">{CURRENCIES[currency].symbol}</span>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={e => setAmount(Math.max(step, Math.floor(e.target.value / step) * step))}
                />
              </div>
              <button onClick={() => setAmount(amount + step * 10)}>+</button>
            </div>

            <div className="quick-amounts">
              {[10, 50, 100, 500, 1000].map(mult => (
                <button 
                  key={mult}
                  className={`quick-btn ${amount === step * mult ? 'active' : ''}`}
                  onClick={() => setAmount(step * mult)}
                >
                  {formatAmount(step * mult, currency)}
                </button>
              ))}
            </div>

            <button className="mint-confirm-btn" onClick={() => onMint(selectedPlayer, amount)}>
              💰 Add {formatAmount(amount, currency)} to {selectedPlayer.name}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Award Pot Modal
const AwardPotModal = ({ players, potAmount, currency, mode, onAward, onCancel }) => {
  const [selectedWinners, setSelectedWinners] = useState([]);

  const toggleWinner = (player) => {
    if (selectedWinners.find(w => w.id === player.id)) {
      setSelectedWinners(selectedWinners.filter(w => w.id !== player.id));
    } else {
      setSelectedWinners([...selectedWinners, player]);
    }
  };

  const splitAmount = selectedWinners.length > 0 
    ? Math.floor(potAmount / selectedWinners.length) 
    : 0;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="award-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header admin-header">
          <h3>🏆 Award Pot</h3>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>

        <div className="pot-display">
          <span className="pot-total">{formatAmount(potAmount, currency)}</span>
          <span className="pot-label">Total Pot</span>
        </div>

        {mode === 'SPLIT' && (
          <p className="split-info">
            Select winners to split: {formatAmount(splitAmount, currency)} each
          </p>
        )}

        <div className="winner-select">
          {players.filter(p => p).map(player => (
            <button
              key={player.id}
              className={`winner-option ${selectedWinners.find(w => w.id === player.id) ? 'selected' : ''}`}
              onClick={() => mode === 'SPLIT' ? toggleWinner(player) : setSelectedWinners([player])}
            >
              <span className="player-avatar">{player.name.charAt(0)}</span>
              <span className="player-name">{player.name}</span>
              {selectedWinners.find(w => w.id === player.id) && (
                <span className="winner-badge">✓</span>
              )}
            </button>
          ))}
        </div>

        <button 
          className="award-confirm-btn"
          disabled={selectedWinners.length === 0}
          onClick={() => onAward(selectedWinners, splitAmount || potAmount)}
        >
          Award {selectedWinners.length > 1 ? `${selectedWinners.length} Winners` : 'Winner'}
        </button>
      </div>
    </div>
  );
};

// Settlement Modal
const SettlementModal = ({ players, currency, transactions, onClose }) => {
  const [paidStatus, setPaidStatus] = useState({});

  const getNetChange = (player) => {
    const buys = transactions
      .filter(t => t.type === 'MINT' && t.playerId === player.id)
      .reduce((sum, t) => sum + t.amount, 0);
    return player.balance - buys;
  };

  return (
    <div className="modal-overlay">
      <div className="settlement-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💵 Cash Out</h3>
        </div>

        <div className="settlement-summary">
          <div className="vault-status">
            <span className="vault-label">Total Chips in Game:</span>
            <span className="vault-amount">
              {formatAmount(players.filter(p => p).reduce((sum, p) => sum + p.balance, 0), currency)}
            </span>
          </div>
        </div>

        <div className="settlement-list">
          {players.filter(p => p).sort((a, b) => b.balance - a.balance).map(player => {
            const netChange = getNetChange(player);
            return (
              <div key={player.id} className={`settlement-row ${paidStatus[player.id] ? 'paid' : ''}`}>
                <div className="settlement-player">
                  <span className="player-avatar">{player.name.charAt(0)}</span>
                  <div className="player-details">
                    <span className="player-name">{player.name}</span>
                    <span className={`net-change ${netChange >= 0 ? 'positive' : 'negative'}`}>
                      {netChange >= 0 ? '▲' : '▼'} {formatAmount(Math.abs(netChange), currency)}
                    </span>
                  </div>
                </div>
                <div className="settlement-amount">
                  <span className="cash-owed">{formatAmount(player.balance, currency)}</span>
                  <button 
                    className={`paid-btn ${paidStatus[player.id] ? 'checked' : ''}`}
                    onClick={() => setPaidStatus({...paidStatus, [player.id]: !paidStatus[player.id]})}
                  >
                    {paidStatus[player.id] ? '✓ Paid' : 'Mark Paid'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button className="close-settlement-btn" onClick={onClose}>
          End Game
        </button>
      </div>
    </div>
  );
};

// Main App Component
export default function App() {
  // App state
  const [screen, setScreen] = useState('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Room state
  const [roomCode, setRoomCode] = useState('');
  const [roomSettings, setRoomSettings] = useState({
    currency: 'LAK',
    mode: 'DIRECT',
    step: 1000,
    maxSeats: 8
  });
  
  // Game state
  const [players, setPlayers] = useState(Array(8).fill(null));
  const [potAmount, setPotAmount] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [frozen, setFrozen] = useState(false);
  
  // UI state
  const [showTransferModal, setShowTransferModal] = useState(null);
  const [showMintModal, setShowMintModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // Load personal state
  useEffect(() => {
    let mounted = true;
    const loadPersonalState = async () => {
      try {
        const saved = await storage.get('tablebanker-me');
        if (saved && mounted) {
          const state = JSON.parse(saved.value);
          setCurrentUser(state.currentUser);
          setIsAdmin(state.isAdmin || false);
          setRoomCode(state.roomCode || '');
          if (state.roomCode && state.currentUser) {
            await loadRoomData(state.roomCode);
            setScreen('game');
          }
        }
      } catch (e) {
        console.log('No saved personal state');
      }
    };
    loadPersonalState();
    return () => { mounted = false; };
  }, []);

  // Load room data from shared storage
  const loadRoomData = async (code) => {
    if (!code) return null;
    try {
      const saved = await storage.get(`room-${code}`, true);
      if (saved) {
        const room = JSON.parse(saved.value);
        setRoomSettings(room.settings || roomSettings);
        setPlayers(room.players || Array(8).fill(null));
        setPotAmount(room.potAmount || 0);
        setTransactions(room.transactions || []);
        setFrozen(room.frozen || false);
        return room;
      }
    } catch (e) {
      console.log('Room not found:', code);
    }
    return null;
  };

  // Save room data to shared storage
  const saveRoomData = async (code, playersData, pot, txs, isFrozen, settings) => {
    if (!code) return;
    try {
      await storage.set(`room-${code}`, JSON.stringify({
        settings: settings,
        players: playersData,
        potAmount: pot,
        transactions: txs,
        frozen: isFrozen,
        updatedAt: Date.now()
      }), true);
    } catch (e) {
      console.log('Could not save room state');
    }
  };

  // Save personal state
  const savePersonalState = async (user, admin, code) => {
    try {
      await storage.set('tablebanker-me', JSON.stringify({
        currentUser: user,
        isAdmin: admin,
        roomCode: code
      }));
    } catch (e) {
      console.log('Could not save personal state');
    }
  };

  // Sync room state periodically
  useEffect(() => {
    if (screen !== 'game' || !roomCode) return;
    
    const syncRoom = async () => {
      const room = await loadRoomData(roomCode);
      if (room && currentUser) {
        const me = room.players?.find(p => p?.id === currentUser.id);
        if (me && me.balance !== currentUser.balance) {
          setCurrentUser(prev => ({ ...prev, balance: me.balance }));
        }
      }
    };

    const interval = setInterval(syncRoom, 2000);
    return () => clearInterval(interval);
  }, [screen, roomCode, currentUser?.id]);

  // Notification helper
  const notify = (message, type = 'info') => {
    const id = generateId();
    setNotifications(n => [...n, { id, message, type }]);
    setTimeout(() => {
      setNotifications(n => n.filter(notif => notif.id !== id));
    }, 3000);
  };

  // Create room
  const createRoom = async (name) => {
    const code = generateRoomCode();
    const adminPlayer = {
      id: generateId(),
      name,
      balance: 0,
      isAdmin: true,
      seat: 0
    };
    
    const newPlayers = Array(8).fill(null);
    newPlayers[0] = adminPlayer;
    
    await saveRoomData(code, newPlayers, 0, [], false, roomSettings);
    await savePersonalState(adminPlayer, true, code);
    
    setRoomCode(code);
    setCurrentUser(adminPlayer);
    setIsAdmin(true);
    setPlayers(newPlayers);
    setPotAmount(0);
    setTransactions([]);
    setFrozen(false);
    setScreen('game');
    notify(`Room ${code} created! Share this code with players.`, 'success');
  };

  // Find room by code
  const findRoom = async (code) => {
    const room = await loadRoomData(code);
    if (room) {
      setRoomCode(code);
      setScreen('lobby');
      notify(`Found room! Pick a seat.`, 'success');
      return true;
    } else {
      notify(`Room ${code} not found!`, 'error');
      return false;
    }
  };

  // Join room
  const joinRoom = async (name, seat) => {
    const player = {
      id: generateId(),
      name,
      balance: 0,
      isAdmin: false,
      seat
    };
    
    const newPlayers = [...players];
    newPlayers[seat] = player;
    
    await saveRoomData(roomCode, newPlayers, potAmount, transactions, frozen, roomSettings);
    await savePersonalState(player, false, roomCode);
    
    setCurrentUser(player);
    setPlayers(newPlayers);
    setScreen('game');
    notify(`Welcome ${name}! You're at Seat ${seat + 1}.`, 'success');
  };

  // Seat selection
  const handleSeatSelect = (seatIndex) => {
    if (frozen) {
      notify('Table is frozen!', 'error');
      return;
    }
    
    const existingPlayer = players[seatIndex];
    
    if (existingPlayer && currentUser) {
      if (existingPlayer.id !== currentUser.id && roomSettings.mode === 'DIRECT') {
        setShowTransferModal({ from: currentUser, to: existingPlayer });
      }
    } else if (!existingPlayer && screen === 'lobby') {
      joinRoom(joinName, seatIndex);
    }
  };

  // Handle transfer
  const handleTransfer = async (amount) => {
    if (!showTransferModal) return;
    
    const { from, to } = showTransferModal;
    const isPot = !to;
    
    const newPlayers = players.map(p => {
      if (!p) return null;
      if (p.id === from.id) return { ...p, balance: p.balance - amount };
      if (!isPot && p.id === to.id) return { ...p, balance: p.balance + amount };
      return p;
    });
    
    const newPot = isPot ? potAmount + amount : potAmount;
    const newTx = {
      id: generateId(),
      type: isPot ? 'POT_IN' : 'TRANSFER',
      description: isPot ? `${from.name} bet to pot` : `${from.name} → ${to.name}`,
      amount,
      playerId: from.id,
      timestamp: Date.now()
    };
    const newTransactions = [newTx, ...transactions];
    
    await saveRoomData(roomCode, newPlayers, newPot, newTransactions, frozen, roomSettings);
    
    setPlayers(newPlayers);
    setPotAmount(newPot);
    setTransactions(newTransactions);
    
    if (from.id === currentUser.id) {
      setCurrentUser({ ...currentUser, balance: currentUser.balance - amount });
    } else if (to && to.id === currentUser.id) {
      setCurrentUser({ ...currentUser, balance: currentUser.balance + amount });
    }
    
    setShowTransferModal(null);
    notify(`Transferred ${formatAmount(amount, roomSettings.currency)}!`, 'success');
  };

  // Admin: Mint chips
  const handleMint = async (player, amount) => {
    const newPlayers = players.map(p => {
      if (!p) return null;
      if (p.id === player.id) return { ...p, balance: p.balance + amount };
      return p;
    });
    
    const newTx = {
      id: generateId(),
      type: 'MINT',
      description: `Admin → ${player.name} (Buy-In)`,
      amount,
      playerId: player.id,
      timestamp: Date.now()
    };
    const newTransactions = [newTx, ...transactions];
    
    await saveRoomData(roomCode, newPlayers, potAmount, newTransactions, frozen, roomSettings);
    
    setPlayers(newPlayers);
    setTransactions(newTransactions);
    
    if (player.id === currentUser.id) {
      setCurrentUser({ ...currentUser, balance: currentUser.balance + amount });
    }
    
    setShowMintModal(false);
    notify(`Added ${formatAmount(amount, roomSettings.currency)} to ${player.name}`, 'success');
  };

  // Admin: Award pot
  const handleAwardPot = async (winners, amountEach) => {
    const newPlayers = players.map(p => {
      if (!p) return null;
      if (winners.find(w => w.id === p.id)) {
        return { ...p, balance: p.balance + amountEach };
      }
      return p;
    });
    
    const winnerNames = winners.map(w => w.name).join(', ');
    const newTx = {
      id: generateId(),
      type: 'POT_OUT',
      description: `Pot → ${winnerNames}`,
      amount: amountEach * winners.length,
      playerId: null,
      timestamp: Date.now()
    };
    const newTransactions = [newTx, ...transactions];
    
    await saveRoomData(roomCode, newPlayers, 0, newTransactions, frozen, roomSettings);
    
    setPlayers(newPlayers);
    setPotAmount(0);
    setTransactions(newTransactions);
    
    if (winners.find(w => w.id === currentUser.id)) {
      setCurrentUser({ ...currentUser, balance: currentUser.balance + amountEach });
    }
    
    setShowAwardModal(false);
    notify(`Pot awarded to ${winnerNames}!`, 'success');
  };

  // Admin: Freeze table
  const toggleFreeze = async () => {
    const newFrozen = !frozen;
    await saveRoomData(roomCode, players, potAmount, transactions, newFrozen, roomSettings);
    setFrozen(newFrozen);
    notify(frozen ? 'Table unfrozen' : 'Table frozen!', frozen ? 'success' : 'warning');
  };

  // Admin: Undo last transaction
  const undoLastTransaction = async () => {
    if (transactions.length === 0) return;
    
    const lastTx = transactions[0];
    const newTx = {
      id: generateId(),
      type: 'UNDO',
      description: `Undid: ${lastTx.description}`,
      amount: -lastTx.amount,
      playerId: null,
      timestamp: Date.now()
    };
    const newTransactions = [newTx, ...transactions];
    
    await saveRoomData(roomCode, players, potAmount, newTransactions, frozen, roomSettings);
    setTransactions(newTransactions);
    notify('Transaction undone', 'info');
  };

  // Reset / Leave room
  const resetGame = async () => {
    try {
      await storage.delete('tablebanker-me');
    } catch (e) {}
    setScreen('home');
    setIsAdmin(false);
    setCurrentUser(null);
    setRoomCode('');
    setPlayers(Array(8).fill(null));
    setPotAmount(0);
    setTransactions([]);
    setFrozen(false);
  };

  // Total chips
  const totalChips = players.filter(p => p).reduce((sum, p) => sum + p.balance, 0) + potAmount;

  // Render screens
  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return (
          <div className="home-screen">
            <div className="logo-container">
              <div className="logo">🎰</div>
              <h1>TableBanker</h1>
              <p className="tagline">Digital Chips. Real Trust.</p>
            </div>
            
            <div className="home-actions">
              <button className="primary-btn create-btn" onClick={() => setScreen('create')}>
                <span className="btn-icon">👑</span>
                <span className="btn-text">Create Room</span>
                <span className="btn-subtitle">I'm the Banker</span>
              </button>
              
              <button className="secondary-btn join-btn" onClick={() => setScreen('join')}>
                <span className="btn-icon">🎮</span>
                <span className="btn-text">Join Room</span>
                <span className="btn-subtitle">Enter room code</span>
              </button>
            </div>
            
            <div className="home-footer">
              <span className="currency-badges">
                {Object.entries(CURRENCIES).map(([code, curr]) => (
                  <span key={code} className="currency-badge">{curr.symbol}</span>
                ))}
              </span>
              <p>1 Chip = 1 Currency Unit</p>
            </div>
          </div>
        );

      case 'create':
        return (
          <div className="create-screen">
            <button className="back-btn" onClick={() => setScreen('home')}>← Back</button>
            
            <h2>Create Room</h2>
            
            <div className="form-group">
              <label>Your Name (Chao Meu / Banker)</label>
              <input 
                type="text" 
                placeholder="Enter your name"
                value={joinName}
                onChange={e => setJoinName(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Currency</label>
              <div className="currency-select">
                {Object.entries(CURRENCIES).map(([code, curr]) => (
                  <button
                    key={code}
                    className={`currency-option ${roomSettings.currency === code ? 'active' : ''}`}
                    onClick={() => setRoomSettings({...roomSettings, currency: code, step: curr.step})}
                  >
                    <span className="curr-symbol">{curr.symbol}</span>
                    <span className="curr-name">{curr.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label>Game Mode</label>
              <div className="mode-select">
                {Object.entries(GAME_MODES).map(([code, mode]) => (
                  <button
                    key={code}
                    className={`mode-option ${roomSettings.mode === code ? 'active' : ''}`}
                    onClick={() => setRoomSettings({...roomSettings, mode: code})}
                  >
                    <span className="mode-name">{mode.name}</span>
                    <span className="mode-desc">{mode.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label>Minimum Step: {formatAmount(roomSettings.step, roomSettings.currency)}</label>
              <input 
                type="range"
                min={CURRENCIES[roomSettings.currency].step}
                max={CURRENCIES[roomSettings.currency].step * 100}
                step={CURRENCIES[roomSettings.currency].step}
                value={roomSettings.step}
                onChange={e => setRoomSettings({...roomSettings, step: parseInt(e.target.value)})}
              />
            </div>
            
            <button 
              className="primary-btn"
              disabled={!joinName.trim()}
              onClick={() => createRoom(joinName.trim())}
            >
              Create Room 👑
            </button>
          </div>
        );

      case 'join':
        return (
          <div className="join-screen">
            <button className="back-btn" onClick={() => setScreen('home')}>← Back</button>
            
            <h2>Join Room</h2>
            
            <div className="form-group">
              <label>Your Name</label>
              <input 
                type="text" 
                placeholder="Enter your name"
                value={joinName}
                onChange={e => setJoinName(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Room Code</label>
              <input 
                type="text" 
                placeholder="XXXXXX"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="room-code-input"
              />
            </div>
            
            <button 
              className="primary-btn"
              disabled={!joinName.trim() || joinCode.length !== 6}
              onClick={() => findRoom(joinCode)}
            >
              Find Table 🔍
            </button>
          </div>
        );

      case 'lobby':
        return (
          <div className="lobby-screen">
            <button className="back-btn" onClick={() => setScreen('join')}>← Back</button>
            
            <h2>Room: {roomCode}</h2>
            <p className="lobby-hint">Tap an empty seat to join</p>
            
            <div className="table-container mini">
              <div className="poker-table">
                <div className="seats-ring">
                  {players.map((player, index) => (
                    <Seat
                      key={index}
                      seat={index + 1}
                      player={player}
                      isCurrentUser={false}
                      isAdmin={false}
                      onSelect={() => handleSeatSelect(index)}
                      currency={roomSettings.currency}
                      totalChips={totalChips}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'game':
        return (
          <div className={`game-screen ${frozen ? 'frozen' : ''}`}>
            {/* Header */}
            <div className="game-header">
              <div className="room-info">
                <button 
                  className="room-code-btn"
                  onClick={() => {
                    navigator.clipboard?.writeText(roomCode);
                    notify(`Code ${roomCode} copied! Share with players.`, 'success');
                  }}
                >
                  <span className="room-code">{roomCode}</span>
                  <span className="copy-hint">📋 Tap to copy</span>
                </button>
                <span className="room-mode">{GAME_MODES[roomSettings.mode].name}</span>
              </div>
              <div className="vault-info">
                <span className="vault-label">Vault:</span>
                <span className="vault-total">{formatAmount(totalChips, roomSettings.currency)}</span>
              </div>
            </div>

            {frozen && (
              <div className="freeze-banner">
                🔒 TABLE FROZEN - Transactions Disabled
              </div>
            )}

            {/* Table Area */}
            <div className="table-container">
              <div className="poker-table">
                <div className="table-felt">
                  <CentralPot
                    amount={potAmount}
                    currency={roomSettings.currency}
                    mode={roomSettings.mode}
                    glowing={potAmount > 0}
                    onTap={() => {
                      if (roomSettings.mode !== 'DIRECT' && currentUser && !frozen) {
                        setShowTransferModal({ from: currentUser, to: null });
                      } else if (isAdmin && potAmount > 0) {
                        setShowAwardModal(true);
                      }
                    }}
                  />
                </div>
                
                <div className="seats-ring">
                  {players.map((player, index) => (
                    <Seat
                      key={index}
                      seat={index + 1}
                      player={player}
                      isCurrentUser={player?.id === currentUser?.id}
                      isAdmin={isAdmin}
                      onSelect={() => handleSeatSelect(index)}
                      currency={roomSettings.currency}
                      totalChips={totalChips}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* My Stack */}
            {currentUser && (
              <div className="my-stack">
                <span className="my-stack-label">My Stack ({currentUser.name})</span>
                <span className="my-stack-amount">
                  {formatAmount(
                    players.find(p => p?.id === currentUser.id)?.balance || 0,
                    roomSettings.currency
                  )}
                </span>
              </div>
            )}

            {/* Transaction Feed */}
            <div className="transaction-feed">
              <div className="feed-header">
                <span>📜 Ledger</span>
                <span className="tx-count">{transactions.length} transactions</span>
              </div>
              <div className="feed-list">
                {transactions.slice(0, 10).map(tx => (
                  <TransactionItem key={tx.id} tx={tx} currency={roomSettings.currency} />
                ))}
                {transactions.length === 0 && (
                  <div className="empty-feed">No transactions yet</div>
                )}
              </div>
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <div className="admin-controls">
                <button className="admin-btn mint" onClick={() => setShowMintModal(true)}>
                  🏦 Mint
                </button>
                <button className="admin-btn freeze" onClick={toggleFreeze}>
                  {frozen ? '🔓 Unfreeze' : '🔒 Freeze'}
                </button>
                <button className="admin-btn undo" onClick={undoLastTransaction}>
                  ↩️ Undo
                </button>
                {potAmount > 0 && (
                  <button className="admin-btn award" onClick={() => setShowAwardModal(true)}>
                    🏆 Award
                  </button>
                )}
                <button className="admin-btn cashout" onClick={() => setShowSettlement(true)}>
                  💵 Cash Out
                </button>
              </div>
            )}

            {/* Exit Button */}
            <button className="exit-btn" onClick={resetGame}>
              Exit Room
            </button>

            {/* Modals */}
            {showTransferModal && (
              <TransferModal
                from={showTransferModal.from}
                to={showTransferModal.to}
                currency={roomSettings.currency}
                step={roomSettings.step}
                onConfirm={handleTransfer}
                onCancel={() => setShowTransferModal(null)}
              />
            )}

            {showMintModal && (
              <MintModal
                players={players}
                currency={roomSettings.currency}
                step={roomSettings.step}
                onMint={handleMint}
                onCancel={() => setShowMintModal(false)}
              />
            )}

            {showAwardModal && (
              <AwardPotModal
                players={players}
                potAmount={potAmount}
                currency={roomSettings.currency}
                mode={roomSettings.mode}
                onAward={handleAwardPot}
                onCancel={() => setShowAwardModal(false)}
              />
            )}

            {showSettlement && (
              <SettlementModal
                players={players}
                currency={roomSettings.currency}
                transactions={transactions}
                onClose={resetGame}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="tablebanker-app">
      <style>{`
        :root {
          --bg-primary: #0a0a0f;
          --bg-secondary: #12121a;
          --bg-tertiary: #1a1a25;
          --neon-purple: #a855f7;
          --neon-purple-glow: rgba(168, 85, 247, 0.4);
          --electric-cyan: #22d3ee;
          --electric-cyan-glow: rgba(34, 211, 238, 0.4);
          --gold: #fbbf24;
          --gold-glow: rgba(251, 191, 36, 0.4);
          --text-primary: #ffffff;
          --text-secondary: #94a3b8;
          --text-muted: #64748b;
          --danger: #ef4444;
          --success: #22c55e;
          --warning: #f59e0b;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .tablebanker-app {
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: var(--bg-primary);
          color: var(--text-primary);
          min-height: 100vh;
          overflow-x: hidden;
        }

        .home-screen {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: 
            radial-gradient(ellipse at 50% 0%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(34, 211, 238, 0.1) 0%, transparent 40%),
            var(--bg-primary);
        }

        .logo-container { text-align: center; margin-bottom: 3rem; }
        .logo { font-size: 5rem; margin-bottom: 1rem; animation: float 3s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

        .logo-container h1 {
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--neon-purple), var(--electric-cyan));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 2px;
        }

        .tagline { color: var(--text-secondary); font-size: 1.1rem; margin-top: 0.5rem; }

        .home-actions { display: flex; flex-direction: column; gap: 1rem; width: 100%; max-width: 320px; }

        .primary-btn, .secondary-btn {
          display: flex; flex-direction: column; align-items: center;
          padding: 1.25rem 1.5rem; border-radius: 16px; border: none; cursor: pointer;
          transition: all 0.3s ease;
        }

        .primary-btn {
          background: linear-gradient(135deg, var(--neon-purple), #7c3aed);
          box-shadow: 0 4px 20px var(--neon-purple-glow);
        }
        .primary-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 30px var(--neon-purple-glow); }
        .primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .secondary-btn { background: var(--bg-tertiary); border: 1px solid rgba(255,255,255,0.1); }
        .secondary-btn:hover { background: var(--bg-secondary); border-color: var(--electric-cyan); }

        .btn-icon { font-size: 1.5rem; margin-bottom: 0.25rem; }
        .btn-text { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); }
        .btn-subtitle { font-size: 0.8rem; color: var(--text-secondary); }

        .home-footer { margin-top: 3rem; text-align: center; }
        .currency-badges { display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 0.5rem; }
        .currency-badge { background: var(--bg-tertiary); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 1rem; color: var(--gold); }
        .home-footer p { color: var(--text-muted); font-size: 0.85rem; }

        .create-screen, .join-screen, .lobby-screen { min-height: 100vh; padding: 1.5rem; background: var(--bg-primary); }
        .back-btn { background: transparent; border: none; color: var(--text-secondary); font-size: 1rem; cursor: pointer; margin-bottom: 1.5rem; }
        .back-btn:hover { color: var(--text-primary); }

        .create-screen h2, .join-screen h2, .lobby-screen h2 {
          font-size: 1.75rem; margin-bottom: 2rem;
          background: linear-gradient(135deg, var(--neon-purple), var(--electric-cyan));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: block; color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem; }
        .form-group input[type="text"], .form-group input[type="number"] {
          width: 100%; padding: 1rem; background: var(--bg-secondary);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
          color: var(--text-primary); font-size: 1rem;
        }
        .form-group input:focus { outline: none; border-color: var(--neon-purple); }
        .room-code-input { text-align: center; font-size: 1.5rem !important; letter-spacing: 8px; font-weight: 700; }

        .currency-select, .mode-select { display: flex; flex-direction: column; gap: 0.5rem; }
        .currency-option, .mode-option {
          display: flex; align-items: center; gap: 1rem; padding: 1rem;
          background: var(--bg-secondary); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; cursor: pointer; transition: all 0.2s;
        }
        .currency-option:hover, .mode-option:hover { border-color: var(--neon-purple); }
        .currency-option.active, .mode-option.active { border-color: var(--neon-purple); background: rgba(168, 85, 247, 0.1); }
        .curr-symbol { font-size: 1.5rem; color: var(--gold); }
        .curr-name, .mode-name { color: var(--text-primary); font-weight: 500; }
        .mode-option { flex-direction: column; align-items: flex-start; gap: 0.25rem; }
        .mode-desc { font-size: 0.8rem; color: var(--text-muted); }
        .form-group input[type="range"] { width: 100%; accent-color: var(--neon-purple); }
        .lobby-hint { color: var(--text-secondary); margin-bottom: 2rem; }

        .game-screen {
          min-height: 100vh;
          background: radial-gradient(ellipse at 50% 30%, rgba(168, 85, 247, 0.08) 0%, transparent 50%), var(--bg-primary);
          padding-bottom: 200px;
        }
        .game-screen.frozen { pointer-events: none; }
        .game-screen.frozen .admin-controls { pointer-events: auto; }

        .game-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1rem 1.5rem; background: var(--bg-secondary);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .room-info { display: flex; flex-direction: column; }
        .room-code-btn {
          display: flex; flex-direction: column; align-items: flex-start;
          background: var(--bg-tertiary); border: 1px solid var(--electric-cyan);
          border-radius: 8px; padding: 0.5rem 0.75rem; cursor: pointer; transition: all 0.2s;
        }
        .room-code-btn:hover { background: rgba(34, 211, 238, 0.1); }
        .room-code-btn .room-code { font-size: 1.1rem; font-weight: 700; color: var(--electric-cyan); letter-spacing: 2px; }
        .copy-hint { font-size: 0.65rem; color: var(--text-muted); }
        .room-code { font-weight: 600; color: var(--electric-cyan); }
        .room-mode { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; }
        .vault-info { text-align: right; }
        .vault-label { font-size: 0.8rem; color: var(--text-muted); display: block; }
        .vault-total { font-size: 1.25rem; font-weight: 700; color: var(--gold); }

        .freeze-banner {
          background: linear-gradient(90deg, var(--danger), #dc2626);
          color: white; text-align: center; padding: 0.75rem; font-weight: 600;
          animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }

        .table-container { padding: 1rem; display: flex; justify-content: center; }
        .table-container.mini { transform: scale(0.85); }
        .poker-table { position: relative; width: 340px; height: 340px; }
        .table-felt {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 180px; height: 180px;
          background: linear-gradient(145deg, #1a472a, #0f2e1a);
          border-radius: 50%; border: 8px solid #2d1810;
          box-shadow: inset 0 0 30px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
        }
        .seats-ring { position: absolute; width: 100%; height: 100%; }

        .seat {
          position: absolute; width: 70px; height: 90px;
          display: flex; flex-direction: column; align-items: center;
          cursor: pointer; transition: all 0.2s;
        }
        .seat:nth-child(1) { top: 0; left: 50%; transform: translateX(-50%); }
        .seat:nth-child(2) { top: 10%; right: 5%; }
        .seat:nth-child(3) { top: 50%; right: 0; transform: translateY(-50%); }
        .seat:nth-child(4) { bottom: 10%; right: 5%; }
        .seat:nth-child(5) { bottom: 0; left: 50%; transform: translateX(-50%); }
        .seat:nth-child(6) { bottom: 10%; left: 5%; }
        .seat:nth-child(7) { top: 50%; left: 0; transform: translateY(-50%); }
        .seat:nth-child(8) { top: 10%; left: 5%; }

        .seat.empty { opacity: 0.5; }
        .seat.empty:hover { opacity: 1; }
        .empty-seat {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 50px; height: 50px; border: 2px dashed var(--text-muted); border-radius: 50%;
        }
        .seat-number { font-size: 1.2rem; color: var(--text-muted); }
        .tap-hint { font-size: 0.6rem; color: var(--text-muted); margin-top: 0.25rem; }

        .player-info { display: flex; flex-direction: column; align-items: center; position: relative; }
        .avatar {
          width: 50px; height: 50px; border-radius: 50%;
          background: linear-gradient(135deg, var(--neon-purple), #7c3aed);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.25rem; font-weight: 700; position: relative;
          border: 3px solid var(--bg-primary);
        }
        .seat.current-user .avatar { border-color: var(--gold); box-shadow: 0 0 15px var(--gold-glow); }
        .seat.admin-seat .avatar { background: linear-gradient(135deg, var(--electric-cyan), #0891b2); }
        .admin-badge { position: absolute; top: -5px; right: -5px; font-size: 0.9rem; }
        .player-name { font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-primary); max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .player-balance { font-size: 0.8rem; font-weight: 600; color: var(--gold); }
        .chip-stack { position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); width: 20px; }
        .chip-layer { position: absolute; width: 20px; height: 4px; background: linear-gradient(90deg, var(--gold), #d97706); border-radius: 2px; box-shadow: 0 1px 2px rgba(0,0,0,0.3); }

        .central-pot { display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: all 0.3s; }
        .central-pot.glowing { animation: pot-glow 2s ease-in-out infinite; }
        @keyframes pot-glow { 0%, 100% { filter: drop-shadow(0 0 10px var(--gold-glow)); } 50% { filter: drop-shadow(0 0 20px var(--gold-glow)); } }
        .pot-icon { font-size: 2rem; }
        .pot-amount { font-size: 1.1rem; font-weight: 700; color: var(--gold); }
        .pot-label { font-size: 0.7rem; color: var(--text-muted); }
        .pot-hint { font-size: 0.6rem; color: var(--text-secondary); margin-top: 0.25rem; }

        .my-stack {
          text-align: center; padding: 1rem; background: var(--bg-secondary);
          margin: 1rem; border-radius: 16px; border: 1px solid rgba(251, 191, 36, 0.3);
        }
        .my-stack-label { display: block; font-size: 0.8rem; color: var(--text-muted); }
        .my-stack-amount { font-size: 2rem; font-weight: 700; color: var(--gold); }

        .transaction-feed { margin: 1rem; background: var(--bg-secondary); border-radius: 16px; overflow: hidden; }
        .feed-header { display: flex; justify-content: space-between; padding: 0.75rem 1rem; background: var(--bg-tertiary); font-size: 0.9rem; }
        .tx-count { color: var(--text-muted); font-size: 0.8rem; }
        .feed-list { max-height: 200px; overflow-y: auto; }
        .transaction-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .tx-icon { font-size: 1.25rem; }
        .tx-details { flex: 1; display: flex; flex-direction: column; }
        .tx-description { font-size: 0.85rem; }
        .tx-time { font-size: 0.7rem; color: var(--text-muted); }
        .tx-amount { font-weight: 600; }
        .tx-amount.positive { color: var(--success); }
        .tx-amount.negative { color: var(--danger); }
        .empty-feed { padding: 2rem; text-align: center; color: var(--text-muted); }

        .admin-controls {
          position: fixed; bottom: 0; left: 0; right: 0;
          display: flex; gap: 0.5rem; padding: 1rem;
          background: var(--bg-secondary); border-top: 1px solid rgba(34, 211, 238, 0.3);
          overflow-x: auto;
        }
        .admin-btn {
          flex-shrink: 0; padding: 0.75rem 1rem; border-radius: 12px; border: none;
          font-size: 0.85rem; font-weight: 600; cursor: pointer;
          background: var(--bg-tertiary); color: var(--text-primary);
          border: 1px solid rgba(34, 211, 238, 0.3); transition: all 0.2s;
        }
        .admin-btn:hover { background: rgba(34, 211, 238, 0.1); }
        .admin-btn.mint { background: linear-gradient(135deg, var(--electric-cyan), #0891b2); border: none; }
        .admin-btn.freeze { background: var(--danger); border: none; }
        .admin-btn.cashout { background: linear-gradient(135deg, var(--gold), #d97706); border: none; color: #000; }

        .exit-btn {
          position: fixed; bottom: 80px; right: 1rem;
          padding: 0.5rem 1rem; background: transparent;
          border: 1px solid var(--text-muted); border-radius: 8px;
          color: var(--text-muted); font-size: 0.8rem; cursor: pointer;
        }

        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8); display: flex;
          align-items: center; justify-content: center; z-index: 1000; padding: 1rem;
        }
        .transfer-modal, .mint-modal, .award-modal, .settlement-modal {
          background: var(--bg-secondary); border-radius: 20px;
          width: 100%; max-width: 400px; max-height: 90vh; overflow-y: auto;
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .modal-header h3 {
          font-size: 1.25rem;
          background: linear-gradient(135deg, var(--neon-purple), var(--electric-cyan));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .modal-header.admin-header h3 {
          background: linear-gradient(135deg, var(--electric-cyan), #0891b2);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .close-btn { background: transparent; border: none; color: var(--text-secondary); font-size: 1.25rem; cursor: pointer; }

        .transfer-parties { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1.5rem; }
        .party { text-align: center; }
        .party-avatar {
          width: 60px; height: 60px; border-radius: 50%;
          background: linear-gradient(135deg, var(--neon-purple), #7c3aed);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; font-weight: 700; margin: 0 auto 0.5rem;
        }
        .party.to .party-avatar { background: linear-gradient(135deg, var(--gold), #d97706); }
        .party-name { font-weight: 500; font-size: 0.9rem; }
        .party-balance { font-size: 0.8rem; color: var(--gold); }
        .transfer-arrow { font-size: 2rem; color: var(--text-muted); }

        .amount-input { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1rem; }
        .amount-input button {
          width: 48px; height: 48px; border-radius: 50%; border: none;
          background: var(--bg-tertiary); color: var(--text-primary);
          font-size: 1.5rem; cursor: pointer;
        }
        .amount-display { display: flex; align-items: center; background: var(--bg-primary); border-radius: 12px; padding: 0.75rem 1rem; }
        .currency-symbol { font-size: 1.25rem; color: var(--gold); margin-right: 0.5rem; }
        .amount-display input {
          width: 100px; background: transparent; border: none;
          color: var(--text-primary); font-size: 1.5rem; font-weight: 700; text-align: center;
        }
        .amount-display input:focus { outline: none; }

        .quick-amounts { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0 1rem 1rem; justify-content: center; }
        .quick-btn {
          padding: 0.5rem 1rem; border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.1); background: var(--bg-tertiary);
          color: var(--text-secondary); font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
        }
        .quick-btn:hover, .quick-btn.active { border-color: var(--neon-purple); color: var(--text-primary); }
        .quick-btn.all { background: linear-gradient(135deg, var(--danger), #dc2626); border: none; color: white; }

        .slide-to-pay { padding: 1rem; }
        .slide-track {
          position: relative; height: 56px; background: var(--bg-tertiary);
          border-radius: 28px; overflow: hidden; cursor: grab;
        }
        .slide-progress { position: absolute; top: 0; left: 0; height: 100%; background: linear-gradient(90deg, var(--neon-purple), #7c3aed); transition: width 0.1s; }
        .slide-thumb {
          position: absolute; top: 4px; width: 48px; height: 48px;
          background: white; border-radius: 50%; display: flex;
          align-items: center; justify-content: center; font-size: 1.5rem;
          transition: left 0.1s; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .slide-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--text-secondary); font-weight: 500; pointer-events: none; }

        .mint-subtitle { text-align: center; color: var(--text-secondary); padding: 1rem; }
        .player-select, .winner-select { display: flex; flex-direction: column; gap: 0.5rem; padding: 0 1rem; max-height: 250px; overflow-y: auto; }
        .player-option, .winner-option {
          display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem;
          background: var(--bg-tertiary); border: 1px solid transparent;
          border-radius: 12px; cursor: pointer; transition: all 0.2s;
        }
        .player-option:hover, .winner-option:hover { border-color: var(--electric-cyan); }
        .player-option.selected, .winner-option.selected { border-color: var(--electric-cyan); background: rgba(34, 211, 238, 0.1); }
        .player-option .player-avatar, .winner-option .player-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, var(--neon-purple), #7c3aed);
          display: flex; align-items: center; justify-content: center; font-weight: 600;
        }
        .player-option .player-name, .winner-option .player-name { flex: 1; }
        .player-option .player-balance { color: var(--gold); }
        .winner-badge { color: var(--success); font-size: 1.25rem; }

        .player-info-text { flex: 1; display: flex; flex-direction: column; align-items: flex-start; }
        .player-option .player-seat { font-size: 0.75rem; color: var(--text-muted); }
        .player-option .select-arrow { color: var(--text-muted); font-size: 1.25rem; }
        .empty-players { padding: 2rem; text-align: center; color: var(--text-muted); }

        .back-to-list {
          display: block; width: 100%; padding: 0.75rem 1rem;
          background: transparent; border: none;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          color: var(--electric-cyan); font-size: 0.9rem; text-align: left; cursor: pointer;
        }
        .back-to-list:hover { background: var(--bg-tertiary); }

        .selected-player-display { display: flex; flex-direction: column; align-items: center; padding: 1.5rem; gap: 0.5rem; }
        .selected-player-display .player-avatar {
          width: 70px; height: 70px; border-radius: 50%;
          background: linear-gradient(135deg, var(--electric-cyan), #0891b2);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.75rem; font-weight: 700;
        }
        .selected-player-display .player-name { font-size: 1.1rem; font-weight: 600; }
        .selected-player-display .player-balance { color: var(--gold); font-size: 1rem; }

        .mint-confirm-btn, .award-confirm-btn {
          display: block; width: calc(100% - 2rem); margin: 1rem; padding: 1rem;
          background: linear-gradient(135deg, var(--electric-cyan), #0891b2);
          border: none; border-radius: 12px; color: white;
          font-size: 1rem; font-weight: 600; cursor: pointer;
        }
        .award-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .pot-display { text-align: center; padding: 1.5rem; }
        .pot-total { display: block; font-size: 2.5rem; font-weight: 700; color: var(--gold); }
        .pot-display .pot-label { color: var(--text-muted); }
        .split-info { text-align: center; color: var(--text-secondary); padding: 0 1rem 1rem; }

        .settlement-modal { max-width: 450px; }
        .settlement-summary { padding: 1rem; background: var(--bg-tertiary); }
        .vault-status { display: flex; justify-content: space-between; align-items: center; }
        .vault-status .vault-label { color: var(--text-secondary); }
        .vault-status .vault-amount { font-size: 1.25rem; font-weight: 700; color: var(--gold); }
        .settlement-list { max-height: 300px; overflow-y: auto; }
        .settlement-row { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .settlement-row.paid { opacity: 0.5; }
        .settlement-player { display: flex; align-items: center; gap: 0.75rem; }
        .settlement-player .player-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, var(--neon-purple), #7c3aed);
          display: flex; align-items: center; justify-content: center; font-weight: 600;
        }
        .player-details { display: flex; flex-direction: column; }
        .net-change { font-size: 0.75rem; }
        .net-change.positive { color: var(--success); }
        .net-change.negative { color: var(--danger); }
        .settlement-amount { text-align: right; }
        .cash-owed { display: block; font-size: 1.1rem; font-weight: 700; color: var(--gold); }
        .paid-btn {
          margin-top: 0.25rem; padding: 0.25rem 0.75rem; border-radius: 20px;
          border: 1px solid var(--text-muted); background: transparent;
          color: var(--text-secondary); font-size: 0.75rem; cursor: pointer;
        }
        .paid-btn.checked { background: var(--success); border-color: var(--success); color: white; }
        .close-settlement-btn {
          display: block; width: calc(100% - 2rem); margin: 1rem; padding: 1rem;
          background: var(--danger); border: none; border-radius: 12px;
          color: white; font-size: 1rem; font-weight: 600; cursor: pointer;
        }

        .notifications { position: fixed; top: 1rem; right: 1rem; z-index: 2000; display: flex; flex-direction: column; gap: 0.5rem; }
        .notification { padding: 0.75rem 1rem; border-radius: 8px; background: var(--bg-secondary); border-left: 4px solid var(--neon-purple); animation: slide-in 0.3s ease; }
        .notification.success { border-color: var(--success); }
        .notification.error { border-color: var(--danger); }
        .notification.warning { border-color: var(--warning); }
        @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--bg-primary); }
        ::-webkit-scrollbar-thumb { background: var(--bg-tertiary); border-radius: 3px; }
      `}</style>

      {renderScreen()}

      <div className="notifications">
        {notifications.map(n => (
          <div key={n.id} className={`notification ${n.type}`}>
            {n.message}
          </div>
        ))}
      </div>
    </div>
  );
}
