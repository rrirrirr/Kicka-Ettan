# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :kicka_ettan,
  ecto_repos: [KickaEttan.Repo],
  generators: [timestamp_type: :utc_datetime]

# Configures the endpoint
config :kicka_ettan, KickaEttanWeb.Endpoint,
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: KickaEttanWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: KickaEttan.PubSub,
  live_view: [signing_salt: "WtlDGqap"]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Rate Limiting (Hammer)
config :hammer,
  backend: {Hammer.Backend.ETS, [expiry_ms: 60_000 * 60, cleanup_interval_ms: 60_000 * 10]}

config :logger_json, :backend,
  metadata: [:request_id, :game_id, :player_id],
  json_encoder: Jason,
  formatter: LoggerJSON.Formatters.BasicLogger

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# PostHog Analytics
# PostHog automatically enriches events with GeoIP data (country, city, etc.)
config :posthog,
  api_url: "https://us.i.posthog.com",
  api_key: nil  # Set via POSTHOG_API_KEY environment variable in runtime.exs

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
