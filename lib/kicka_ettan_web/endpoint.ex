defmodule KickaEttanWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :kicka_ettan

  # The session will be stored in the cookie and signed,
  # this means its contents can be read but not tampered with.
  # Set :encryption_salt if you would also like to encrypt it.
  @session_options [
    store: :cookie,
    key: "_kicka_ettan_key",
    signing_salt: "session_signing_salt",
    same_site: "Lax"
  ]

 socket "/socket", KickaEttanWeb.UserSocket,
    websocket: true,
    longpoll: false

  # Serve at "/" the static files from "priv/static" directory.
  #
  # You should set gzip to true if you are running phx.digest
  # when deploying your static files in production.
  plug Plug.Static,
    at: "/",
    from: :kicka_ettan,
    gzip: false,
    only: KickaEttanWeb.static_paths()

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    plug Phoenix.CodeReloader
    plug Phoenix.Ecto.CheckRepoStatus, otp_app: :kicka_ettan
  end

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]
  
  use Sentry.PlugCapture
  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head
  plug Plug.Session, @session_options

  plug Corsica,
    origins: Application.get_env(:kicka_ettan, :cors_origins, [~r{^http://localhost:\d+$}]),
    allow_headers: :all,
    allow_credentials: true

  plug Sentry.PlugContext
  plug KickaEttanWeb.Router
end
