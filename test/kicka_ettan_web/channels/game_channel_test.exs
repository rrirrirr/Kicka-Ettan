defmodule KickaEttanWeb.GameChannelTest do
  use KickaEttanWeb.ChannelCase

  alias KickaEttan.Games.GameSupervisor
  alias KickaEttanWeb.UserSocket

  setup do
    {:ok, game_id} = GameSupervisor.create_game(%{stones_per_team: 1})
    
    {:ok, socket} = connect(UserSocket, %{"player_id" => "test_player"})
    
    %{socket: socket, game_id: game_id}
  end

  describe "join/3" do
    test "successfully joins existing game", %{socket: socket, game_id: game_id} do
      {:ok, reply, _socket} = subscribe_and_join(socket, "game:#{game_id}", %{})
      
      assert reply.game_state.game_id == game_id
      assert reply.player_id == "test_player"
    end

    test "returns game state and player_id on join", %{socket: socket, game_id: game_id} do
      {:ok, reply, _socket} = subscribe_and_join(socket, "game:#{game_id}", %{})
      
      assert Map.has_key?(reply, :game_state)
      assert Map.has_key?(reply, :player_id)
      assert reply.game_state.phase == :placement
    end

    test "returns error for non-existent game", %{socket: socket} do
      assert {:error, %{reason: "Game not found"}} = 
        subscribe_and_join(socket, "game:nonexistent_game", %{})
    end

    test "returns error for full game", %{game_id: game_id} do
      # Join two players
      {:ok, socket1} = connect(UserSocket, %{"player_id" => "player1"})
      {:ok, socket2} = connect(UserSocket, %{"player_id" => "player2"})
      
      {:ok, _, _} = subscribe_and_join(socket1, "game:#{game_id}", %{})
      {:ok, _, _} = subscribe_and_join(socket2, "game:#{game_id}", %{})
      
      # Third player should fail
      {:ok, socket3} = connect(UserSocket, %{"player_id" => "player3"})
      assert {:error, %{reason: "Game is full"}} = 
        subscribe_and_join(socket3, "game:#{game_id}", %{})
    end

    test "handles reconnection (same player_id)", %{socket: socket, game_id: game_id} do
      {:ok, _, _socket1} = subscribe_and_join(socket, "game:#{game_id}", %{})
      
      # Reconnect with same player_id
      {:ok, socket2} = connect(UserSocket, %{"player_id" => "test_player"})
      {:ok, reply, _socket2} = subscribe_and_join(socket2, "game:#{game_id}", %{})
      
      # Should succeed without error
      assert reply.player_id == "test_player"
    end

    test "allows requesting specific color", %{game_id: game_id} do
      {:ok, socket} = connect(UserSocket, %{"player_id" => "red_player"})
      {:ok, reply, _} = subscribe_and_join(socket, "game:#{game_id}", %{"color" => "red"})
      
      player = Enum.find(reply.game_state.players, & &1.id == "red_player")
      assert player.color == :red
    end
  end

  describe "handle_in place_stone" do
    setup %{socket: socket, game_id: game_id} do
      {:ok, _, socket} = subscribe_and_join(socket, "game:#{game_id}", %{})
      %{socket: socket}
    end

    test "places stone with valid payload", %{socket: socket} do
      payload = %{"stone_index" => 0, "position" => %{"x" => 200, "y" => 400}}
      
      ref = push(socket, "place_stone", payload)
      assert_reply ref, :ok
    end

    test "returns error for invalid payload", %{socket: socket} do
      payload = %{"invalid" => "payload"}
      
      ref = push(socket, "place_stone", payload)
      assert_reply ref, :error, %{reason: "Invalid payload"}
    end

    test "returns error for invalid stone index", %{socket: socket} do
      payload = %{"stone_index" => 99, "position" => %{"x" => 200, "y" => 400}}
      
      ref = push(socket, "place_stone", payload)
      assert_reply ref, :error, %{reason: :invalid_placement}
    end
  end

  describe "handle_in confirm_placement" do
    setup %{socket: socket, game_id: game_id} do
      {:ok, _, socket} = subscribe_and_join(socket, "game:#{game_id}", %{})
      %{socket: socket}
    end

    test "confirms placement when all stones placed", %{socket: socket} do
      # Place stone first
      push(socket, "place_stone", %{"stone_index" => 0, "position" => %{"x" => 200, "y" => 400}})
      
      ref = push(socket, "confirm_placement", %{})
      assert_reply ref, :ok
    end

    test "returns error when not all stones placed", %{socket: socket} do
      ref = push(socket, "confirm_placement", %{})
      assert_reply ref, :error, %{reason: :not_all_stones_placed}
    end
  end

  describe "handle_in ready_for_next_round" do
    setup %{game_id: game_id} do
      # Create two-player game and complete round 1
      {:ok, socket1} = connect(UserSocket, %{"player_id" => "player1"})
      {:ok, socket2} = connect(UserSocket, %{"player_id" => "player2"})
      
      {:ok, _, socket1} = subscribe_and_join(socket1, "game:#{game_id}", %{})
      {:ok, _, socket2} = subscribe_and_join(socket2, "game:#{game_id}", %{})
      
      # Place and confirm stones
      push(socket1, "place_stone", %{"stone_index" => 0, "position" => %{"x" => 200, "y" => 400}})
      push(socket2, "place_stone", %{"stone_index" => 0, "position" => %{"x" => 300, "y" => 500}})
      push(socket1, "confirm_placement", %{})
      push(socket2, "confirm_placement", %{})
      
      # Allow time for processing
      :timer.sleep(50)
      
      %{socket1: socket1}
    end

    test "ready for next round succeeds", %{socket1: socket1} do
      ref = push(socket1, "ready_for_next_round", %{})
      assert_reply ref, :ok
    end
  end

  describe "game_state_update broadcast" do
    setup %{socket: socket, game_id: game_id} do
      {:ok, _, socket} = subscribe_and_join(socket, "game:#{game_id}", %{})
      %{socket: socket}
    end

    test "receives update after placing stone", %{socket: socket} do
      payload = %{"stone_index" => 0, "position" => %{"x" => 200, "y" => 400}}
      push(socket, "place_stone", payload)
      
      assert_broadcast "game_state_update", _state
    end
  end
end
