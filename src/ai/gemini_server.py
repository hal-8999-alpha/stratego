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

def format_board(board, known_pieces):
    """Format the board state into a readable string."""
    # Add column numbers
    board_str = "   0  1  2  3  4  5  6  7  8  9\n"
    
    for row in range(10):
        # Add row numbers
        board_str += f"{row} "
        for col in range(10):
            piece = board[row][col]
            # Special handling for water squares
            if row in [4, 5] and col in [2, 3, 6, 7]:
                board_str += "~~~"
            elif piece:
                key = f"{row}-{col}"
                if piece['player'] == 'ai':
                    # Show AI pieces normally
                    board_str += f"AI{piece['type']}"
                else:
                    # For enemy pieces, show the type if it's known
                    if key in known_pieces and known_pieces[key]['player'] == 'player':
                        board_str += f" {known_pieces[key]['type']} "
                    else:
                        board_str += " ? "
            else:
                board_str += " . "
        board_str += "\n"
    return board_str

def format_known_pieces(known_pieces):
    """Format known pieces information."""
    if not known_pieces:
        return "No enemy pieces have been revealed yet."
    
    formatted = []
    for key, piece in known_pieces.items():
        if piece['player'] == 'player':  # Only show enemy (player) pieces
            row, col = key.split('-')
            formatted.append(f"- {piece['type']} at position ({row},{col})")
    
    if not formatted:
        return "No enemy pieces have been revealed yet."
        
    return "\n".join(formatted)

def format_battle_history(history):
    """Format battle history information."""
    if not history:
        return "No battles have occurred yet."
    
    formatted = []
    for battle in history[-5:]:  # Only show last 5 battles
        attacker_side = "AI" if battle['attacker']['player'] == 'ai' else "Enemy"
        defender_side = "AI" if battle['defender']['player'] == 'ai' else "Enemy"
        winner_side = "AI" if battle['winner'] == 'ai' else "Enemy"
        formatted.append(
            f"- {attacker_side} {battle['attacker']['type']} attacked {defender_side} {battle['defender']['type']}: {winner_side} won"
        )
    return "\n".join(formatted)

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

def format_move_history(moves):
    """Format the last 10 moves in the game."""
    if not moves:
        return "No moves made yet."
    
    return "\n".join([
        f"- Turn {i+1}: {move['player']} moved from ({move['from']['row']},{move['from']['col']}) to ({move['to']['row']},{move['to']['col']})"
        for i, move in enumerate(moves[-10:])
    ])

def create_prompt(board, legal_moves, known_pieces, battle_history, confirmed_bombs, turn_count, move_history=[]):
    """Create a prompt for move selection"""
    prompt = f"""You are playing Stratego as the AI player (top side). Your goal is to find and capture the enemy flag while protecting your own flag.

PIECE STRENGTH RULES (VERY IMPORTANT):
1. Lower numbers are ALWAYS stronger than higher numbers:
   - 1 beats 2,3,4,5,6,7,8,9
   - 2 beats 3,4,5,6,7,8,9
   - 3 beats 4,5,6,7,8,9
   - 4 beats 5,6,7,8,9
   - 5 beats 6,7,8,9
   - 6 beats 7,8,9
   - 7 beats 8,9
   - 8 beats 9
   - 9 loses to ALL except Flag
2. Special rules:
   - Spy (S) wins against ANY piece (except Bomb) if Spy attacks first
   - Spy (S) loses if it is attacked by any piece
   - Miners (8) are needed for Bombs (B)
   - Flag (F) cannot move

MOVE VALIDATION STEPS - CHECK THESE BEFORE CHOOSING A MOVE:
1. If attacking a known enemy piece, verify your piece's number is LOWER than the enemy's
2. Never attack with a higher number - it will always lose
3. Example: If enemy has a 6, don't attack with 7,8,or 9 - they will lose
4. Look at recent battles to avoid repeating losing matchups

STRATEGIC CONSIDERATIONS:
- Protect your Flag with strong pieces
- Based on the player's moves where do you think they're strong? Where do you think they're weak? Where do you think they're bluffing?
- Where do you think the player's flag is?
- Where do you think the bombs are?
- Where do you think the player's Marshal (1) and General (2) are?
- If you know where the player's spy is, how can you use that to your advantage?
- Use Scouts (9) only for exploration, they lose to everything except Flag
- Keep your Marshal (1) and General (2) safe but ready for key battles
- Miners (8) are crucial for bombs - don't lose them carelessly
- Trick the player into attacking a weak piece next to your spy. The spy always wins when attacking first. The spy always loses when defending.
- Keep your spy safe. If the player knows where your spy is, they can move a piece next to it to capture it.
- You want your opponent to have as little information as possible about your pieces. 
- Bluff using weak pieces to make the player think you have a strong piece
- LEARN FROM PAST BATTLES - don't repeat losing matchups

THINKING:
1. What do you know about the player's pieces?
2. Where do you think the player's flag is?
3. Based on your current legal moves which one is the best and which one is the worst?
4. Where are you strongest on the board? Where are you weakest?
5. What is the player trying to protect? What is the player trying to attack?
6. What is the player trying to do?
7. What is the player trying to avoid?



Turn: {turn_count}

Recent Moves:
{format_move_history(move_history)}

Known Enemy Pieces (CHECK THESE BEFORE ATTACKING):
{format_known_pieces(known_pieces)}

Recent Battles (DO NOT REPEAT THESE MISTAKES):
{format_battle_history(battle_history)}

Confirmed Bombs:
{format_bombs(confirmed_bombs)}

Legal Moves Available:
{format_legal_moves(legal_moves)}

Current Board State:
{format_board(board, known_pieces)}

VALIDATION REQUIRED: Before outputting a move, verify:
1. If attacking, is your piece's number LOWER than the enemy piece?
2. Are you avoiding moves that repeat past losing battles?
3. Are you protecting your valuable pieces (1,2,3)?

Based on this validation, output EXACTLY ONE line with your chosen move in this format:
MOVE (fromRow,fromCol) TO (toRow,toCol)"""
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
            data['turnCount'],
            data.get('moveHistory', [])  # Add move history with default empty list
        )

        # Log the prompt
        print("\n=== SENDING TO GEMINI ===")
        print(prompt)
        print("=== END OF PROMPT ===\n")

        # Get Gemini's response
        response = await chat.send_message(prompt)
        
        # Log the response
        print("=== GEMINI RESPONSE ===")
        print(response.text)
        print("=== END OF RESPONSE ===\n")
        
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