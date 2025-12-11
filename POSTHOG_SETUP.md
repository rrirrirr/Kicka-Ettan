# PostHog Analytics Setup Guide

This guide will help you set up PostHog Cloud analytics for tracking game events, user behavior, and visitor countries.

## Overview

The application now includes:
- **Backend tracking** (Elixir/Phoenix): Tracks game lifecycle events, player actions, and round progression
- **Frontend tracking** (React): Automatically tracks page views and can track custom events
- **Automatic GeoIP detection**: PostHog automatically enriches all events with country, city, and region data

## Prerequisites

**PostHog Cloud Account**: Sign up at [https://posthog.com/](https://posthog.com/)
- Free tier includes 1M events/month
- No credit card required to start
- **Built-in GeoIP** - No need for external databases!

## Step 1: Get Your PostHog API Key

1. Log in to your PostHog account
2. Go to Project Settings (gear icon in the sidebar)
3. Click on "Project API Key"
4. Copy your Project API Key

The API key will look something like: `phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 2: Configure Environment Variables

**IMPORTANT**: Never commit API keys to the repository! Use environment variables.

### Production Server

Add these environment variables to your production server:

```bash
# PostHog API Key (required)
export POSTHOG_API_KEY="phc_i5JP25043YWFRXIOYqxU2z0pgi1vRAZZucj2NMPjRPe"

# Frontend PostHog Config (same key for frontend tracking)
export VITE_POSTHOG_API_KEY="phc_i5JP25043YWFRXIOYqxU2z0pgi1vRAZZucj2NMPjRPe"
export VITE_POSTHOG_HOST="https://us.i.posthog.com"
```

**For DigitalOcean Droplet** (your current setup):
1. SSH into your droplet
2. Edit your environment file or systemd service file:
   ```bash
   sudo nano /etc/systemd/system/kicka_ettan.service
   ```
3. Add the environment variables in the `[Service]` section:
   ```ini
   [Service]
   Environment="POSTHOG_API_KEY=phc_i5JP25043YWFRXIOYqxU2z0pgi1vRAZZucj2NMPjRPe"
   Environment="VITE_POSTHOG_API_KEY=phc_i5JP25043YWFRXIOYqxU2z0pgi1vRAZZucj2NMPjRPe"
   ```
4. Reload and restart the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart kicka_ettan
   ```

### Local Development

Copy the example file and add your API key:

```bash
# Copy the example
cp .env.example .env

# Edit .env and add your PostHog API key
# The .env file is already in .gitignore so it won't be committed
```

Your `.env` file should contain:
```bash
POSTHOG_API_KEY=phc_i5JP25043YWFRXIOYqxU2z0pgi1vRAZZucj2NMPjRPe
VITE_POSTHOG_API_KEY=phc_i5JP25043YWFRXIOYqxU2z0pgi1vRAZZucj2NMPjRPe
```

Then source it before running the server:
```bash
source .env
iex -S mix phx.server
```

Or use `direnv` for automatic environment loading.

## Step 3: Deploy and Test

**Deploy your application** with the new changes:
```bash
git push origin main  # Triggers GitHub Actions deployment
```

**Test the integration**:
- Create a new game
- Join as a player
- Play a few rounds
- Check PostHog dashboard for events (you'll see GeoIP data automatically added!)

## Events Being Tracked

### Backend Events (via Elixir)

These events are automatically tracked when they occur:

| Event Name | When Triggered | Properties | Auto-enriched by PostHog |
|------------|----------------|------------|--------------------------|
| `game.created` | New game is created | `game_id`, `game_type` | `$geoip_country_code`, `$geoip_city_name` |
| `game.player_joined` | Player joins a game | `game_id`, `player_id`, `color` | `$geoip_country_code`, `$geoip_city_name` |
| `game.stone_placed` | Player confirms stone placement | `game_id`, `player_id`, `round_number` | `$geoip_country_code` |
| `game.ban_placed` | Player confirms ban zone | `game_id`, `player_id`, `round_number` | `$geoip_country_code` |
| `game.round_started` | New round begins | `game_id`, `round_number` | `$geoip_country_code` |
| `game.round_completed` | Round is completed | `game_id`, `round_number` | `$geoip_country_code` |
| `game.completed` | Game ends | `game_id`, `total_rounds` | `$geoip_country_code` |

**Note**: PostHog automatically enriches every event with GeoIP data including country, city, region, timezone, and more.

### Frontend Events (via React)

- **Automatic**: Page views, page leaves
- **Manual** (via `usePostHog()` hook): Custom events you can add

Example of adding custom tracking in a React component:
```tsx
import { usePostHog } from '../contexts/PostHogContext';

function MyComponent() {
  const { trackEvent } = usePostHog();

  const handleButtonClick = () => {
    trackEvent('button_clicked', {
      button_name: 'create_game',
      page: 'home'
    });
  };

  return <button onClick={handleButtonClick}>Create Game</button>;
}
```

## Viewing Your Analytics

1. Log in to PostHog
2. Navigate to **Activity** to see recent events
3. Use **Insights** to create custom dashboards:
   - Total games created
   - Players by country
   - Average rounds per game
   - Stone placement frequency
   - Player retention

### Example Insights to Create

1. **Games Created Over Time**
   - Event: `game.created`
   - Visualization: Line chart

2. **Players by Country**
   - Event: `game.player_joined`
   - Group by: `$geoip_country_code` (auto-enriched by PostHog)
   - Visualization: World map or bar chart

3. **Average Rounds per Game**
   - Event: `game.round_completed`
   - Aggregation: Average of `round_number`

4. **Daily Active Games**
   - Event: `game.created`
   - Time range: Last 30 days
   - Interval: Daily

## Privacy Considerations

- **No PII collected**: We only track game IDs and player IDs (random UUIDs)
- **GeoIP by PostHog**: PostHog automatically adds country/city data from IP addresses (handled on their servers)
- **GDPR compliant**: PostHog can be configured for GDPR compliance in settings
- **Opt-out**: Consider adding a cookie consent banner if required in your jurisdiction

## Troubleshooting

### Events not appearing in PostHog

1. **Check API key**: Verify `POSTHOG_API_KEY` is set correctly
2. **Check logs**: Look for PostHog errors in application logs
3. **Network issues**: Ensure your server can reach `https://us.i.posthog.com`
4. **Test in dev**: Try with a test event in development

### GeoIP data not showing

PostHog automatically enriches events with GeoIP data. If you don't see it:
1. **Check event properties**: Look for `$geoip_country_code`, `$geoip_city_name` in PostHog
2. **Local IPs**: Localhost (127.0.0.1) and private IPs (192.168.x.x) won't have country data
3. **Wait a moment**: GeoIP enrichment can take a few seconds to process

### Frontend tracking not working

1. **Check VITE env vars**: Must start with `VITE_` to be accessible
2. **Rebuild frontend**: Run `bun run build` after changing env vars
3. **Check browser console**: Look for PostHog initialization messages
4. **API key format**: Should start with `phc_`

## Cost Management

PostHog Cloud free tier includes:
- **1M events/month**
- **Unlimited users**
- **1 year data retention**

To estimate your usage:
- Each game with 2 players playing 3 rounds = ~15 events
- 1000 games/month = ~15,000 events
- Well within free tier limits

## Additional Resources

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog Elixir Library](https://hex.pm/packages/posthog)
- [PostHog GeoIP Properties](https://posthog.com/docs/data/events#geoip-properties) - Learn about automatic GeoIP enrichment

## Support

If you encounter issues:
1. Check PostHog's status page: [https://status.posthog.com/](https://status.posthog.com/)
2. Review application logs: `journalctl -u kicka_ettan -f`
3. Test with a minimal example
4. Contact PostHog support or check their community forum
