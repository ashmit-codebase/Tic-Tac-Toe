import { getBestMove } from './ai.js';

// Sound Effects Manager using Web Audio API
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playTone(freq, type, duration, delay = 0) {
    if (this.muted) return;
    this.init();
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    setTimeout(() => {
      try {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {
        console.warn("Sound playback failed", e);
      }
    }, delay * 1000);
  }

  playClick(isX = true) {
    const freq = isX ? 523.25 : 659.25;
    this.playTone(freq, 'triangle', 0.15);
  }

  playWin() {
    const now = 0;
    this.playTone(261.63, 'sine', 0.3, now);
    this.playTone(329.63, 'sine', 0.3, now + 0.1);
    this.playTone(392.00, 'sine', 0.3, now + 0.2);
    this.playTone(523.25, 'sine', 0.5, now + 0.3);
  }

  playLose() {
    const now = 0;
    this.playTone(311.13, 'sawtooth', 0.4, now);
    this.playTone(293.66, 'sawtooth', 0.4, now + 0.15);
    this.playTone(246.94, 'sawtooth', 0.6, now + 0.3);
  }

  playDraw() {
    const now = 0;
    this.playTone(293.66, 'triangle', 0.3, now);
    this.playTone(293.66, 'triangle', 0.5, now + 0.25);
  }
}

const sound = new SoundManager();

// Game State variables
let board = ['', '', '', '', '', '', '', '', ''];
let gameMode = 'ai';
let difficulty = 'unbeatable';
let startingPlayer = 'player';
let playerSymbol = 'X';
let aiSymbol = 'O';
let currentTurn = 'X';
let gameActive = true;
let isAiThinking = false;

const scores = {
  pvp: { x: 0, o: 0, draws: 0 },
  ai: { player: 0, ai: 0, draws: 0 }
};

const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const cells = document.querySelectorAll('[data-cell]');
const gameBoardEl = document.getElementById('game-board');
const statusMessageEl = document.getElementById('status-message');
const soundToggleBtn = document.getElementById('sound-toggle');
const modePvpBtn = document.getElementById('mode-pvp');
const modeAiBtn = document.getElementById('mode-ai');
const aiConfigSection = document.getElementById('ai-config-section');

const diffEasyBtn = document.getElementById('diff-easy');
const diffMediumBtn = document.getElementById('diff-medium');
const diffUnbeatableBtn = document.getElementById('diff-unbeatable');
const startPlayerBtn = document.getElementById('start-player');
const startAiBtn = document.getElementById('start-ai');

const scoreLeftLabel = document.getElementById('score-left-label');
const scoreLeftVal = document.getElementById('score-left-val');
const scoreRightLabel = document.getElementById('score-right-label');
const scoreRightVal = document.getElementById('score-right-val');
const scoreDrawsVal = document.getElementById('score-draws-val');

const resetBoardBtn = document.getElementById('reset-board-btn');
const resetScoresBtn = document.getElementById('reset-scores-btn');
const nodesCountEl = document.getElementById('nodes-count');
const searchTimeEl = document.getElementById('search-time');
const svgLine = document.getElementById('win-line');

function initGame() {
  setupEventListeners();
  updateScoresUI();
  resetBoard();
}

function setupEventListeners() {
  cells.forEach((cell, index) => {
    cell.addEventListener('click', () => handleCellClick(cell, index));
  });

  soundToggleBtn.addEventListener('click', () => {
    sound.muted = !sound.muted;
    sound.init();
    soundToggleBtn.innerHTML = sound.muted 
      ? '<i class="fas fa-volume-mute"></i>' 
      : '<i class="fas fa-volume-up"></i>';
    soundToggleBtn.classList.toggle('muted', sound.muted);
  });

  modePvpBtn.addEventListener('click', () => setGameMode('pvp'));
  modeAiBtn.addEventListener('click', () => setGameMode('ai'));

  diffEasyBtn.addEventListener('click', () => setDifficulty('easy'));
  diffMediumBtn.addEventListener('click', () => setDifficulty('medium'));
  diffUnbeatableBtn.addEventListener('click', () => setDifficulty('unbeatable'));

  startPlayerBtn.addEventListener('click', () => setStartingPlayer('player'));
  startAiBtn.addEventListener('click', () => setStartingPlayer('ai'));

  resetBoardBtn.addEventListener('click', resetBoard);
  resetScoresBtn.addEventListener('click', resetScores);
}

