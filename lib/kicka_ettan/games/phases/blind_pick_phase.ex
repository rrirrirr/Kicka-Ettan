defmodule KickaEttan.Games.Phases.BlindPickPhase do
  @moduledoc """
  Blind Pick Phase: Players place stones simultaneously without seeing opponent's placements.
  
  Actions handled:
  - :place_stone - Place a stone at a position
  - :confirm_placement - Confirm all stones are placed
  - :cancel_placement - Revoke confirmation
  """
  @behaviour KickaEttan.Games.Phase

  require Logger

  @impl true
  def init(game_state) do
    # Initialize player readiness tracking
    player_ready =
      game_state.players
      |> Enum.map(fn p -> {p.id, false} end)
      |> Map.new()

    {:ok, %{player_ready: player_ready}}
  end

  @impl true
  def handles_actions do
    [:place_stone, :confirm_placement, :cancel_placement]
  end

  # Stone radius in logical units (matches frontend STONE_RADIUS constant)
  @stone_radius 14.5

  @impl true
  def handle_action(:place_stone, args, phase_state, game_state) do
    %{player_id: player_id, stone_index: stone_index, position: position} = args

    with {:ok, player} <- find_player(game_state, player_id),
         :ok <- validate_stone_index(stone_index, game_state.stones_per_team),
         :ok <- validate_position(position),
         :ok <- validate_not_in_banned_zone(position, player.color, game_state) do
      color = player.color

      stones =
        Map.update!(game_state.stones, color, fn current_stones ->
          current_stones = current_stones || []

          if stone_index < length(current_stones) do
            List.replace_at(current_stones, stone_index, position)
          else
            current_stones ++ [position]
          end
        end)

      {:ok, phase_state, %{game_state | stones: stones}}
    end
  end

  @impl true
  def handle_action(:confirm_placement, args, phase_state, game_state) do
    %{player_id: player_id} = args

    with {:ok, player} <- find_player(game_state, player_id),
         :ok <- validate_all_stones_placed(game_state, player.color) do
      player_ready = Map.put(phase_state.player_ready, player_id, true)
      Logger.info("Player #{player_id} confirmed placement")
      {:ok, %{phase_state | player_ready: player_ready}, game_state}
    end
  end

  @impl true
  def handle_action(:cancel_placement, args, phase_state, game_state) do
    %{player_id: player_id} = args

    with {:ok, _player} <- find_player(game_state, player_id) do
      player_ready = Map.put(phase_state.player_ready, player_id, false)
      Logger.info("Player #{player_id} canceled placement")
      {:ok, %{phase_state | player_ready: player_ready}, game_state}
    end
  end

  @impl true
  def check_completion(phase_state, _game_state) do
    all_ready = Enum.all?(phase_state.player_ready, fn {_id, ready} -> ready end)

    if all_ready do
      {:complete, :all_ready}
    else
      :continue
    end
  end

  @impl true
  def client_view(phase_state, game_state, player_id) do
    base_view = Map.from_struct(game_state)

    view =
      if player_id do
        # Hide opponent's stones during blind pick
        case find_player(game_state, player_id) do
          {:ok, player} ->
            opponent_color = if player.color == :red, do: :yellow, else: :red
            stones = Map.put(base_view.stones, opponent_color, [])
            base_view
            |> Map.put(:stones, stones)

          _ ->
            base_view
        end
      else
        base_view
      end

    # Add phase-specific data
    # Include banned_zones so frontend can render them
    Map.merge(view, %{
      phase: :placement,
      player_ready: phase_state.player_ready,
      banned_zones: game_state.banned_zones
    })
  end

  # Private helpers

  defp find_player(game_state, player_id) do
    case Enum.find(game_state.players, fn p -> p.id == player_id end) do
      nil -> {:error, :player_not_found}
      player -> {:ok, player}
    end
  end

  defp validate_stone_index(index, max_stones) do
    if index >= 0 and index < max_stones do
      :ok
    else
      {:error, :invalid_placement}
    end
  end

  defp validate_position(%{"x" => x, "y" => y}) when is_number(x) and is_number(y) do
    if x >= 0 and x <= 500 and y >= 0 and y <= 1000 do
      :ok
    else
      {:error, :invalid_placement}
    end
  end

  defp validate_position(_), do: {:error, :invalid_placement}

  defp validate_not_in_banned_zone(%{"x" => x, "y" => y}, color, game_state) do
    banned_zone = get_in(game_state, [Access.key(:banned_zones), color])

    case banned_zone do
      nil ->
        # No banned zone for this player
        :ok

      %{x: ban_x, y: ban_y, radius: ban_radius} ->
        # Check if stone overlaps with banned zone
        # Stone overlaps if distance between centers < stone_radius + ban_radius
        distance = :math.sqrt(:math.pow(x - ban_x, 2) + :math.pow(y - ban_y, 2))

        if distance < @stone_radius + ban_radius do
          {:error, :placement_in_banned_zone}
        else
          :ok
        end

      _ ->
        :ok
    end
  end

  defp validate_all_stones_placed(game_state, color) do
    placed_stones = game_state.stones[color] || []

    if length(placed_stones) >= game_state.stones_per_team do
      :ok
    else
      {:error, :not_all_stones_placed}
    end
  end
end
