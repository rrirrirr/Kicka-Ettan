defmodule KickaEttan.Games.Types.BlindPick do
  @moduledoc """
  Blind Pick Game Type
  
  The standard curling stone placement game:
  - Players place stones simultaneously without seeing opponent
  - Stones are revealed and collisions resolved
  - Repeat for configured number of rounds
  """
  @behaviour KickaEttan.Games.GameType

  alias KickaEttan.Games.Phases.{BlindPickPhase, CombinedPhase}

  @impl true
  def definition do
    %{
      id: :blind_pick,
      name: "Blind Pick",
      short_description: "Place stones without seeing your opponent's moves",
      long_description: """
      In Blind Pick mode, both players place their stones simultaneously 
      without being able to see where their opponent places theirs. 
      Once both players confirm their placements, all stones are revealed 
      and any collisions are resolved. This creates exciting moments of 
      surprise and strategic guessing!
      """,
      phases: [
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
        }
      },
      default_settings: %{
        stones_per_team: 3,
        total_rounds: 0
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
