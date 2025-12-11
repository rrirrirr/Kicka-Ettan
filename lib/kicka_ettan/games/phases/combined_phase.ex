defmodule KickaEttan.Games.Phases.CombinedPhase do
  @moduledoc """
  Combined Phase: Both players' stones are revealed and collision resolution occurs.
  Players view the result and can start the next round.
  
  Actions handled:
  - :ready_for_next_round - Player is ready to proceed to next round
  """
  @behaviour KickaEttan.Games.Phase

  require Logger

  # Stone dimensions for collision resolution
  @stone_radius 14.5
  @stone_diameter 29.0
  @sheet_width 475.0
  @hog_line_offset 640.0
  @back_line_offset 183.0
  @max_collision_iterations 20

  @impl true
  def init(game_state) do
    # Resolve collisions when entering combined phase (including ban zones)
    resolved_stones = resolve_stone_collisions(game_state.stones, game_state.banned_zones)

    # Track who is ready for next round
    player_ready =
      game_state.players
      |> Enum.map(fn p -> {p.id, false} end)
      |> Map.new()

    {:ok, %{player_ready: player_ready, resolved_stones: resolved_stones}}
  end

  @impl true
  def handles_actions do
    [:ready_for_next_round]
  end

  @impl true
  def handle_action(:ready_for_next_round, args, phase_state, game_state) do
    %{player_id: player_id} = args

    case find_player(game_state, player_id) do
      {:ok, _player} ->
        player_ready = Map.put(phase_state.player_ready, player_id, true)
        Logger.info("Player #{player_id} ready for next round")
        {:ok, %{phase_state | player_ready: player_ready}, game_state}

      error ->
        error
    end
  end

  @impl true
  def check_completion(phase_state, _game_state) do
    # Phase completes when at least one player clicks "next round"
    any_ready = Enum.any?(phase_state.player_ready, fn {_id, ready} -> ready end)

    if any_ready do
      {:complete, :start_next_round}
    else
      :continue
    end
  end

  @impl true
  def client_view(phase_state, game_state, _player_id) do
    base_view = Map.from_struct(game_state)

    # Show all stones (resolved positions)
    Map.merge(base_view, %{
      phase: :combined,
      stones: phase_state.resolved_stones,
      player_ready: phase_state.player_ready
    })
  end

  # Private helpers

  defp find_player(game_state, player_id) do
    case Enum.find(game_state.players, fn p -> p.id == player_id end) do
      nil -> {:error, :player_not_found}
      player -> {:ok, player}
    end
  end

  defp resolve_stone_collisions(stones, banned_zones) do
    KickaEttan.Games.Collision.resolve_stone_collisions(stones, banned_zones)
  end
end
