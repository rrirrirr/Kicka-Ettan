import Config

# Do not print debug messages in production
config :logger, level: :info

# Sentry configuration - DSN is loaded from SENTRY_DSN env var in runtime.exs
config :sentry,
  environment_name: :prod,
  enable_source_code_context: true,
  root_source_code_paths: [File.cwd!()]

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.
