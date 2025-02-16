import os
from typing import Dict, List, Optional
from google import genai
from dataclasses import dataclass
import re

@dataclass
class Position:
    row: int
    col: int

@dataclass
class Piece:
    type: str
    player: str
    row: int
    col: int

@dataclass
class Move:
    from_pos: Position
    to_pos: Position
    piece: Piece

class GeminiStrategist:
    def __init__(self, api_key: str):
        self.client = genai.Client(
            api_key=api_key,
            http_options={'api_version': 'v1alpha'}
        )
        self.model = 'gemini-2.0-flash-thinking-exp'
        self.chat = None
        self.initialize_chat()

    def initialize_chat(self):
        """Initialize or reset the chat session"""
        self.chat = self.client.aio.chats.create(model=self.model)

    async def analyze_game_state(
        self,
        board: List[List[Optional[Piece]]],
        legal_moves: List[Move],
        known_pieces: Dict[str, Piece],
        battle_history: List[Dict],
        confirmed_bombs: List[Position],
        turn_count: int
    ):
        """Analyze the current game state and suggest a move"""
        
        # Create a detailed prompt about the game state
        prompt = self._create_game_state_prompt(
            board, legal_moves, known_pieces, 
            battle_history, confirmed_bombs, turn_count
        )

        try:
            response = await self.chat.send_message(prompt)
            return self._parse_response(response.text)
        except Exception as e:
            print(f"Error getting Gemini response: {e}")
            return None

    def _create_game_state_prompt(
        self,
        board: List[List[Optional[Piece]]],
        legal_moves: List[Move],
        known_pieces: Dict[str, Piece],
        battle_history: List[Dict],
        confirmed_bombs: List[Position],
        turn_count: int
    ) -> str:
        """Create a prompt for move selection"""
        
        prompt = f"""You are playing Stratego. Based on the following game state, output ONLY a single line with your chosen move in EXACTLY this format: "MOVE (fromRow,fromCol) TO (toRow,toCol)". Nothing else.

Turn: {turn_count}

Known Enemy Pieces:
{self._format_known_pieces(known_pieces)}

Confirmed Bombs:
{self._format_bomb_locations(confirmed_bombs)}

Recent Battles:
{self._format_battle_history(battle_history)}

Legal Moves:
{self._format_legal_moves(legal_moves)}

Board:
{self._format_board(board, known_pieces)}"""
        return prompt

    def _format_known_pieces(self, known_pieces: Dict[str, Piece]) -> str:
        """Format known enemy pieces information"""
        if not known_pieces:
            return "No enemy pieces have been revealed yet."
        
        formatted = []
        for pos, piece in known_pieces.items():
            formatted.append(f"- {piece.type} at position ({piece.row}, {piece.col})")
        return "\n".join(formatted)

    def _format_bomb_locations(self, bombs: List[Position]) -> str:
        """Format confirmed bomb locations"""
        if not bombs:
            return "No bombs have been discovered yet."
        
        return "\n".join([f"- Bomb at ({b.row}, {b.col})" for b in bombs])

    def _format_battle_history(self, history: List[Dict]) -> str:
        """Format recent battle history"""
        if not history:
            return "No battles have occurred yet."
        
        formatted = []
        for battle in history[-5:]:  # Show last 5 battles
            formatted.append(
                f"- {battle['attackerType']} vs {battle['defenderType']} - "
                f"Winner: {battle['winner']}"
            )
        return "\n".join(formatted)

    def _format_legal_moves(self, moves: List[Move]) -> str:
        """Format available legal moves"""
        formatted = []
        for move in moves:
            formatted.append(
                f"- Move {move.piece.type} from ({move.from_pos.row}, {move.from_pos.col}) "
                f"to ({move.to_pos.row}, {move.to_pos.col})"
            )
        return "\n".join(formatted)

    def _format_board(self, board: List[List[Optional[Piece]]], known_pieces: Dict[str, Piece]) -> str:
        """Format the board state, showing only known pieces"""
        formatted = []
        for row in range(10):
            row_str = []
            for col in range(10):
                piece = board[row][col]
                if piece is None:
                    row_str.append('.')
                elif piece.player == 'ai':
                    row_str.append(piece.type)
                else:
                    # For enemy pieces, only show if they're known
                    pos_key = f"{row}-{col}"
                    if pos_key in known_pieces:
                        row_str.append(piece.type)
                    else:
                        row_str.append('?')
            formatted.append(' '.join(row_str))
        return '\n'.join(formatted)

    def _parse_response(self, response: str) -> Optional[Dict[str, int]]:
        """Parse Gemini's response into move coordinates"""
        try:
            # Looking for format: "MOVE (fromRow,fromCol) TO (toRow,toCol)"
            pattern = r"MOVE \((\d+),(\d+)\) TO \((\d+),(\d+)\)"
            match = re.search(pattern, response)
            if match:
                from_row, from_col, to_row, to_col = map(int, match.groups())
                return {
                    'from_row': from_row,
                    'from_col': from_col,
                    'to_row': to_row,
                    'to_col': to_col
                }
            return None
        except Exception as e:
            print(f"Error parsing Gemini response: {e}")
            return None

# Example usage:
"""
# Initialize the strategist
strategist = GeminiStrategist(api_key='your-api-key')

# Get move recommendation
recommendation = await strategist.analyze_game_state(
    board=current_board,
    legal_moves=available_moves,
    known_pieces=discovered_pieces,
    battle_history=recent_battles,
    confirmed_bombs=known_bombs,
    turn_count=current_turn
)

if recommendation:
    print("Strategic Analysis:", recommendation['analysis'])
    print("Flag Prediction:", recommendation['flag_prediction'])
    print("Recommended Move:", recommendation['recommended_move'])
""" 