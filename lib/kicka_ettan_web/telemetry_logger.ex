defmodule KickaEttanWeb.TelemetryLogger do
  @moduledoc """
  Handles Telemetry events and logs them using Logger.
  """
  require Logger

  def setup do
    :telemetry.attach_many(
      "kicka-ettan-logger",
      [
        [:phoenix, :endpoint, :stop],
        [:kicka_ettan, :game, :event]
      ],
      &handle_event/4,
      nil
    )
  end

  def handle_event([:phoenix, :endpoint, :stop], measurements, metadata, _config) do
    duration_ms = System.convert_time_unit(measurements.duration, :native, :millisecond)
    
    Logger.info("Request finished",
      method: metadata.conn.method,
      path: metadata.conn.request_path,
      status: metadata.conn.status,
      duration_ms: duration_ms,
      request_id: Logger.metadata()[:request_id]
    )
  end

  def handle_event([:kicka_ettan, :game, :event], _measurements, metadata, _config) do
    Logger.info("Game Event: #{metadata.event}",
      game_id: metadata.game_id,
      player_id: metadata.player_id,
      details: metadata.details
    )
  end
end
