defmodule KickaEttan.Games.Types.BanPick do
  @moduledoc """
  Ban Pick Game Type

  A strategic curling variant with a ban phase:
  - Players first place a ban zone to restrict opponent placement
  - Then players place stones simultaneously (blind pick)
  - Stones are revealed and collisions resolved
  - Repeat for configured number of rounds
  """
  @behaviour KickaEttan.Games.GameType

  alias KickaEttan.Games.Phases.{BanPhase, BlindPickPhase, CombinedPhase}

  @impl true
  def definition do
    %{
      id: :ban_pick,
      name: "Ban Pick",
      short_description: "Ban a zone, then place stones blind",
      long_description: """
      In Ban Pick mode, each round starts with a strategic ban phase.
      Each player places a circular zone where their opponent cannot
      place stones. Then both players place their stones simultaneously
      without seeing the opponent's placements (like Blind Pick).
      Once confirmed, all stones are revealed and collisions resolved.
      The ban zones add a layer of strategic depth!
      """,
      phases: [
        BanPhase,
        BlindPickPhase,
        CombinedPhase
      ],
      loop_type: {:rounds, 3},
      settings_schema: %{
        stones_per_team: %{
          type: :integer,
          label: "Stones per Team",
          description: "Number of stones each team can place per round",
          min: 1,
          max: 8,
          default: 3
        },
        total_rounds: %{
          type: :integer,
          label: "Number of Rounds",
          description: "How many rounds to play",
          min: 0,
          max: 10,
          default: 0
        },
        ban_circle_radius: %{
          type: :integer,
          label: "Ban Circle Size",
          description: "Radius of the banned zone circle (in cm)",
          min: 20,
          max: 100,
          default: 50
        }
      },
      default_settings: %{
        stones_per_team: 3,
        total_rounds: 0,
        ban_circle_radius: 50
      }
    }
  end

  @impl true
  def apply_settings(user_settings) do
    defaults = definition().default_settings
    schema = definition().settings_schema

    settings =
      Enum.reduce(schema, defaults, fn {key, spec}, acc ->
        if Map.has_key?(user_settings, key) do
          value = user_settings[key]

          cond do
            spec.type == :integer and not is_integer(value) ->
              acc

            spec[:min] && value < spec.min ->
              Map.put(acc, key, spec.min)

            spec[:max] && value > spec.max ->
              Map.put(acc, key, spec.max)

            true ->
              Map.put(acc, key, value)
          end
        else
          acc
        end
      end)

    {:ok, settings}
  end

  @impl true
  def init_game(_settings) do
    {:ok, %{}}
  end
end
