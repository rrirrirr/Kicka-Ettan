defmodule KickaEttanWeb.Plugs.RateLimitTest do
  use KickaEttanWeb.ConnCase

  alias KickaEttanWeb.Plugs.RateLimit

  describe "call/2" do
    test "allows requests under rate limit", %{conn: conn} do
      # First request should pass
      conn = RateLimit.call(conn, [])
      
      refute conn.halted
    end

    test "returns 429 when rate limit exceeded", %{conn: _conn} do
      # Make 61 rapid requests (limit is 60 per minute)
      conn_results = Enum.map(1..62, fn _ ->
        # Need a fresh conn for each request
        build_conn()
        |> Map.put(:remote_ip, {127, 0, 0, 200})  # Same IP
        |> RateLimit.call([])
      end)
      
      # At least one should be rate limited
      rate_limited = Enum.filter(conn_results, & &1.halted)
      
      assert length(rate_limited) >= 1
    end

    test "rate limits by IP address", %{conn: _conn} do
      # Make requests from different IPs
      conn1 = build_conn()
        |> Map.put(:remote_ip, {192, 168, 1, 1})
        |> RateLimit.call([])
      
      conn2 = build_conn()
        |> Map.put(:remote_ip, {192, 168, 1, 2})
        |> RateLimit.call([])
      
      # Both should pass (different IPs have separate limits)
      refute conn1.halted
      refute conn2.halted
    end
  end
end
