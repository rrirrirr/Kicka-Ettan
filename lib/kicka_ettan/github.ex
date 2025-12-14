
defmodule KickaEttan.GitHub do
  @moduledoc """
  Client for interacting with the GitHub API.
  """

  require Logger

  @api_base "https://api.github.com"

  def trigger_deploy(env) when env in ["prod", "test"] do
    workflow_id =
      case env do
        "prod" -> "deploy.yml"
        "test" -> "deploy_test.yml"
      end

    branch =
      case env do
        "prod" -> "main"
        "test" -> "test"
      end

    url = "/repos/#{repo()}/actions/workflows/#{workflow_id}/dispatches"
    body = %{ref: branch}

    case post(url, body) do
      {:ok, _body} ->
        Logger.info("Triggered #{env} deployment on branch #{branch}")
        {:ok, :triggered}

      {:error, reason} ->
        Logger.error("Failed to trigger #{env} deployment: #{inspect(reason)}")
        {:error, reason}
    end
  end

  def get_recent_runs(env) when env in ["prod", "test"] do
    workflow_id =
      case env do
        "prod" -> "deploy.yml"
        "test" -> "deploy_test.yml"
      end

    url = "/repos/#{repo()}/actions/workflows/#{workflow_id}/runs?per_page=5"

    case get(url) do
      {:ok, body} ->
        runs =
          body
          |> Map.get("workflow_runs", [])
          |> Enum.map(&map_run/1)

        {:ok, runs}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp map_run(run) do
    %{
      id: run["id"],
      status: run["status"],
      conclusion: run["conclusion"],
      created_at: run["created_at"],
      html_url: run["html_url"],
      actor: get_in(run, ["actor", "login"])
    }
  end

  defp get(path) do
    url = @api_base <> path

    headers = [
      {"Authorization", "Bearer #{token()}"},
      {"Accept", "application/vnd.github.v3+json"},
      {"User-Agent", "KickaEttan"}
    ]

    case Req.get(url, headers: headers) do
      {:ok, %{status: 200, body: body}} -> {:ok, body}
      {:ok, %{status: status, body: body}} -> {:error, "GitHub API 200 expected, got #{status}: #{inspect(body)}"}
      {:error, reason} -> {:error, reason}
    end
  end

  defp post(path, body) do
    url = @api_base <> path

    headers = [
      {"Authorization", "Bearer #{token()}"},
      {"Accept", "application/vnd.github.v3+json"},
      {"User-Agent", "KickaEttan"}
    ]

    case Req.post(url, headers: headers, json: body) do
      {:ok, %{status: 204}} -> {:ok, nil}
      {:ok, %{status: status, body: body}} -> {:error, "GitHub API 204 expected, got #{status}: #{inspect(body)}"}
      {:error, reason} -> {:error, reason}
    end
  end

  defp token, do: Application.get_env(:kicka_ettan, :github)[:token]
  defp repo, do: Application.get_env(:kicka_ettan, :github)[:repo]
end
