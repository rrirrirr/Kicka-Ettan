defmodule KickaEttan.Games.GameSupervisor do
  @moduledoc """
  Supervisor for game server processes.
  """
  use DynamicSupervisor
  require Logger
  alias KickaEttan.Games.GameServer

  def start_link(arg) do
    DynamicSupervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  @impl true
  def init(_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  @doc """
  Create a new game with the given options.
  """
  def create_game(options) do
    game_id = options[:game_id] || generate_game_id()
    
    child_spec = %{
      id: GameServer,
      start: {GameServer, :start_link, [{game_id, options}]},
      restart: :temporary
    }
    
    case DynamicSupervisor.start_child(__MODULE__, child_spec) do
      {:ok, _pid} -> 
        Logger.info("Created new game: #{game_id}")
        {:ok, game_id}
      {:error, {:already_started, _pid}} ->
        Logger.warning("Attempted to create a game with an existing ID: #{game_id}")
        {:error, :already_exists}
      {:error, reason} = error ->
        Logger.error("Failed to create game: #{inspect(reason)}")
        error
    end
  end

  @doc """
  Terminate a game server process.
  """
  def terminate_game(game_id) do
    case Registry.lookup(KickaEttan.GameRegistry, game_id) do
      [{pid, _}] -> 
        Logger.info("Terminating game: #{game_id}")
        DynamicSupervisor.terminate_child(__MODULE__, pid)
      [] -> 
        Logger.warning("Attempted to terminate non-existent game: #{game_id}")
        {:error, :not_found}
    end
  end

  @doc """
  List all active games.
  """
  def list_games do
    DynamicSupervisor.which_children(__MODULE__)
    |> Enum.map(fn {_, pid, _, _} -> pid end)
    |> Enum.map(fn pid ->
      case Registry.keys(KickaEttan.GameRegistry, pid) do
        [game_id] -> game_id
        _ -> nil
      end
    end)
    |> Enum.reject(&is_nil/1)
  end

  defp generate_game_id do
    :crypto.strong_rand_bytes(8) |> Base.url_encode64(padding: false) |> binary_part(0, 8)
  end
end
