import os
import sqlite3
from datetime import datetime, timezone
from aiohttp import web, ClientSession
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN', '').strip()
API_SECRET = os.getenv('DASHBOARD_API_SECRET', '').strip()
HOST = os.getenv('DASHBOARD_BRIDGE_HOST', '127.0.0.1')
PORT = int(os.getenv('DASHBOARD_BRIDGE_PORT', '8787'))
DB_PATH = os.getenv('DB_PATH', 'bot.db')
DISCORD_API = 'https://discord.com/api/v10'

if not TOKEN:
    raise RuntimeError('DISCORD_TOKEN is missing')
if not API_SECRET:
    raise RuntimeError('DASHBOARD_API_SECRET is missing')


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def authorized(request):
    return request.headers.get('Authorization', '') == f'Bearer {API_SECRET}'


def config(guild_id):
    conn = db()
    conn.execute('INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)', (guild_id,))
    row = conn.execute('SELECT * FROM guild_config WHERE guild_id=?', (guild_id,)).fetchone()
    conn.close()
    return dict(row) if row else {}


def set_config(guild_id, key, value):
    allowed = {'log_channel','modlog_channel','anti_links','anti_slurs','anti_spam','anti_caps','anti_mentions','max_mentions','spam_messages','spam_window','punishment','timeout_seconds','warn_threshold','auto_mod_role','muted_role'}
    if key not in allowed:
        raise ValueError('invalid configuration key')
    conn = db()
    conn.execute('INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)', (guild_id,))
    conn.execute(f'UPDATE guild_config SET {key}=? WHERE guild_id=?', (value, guild_id))
    conn.commit()
    conn.close()


def stats(guild_id):
    conn = db()
    cases = conn.execute('SELECT COUNT(*) n FROM cases WHERE guild_id=?', (guild_id,)).fetchone()['n']
    warnings = conn.execute('SELECT COUNT(*) n FROM warnings WHERE guild_id=?', (guild_id,)).fetchone()['n']
    recent = conn.execute('SELECT id,user_id,moderator_id,action,reason,created_at FROM cases WHERE guild_id=? ORDER BY id DESC LIMIT 8', (guild_id,)).fetchall()
    conn.close()
    return {'cases': cases, 'warnings': warnings, 'recent': [dict(row) for row in recent]}


async def discord(method, path, **kwargs):
    headers = {'Authorization': f'Bot {TOKEN}', 'User-Agent': 'RMXYZ-Dashboard/1.0'}
    async with ClientSession(headers=headers) as session:
        async with session.request(method, f'{DISCORD_API}{path}', **kwargs) as r:
            text = await r.text()
            try:
                data = await r.json()
            except Exception:
                data = {'raw': text}
            return r.status, data


@web.middleware
async def auth_middleware(request, handler):
    if not authorized(request):
        return web.json_response({'error': 'unauthorized'}, status=401)
    return await handler(request)


async def health(request):
    status, user = await discord('GET', '/users/@me')
    return web.json_response({'ok': status == 200, 'status': 'online' if status == 200 else 'offline', 'bot': user if status == 200 else None})


async def guilds(request):
    status, data = await discord('GET', '/users/@me/guilds')
    if status != 200:
        return web.json_response({'error': 'discord request failed', 'details': data}, status=status)
    return web.json_response([{'id': g['id'], 'name': g['name'], 'icon': g.get('icon'), 'member_count': g.get('approximate_member_count')} for g in data])


async def guild(request):
    gid = request.match_info['guild_id']
    status, data = await discord('GET', f'/guilds/{gid}', params={'with_counts': 'true'})
    if status != 200:
        return web.json_response({'error': 'guild lookup failed', 'details': data}, status=status)
    return web.json_response({'guild': data, 'config': config(int(gid)), 'stats': stats(int(gid))})


async def update_config(request):
    gid = int(request.match_info['guild_id'])
    body = await request.json()
    if 'key' not in body or 'value' not in body:
        return web.json_response({'error': 'key and value are required'}, status=400)
    try:
        set_config(gid, body['key'], body['value'])
    except ValueError as e:
        return web.json_response({'error': str(e)}, status=400)
    return web.json_response({'ok': True, 'config': config(gid)})


async def action(request):
    gid = request.match_info['guild_id']
    body = await request.json()
    kind = body.get('action')
    channel = body.get('channel_id')
    if kind == 'purge':
        if not channel: return web.json_response({'error': 'channel_id required'}, status=400)
        amount = max(1, min(int(body.get('amount', 10)), 100))
        status, messages = await discord('GET', f'/channels/{channel}/messages', params={'limit': str(amount)})
        if status != 200: return web.json_response({'error': 'message lookup failed', 'details': messages}, status=status)
        ids = [m['id'] for m in messages]
        if not ids: return web.json_response({'ok': True, 'deleted': 0})
        status, result = await discord('POST', f'/channels/{channel}/messages/bulk-delete', json={'messages': ids})
        return web.json_response({'ok': status in (200, 204), 'deleted': len(ids), 'details': result}, status=status)
    if kind == 'slowmode':
        if not channel: return web.json_response({'error': 'channel_id required'}, status=400)
        seconds = max(0, min(int(body.get('seconds', 0)), 21600))
        status, result = await discord('PATCH', f'/channels/{channel}', json={'rate_limit_per_user': seconds})
        return web.json_response({'ok': status == 200, 'details': result}, status=status)
    return web.json_response({'error': 'unsupported action'}, status=400)


app = web.Application(middlewares=[auth_middleware])
app.add_routes([
    web.get('/health', health),
    web.get('/guilds', guilds),
    web.get('/guild/{guild_id}', guild),
    web.post('/guild/{guild_id}/config', update_config),
    web.post('/guild/{guild_id}/action', action),
])

if __name__ == '__main__':
    print(f'RMXYZ dashboard bridge listening on {HOST}:{PORT}')
    web.run_app(app, host=HOST, port=PORT)
