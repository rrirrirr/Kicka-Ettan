defmodule KickaEttan.Repo do
  use Ecto.Repo,
    otp_app: :kicka_ettan,
    adapter: Ecto.Adapters.Postgres
end