function setGameMode(mode) {
  if (gameMode === mode) return;
  gameMode = mode;
  
  modePvpBtn.classList.toggle('active', mode === 'pvp');
  modeAiBtn.classList.toggle('active', mode === 'ai');
  
  if (mode === 'ai') {
    aiConfigSection.classList.remove('hidden');
  } else {
    aiConfigSection.classList.add('hidden');
  }
  
  updateScoresUI();
  resetBoard();
}

function setDifficulty(diff) {
  if (difficulty === diff) return;
  difficulty = diff;
  
  diffEasyBtn.classList.toggle('active', diff === 'easy');
  diffMediumBtn.classList.toggle('active', diff === 'medium');
  diffUnbeatableBtn.classList.toggle('active', diff === 'unbeatable');
  
  resetBoard();
}

function setStartingPlayer(starter) {
  if (startingPlayer === starter) return;
  startingPlayer = starter;
  
  startPlayerBtn.classList.toggle('active', starter === 'player');
  startAiBtn.classList.toggle('active', starter === 'ai');
  
  if (startingPlayer === 'player') {
    playerSymbol = 'X';
    aiSymbol = 'O';
  } else {
    playerSymbol = 'O';
    aiSymbol = 'X';
  }
  
  resetBoard();
}

function updateScoresUI() {
  if (gameMode === 'pvp') {
    scoreLeftLabel.textContent = 'Player X';
    scoreLeftVal.textContent = scores.pvp.x;
    scoreRightLabel.textContent = 'Player O';
    scoreRightVal.textContent = scores.pvp.o;
    scoreDrawsVal.textContent = scores.pvp.draws;
  } else {
    scoreLeftLabel.textContent = 'You (Human)';
    scoreLeftVal.textContent = scores.ai.player;
    scoreRightLabel.textContent = 'AI Agent';
    scoreRightVal.textContent = scores.ai.ai;
    scoreDrawsVal.textContent = scores.ai.draws;
  }
}

function handleCellClick(cell, index) {
  if (!gameActive || board[index] !== '' || isAiThinking) return;

  sound.init();
  
  makeMove(index, currentTurn);
  
  if (checkGameStatus()) return;

  currentTurn = currentTurn === 'X' ? 'O' : 'X';
  updateStatusMessage();

  if (gameMode === 'ai' && currentTurn === aiSymbol) {
    triggerAiMove();
  }
}

function makeMove(index, symbol) {
  board[index] = symbol;
  const cell = cells[index];
  
  cell.textContent = symbol;
  cell.setAttribute('data-symbol', symbol);
  cell.classList.add('taken');
  
  sound.playClick(symbol === 'X');
}

function triggerAiMove() {
  isAiThinking = true;
  statusMessageEl.innerHTML = `<span class="pulse-text">AI Agent is calculating optimal move...</span>`;
  gameBoardEl.classList.add('ai-turn');

  const startSearchTime = performance.now();
  
  setTimeout(() => {
    const result = getBestMove(board, difficulty, aiSymbol, playerSymbol);
    const endSearchTime = performance.now();
    const searchDurationMs = (endSearchTime - startSearchTime).toFixed(1);

    if (nodesCountEl) nodesCountEl.textContent = result.nodes;
    if (searchTimeEl) searchTimeEl.textContent = `${searchDurationMs}ms`;

    if (result.index !== -1) {
      makeMove(result.index, aiSymbol);
      
      isAiThinking = false;
      gameBoardEl.classList.remove('ai-turn');
      
      if (checkGameStatus()) return;
      
      currentTurn = playerSymbol;
      updateStatusMessage();
    }
  }, 450);
}

function checkGameStatus() {
  for (let combo of WIN_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      endGame(board[a], combo);
      return true;
    }
  }

  if (board.every(cell => cell !== '')) {
    endGame('draw');
    return true;
  }

  return false;
}

