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

  # Sheet boundary constants (matching frontend constants)
  @sheet_width 475
  @view_top_offset 640  # Same as HOG_LINE_OFFSET
  @hog_line_offset 640
  @hog_line_width 10
  @back_line_offset 183

  @impl true
  def handle_action(:place_stone, args, phase_state, game_state) do
    %{player_id: player_id, stone_index: stone_index, position: position} = args

    with {:ok, player} <- find_player(game_state, player_id),
         :ok <- validate_stone_index(stone_index, game_state.stones_per_team),
         :ok <- validate_position(position),
         {:ok, adjusted_position} <- adjust_for_banned_zone(position, player.color, game_state) do
      color = player.color

      stones =
        Map.update!(game_state.stones, color, fn current_stones ->
          current_stones = current_stones || []

          if stone_index < length(current_stones) do
            List.replace_at(current_stones, stone_index, adjusted_position)
          else
            current_stones ++ [adjusted_position]
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

  # Adjusts stone position if overlapping with ban zone:
  # - If fully inside ban zone: returns error (stone should be reset to bar)
  # - If partially overlapping and valid position: pushes stone out to just touch ban zone edge
  # - If partially overlapping but pushed out of bounds: returns error
  # - If not overlapping: returns original position
  defp adjust_for_banned_zone(%{"x" => x, "y" => y} = position, color, game_state) do
    banned_zone = get_in(game_state, [Access.key(:banned_zones), color])

    case banned_zone do
      nil ->
        # No banned zone for this player
        {:ok, position}

      %{x: ban_x, y: ban_y, radius: ban_radius} ->
        dx = x - ban_x
        dy = y - ban_y
        distance = :math.sqrt(dx * dx + dy * dy)
        min_distance = @stone_radius + ban_radius

        cond do
          # Stone is fully inside ban zone (no part is outside)
          distance + @stone_radius <= ban_radius ->
            {:error, :placement_in_banned_zone}

          # Stone partially overlaps - push it out
          distance < min_distance ->
            # Calculate direction from ban center to stone center
            {nx, ny} = if distance == 0 do
              # Stone exactly at center - push upward
              {0, -1}
            else
              {dx / distance, dy / distance}
            end

            # Push stone so it just touches the ban zone edge
            new_x = ban_x + nx * min_distance
            new_y = ban_y + ny * min_distance
            new_position = %{"x" => new_x, "y" => new_y}

            # Check if pushed position is within valid bounds
            if is_position_within_bounds(new_x, new_y) do
              {:ok, new_position}
            else
              # Pushed position is out of bounds - reject placement
              {:error, :placement_in_banned_zone}
            end

          # No overlap
          true ->
            {:ok, position}
        end

      _ ->
        {:ok, position}
    end
  end

  # Check if a position is within valid placement bounds
  defp is_position_within_bounds(x, y) do
    hog_line_y = @view_top_offset - @hog_line_offset
    hog_line_bottom_edge = hog_line_y + @hog_line_width / 2
    back_line_y = @view_top_offset + @back_line_offset

    min_x = @stone_radius
    max_x = @sheet_width - @stone_radius
    min_y = hog_line_bottom_edge + @stone_radius
    max_y = back_line_y + @stone_radius

    x >= min_x and x <= max_x and y >= min_y and y <= max_y
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
