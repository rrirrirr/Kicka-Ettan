defmodule KickaEttanWeb.PageController do
  use KickaEttanWeb, :controller

  # This controller serves the React app for all non-API routes
  def index(conn, _params) do
    # Send the index.html file
    conn
    |> put_resp_header("content-type", "text/html; charset=utf-8")
    |> send_file(200, Application.app_dir(:kicka_ettan, "priv/static/index.html"))
  end
end
