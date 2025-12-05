defmodule KickaEttanWeb.UserSocketTest do
  use KickaEttanWeb.ChannelCase

  alias KickaEttanWeb.UserSocket

  describe "connect/3" do
    test "accepts connection with player_id param" do
      {:ok, socket} = connect(UserSocket, %{"player_id" => "test_player_123"})
      
      assert socket.assigns.player_id == "test_player_123"
    end

    test "generates player_id when not provided" do
      {:ok, socket} = connect(UserSocket, %{})
      
      assert is_binary(socket.assigns.player_id)
      assert String.length(socket.assigns.player_id) > 0
    end

    test "assigns player_id to socket" do
      {:ok, socket} = connect(UserSocket, %{"player_id" => "my_player"})
      
      assert Map.has_key?(socket.assigns, :player_id)
      assert socket.assigns.player_id == "my_player"
    end
  end

  describe "id/1" do
    test "returns correct socket ID format" do
      {:ok, socket} = connect(UserSocket, %{"player_id" => "test_player"})
      
      assert UserSocket.id(socket) == "player_socket:test_player"
    end
  end
end
