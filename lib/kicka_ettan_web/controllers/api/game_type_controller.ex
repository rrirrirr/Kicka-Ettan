defmodule KickaEttanWeb.API.GameTypeController do
  @moduledoc """
  API controller for retrieving available game types.
  """
  use KickaEttanWeb, :controller
  alias KickaEttan.Games.GameType

  @doc """
  Returns all visible game types (playable + coming_soon, not hidden).
  """
  def index(conn, _params) do
    game_types =
      GameType.list_visible_types()
      |> Enum.map(&GameType.to_json/1)

    json(conn, %{game_types: game_types})
  end
end
