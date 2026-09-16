# RMXYZ Dashboard ↔ VPS setup

## 1. Discord OAuth2 redirect
Use this redirect URL in the Discord Developer Portal:

`https://rmxyz-dashboard.vercel.app/api/auth/callback`

The dashboard requests the `identify` and `guilds` OAuth2 scopes. Discord redirects the user back with an authorization code, which the dashboard exchanges server-side. Discord documents this standard authorization-code flow and configurable redirect URLs. citeturn277165search1turn277165search3

## 2. Vercel environment variables
Add these to the Vercel project:

```env
DISCORD_CLIENT_ID=YOUR_APPLICATION_ID
DISCORD_CLIENT_SECRET=YOUR_CLIENT_SECRET
DISCORD_REDIRECT_URI=https://rmxyz-dashboard.vercel.app/api/auth/callback
SESSION_SECRET=make-this-a-long-random-secret-at-least-32-characters
BOT_API_URL=https://YOUR-VPS-DOMAIN.example.com
BOT_API_SECRET=your-shared-random-secret
```

## 3. VPS environment variables
In the same directory as the existing bot:

```env
DISCORD_TOKEN=your_existing_bot_token
DB_PATH=bot.db
DASHBOARD_API_SECRET=the_exact_same_value_as_BOT_API_SECRET
DASHBOARD_BRIDGE_HOST=127.0.0.1
DASHBOARD_BRIDGE_PORT=8787
```

## 4. Install bridge dependency
Your existing `discord.py` installation already brings `aiohttp` as a dependency in normal installs. If your VPS environment does not have it:

```bash
python3 -m pip install aiohttp python-dotenv
```

## 5. Run the bridge
Start the dashboard bridge alongside the bot:

```bash
python3 dashboard_bridge.py
```

Keep the bridge bound to `127.0.0.1` and expose it through a reverse proxy or secure tunnel. Do not expose the shared secret or Discord bot token to the browser.

For a VPS, a simple production pattern is Nginx/Caddy in front of `127.0.0.1:8787` with HTTPS. Cloudflare Tunnel is another option if you do not want to open an inbound port.

## 6. What the bridge does
- `/health` verifies the bot token against Discord.
- `/guilds` returns the bot's connected guilds.
- `/guild/{id}` returns live Discord guild info plus SQLite AutoMod config and moderation statistics.
- `/guild/{id}/config` changes supported AutoMod settings in the same `bot.db` used by the bot.
- `/guild/{id}/action` supports dashboard actions such as channel purge and slowmode.

## Important
The dashboard never receives `DISCORD_TOKEN`. OAuth tokens and the bot token stay server-side. The bridge is protected with a separate shared secret.
