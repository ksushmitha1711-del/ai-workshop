import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Zap, CalendarDays, MapPin, Users, Search, RefreshCw, Ticket, ShieldCheck, X, ArrowUpRight } from 'lucide-react';
import './style.css';

const API = (import.meta.env.VITE_API_BASE_URL || 'https://ai-workshop-1-7ayo.onrender.com').replace(/\/$/, '');
const categories = ['All', 'Tech', 'Music', 'Workshops', 'Sports'];
const userStoreKey = 'campuspulse_user_id';
const prettyDate = value => {
  if (!value) return 'Date to be announced';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};
const titleCase = text => String(text || '').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function App() {
  const [events, setEvents] = useState([]);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [userId, setUserId] = useState(() => localStorage.getItem(userStoreKey) || '');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [policyOpen, setPolicyOpen] = useState(false);
  const [busy, setBusy] = useState('');

  async function request(path, options) {
    const response = await fetch(`${API}${path}`, { ...options, headers: { ...(options?.body ? { 'Content-Type': 'application/json' } : {}), ...options?.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Backend returned ${response.status}`);
    return data;
  }
  async function loadEvents() {
    setLoading(true); setError('');
    try { const data = await request('/api/events'); setEvents(Array.isArray(data) ? data : []); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  async function loadRegistrations(id = userId) {
    if (!id.trim()) { setRegistrations([]); return; }
    try { setRegistrations(await request(`/api/me/registrations?user_id=${encodeURIComponent(id.trim())}`)); }
    catch (e) { setNotice(`Could not load registrations: ${e.message}`); }
  }
  useEffect(() => { loadEvents(); }, []);
  useEffect(() => { if (userId) loadRegistrations(userId); else setRegistrations([]); }, [userId]);
  const filtered = useMemo(() => events.filter(e => {
    const cat = titleCase(e.category || e.type || '');
    return (category === 'All' || cat.toLowerCase().includes(category.toLowerCase())) && `${e.title || ''} ${e.description || ''} ${e.location || e.venue || ''}`.toLowerCase().includes(query.toLowerCase());
  }), [events, category, query]);
  const registeredIds = new Set(registrations.map(r => String(r.event_id)));

  async function register(eventId) {
    if (!userId.trim()) { setNotice('Enter your existing database user ID above to register. No account or sign-in is needed.'); return; }
    setBusy(String(eventId)); setNotice('');
    try {
      await request('/api/registrations', { method: 'POST', body: JSON.stringify({ user_id: userId.trim(), event_id: eventId }) });
      setNotice('You are registered.'); await loadRegistrations(userId); await loadEvents();
    } catch (e) { setNotice(e.message); }
    finally { setBusy(''); }
  }
  function saveUser(value) { setUserId(value); localStorage.setItem(userStoreKey, value); }

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-icon"><Zap size={17} fill="currentColor"/></div><div><b>CampusPulse</b><span>Campus events, together</span></div></div><div className="live"><i/> API READY</div></header>
    <main>
      <section className="hero"><div className="eyebrow"><span>YOUR CAMPUS, IN MOTION</span><span className="hero-line"/></div><h1>Find your next<br/><em>big moment.</em></h1><p>Discover events, meet your people, and make campus count.</p><div className="hero-stats"><div><strong>{events.length}</strong><span>events listed</span></div><div><strong>{registrations.length}</strong><span>your registrations</span></div><button className="refresh" onClick={loadEvents} aria-label="Refresh events"><RefreshCw size={16}/></button></div></section>
      <section className="user-panel"><div><span className="eyebrow-small">YOUR DATABASE USER ID</span><p>Use an existing ID to save and view registrations. No login required.</p></div><input aria-label="Database user ID" value={userId} onChange={e => saveUser(e.target.value)} placeholder="Paste your user ID"/></section>
      <section className="directory"><div className="section-heading"><div><span className="eyebrow-small">THE CAMPUS CALENDAR</span><h2>Explore events <span>{filtered.length}</span></h2></div><label className="search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search events"/></label></div>
        <div className="filters">{categories.map(c => <button key={c} onClick={() => setCategory(c)} className={category === c ? 'filter active' : 'filter'}>{c}</button>)}</div>
        {error ? <div className="state error"><b>Could not reach the events API</b><p>{error}</p><button onClick={loadEvents}>Try again</button></div> : loading ? <div className="state">Loading events from your backend…</div> : filtered.length === 0 ? <div className="state">No events found. Try another search or category.</div> : <div className="event-grid">{filtered.map((event, index) => {
          const id = event.id; const registered = registeredIds.has(String(id));
          const cat = titleCase(event.category || event.type || 'Campus');
          return <article className="event-card" key={id ?? index}><div className={`cover cover-${index % 4}`}><div className="cover-top"><span>{cat}</span><span className="cover-mark">CP / 0{index + 1}</span></div><div className="cover-title">{event.title || 'Campus event'}</div><div className="cover-orb"/></div><div className="event-info"><h3>{event.title || 'Campus event'}</h3>{event.description && <p className="description">{event.description}</p>}<div className="event-meta"><span><CalendarDays size={14}/>{prettyDate(event.date || event.event_date || event.starts_at)}</span><span><MapPin size={14}/>{event.location || event.venue || 'Campus location'}</span></div><div className="card-bottom"><span className="capacity"><Users size={14}/>{event.capacity ? `${event.capacity} spots` : 'Open event'}</span><button className={registered ? 'register done' : 'register'} disabled={registered || busy === String(id)} onClick={() => register(id)}>{registered ? <><Ticket size={15}/> Registered</> : busy === String(id) ? 'Saving…' : <>Join event <ArrowUpRight size={15}/></>}</button></div></div></article>;
        })}</div>}
      </section>
      {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={16}/></button></div>}
      <section className="policy"><div className="policy-icon"><ShieldCheck size={19}/></div><div><span className="eyebrow-small">CAMPUS GUIDELINES</span><h3>Course & event policy</h3><p>Make space for everyone. Respect course and campus rules, follow organizer instructions, and treat attendees and venues with care.</p><button onClick={() => setPolicyOpen(!policyOpen)}>{policyOpen ? 'Hide policy' : 'Read full policy'} <ArrowUpRight size={14}/></button>{policyOpen && <div className="policy-detail"><b>Participation</b><p>Register only for events you plan to attend. Your registration is associated with the user ID you provide.</p><b>Respect & safety</b><p>Follow campus conduct standards, accessibility guidance, venue rules, and organizer directions. Harassment, discrimination, and disruption are not acceptable.</p><b>Changes & cancellations</b><p>Event details can change. Check the event listing and any organizer updates before attending. Contact the organizer directly about accommodations or cancellation.</p><small>These guidelines complement your institution's official course, conduct, and safety policies.</small></div>}</div></section>
    </main><footer><div className="brand mini"><div className="brand-icon"><Zap size={14} fill="currentColor"/></div><b>CampusPulse</b></div><span>Built for campus life · No account required</span></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
