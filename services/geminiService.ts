
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { BoardState, PlayerColor, Move, PieceSymbol, CastlingRights, DifficultyLevel } from '../types';
import { ChessLogic, parseAlgebraicMove, moveToAlgebraic } from './chessLogic';
import { GEMINI_MODEL_NAME, AI_DIFFICULTY_SETTINGS } from '../constants';

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.error("API_KEY environment variable not set. AI functionality will be severely limited or disabled.");
}

function boardToString(board: BoardState, playerPerspective: PlayerColor): string {
  // Simple text representation. White at bottom, Black at top if player is White.
  // Rows are 8 down to 1 for white, 1 up to 8 for black.
  // Files are a to h.
  let boardStr = "  a b c d e f g h\n";
  const viewBoard = playerPerspective === 'white' ? board : board.slice().reverse().map(row => row.slice().reverse());

  for (let r = 0; r < 8; r++) {
    boardStr += `${playerPerspective === 'white' ? 8 - r : r + 1} `;
    for (let c = 0; c < 8; c++) {
      const piece = viewBoard[r][c];
      if (!piece) {
        boardStr += ". ";
      } else {
        let pieceChar: string = piece.type; // Explicitly type as string or use a different variable
        if (piece.color === 'black') {
          pieceChar = pieceChar.toLowerCase();
        }
        boardStr += pieceChar + " ";
      }
    }
    boardStr += "\n";
  }
  return boardStr;
}


export const getAIMove = async (
  boardState: BoardState,
  aiPlayerColor: PlayerColor,
  moveHistory: string[], // Array of moves in algebraic notation
  castlingRights: CastlingRights, 
  lastMove: Move | null,
  difficulty: DifficultyLevel
): Promise<Move | null> => {
  const currentDifficultySettings = AI_DIFFICULTY_SETTINGS[difficulty];

  if (!ai) {
    console.warn("Gemini AI not initialized. AI will make a random move.");
    const possibleMoves = ChessLogic.getAllPossibleMovesForPlayer(boardState, aiPlayerColor, lastMove, castlingRights);
    return possibleMoves.length > 0 ? possibleMoves[Math.floor(Math.random() * possibleMoves.length)] : null;
  }

  const possibleMoves = ChessLogic.getAllPossibleMovesForPlayer(boardState, aiPlayerColor, lastMove, castlingRights);
  if (possibleMoves.length === 0) {
    return null; // No moves possible (checkmate or stalemate)
  }

  const possibleMovesString = possibleMoves.map(m => moveToAlgebraic(m)).join(', ');
  
  const currentBoardStr = boardToString(boardState, aiPlayerColor);
  const lastFewMoves = moveHistory.slice(-6).join(', '); // Last 3 full moves

  const prompt = `You are a chess AI playing as ${aiPlayerColor} at ${difficulty} difficulty.
Current board state (uppercase for your pieces, lowercase for opponent's pieces, '.' for empty. Your pieces are ${aiPlayerColor === 'white' ? 'uppercase' : 'lowercase'}. Perspective: ${aiPlayerColor}):
${currentBoardStr}

Recent moves: ${lastFewMoves || 'None'}
It's ${aiPlayerColor}'s turn.

Your available valid moves are: ${possibleMovesString}.
You MUST choose one move from this list.
Respond with ONLY the chosen move in algebraic notation (e.g., e2e4, g1f3, a7a8q for pawn promotion to Queen).

Your chosen move for ${aiPlayerColor}:`;

  try {
    const aiPromise = ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        temperature: currentDifficultySettings.temperature,
        maxOutputTokens: 10,
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error(`AI request timed out after ${currentDifficultySettings.timeout}ms`)), currentDifficultySettings.timeout)
    );
    
    // Race the AI response against the timeout
    const response = await Promise.race([aiPromise, timeoutPromise]) as GenerateContentResponse | null;

    if (!response) { // This means timeoutPromise won
        throw new Error(`AI request timed out after ${currentDifficultySettings.timeout}ms`);
    }


    const aiMoveString = response.text.trim();
    const parsedMove = parseAlgebraicMove(aiMoveString);

    if (parsedMove) {
      const isValidChoice = possibleMoves.some(pm => 
        pm.from.row === parsedMove.from.row && pm.from.col === parsedMove.from.col &&
        pm.to.row === parsedMove.to.row && pm.to.col === parsedMove.to.col &&
        (pm.promotion ? pm.promotion.toUpperCase() : undefined) === (parsedMove.promotion ? parsedMove.promotion.toUpperCase() : undefined)
      );

      if (isValidChoice) {
         const chosenMove = possibleMoves.find(pm => 
            pm.from.row === parsedMove.from.row && pm.from.col === parsedMove.from.col &&
            pm.to.row === parsedMove.to.row && pm.to.col === parsedMove.to.col &&
            (pm.promotion ? pm.promotion.toUpperCase() : undefined) === (parsedMove.promotion ? parsedMove.promotion.toUpperCase() : undefined)
         );
        return chosenMove || parsedMove; 
      } else {
        console.warn(`AI proposed an invalid move: ${aiMoveString} for difficulty ${difficulty}. Valid moves were: ${possibleMovesString}. Falling back to a random valid move.`);
        return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      }
    } else {
      console.warn(`AI response could not be parsed: ${aiMoveString} for difficulty ${difficulty}. Falling back to a random valid move.`);
      return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }
  } catch (error: any) {
    console.error(`Error getting AI move from Gemini (difficulty: ${difficulty}):`, error.message);
    return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
  }
};