defmodule KickaEttanWeb.API.CollisionController do
  @moduledoc """
  Dev-only controller for testing collision resolution.
  """
  use KickaEttanWeb, :controller

  @doc """
  Resolve collisions for a given set of stones and ban zones.
  This endpoint is only available in dev mode.
  """
  def resolve(conn, params) do
    unless Application.get_env(:kicka_ettan, :dev_routes) do
      conn
      |> put_status(:not_found)
      |> json(%{error: "Not found"})
    else
      stones = parse_stones(params["stones"])
      banned_zones = parse_banned_zones(params["banned_zones"])
      
      resolved = KickaEttan.Games.Collision.resolve_stone_collisions(stones, banned_zones)
      
      conn |> json(%{resolved_stones: resolved})
    end
  end

  defp parse_stones(%{"red" => red, "yellow" => yellow}) do
    %{
      red: Enum.map(red || [], &parse_position/1),
      yellow: Enum.map(yellow || [], &parse_position/1)
    }
  end
  defp parse_stones(_), do: %{red: [], yellow: []}

  defp parse_position(%{"x" => x, "y" => y}) do
    %{"x" => parse_float(x), "y" => parse_float(y)}
  end
  defp parse_position(_), do: %{"x" => 0.0, "y" => 0.0}

  defp parse_float(val) when is_float(val), do: val
  defp parse_float(val) when is_integer(val), do: val * 1.0
  defp parse_float(val) when is_binary(val) do
    case Float.parse(val) do
      {f, _} -> f
      :error -> 0.0
    end
  end
  defp parse_float(_), do: 0.0

  defp parse_banned_zones(nil), do: %{}
  defp parse_banned_zones(zones) when is_map(zones) do
    Enum.reduce(zones, %{}, fn {color, zone}, acc ->
      color_atom = String.to_existing_atom(color)
      parsed_zone = %{
        x: parse_float(zone["x"]),
        y: parse_float(zone["y"]),
        radius: parse_float(zone["radius"])
      }
      Map.put(acc, color_atom, parsed_zone)
    end)
  rescue
    _ -> %{}
  end
  defp parse_banned_zones(_), do: %{}


end
