defmodule KickaEttan.Analytics.PosthogClient do
  @moduledoc """
  PostHog analytics client for tracking game events and user behavior.

  This module provides functions to send events to PostHog for analytics tracking.
  Events are sent asynchronously to avoid blocking game operations.
  """

  require Logger

  @doc """
  Captures a custom event in PostHog.

  ## Parameters
    - event_name: String name of the event (e.g., "game.created")
    - distinct_id: Unique identifier for the user/session (e.g., player_id or game_id)
    - properties: Map of additional event properties (optional)

  ## Examples
      iex> PosthogClient.capture("game.created", "game-123", %{game_type: "standard"})
      :ok
  """
  def capture(event_name, distinct_id, properties \\ %{}) do
    # Only send events if PostHog is configured
    case Application.get_env(:posthog, :api_key) do
      nil ->
        Logger.debug("PostHog not configured, skipping event: #{event_name}")
        :ok

      _api_key ->
        # Send event asynchronously to avoid blocking
        Task.start(fn ->
          try do
            Posthog.capture(event_name, %{
              distinct_id: distinct_id,
              properties: properties
            })
          rescue
            error ->
              Logger.warning("Failed to send PostHog event: #{inspect(error)}")
          end
        end)

        :ok
    end
  end

  @doc """
  Identifies a user/player in PostHog with additional properties.

  ## Parameters
    - distinct_id: Unique identifier for the user (e.g., player_id)
    - properties: Map of user properties (e.g., %{country: "SE", color: "yellow"})
  """
  def identify(distinct_id, properties \\ %{}) do
    case Application.get_env(:posthog, :api_key) do
      nil ->
        Logger.debug("PostHog not configured, skipping identify")
        :ok

      _api_key ->
        Task.start(fn ->
          try do
            Posthog.capture("$identify", %{
              distinct_id: distinct_id,
              properties: properties,
              "$set": properties
            })
          rescue
            error ->
              Logger.warning("Failed to identify user in PostHog: #{inspect(error)}")
          end
        end)

        :ok
    end
  end

  @doc """
  Captures a game creation event.

  PostHog automatically enriches events with GeoIP data (country, city, region)
  based on the IP address.
  """
  def track_game_created(game_id, game_type) do
    capture("game.created", game_id, %{
      game_type: game_type,
      game_id: game_id
    })
  end

  @doc """
  Captures a player join event.

  PostHog automatically enriches events with GeoIP data (country, city, region)
  based on the IP address.
  """
  def track_player_joined(game_id, player_id, color) do
    capture("game.player_joined", player_id, %{
      game_id: game_id,
      player_id: player_id,
      color: color
    })
  end

  @doc """
  Captures a round started event.
  """
  def track_round_started(game_id, round_number) do
    capture("game.round_started", game_id, %{
      game_id: game_id,
      round_number: round_number
    })
  end

  @doc """
  Captures a round completed event.
  """
  def track_round_completed(game_id, round_number) do
    capture("game.round_completed", game_id, %{
      game_id: game_id,
      round_number: round_number
    })
  end

  @doc """
  Captures a stone placement event.
  """
  def track_stone_placed(game_id, player_id, round_number) do
    capture("game.stone_placed", player_id, %{
      game_id: game_id,
      player_id: player_id,
      round_number: round_number
    })
  end

  @doc """
  Captures a ban zone placement event.
  """
  def track_ban_placed(game_id, player_id, round_number) do
    capture("game.ban_placed", player_id, %{
      game_id: game_id,
      player_id: player_id,
      round_number: round_number
    })
  end

  @doc """
  Captures a game completed event.
  """
  def track_game_completed(game_id, total_rounds) do
    capture("game.completed", game_id, %{
      game_id: game_id,
      total_rounds: total_rounds
    })
  end
end
