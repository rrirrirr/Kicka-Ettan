
defmodule KickaEttanWeb.Admin.DeployLive do
  use KickaEttanWeb, :live_view
  alias KickaEttan.GitHub

  def mount(_params, _session, socket) do
    if connected?(socket) do
      Process.send_after(self(), :update_runs, 1000)
    end

    {:ok, assign(socket, prod_runs: [], test_runs: [], loading: true)}
  end

  def render(assigns) do
    ~H"""
    <div class="p-8 max-w-6xl mx-auto text-white">
      <h1 class="text-3xl font-bold mb-8">Deployment Dashboard</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Production Panel -->
        <div class="bg-zinc-800 p-6 rounded-lg shadow-lg border border-red-900/50">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-red-500">Production</h2>
            <button
              phx-click="deploy"
              phx-value-env="prod"
              data-confirm="Are you sure you want to deploy to PRODUCTION?"
              class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              🚀 Deploy Prod
            </button>
          </div>

          <div class="space-y-4">
            <h3 class="text-xl font-semibold text-gray-300">Recent Runs</h3>
            <%= if @loading do %>
              <div class="animate-pulse flex space-x-4">
                <div class="flex-1 space-y-4 py-1">
                  <div class="h-4 bg-zinc-700 rounded w-3/4"></div>
                  <div class="h-4 bg-zinc-700 rounded"></div>
                </div>
              </div>
            <% else %>
              <%= for run <- @prod_runs do %>
                <.run_card run={run} />
              <% end %>
            <% end %>
          </div>
        </div>

        <!-- Test Panel -->
        <div class="bg-zinc-800 p-6 rounded-lg shadow-lg border border-blue-900/50">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-blue-500">Test Environment</h2>
            <button
              phx-click="deploy"
              phx-value-env="test"
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              🧪 Deploy Test
            </button>
          </div>

          <div class="space-y-4">
            <h3 class="text-xl font-semibold text-gray-300">Recent Runs</h3>
             <%= if @loading do %>
              <div class="animate-pulse flex space-x-4">
                <div class="flex-1 space-y-4 py-1">
                  <div class="h-4 bg-zinc-700 rounded w-3/4"></div>
                  <div class="h-4 bg-zinc-700 rounded"></div>
                </div>
              </div>
            <% else %>
              <%= for run <- @test_runs do %>
                <.run_card run={run} />
              <% end %>
            <% end %>
          </div>
        </div>
      </div>
    </div>
    """
  end

  def run_card(assigns) do
    ~H"""
    <div class="bg-zinc-900 p-4 rounded border border-zinc-700 flex justify-between items-center">
      <div>
        <div class="flex items-center gap-2">
          <span class={status_color(@run.status, @run.conclusion)}>
            <%= status_icon(@run.status, @run.conclusion) %>
          </span>
          <span class="font-mono text-sm text-gray-400">#<%= @run.id %></span>
        </div>
        <div class="text-sm text-gray-500 mt-1">
          Triggered by <span class="text-gray-300"><%= @run.actor %></span>
          <span class="mx-1">•</span>
          <%= Calendar.strftime(@run.created_at, "%b %d %H:%M") %>
        </div>
      </div>
      <a
        href={@run.html_url}
        target="_blank"
        class="text-blue-400 hover:text-blue-300 text-sm hover:underline"
      >
        View Logs &rarr;
      </a>
    </div>
    """
  end

  def handle_event("deploy", %{"env" => env}, socket) do
    case GitHub.trigger_deploy(env) do
      {:ok, :triggered} ->
        socket = put_flash(socket, :info, "Deployment triggered for #{env}!")
        Process.send_after(self(), :update_runs, 2000) # Quick follow-up update
        {:noreply, socket}

      {:error, _reason} ->
        {:noreply, put_flash(socket, :error, "Failed to trigger deployment")}
    end
  end

  def handle_info(:update_runs, socket) do
    prod_task = Task.async(fn -> GitHub.get_recent_runs("prod") end)
    test_task = Task.async(fn -> GitHub.get_recent_runs("test") end)

    {prod_res, test_res} = {Task.await(prod_task), Task.await(test_task)}

    prod_runs = case prod_res do
      {:ok, runs} -> runs
      _ -> []
    end

    test_runs = case test_res do
      {:ok, runs} -> runs
      _ -> []
    end
    
    # Schedule next update
    Process.send_after(self(), :update_runs, 5000)

    {:noreply, assign(socket, prod_runs: prod_runs, test_runs: test_runs, loading: false)}
  end

  # Helpers
  defp status_color("queued", _), do: "text-yellow-500"
  defp status_color("in_progress", _), do: "text-blue-500 animate-pulse"
  defp status_color("completed", "success"), do: "text-green-500"
  defp status_color("completed", "failure"), do: "text-red-500"
  defp status_color(_, _), do: "text-gray-500"

  defp status_icon("queued", _), do: "⏳ Queued"
  defp status_icon("in_progress", _), do: "🔄 Running"
  defp status_icon("completed", "success"), do: "✅ Success"
  defp status_icon("completed", "failure"), do: "❌ Failed"
  defp status_icon(_, _), do: "❓ Unknown"
end
