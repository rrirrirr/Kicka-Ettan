defmodule KickaEttanWeb.Router do
  use KickaEttanWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
    plug KickaEttanWeb.Plugs.RateLimit
  end

  scope "/api", KickaEttanWeb.API do
    pipe_through :api

    resources "/games", GameController, only: [:create, :show]
    post "/games/:id/join", GameController, :join
    get "/health", HealthController, :index
    
    # Dev-only collision testing endpoint
    post "/collisions/resolve", CollisionController, :resolve
  end

  import Phoenix.LiveDashboard.Router

  pipeline :dashboard_auth do
    plug :require_dashboard_auth
  end

  scope "/" do
    pipe_through [:fetch_session, :protect_from_forgery, :dashboard_auth]
    live_dashboard "/dashboard", metrics: KickaEttanWeb.Telemetry
  end

  defp require_dashboard_auth(conn, _opts) do
    if Application.get_env(:kicka_ettan, :dev_routes) do
      conn
    else
      auth_conf = Application.get_env(:kicka_ettan, :dashboard_auth)

      Plug.BasicAuth.basic_auth(conn,
        username: auth_conf[:username],
        password: auth_conf[:password]
      )
    end
  end

  # For serving the React app in production
  scope "/", KickaEttanWeb do
    get "/", PageController, :index
    get "/*path", PageController, :index
  end
end
