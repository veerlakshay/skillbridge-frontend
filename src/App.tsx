import { useEffect, useMemo, useState } from 'react';

type Skill = { id: string; name: string };
type Opportunity = { id: string; title: string; description: string; createdAt: string; skills: Skill[]; matchScore?: number };
type User = { id: string; name: string; email: string; skills: Skill[] };

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const USE_MOCK = String(import.meta.env.VITE_USE_MOCK).toLowerCase() === '1' || String(import.meta.env.VITE_USE_MOCK).toLowerCase() === 'true';

// Simple in-memory mock API to run the UI without a backend
function uid() { try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2); } }

const mock = (() => {
  // Seed skills
  const skillNames = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'PostgreSQL', 'Prisma', 'Docker', 'CI/CD'
  ];
  const skills: Skill[] = skillNames.map((name) => ({ id: uid(), name }));
  const findSkill = (name: string) => skills.find((s) => s.name === name)!;

  // Seed opportunities
  const opportunities: Opportunity[] = [
    {
      id: uid(),
      title: 'Frontend Intern',
      description: 'Build UI with React + TS',
      createdAt: new Date().toISOString(),
      skills: [findSkill('React'), findSkill('TypeScript')],
    },
    {
      id: uid(),
      title: 'Backend Intern',
      description: 'API with Node, Express, Prisma',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      skills: [findSkill('Node.js'), findSkill('Express'), findSkill('PostgreSQL'), findSkill('Prisma')],
    },
    {
      id: uid(),
      title: 'DevOps Trainee',
      description: 'Dockerize apps and set up CI',
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      skills: [findSkill('Docker'), findSkill('CI/CD')],
    },
  ];

  // Seed users
  const users: User[] = [
    { id: uid(), name: 'Alice', email: 'alice@example.com', skills: [findSkill('React'), findSkill('TypeScript')] },
    { id: uid(), name: 'Bob', email: 'bob@example.com', skills: [findSkill('Node.js'), findSkill('Express'), findSkill('PostgreSQL')] },
  ];

  const getSkills = async () => skills;
  const getOpps = async () => opportunities.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const postOpp = async (body: any) => {
    const chosen = skills.filter((s) => (body?.skillIds || []).includes(s.id));
    const opp: Opportunity = { id: uid(), title: body.title, description: body.description, createdAt: new Date().toISOString(), skills: chosen };
    opportunities.unshift(opp);
    return opp;
  };
  const getUsers = async () => users;
  const postUser = async (body: any) => {
    const chosen = skills.filter((s) => (body?.skillIds || []).includes(s.id));
    const user: User = { id: uid(), name: body.name, email: body.email, skills: chosen };
    users.push(user);
    return user;
  };
  const getMatches = async (userId: string) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return [] as Opportunity[];
    const uSkillIds = new Set(u.skills.map((s) => s.id));
    return opportunities.map((o) => ({
      ...o,
      matchScore: o.skills.reduce((acc, s) => acc + (uSkillIds.has(s.id) ? 1 : 0), 0),
    }));
  };

  return { getSkills, getOpps, postOpp, getUsers, postUser, getMatches };
})();

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  if (USE_MOCK) {
    const method = (options?.method || 'GET').toUpperCase();
    const body = options?.body ? JSON.parse(String(options.body)) : undefined;
    // rudimentary router
    if (path === '/api/skills' && method === 'GET') return mock.getSkills() as any;
    if (path === '/api/opportunities' && method === 'GET') return mock.getOpps() as any;
    if (path === '/api/opportunities' && method === 'POST') return mock.postOpp(body) as any;
    if (path === '/api/users' && method === 'GET') return mock.getUsers() as any;
    if (path === '/api/users' && method === 'POST') return mock.postUser(body) as any;
    if (path.startsWith('/api/users/') && path.endsWith('/matches') && method === 'GET') {
      const userId = path.split('/')[3];
      return mock.getMatches(userId) as any;
    }
    throw new Error(`Mock route not implemented: ${method} ${path}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  useEffect(() => { api<Skill[]>('/api/skills').then(setSkills).catch(console.error); }, []);
  return skills;
}

function Header({ view, setView }: { view: 'opps' | 'users' | 'match' | 'create'; setView: (v: 'opps' | 'users' | 'match' | 'create') => void }) {
  return (
    <header className="container">
      <h1>SkillBridge</h1>
      {USE_MOCK && <span className="muted" style={{ marginLeft: 12, fontSize: 12 }}>(UI Demo – Mock Data)</span>}
      <nav>
        <a href="#" className={view === 'opps' ? 'active' : ''} onClick={() => setView('opps')}>Opportunities</a>
        <a href="#" className={view === 'users' ? 'active' : ''} onClick={() => setView('users')}>Users</a>
        <a href="#" className={view === 'match' ? 'active' : ''} onClick={() => setView('match')}>Matching</a>
        <a href="#" className={view === 'create' ? 'active' : ''} onClick={() => setView('create')}>Create</a>
      </nav>
    </header>
  );
}

function OpportunityList() {
  const [list, setList] = useState<Opportunity[]>([]);
  useEffect(() => { api<Opportunity[]>('/api/opportunities').then(setList).catch(console.error); }, []);
  return (
    <div className="container">
      <div className="panel">
        <h2>Opportunities</h2>
        <p className="muted">Recent postings</p>
        {list.map((o) => (
          <div key={o.id} style={{ padding: '12px 0', borderTop: '1px solid #2a355d' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <strong>{o.title}</strong>
                <div className="muted" style={{ fontSize: 14 }}>{new Date(o.createdAt).toLocaleString()}</div>
              </div>
              <div>
                {o.skills.map((s) => <span key={s.id} className="tag">{s.name}</span>)}
              </div>
            </div>
            <div style={{ marginTop: 8 }}>{o.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateOpportunity() {
  const skills = useSkills();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>('');

  const toggle = (id: string) => setSelected((xs) => xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]);

  const submit = async () => {
    setSaving(true); setMessage('');
    try {
      await api<Opportunity>('/api/opportunities', { method: 'POST', body: JSON.stringify({ title, description, skillIds: selected }) });
      setTitle(''); setDescription(''); setSelected([]); setMessage('Created!');
    } catch (e: any) {
      setMessage(e.message || 'Error');
    } finally { setSaving(false); }
  };

  return (
    <div className="container">
      <div className="panel">
        <h2>Create Opportunity</h2>
        <div className="grid">
          <div className="col-6">
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Frontend Intern" />
          </div>
          <div className="col-12">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short role description" rows={4} />
          </div>
          <div className="col-12">
            <label>Skills</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap: 8, marginTop: 8 }}>
              {skills.map((s) => (
                <button type="button" key={s.id} className={selected.includes(s.id) ? '' : 'secondary'} onClick={() => toggle(s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div className="col-12" style={{ display:'flex', gap:8 }}>
            <button onClick={submit} disabled={saving}>Save</button>
            {message && <div className="muted">{message}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Users() {
  const skills = useSkills();
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => { api<User[]>('/api/users').then(setUsers).catch(console.error); }, []);
  const toggle = (id: string) => setSelected((xs) => xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]);

  const submit = async () => {
    await api<User>('/api/users', { method: 'POST', body: JSON.stringify({ name, email, skillIds: selected }) });
    setName(''); setEmail(''); setSelected([]);
    const fresh = await api<User[]>('/api/users');
    setUsers(fresh);
  };

  return (
    <div className="container">
      <div className="panel">
        <h2>Users</h2>
        <div className="grid">
          <div className="col-6">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alice" />
          </div>
          <div className="col-6">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alice@example.com" />
          </div>
          <div className="col-12">
            <label>Skills</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap: 8, marginTop: 8 }}>
              {skills.map((s) => (
                <button type="button" key={s.id} className={selected.includes(s.id) ? '' : 'secondary'} onClick={() => toggle(s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div className="col-12">
            <button onClick={submit}>Add</button>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          {users.map((u) => (
            <div key={u.id} style={{ padding: '12px 0', borderTop: '1px solid #2a355d' }}>
              <strong>{u.name}</strong> <span className="muted">({u.email})</span>
              <div style={{ marginTop: 6 }}>{u.skills.map((s) => <span className="tag" key={s.id}>{s.name}</span>)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Matching() {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [matches, setMatches] = useState<Opportunity[]>([]);
  useEffect(() => { api<User[]>('/api/users').then(setUsers).catch(console.error); }, []);

  useEffect(() => {
    if (!selected) { setMatches([]); return; }
    api<Opportunity[]>(`/api/users/${selected}/matches`).then(setMatches).catch(console.error);
  }, [selected]);

  const currentUser = useMemo(() => users.find((u) => u.id === selected), [users, selected]);

  return (
    <div className="container">
      <div className="panel">
        <h2>Matching</h2>
        <div style={{ display:'flex', gap: 8, alignItems:'center' }}>
          <label>Choose user</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Select user…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
        </div>
        {currentUser && (
          <div style={{ marginTop: 10 }}>
            <div className="muted">Skills: {currentUser.skills.map((s) => s.name).join(', ') || 'None'}</div>
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          {matches.map((m) => (
            <div key={m.id} style={{ padding: '12px 0', borderTop: '1px solid #2a355d' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <strong>{m.title}</strong>
                  {typeof m.matchScore === 'number' && (
                    <span className="muted" style={{ marginLeft: 8 }}>match {m.matchScore}</span>
                  )}
                </div>
                <div>{m.skills.map((s) => <span key={s.id} className="tag">{s.name}</span>)}</div>
              </div>
              <div style={{ marginTop: 8 }}>{m.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'opps' | 'users' | 'match' | 'create'>('opps');
  return (
    <>
      <Header view={view} setView={setView} />
      {view === 'opps' && <OpportunityList />}
      {view === 'users' && <Users />}
      {view === 'match' && <Matching />}
      {view === 'create' && <CreateOpportunity />}
    </>
  );
}
