import requests
import sys

BASE_URL = "http://localhost:4000/api"

def verify_game_flow():
    # 1. Create Game
    print("Creating game...")
    resp = requests.post(f"{BASE_URL}/games", json={})
    if resp.status_code not in [200, 201]:
        print(f"Failed to create game: {resp.status_code} {resp.text}")
        return
    
    data = resp.json()
    game_id = data['game_id']
    print(f"Game created: {game_id}")

    # 2. Join Player 1
    print("Joining Player 1...")
    resp = requests.post(f"{BASE_URL}/games/{game_id}/join", json={})
    if resp.status_code != 200:
        print(f"Failed to join player 1: {resp.text}")
        return
    
    data = resp.json()
    player1_id = data['player_id']
    print(f"Player 1 joined: {player1_id}")

    # 3. Join Player 2
    print("Joining Player 2...")
    resp = requests.post(f"{BASE_URL}/games/{game_id}/join", json={})
    if resp.status_code != 200:
        print(f"Failed to join player 2: {resp.text}")
        return
    
    data = resp.json()
    player2_id = data['player_id']
    print(f"Player 2 joined: {player2_id}")

    # 4. Join Player 3 (Should fail)
    print("Joining Player 3 (Expect failure)...")
    resp = requests.post(f"{BASE_URL}/games/{game_id}/join", json={})
    if resp.status_code == 422:
        print("Player 3 correctly rejected.")
    else:
        print(f"Unexpected response for Player 3: {resp.status_code} {resp.text}")

if __name__ == "__main__":
    verify_game_flow()
