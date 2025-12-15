defmodule KickaEttan.Games.Phases.TurnOrderPhase do
  @moduledoc """
  A phase for deciding who goes first in turn-based placement.
  
  Both players vote for who should start. When both agree, the phase completes
  and passes the agreed first_player to the next phase.
  
  When dice are rolled, we delay phase completion to allow the animation to display.
  """
  @behaviour KickaEttan.Games.Phase
  require Logger

  # Delay (in ms) before phase completes after dice roll - gives time for frontend to receive data
  # Short delay just to ensure data is transmitted before phase changes
  @dice_animation_delay_ms 500

  @derive Jason.Encoder
  defstruct [
    name: "turn_order",
    votes: %{},        # %{player_id => voted_for_player_id or "randomize"}
    first_player: nil, # Set when both agree
    dice_rolls: %{},   # %{player_id => roll} when randomize is used
    dice_completed_at: nil  # Timestamp when dice roll completed
  ]

  @impl true
  def init(_game_state, opts \\ []) do
    opts = Map.new(opts)
    
    state = %__MODULE__{
      name: opts[:name] || "turn_order",
      votes: %{},
      first_player: nil,
      dice_completed_at: nil
    }
    
    {:ok, state}
  end

  @impl true
  def handle_action(action, params, phase_state, game_state) do
    case action do
      :vote_first_player -> vote_first_player(params, phase_state, game_state)
      :acknowledge_dice -> acknowledge_dice(params, phase_state, game_state)
      _ -> {:error, :unknown_action}
    end
  end

  defp vote_first_player(%{player_id: player_id, vote_for: vote_for_id}, state, game_state) do
    # Record vote
    new_votes = Map.put(state.votes, player_id, vote_for_id)
    
    # Check if both players have voted
    player_ids = Enum.map(game_state.players, & &1.id)
    all_voted = Enum.all?(player_ids, fn pid -> Map.has_key?(new_votes, pid) end)
    
    if all_voted do
      votes = Enum.map(player_ids, fn pid -> new_votes[pid] end) |> Enum.uniq()
      
      cond do
        # Both voted "randomize" - roll dice!
        votes == ["randomize"] ->
          handle_randomize(player_ids, state, game_state)
        
        # Both voted for the same player
        length(votes) == 1 ->
          agreed_player = hd(votes)
          Logger.info("TurnOrderPhase: Both players agreed. #{agreed_player} starts first.")
          
          new_state = %{state | 
            votes: %{},
            first_player: agreed_player,
            dice_rolls: %{},
            dice_completed_at: nil  # No dice roll, no delay needed
          }
          {:ok, new_state, game_state}
        
        # Disagreement - reset votes
        true ->
          Logger.debug("TurnOrderPhase: Players disagree on first player. Resetting votes.")
          new_state = %{state | votes: %{}, dice_rolls: %{}, dice_completed_at: nil}
          {:ok, new_state, game_state}
      end
    else
      # Still waiting for other player's vote
      new_state = %{state | votes: new_votes}
      {:ok, new_state, game_state}
    end
  end

  defp handle_randomize(player_ids, state, game_state) do
    # Roll a d6 for each player
    rolls = Enum.map(player_ids, fn pid -> {pid, :rand.uniform(6)} end) |> Map.new()
    
    [p1_id, p2_id] = player_ids
    p1_roll = rolls[p1_id]
    p2_roll = rolls[p2_id]
    
    Logger.info("TurnOrderPhase: Randomize! #{p1_id} rolled #{p1_roll}, #{p2_id} rolled #{p2_roll}")
    
    cond do
      p1_roll < p2_roll ->
        # P1 wins (lower roll starts)
        Logger.info("TurnOrderPhase: #{p1_id} wins with lower roll!")
        new_state = %{state | 
          votes: %{}, 
          first_player: p1_id, 
          dice_rolls: rolls,
          dice_completed_at: System.monotonic_time(:millisecond)
        }
        {:ok, new_state, game_state}
      
      p2_roll < p1_roll ->
        # P2 wins
        Logger.info("TurnOrderPhase: #{p2_id} wins with lower roll!")
        new_state = %{state | 
          votes: %{}, 
          first_player: p2_id, 
          dice_rolls: rolls,
          dice_completed_at: System.monotonic_time(:millisecond)
        }
        {:ok, new_state, game_state}
      
      true ->
        # Tie! Re-roll automatically
        Logger.info("TurnOrderPhase: Tie! Re-rolling...")
        handle_randomize(player_ids, state, game_state)
    end
  end

  # Optional: allow clients to explicitly acknowledge the dice animation is done
  defp acknowledge_dice(%{player_id: _player_id}, state, game_state) do
    # For now, just return the state unchanged - we rely on timer
    {:ok, state, game_state}
  end

  @impl true
  def check_completion(state, _game_state) do
    cond do
      # No first player decided yet
      state.first_player == nil ->
        :continue
      
      # Dice were rolled - wait for animation delay
      state.dice_completed_at != nil ->
        elapsed = System.monotonic_time(:millisecond) - state.dice_completed_at
        if elapsed >= @dice_animation_delay_ms do
          Logger.info("TurnOrderPhase: Dice animation delay elapsed, completing phase.")
          {:complete, %{first_player: state.first_player}}
        else
          Logger.debug("TurnOrderPhase: Waiting for dice animation (#{elapsed}ms / #{@dice_animation_delay_ms}ms)")
          :continue
        end
      
      # No dice roll (direct agreement) - complete immediately
      true ->
        {:complete, %{first_player: state.first_player}}
    end
  end

  @impl true
  def client_view(state, game_state, player_id) do
    base_view = Map.from_struct(game_state)
    
    # Find opponent
    opponent = Enum.find(game_state.players, fn p -> p.id != player_id end)
    opponent_has_voted = opponent && Map.has_key?(state.votes, opponent.id)
    
    Map.merge(base_view, %{
      phase: "turn_order",
      phase_type: "turn_order",
      name: state.name,
      my_vote: Map.get(state.votes, player_id),
      opponent_has_voted: opponent_has_voted,
      dice_rolls: state.dice_rolls,
      first_player: state.first_player
    })
  end

  @impl true
  def handles_actions, do: [:vote_first_player, :acknowledge_dice]
end
