
import { PieceSymbol, PlayerColor, BoardState, Piece } from './types';

export const PIECE_UNICODE: Record<PlayerColor, Record<PieceSymbol, string>> = {
  white: {
    K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  },
  black: {
    K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟',
  },
};

export const INITIAL_BOARD_SETUP: (PieceSymbol | null)[][] = [
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

export const USER_PLAYER_COLOR: PlayerColor = 'white';
export const AI_PLAYER_COLOR: PlayerColor = 'black';

export const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

export const PROMOTION_PIECES: PieceSymbol[] = ['Q', 'R', 'B', 'N'];

export const PIECE_NAMES_HEBREW: Record<PieceSymbol, string> = {
  'P': 'רגלי', 'R': 'צריח', 'N': 'פרש', 'B': 'רץ', 'Q': 'מלכה', 'K': 'מלך'
};

export const PLAYER_COLOR_HEBREW: Record<PlayerColor, string> = {
  'white': 'לבן', 'black': 'שחור'
};

export const HEBREW_FILES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'];
// For user (White) perspective, ranks are 1-8 from bottom to top.
// When iterating board rows 0-7, row 0 is rank 8, row 7 is rank 1.
export const HEBREW_RANKS_DISPLAY = ['8', '7', '6', '5', '4', '3', '2', '1'];


// AI Difficulty Settings
export const AI_DIFFICULTY_SETTINGS = {
  easy: { temperature: 0.8, timeout: 10000 }, // More random, quicker fallback
  medium: { temperature: 0.4, timeout: 15000 }, // Balanced
  hard: { temperature: 0.2, timeout: 20000 }, // More deterministic, longer to think
};


export function createInitialBoard(): BoardState {
  const board: BoardState = Array(8).fill(null).map(() => Array(8).fill(null));
  INITIAL_BOARD_SETUP.forEach((rowSetup, r) => {
    rowSetup.forEach((pieceSymbol, c) => {
      if (pieceSymbol) {
        const color: PlayerColor = r < 4 ? 'black' : 'white'; // Standard setup: black top, white bottom
        board[r][c] = { type: pieceSymbol, color, hasMoved: false };
      }
    });
  });
  // Flip for standard array indexing (row 0 is black's back rank)
  // User (white) starts at rows 6 and 7.
  const finalBoard: BoardState = Array(8).fill(null).map(() => Array(8).fill(null));
  finalBoard[0] = [{type: 'R', color: 'black', hasMoved: false}, {type: 'N', color: 'black', hasMoved: false}, {type: 'B', color: 'black', hasMoved: false}, {type: 'Q', color: 'black', hasMoved: false}, {type: 'K', color: 'black', hasMoved: false}, {type: 'B', color: 'black', hasMoved: false}, {type: 'N', color: 'black', hasMoved: false}, {type: 'R', color: 'black', hasMoved: false}];
  finalBoard[1] = Array(8).fill(null).map(() => ({type: 'P', color: 'black', hasMoved: false}));
  for(let i=2; i<6; i++) {
    finalBoard[i] = Array(8).fill(null);
  }
  finalBoard[6] = Array(8).fill(null).map(() => ({type: 'P', color: 'white', hasMoved: false}));
  finalBoard[7] = [{type: 'R', color: 'white', hasMoved: false}, {type: 'N', color: 'white', hasMoved: false}, {type: 'B', color: 'white', hasMoved: false}, {type: 'Q', color: 'white', hasMoved: false}, {type: 'K', color: 'white', hasMoved: false}, {type: 'B', color: 'white', hasMoved: false}, {type: 'N', color: 'white', hasMoved: false}, {type: 'R', color: 'white', hasMoved: false}];
  
  return finalBoard;
}