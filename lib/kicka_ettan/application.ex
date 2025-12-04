defmodule KickaEttan.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    # Attach Sentry logger handler for crashed processes
    :logger.add_handler(:sentry_handler, Sentry.LoggerHandler, %{
      config: %{metadata: [:file, :line]}
    })
    
    # Attach our Telemetry logger
    KickaEttanWeb.TelemetryLogger.setup()

    children = [
      # Start the Telemetry supervisor
      KickaEttanWeb.Telemetry,
      # Start the Ecto repository
      KickaEttan.Repo,
      # Start the PubSub system
      {Phoenix.PubSub, name: KickaEttan.PubSub},
      # Start the Endpoint (http/https)
      KickaEttanWeb.Endpoint,
      # Start game registry
      {Registry, keys: :unique, name: KickaEttan.GameRegistry},
      # Start the game supervisor
      KickaEttan.Games.GameSupervisor,
      # Start the game janitor process
      KickaEttan.Games.Janitor
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: KickaEttan.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    KickaEttanWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
