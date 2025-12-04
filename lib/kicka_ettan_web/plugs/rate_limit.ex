defmodule KickaEttanWeb.Plugs.RateLimit do
  import Plug.Conn
  require Logger

  def init(opts), do: opts

  def call(conn, _opts) do
    case check_rate_limit(conn) do
      {:allow, _count} ->
        conn

      {:deny, _limit} ->
        conn
        |> send_resp(429, "Too Many Requests")
        |> halt()
    end
  end

  defp check_rate_limit(conn) do
    # Limit by IP address
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()
    
    # Bucket: "api_ip:<ip_address>"
    # Limit: 60 requests per minute
    Hammer.check_rate("api_ip:#{ip}", 60_000, 60)
  end
end
