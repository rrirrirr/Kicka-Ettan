defmodule KickaEttan.Games.GameType do
  @moduledoc """
  Behaviour for game type definitions.
  
  A GameType is a configuration that defines:
  - Metadata (name, descriptions)
  - Visibility (playable, coming_soon, hidden)
  - Configurable settings schema
  - Phase flow (sequence of phases)
  - Loop behavior (how many rounds, infinite, etc.)
  """

  @type phase_config :: {module(), keyword()} | module()
  @type loop_type :: :infinite | {:rounds, pos_integer()} | {:until, atom()}
  @type visibility :: :playable | :coming_soon | :hidden

  @doc """
  Returns the game type definition including metadata and flow.
  """
  @callback definition() :: %{
              required(:id) => atom(),
              required(:name) => String.t(),
              required(:visibility) => visibility(),
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
      KickaEttan.Games.Types.BanPick,
      KickaEttan.Games.Types.TurnDoubleBanOpenPick,
      KickaEttan.Games.Types.TurnBasedTest
    ]
  end

  @doc """
  Returns game types that should be visible to users (playable + coming_soon).
  """
  def list_visible_types do
    list_types()
    |> Enum.filter(fn mod ->
      mod.definition().visibility != :hidden
    end)
  end

  @doc """
  Returns only playable game types.
  """
  def list_playable_types do
    list_types()
    |> Enum.filter(fn mod ->
      mod.definition().visibility == :playable
    end)
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

  @doc """
  Converts a game type module's definition to a JSON-serializable map.
  """
  def to_json(module) do
    definition = module.definition()
    
    %{
      id: Atom.to_string(definition.id),
      name: definition.name,
      visibility: Atom.to_string(definition.visibility),
      shortDescription: definition.short_description,
      longDescription: definition.long_description,
      settingsSchema: convert_settings_schema(definition[:settings_schema] || %{}),
      defaultSettings: convert_default_settings(definition[:default_settings] || %{})
    }
  end

  defp convert_settings_schema(schema) do
    schema
    |> Enum.map(fn {key, spec} ->
      {Atom.to_string(key), convert_setting_spec(spec)}
    end)
    |> Map.new()
  end

  defp convert_setting_spec(spec) do
    spec
    |> Enum.map(fn
      {:type, v} when is_atom(v) -> {"type", Atom.to_string(v)}
      {k, v} when is_atom(k) -> {atom_to_camel(k), v}
      {k, v} -> {k, v}
    end)
    |> Map.new()
  end

  defp convert_default_settings(settings) do
    settings
    |> Enum.map(fn {k, v} -> {Atom.to_string(k), v} end)
    |> Map.new()
  end

  defp atom_to_camel(atom) do
    atom
    |> Atom.to_string()
    |> String.split("_")
    |> Enum.with_index()
    |> Enum.map(fn {part, idx} ->
      if idx == 0, do: part, else: String.capitalize(part)
    end)
    |> Enum.join()
  end
end
