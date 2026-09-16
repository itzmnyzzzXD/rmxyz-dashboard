'use client';

import { useEffect, useMemo, useState } from 'react';

const accent = '#ff304f';

export default function Home() {
  const [user, setUser] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/session').then((r) => r.json()).then((d) => {
      setUser(d.user || null);
      setGuilds(d.guilds || []);
      if (d.guilds?.length) setSelected(d.guilds[0]);
    }).finally(() => setLoading(false));
  }, []);

  const nav = ['Overview', 'Moderation', 'AutoMod', 'Logging', 'Roles', 'Commands', 'Server'];
  const stats = useMemo(() => [
    ['Servers', guilds.length || 0, 'Connected to Discord'],
    ['Bot status', 'Online', 'VPS bridge'],
    ['Latency', '—', 'Live from bot'],
    ['Cases', '—', 'This server'],
  ], [guilds.length]);

  if (loading) return <main className="loading"><div className="loader" /><span>Loading RMXYZ…</span></main>;

  if (!user) return <main className="landing">
    <div className="glow g1" /><div className="glow g2" />
    <header className="landingNav"><div className="brand"><span className="brandMark">RM</span><span>RMXYZ</span></div><a className="ghost" href="/api/auth/login">Login</a></header>
    <section className="hero">
      <div className="pill">DISCORD MANAGEMENT • RMXYZ</div>
      <h1>Run your server.<br /><em>Without the clutter.</em></h1>
      <p>Fast moderation, AutoMod, logs, roles and bot controls in one polished dashboard built for RMXYZ.</p>
      <a className="cta" href="/api/auth/login">Continue with Discord <span>↗</span></a>
      <div className="mini"><span className="dot" /> Secure Discord OAuth2 <span>•</span> VPS connected <span>•</span> Mobile ready</div>
    </section>
    <section className="preview"><div className="previewTop"><span>RMXYZ Dashboard</span><span>● Online</span></div><div className="previewBody"><aside><b>Overview</b><span>Moderation</span><span>AutoMod</span><span>Logging</span><span>Roles</span></aside><div className="mock"><div className="mockGrid"><div><small>MEMBERS</small><strong>12,482</strong></div><div><small>CASES</small><strong>84</strong></div><div><small>LATENCY</small><strong>42ms</strong></div></div><div className="mockBar" /></div></div></div></section>
  </main>;

  return <main className="appShell">
    <aside className="sidebar">
      <div className="brand"><span className="brandMark">RM</span><span>RMXYZ</span></div>
      <div className="serverBox"><div className="serverIcon">{selected?.icon ? <img src={selected.icon} /> : 'R'}</div><div><b>{selected?.name || 'Select server'}</b><small>{selected ? `${selected.members || 0} members` : 'Discord'}</small></div><span>⌄</span></div>
      <nav>{nav.map((n) => <button className={tab === n ? 'active' : ''} key={n} onClick={() => setTab(n)}>{n}</button>)}</nav>
      <div className="sideBottom"><a href="/api/auth/logout">Logout</a><span>{user.username}</span></div>
    </aside>
    <section className="content">
      <header className="topbar"><div><span className="eyebrow">SERVER CONTROL</span><h2>{tab}</h2></div><div className="profile"><img src={user.avatar} /><span>{user.username}</span></div></header>
      <div className="page">
        <div className="welcome"><div><span className="eyebrow">RMXYZ / {selected?.name || 'SERVER'}</span><h1>Everything important, at a glance.</h1><p>Manage your Discord server while RMXYZ stays running on your VPS.</p></div><a href="/api/health" className="status"><i /> Bot connected</a></div>
        <div className="stats">{stats.map(([a,b,c]) => <div className="stat" key={a}><span>{a}</span><strong>{b}</strong><small>{c}</small></div>)}</div>
        <div className="grid">
          <section className="card wide"><div className="cardHead"><div><b>Quick actions</b><small>Common moderation controls</small></div></div><div className="actions"><button>Warn member</button><button>Timeout</button><button>Kick</button><button>Ban</button><button>Clear messages</button><button>Lock channel</button></div></section>
          <section className="card"><div className="cardHead"><div><b>AutoMod</b><small>Protection status</small></div><span className="toggle on">ON</span></div><div className="list"><span>Anti spam <i>Enabled</i></span><span>Anti links <i>Enabled</i></span><span>Anti mentions <i>Enabled</i></span><span>Caps filter <i>Disabled</i></span></div></section>
          <section className="card"><div className="cardHead"><div><b>Recent activity</b><small>Latest moderation events</small></div><button className="more">View all</button></div><div className="activity"><div><span className="badge">W</span><div><b>Warning issued</b><small>ExampleUser • 2m ago</small></div></div><div><span className="badge red">T</span><div><b>Member timed out</b><small>AnotherUser • 18m ago</small></div></div><div><span className="badge grey">S</span><div><b>AutoMod blocked spam</b><small>Member • 31m ago</small></div></div></div></section>
        </div>
      </div>
    </section>
  </main>;
}
