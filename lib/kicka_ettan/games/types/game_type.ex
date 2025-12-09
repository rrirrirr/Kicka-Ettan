defmodule KickaEttan.Games.GameType do
  @moduledoc """
  Behaviour for game type definitions.
  
  A GameType is a configuration that defines:
  - Metadata (name, descriptions)
  - Configurable settings schema
  - Phase flow (sequence of phases)
  - Loop behavior (how many rounds, infinite, etc.)
  """

  @type phase_config :: {module(), keyword()} | module()
  @type loop_type :: :infinite | {:rounds, pos_integer()} | {:until, atom()}

  @doc """
  Returns the game type definition including metadata and flow.
  """
  @callback definition() :: %{
              required(:id) => atom(),
              required(:name) => String.t(),
              required(:short_description) => String.t(),
              required(:long_description) => String.t(),
              required(:phases) => [phase_config()],
              required(:loop_type) => loop_type(),
              optional(:settings_schema) => map(),
              optional(:default_settings) => map()
            }

  @doc """
  Validates and applies user-provided settings.
  Returns the merged settings with defaults.
  """
  @callback apply_settings(user_settings :: map()) :: {:ok, map()} | {:error, term()}

  @doc """
  Optional initialization logic when a game of this type is created.
  """
  @callback init_game(settings :: map()) :: {:ok, map()} | {:error, term()}

  @optional_callbacks [init_game: 1]

  @doc """
  Returns a list of all available game type modules.
  """
  def list_types do
    [
      KickaEttan.Games.Types.BlindPick,
      KickaEttan.Games.Types.BanPick
    ]
  end

  @doc """
  Get a game type module by its ID.
  """
  def get_type(type_id) when is_atom(type_id) do
    Enum.find(list_types(), fn mod ->
      mod.definition().id == type_id
    end)
  end

  def get_type(type_id) when is_binary(type_id) do
    Enum.find(list_types(), fn mod ->
      Atom.to_string(mod.definition().id) == type_id
    end)
  end
end
