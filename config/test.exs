import Config

# Configure your database
#
# The MIX_TEST_PARTITION environment variable can be used
# to provide built-in test partitioning in CI environment.
# Run `mix help test` for more information.
config :kicka_ettan, KickaEttan.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "kicka_ettan_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: if(System.get_env("E2E"), do: DBConnection.ConnectionPool, else: Ecto.Adapters.SQL.Sandbox),
  pool_size: System.schedulers_online() * 2

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :kicka_ettan, KickaEttanWeb.Endpoint,
  url: [host: "localhost"],
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "Gp9O4DY68mgZD/M0O3NSpke3cuT+FTi1TV1nTzIY1r7pP64Efx9y8gTZAAp4DirX",
  signing_salt: "test_signing_salt",
  check_origin: false,
  server: !!System.get_env("E2E")

# Print only warnings and errors during test
config :logger, level: :warning

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

# Disable PostHog analytics in tests (test_mode drops all events)
config :posthog,
  api_key: "phc_disabled_in_test",
  test_mode: true