function endGame(result, winningCombo = null) {
  gameActive = false;

  if (result === 'draw') {
    if (gameMode === 'pvp') {
      scores.pvp.draws++;
    } else {
      scores.ai.draws++;
    }
    statusMessageEl.textContent = "It's a Draw!";
    sound.playDraw();
  } else {
    let isPlayerWin = false;
    let isAiWin = false;

    if (gameMode === 'pvp') {
      if (result === 'X') {
        scores.pvp.x++;
        statusMessageEl.textContent = "Player X Wins!";
      } else {
        scores.pvp.o++;
        statusMessageEl.textContent = "Player O Wins!";
      }
    } else {
      if (result === playerSymbol) {
        scores.ai.player++;
        statusMessageEl.textContent = "You Win! Dynamic AI defeated.";
        isPlayerWin = true;
      } else {
        scores.ai.ai++;
        statusMessageEl.textContent = "AI Agent Wins! Unbeatable AI rules.";
        isAiWin = true;
      }
    }

    if (gameMode === 'pvp' || isPlayerWin) {
      sound.playWin();
      triggerConfetti();
    } else {
      sound.playLose();
    }

    if (winningCombo) {
      highlightWinningCells(winningCombo);
      drawWinningLine(winningCombo);
    }
  }

  updateScoresUI();
}

function highlightWinningCells(combo) {
  combo.forEach(idx => {
    cells[idx].classList.add('win-cell');
  });
}

function drawWinningLine(combo) {
  const cellA = cells[combo[0]];
  const cellC = cells[combo[2]];
  
  const rectA = cellA.getBoundingClientRect();
  const rectC = cellC.getBoundingClientRect();
  const boardRect = gameBoardEl.getBoundingClientRect();

  const x1 = rectA.left - boardRect.left + rectA.width / 2;
  const y1 = rectA.top - boardRect.top + rectA.height / 2;
  const x2 = rectC.left - boardRect.left + rectC.width / 2;
  const y2 = rectC.top - boardRect.top + rectC.height / 2;

  const lineEl = svgLine.querySelector('line');
  lineEl.setAttribute('x1', x1);
  lineEl.setAttribute('y1', y1);
  lineEl.setAttribute('x2', x2);
  lineEl.setAttribute('y2', y2);
  
  const length = Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);
  lineEl.style.strokeDasharray = length;
  lineEl.style.strokeDashoffset = length;
  
  lineEl.getBoundingClientRect();
  
  lineEl.style.strokeDashoffset = '0';
  svgLine.classList.remove('hidden');
}

function resetBoard() {
  board = ['', '', '', '', '', '', '', '', ''];
  gameActive = true;
  isAiThinking = false;
  
  cells.forEach(cell => {
    cell.textContent = '';
    cell.removeAttribute('data-symbol');
    cell.className = 'cell';
  });

  svgLine.classList.add('hidden');
  const lineEl = svgLine.querySelector('line');
  lineEl.setAttribute('x1', '0');
  lineEl.setAttribute('y1', '0');
  lineEl.setAttribute('x2', '0');
  lineEl.setAttribute('y2', '0');

  if (nodesCountEl) nodesCountEl.textContent = '0';
  if (searchTimeEl) searchTimeEl.textContent = '0ms';

  if (gameMode === 'pvp') {
    currentTurn = 'X';
  } else {
    currentTurn = 'X';
  }

  gameBoardEl.classList.remove('ai-turn');
  updateStatusMessage();

  if (gameMode === 'ai' && startingPlayer === 'ai') {
    triggerAiMove();
  }
}

function resetScores() {
  scores.pvp = { x: 0, o: 0, draws: 0 };
  scores.ai = { player: 0, ai: 0, draws: 0 };
  updateScoresUI();
  resetBoard();
}

function updateStatusMessage() {
  if (!gameActive) return;
  
  if (gameMode === 'pvp') {
    statusMessageEl.textContent = `Player ${currentTurn}'s Turn`;
  } else {
    if (currentTurn === playerSymbol) {
      statusMessageEl.textContent = "Your Turn (X)";
    } else {
      statusMessageEl.textContent = "AI's Turn (O)";
    }
  }
}

function triggerConfetti() {
  if (window.confetti) {
    window.confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4cc9f0', '#ffb454', '#7c5cfc', '#4ade80']
    });
  } else {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#4cc9f0', '#ffb454', '#7c5cfc', '#4ade80'];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.6,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.75) * 15,
        radius: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.015 + 0.01
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        if (p.alpha > 0) {
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.3;
          p.alpha -= p.decay;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
        }
      });

      if (alive) {
        requestAnimationFrame(animate);
      } else {
        document.body.removeChild(canvas);
      }
    }

    animate();
  }
}

window.addEventListener('load', initGame);
window.addEventListener('resize', () => {
  if (!gameActive && board.some(cell => cell !== '')) {
    let winningCombo = null;
    for (let combo of WIN_COMBOS) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        winningCombo = combo;
        break;
      }
    }
    if (winningCombo) {
      drawWinningLine(winningCombo);
    }
  }
});