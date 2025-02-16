from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import json
import re
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)

# Load environment variables
load_dotenv()

# Initialize Gemini
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is not set")

client = genai.Client(
    api_key=api_key,
    http_options={'api_version': 'v1alpha'}
)

@dataclass
class Position:
    row: int
    col: int

@dataclass
class Piece:
    type: str
    player: str
    position: Position

@dataclass
class Move:
    piece: Piece
    from_pos: Position
    to_pos: Position

def format_board(board):
    """Format the board state into a readable string."""
    board_str = "Current board state:\n"
    for row in range(10):
        for col in range(10):
            piece = board[row][col]
            if piece:
                board_str += f"{piece['player'][0]}{piece['type']} "
            else:
                board_str += "-- "
        board_str += "\n"
    return board_str

def format_known_pieces(known_pieces):
    """Format known pieces information."""
    if not known_pieces:
        return "No enemy pieces have been revealed yet."
    
    formatted = []
    for key, piece in known_pieces.items():
        formatted.append(f"- {piece['type']} at position ({key.split('-')[0]},{key.split('-')[1]})")
    return "\n".join(formatted)

def format_battle_history(history):
    """Format battle history information."""
    return "Recent battles:\n" + "\n".join([
        f"- {battle['attacker']['type']} vs {battle['defender']['type']}: {battle['winner']} won"
        for battle in history[-5:]  # Only show last 5 battles
    ])

def format_bombs(bombs):
    """Format confirmed bomb locations."""
    return "Confirmed bombs at:\n" + "\n".join([
        f"- ({bomb['row']},{bomb['col']})"
        for bomb in bombs
    ])

def format_legal_moves(moves):
    """Format list of legal moves."""
    return "Possible moves:\n" + "\n".join([
        f"- Move {move['piece']['type']} from ({move['from']['row']},{move['from']['col']}) "
        f"to ({move['to']['row']},{move['to']['col']})"
        for move in moves[:10]  # Only show first 10 moves to avoid overwhelming
    ])

def create_prompt(board, legal_moves, known_pieces, battle_history, confirmed_bombs, turn_count):
    """Create a prompt for move selection"""
    prompt = f"""You are playing Stratego. Based on the following game state, output ONLY a single line with your chosen move in EXACTLY this format: "MOVE (fromRow,fromCol) TO (toRow,toCol)". Nothing else.

Turn: {turn_count}

Known Enemy Pieces:
{format_known_pieces(known_pieces)}

Confirmed Bombs:
{format_bombs(confirmed_bombs)}

Recent Battles:
{format_battle_history(battle_history)}

Legal Moves:
{format_legal_moves(legal_moves)}

Board:
{format_board(board)}"""
    return prompt

@app.route('/analyze', methods=['POST'])
async def analyze_game_state():
    try:
        data = request.json
        
        # Create chat for this analysis
        chat = client.aio.chats.create(model='gemini-2.0-flash-thinking-exp')

        # Generate prompt
        prompt = create_prompt(
            data['board'],
            data['legalMoves'],
            data['knownPieces'],
            data['battleHistory'],
            data['confirmedBombs'],
            data['turnCount']
        )

        # Get Gemini's response
        response = await chat.send_message(prompt)
        
        # Parse move from response
        # Looking for format: "MOVE (fromRow,fromCol) TO (toRow,toCol)"
        pattern = r"MOVE \((\d+),(\d+)\) TO \((\d+),(\d+)\)"
        match = re.search(pattern, response.text)
        
        if match:
            from_row, from_col, to_row, to_col = map(int, match.groups())
            return jsonify({
                'move': {
                    'from': {'row': from_row, 'col': from_col},
                    'to': {'row': to_row, 'col': to_col}
                }
            })
        else:
            return jsonify({'error': 'Could not parse move from response'}), 400

    except Exception as e:
        print(f"Error in analyze_game_state: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    import asyncio
    from hypercorn.config import Config
    from hypercorn.asyncio import serve

    config = Config()
    config.bind = ["0.0.0.0:5000"]
    asyncio.run(serve(app, config)) 