'use client';

import { useEffect, useMemo, useState } from 'react';

const nav = ['Overview', 'Moderation', 'AutoMod', 'Logging', 'Roles', 'Commands', 'Server'];

export default function Home() {
  const [user, setUser] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionState, setActionState] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth_error')) setError(params.get('auth_error'));

    fetch('/api/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user || null);
        setGuilds(d.guilds || []);
        if (d.guilds?.length) setSelected(d.guilds[0]);
      })
      .catch(() => setError('Could not load your Discord session.'))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => [
    ['Servers', guilds.length, 'You can manage'],
    ['Access', selected?.owner ? 'Owner' : selected ? 'Admin' : '—', 'Current server'],
    ['Bot', '—', 'VPS connection'],
    ['Cases', '—', 'Current server'],
  ], [guilds.length, selected]);

  async function botAction(action) {
    if (!selected) return;
    setActionState(`${action}…`);
    try {
      const response = await fetch(`/api/bot/guild/${selected.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Bot bridge is not connected.');
      setActionState(`${action} complete`);
    } catch (e) {
      setActionState(e.message);
    }
    setTimeout(() => setActionState(''), 3000);
  }

  if (loading) return <main className="loading"><div className="loader" /><span>Loading RMXYZ…</span></main>;

  if (!user) return <main className="landing">
    <div className="glow g1" /><div className="glow g2" />
    <header className="landingNav"><div className="brand"><span className="brandMark">RM</span><span>RMXYZ</span></div><a className="ghost" href="/api/auth/login">Login</a></header>
    {error && <div className="authError">{error}</div>}
    <section className="hero">
      <div className="pill">DISCORD MANAGEMENT • RMXYZ</div>
      <h1>Run your server.<br /><em>Without the clutter.</em></h1>
      <p>Moderation, AutoMod, logs, roles and bot controls in one polished dashboard built around your RMXYZ bot.</p>
      <a className="cta" href="/api/auth/login">Continue with Discord <span>↗</span></a>
      <div className="mini"><span className="dot" /> Secure Discord OAuth2 <span>•</span> Server permissions <span>•</span> Mobile ready</div>
    </section>
    <section className="preview"><div className="previewTop"><span>RMXYZ Dashboard</span><span>● Ready</span></div><div className="previewBody"><aside><b>Overview</b><span>Moderation</span><span>AutoMod</span><span>Logging</span><span>Roles</span></aside><div className="mock"><div className="mockGrid"><div><small>SERVERS</small><strong>—</strong></div><div><small>CASES</small><strong>—</strong></div><div><small>STATUS</small><strong>LIVE</strong></div></div><div className="mockBar" /></div></div></div></section>
  </main>;

  return <main className="appShell">
    <aside className="sidebar">
      <div className="brand"><span className="brandMark">RM</span><span>RMXYZ</span></div>
      <div className="serverBox"><div className="serverIcon">{selected?.icon ? <img src={selected.icon} alt="" /> : 'R'}</div><div><b>{selected?.name || 'Select server'}</b><small>{selected ? (selected.owner ? 'Server owner' : 'Manage Server') : 'Discord'}</small></div><span>⌄</span></div>
      <nav>{nav.map((n) => <button className={tab === n ? 'active' : ''} key={n} onClick={() => setTab(n)}>{n}</button>)}</nav>
      <div className="sideBottom"><a href="/api/auth/logout">Logout</a><span>{user.username}</span></div>
    </aside>
    <section className="content">
      <header className="topbar"><div><span className="eyebrow">SERVER CONTROL</span><h2>{tab}</h2></div><div className="profile">{user.avatar && <img src={user.avatar} alt="" />}<span>{user.username}</span></div></header>
      <div className="page">
        {error && <div className="inlineError">{error}</div>}
        <section className="serverChooser card">
          <div className="cardHead"><div><b>Your servers</b><small>Servers where you are the owner, Administrator, or have Manage Server.</small></div><span className="serverCount">{guilds.length}</span></div>
          {guilds.length ? <div className="serverGrid">{guilds.map((guild) => <button key={guild.id} className={`serverCard ${selected?.id === guild.id ? 'selected' : ''}`} onClick={() => setSelected(guild)}><span className="serverCardIcon">{guild.icon ? <img src={guild.icon} alt="" /> : guild.name.slice(0, 1)}</span><span className="serverCardText"><b>{guild.name}</b><small>{guild.owner ? 'Owner' : guild.administrator ? 'Administrator' : 'Manage Server'}</small></span><span className="chev">›</span></button>)}</div> : <div className="emptyServers">No manageable servers were returned by Discord.</div>}
        </section>
        <div className="welcome"><div><span className="eyebrow">RMXYZ / {selected?.name || 'SERVER'}</span><h1>Everything important, at a glance.</h1><p>Manage your Discord server while RMXYZ stays running on your VPS.</p></div><span className="status"><i /> Access verified</span></div>
        <div className="stats">{stats.map(([a,b,c]) => <div className="stat" key={a}><span>{a}</span><strong>{b}</strong><small>{c}</small></div>)}</div>
        <div className="grid">
          <section className="card wide"><div className="cardHead"><div><b>Quick actions</b><small>These controls call the RMXYZ VPS bridge.</small></div>{actionState && <span className="actionState">{actionState}</span>}</div><div className="actions"><button onClick={() => botAction('warn')}>Warn member</button><button onClick={() => botAction('timeout')}>Timeout</button><button onClick={() => botAction('kick')}>Kick</button><button onClick={() => botAction('ban')}>Ban</button><button onClick={() => botAction('clear')}>Clear messages</button><button onClick={() => botAction('lock')}>Lock channel</button></div></section>
          <section className="card"><div className="cardHead"><div><b>AutoMod</b><small>Protection status</small></div><span className="toggle on">ON</span></div><div className="list"><span>Anti spam <i>Enabled</i></span><span>Anti links <i>Enabled</i></span><span>Anti mentions <i>Enabled</i></span><span>Caps filter <i>Disabled</i></span></div></section>
          <section className="card"><div className="cardHead"><div><b>Access</b><small>Your Discord permissions</small></div></div><div className="list"><span>Server owner <i>{selected?.owner ? 'Yes' : 'No'}</i></span><span>Administrator <i>{selected?.administrator ? 'Yes' : 'No'}</i></span><span>Manage Server <i>{selected?.manageGuild ? 'Yes' : 'No'}</i></span></div></section>
        </div>
      </div>
    </section>
  </main>;
}
