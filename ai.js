/**
 * ai.js - Tic-Tac-Toe AI Agent
 * Implements Minimax with Alpha-Beta Pruning, with support for different difficulties:
 * - Easy: Random moves
 * - Medium: 60% chance optimal minimax, 40% chance random
 * - Unbeatable: 100% optimal minimax with Alpha-Beta Pruning
 */

// Win combinations in Tic-Tac-Toe
const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

/**
 * Check if there is a winner on the board.
 * @param {Array} board - 9-element array representing the board
 * @returns {string|null} - 'X', 'O', or null if no winner
 */
function checkWinner(board) {
  for (let combo of WIN_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

/**
 * Check if the board is completely full.
 * @param {Array} board - 9-element array representing the board
 * @returns {boolean} - true if full, false otherwise
 */
function isBoardFull(board) {
  return board.every(cell => cell !== '');
}

// Global nodes counter to showcase search complexity
let nodesEvaluated = 0;

/**
 * Minimax algorithm with Alpha-Beta Pruning
 */
function minimax(board, depth, isMaximizing, aiPlayer, huPlayer, alpha, beta) {
  nodesEvaluated++;

  // Check terminal states
  const winner = checkWinner(board);
  if (winner === aiPlayer) {
    return 10 - depth; // Favor quicker wins
  }
  if (winner === huPlayer) {
    return depth - 10; // Delay losses
  }
  if (isBoardFull(board)) {
    return 0; // Draw
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        board[i] = aiPlayer;
        let score = minimax(board, depth + 1, false, aiPlayer, huPlayer, alpha, beta);
        board[i] = ''; // Undo move
        maxEval = Math.max(maxEval, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) {
          break; // Beta cut-off
        }
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        board[i] = huPlayer;
        let score = minimax(board, depth + 1, true, aiPlayer, huPlayer, alpha, beta);
        board[i] = ''; // Undo move
        minEval = Math.min(minEval, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) {
          break; // Alpha cut-off
        }
      }
    }
    return minEval;
  }
}

/**
 * Find the best move for the AI.
 */
export function getBestMove(board, difficulty, aiPlayer, huPlayer) {
  nodesEvaluated = 0;
  
  // Find all available spots
  const availableMoves = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === '') {
      availableMoves.push(i);
    }
  }

  // If board is full, no moves to make
  if (availableMoves.length === 0) return { index: -1, nodes: 0 };

  // Handle Easy Difficulty: Pure Random Moves
  if (difficulty === 'easy') {
    const randomIndex = Math.floor(Math.random() * availableMoves.length);
    return { index: availableMoves[randomIndex], nodes: 1 };
  }

  // Handle Medium Difficulty: 60% optimal move, 40% random move
  if (difficulty === 'medium') {
    const isOptimal = Math.random() < 0.6;
    if (!isOptimal) {
      const randomIndex = Math.floor(Math.random() * availableMoves.length);
      return { index: availableMoves[randomIndex], nodes: 1 };
    }
    // Otherwise fall through to calculating optimal move
  }

  // Unbeatable Mode (Minimax with Alpha-Beta)
  let bestScore = -Infinity;
  let bestMoves = [];

  for (let i = 0; i < 9; i++) {
    if (board[i] === '') {
      board[i] = aiPlayer;
      let score = minimax(board, 0, false, aiPlayer, huPlayer, -Infinity, Infinity);
      board[i] = ''; // Undo move

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [i];
      } else if (score === bestScore) {
        bestMoves.push(i);
      }
    }
  }

  const chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];

  return {
    index: chosenMove,
    nodes: nodesEvaluated
  };
}