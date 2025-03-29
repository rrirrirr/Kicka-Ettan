defmodule KickaEttanWeb.Router do
  use KickaEttanWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", KickaEttanWeb do
    pipe_through :api

   resources "/games", GameController, only: [:create, :show]
    post "/games/:id/join", GameController, :join
  end

 # For serving the React app in production
  scope "/", KickaEttanWeb do
    get "/", PageController, :index
    get "/*path", PageController, :index
  end

  # Enable LiveDashboard in development
  if Application.compile_env(:kicka_ettan, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through [:fetch_session, :protect_from_forgery]
      live_dashboard "/dashboard", metrics: KickaEttanWeb.Telemetry
    end
  end
end
