export type PieceSymbol = 'P' | 'R' | 'N' | 'B' | 'Q' | 'K';
export type PlayerColor = 'white' | 'black';

export interface Piece {
  type: PieceSymbol;
  color: PlayerColor;
  hasMoved: boolean;
}

export type SquareState = Piece | null;
export type BoardState = SquareState[][];

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  promotion?: PieceSymbol;
  isCastling?: boolean;
  isEnPassant?: boolean;
  capturedPiece?: Piece; // Added to store the captured piece
}

export interface CastlingRights {
  white: { kingSide: boolean; queenSide: boolean };
  black: { kingSide: boolean; queenSide: boolean };
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface GameState {
  board: BoardState;
  currentPlayer: PlayerColor;
  selectedPiecePos: Position | null;
  possibleMoves: Move[];
  gameStatus: string;
  moveHistory: string[]; // Store moves in algebraic notation
  gameOver: boolean;
  isCheck: boolean;
  castlingRights: CastlingRights;
  lastMove: Move | null; // For en passant
  isAITurn: boolean;
  isLoadingAI: boolean;
  aiLastMove: Move | null; // Stores the last move made by the AI
  capturedByWhite: Piece[]; // Black pieces captured by White
  capturedByBlack: Piece[]; // White pieces captured by Black
  difficulty: DifficultyLevel; // Added difficulty level
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  retrievedContext?: {
    uri: string;
    title: string;
  };
}