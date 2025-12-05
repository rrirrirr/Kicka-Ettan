defmodule KickaEttanWeb.API.HealthControllerTest do
  use KickaEttanWeb.ConnCase

  describe "index/2" do
    test "returns 200 with status ok when DB connected", %{conn: conn} do
      conn = get(conn, ~p"/api/health")
      
      response = json_response(conn, 200)
      
      assert response["status"] == "ok"
      assert response["database"] == "connected"
    end
  end
end
