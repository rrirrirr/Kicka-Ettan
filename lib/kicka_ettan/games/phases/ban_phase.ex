defmodule KickaEttan.Games.Phases.BanPhase do
  @moduledoc """
  Ban Phase: Players place a ban zone that restricts opponent placement in the next phase.

  In this phase, each player can place a circular banned zone on the sheet.
  In the subsequent placement phase, the opponent will see these zones as red areas
  and cannot place their stones within them.

  Actions handled:
  - :place_ban - Place a ban zone at a position
  - :confirm_ban - Confirm the ban zone placement
  - :cancel_ban - Revoke confirmation and allow repositioning
  """
  @behaviour KickaEttan.Games.Phase

  require Logger

  @impl true
  def init(game_state) do
    # Initialize player readiness and ban positions
    player_ready =
      game_state.players
      |> Enum.map(fn p -> {p.id, false} end)
      |> Map.new()

    # Each player gets one ban zone (stored by player color)
    ban_positions = %{red: nil, yellow: nil}

    {:ok, %{player_ready: player_ready, ban_positions: ban_positions}}
  end

  @impl true
  def handles_actions do
    [:place_ban, :confirm_ban, :cancel_ban]
  end

  @impl true
  def handle_action(:place_ban, args, phase_state, game_state) do
    %{player_id: player_id, position: position} = args

    with {:ok, player} <- find_player(game_state, player_id),
         :ok <- validate_position(position) do
      color = player.color

      # Get ban circle radius from settings (default 50 if not set)
      ban_radius = get_ban_radius(game_state)

      ban_zone = %{
        x: position["x"],
        y: position["y"],
        radius: ban_radius
      }

      ban_positions = Map.put(phase_state.ban_positions, color, ban_zone)

      # Reset ready state when placing a new ban
      player_ready = Map.put(phase_state.player_ready, player_id, false)

      {:ok, %{phase_state | ban_positions: ban_positions, player_ready: player_ready}, game_state}
    end
  end

  @impl true
  def handle_action(:confirm_ban, args, phase_state, game_state) do
    %{player_id: player_id} = args

    with {:ok, player} <- find_player(game_state, player_id),
         :ok <- validate_ban_placed(phase_state, player.color) do
      player_ready = Map.put(phase_state.player_ready, player_id, true)
      Logger.info("Player #{player_id} confirmed ban placement")
      {:ok, %{phase_state | player_ready: player_ready}, game_state}
    end
  end

  @impl true
  def handle_action(:cancel_ban, args, phase_state, game_state) do
    %{player_id: player_id} = args

    with {:ok, _player} <- find_player(game_state, player_id) do
      player_ready = Map.put(phase_state.player_ready, player_id, false)
      Logger.info("Player #{player_id} canceled ban confirmation")
      {:ok, %{phase_state | player_ready: player_ready}, game_state}
    end
  end

  @impl true
  def check_completion(phase_state, _game_state) do
    all_ready = Enum.all?(phase_state.player_ready, fn {_id, ready} -> ready end)

    if all_ready do
      # Store ban positions in game_state for the next phase
      # The banned zones are swapped: red's ban affects yellow, yellow's ban affects red
      banned_zones = %{
        red: phase_state.ban_positions.yellow,  # Yellow's ban restricts red
        yellow: phase_state.ban_positions.red   # Red's ban restricts yellow
      }

      {:complete, %{banned_zones: banned_zones}}
    else
      :continue
    end
  end

  @impl true
  def client_view(phase_state, game_state, player_id) do
    base_view = Map.from_struct(game_state)
    ban_radius = get_ban_radius(game_state)

    view =
      if player_id do
        case find_player(game_state, player_id) do
          {:ok, player} ->
            # Player can see their own ban but not opponent's during placement
            my_color = player.color
            my_ban = phase_state.ban_positions[my_color]

            # Show only player's own ban zone during placement
            ban_view = %{my_color => my_ban}

            Map.put(base_view, :ban_positions, ban_view)

          _ ->
            base_view
        end
      else
        # Spectators see nothing until confirmed
        Map.put(base_view, :ban_positions, %{})
      end

    # Add phase-specific data
    Map.merge(view, %{
      phase: :ban,
      player_ready: phase_state.player_ready,
      ban_radius: ban_radius
    })
  end

  # Private helpers

  defp find_player(game_state, player_id) do
    case Enum.find(game_state.players, fn p -> p.id == player_id end) do
      nil -> {:error, :player_not_found}
      player -> {:ok, player}
    end
  end

  defp validate_position(%{"x" => x, "y" => y}) when is_number(x) and is_number(y) do
    if x >= 0 and x <= 500 and y >= 0 and y <= 1000 do
      :ok
    else
      {:error, :invalid_position}
    end
  end

  defp validate_position(_), do: {:error, :invalid_position}

  defp validate_ban_placed(phase_state, color) do
    if phase_state.ban_positions[color] != nil do
      :ok
    else
      {:error, :ban_not_placed}
    end
  end

  defp get_ban_radius(game_state) do
    # Get from settings or use default
    case game_state do
      %{settings: %{ban_circle_radius: radius}} when is_number(radius) -> radius
      _ -> 50  # Default ban radius
    end
  end
end
