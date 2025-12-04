defmodule KickaEttanWeb.API.HealthController do
  use KickaEttanWeb, :controller
  alias KickaEttan.Repo

  @doc """
  Health check endpoint.
  Returns 200 OK if the database is accessible.
  Returns 503 Service Unavailable if the database is down.
  """
  def index(conn, _params) do
    case Ecto.Adapters.SQL.query(Repo, "SELECT 1") do
      {:ok, _} ->
        conn
        |> put_status(:ok)
        |> json(%{status: "ok", database: "connected"})

      {:error, reason} ->
        conn
        |> put_status(:service_unavailable)
        |> json(%{status: "error", database: "disconnected", reason: inspect(reason)})
    end
  end
end
