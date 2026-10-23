import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, BadgeCheck, Bot, CheckCircle2,
  CircleAlert, CircleDashed, Clock3, Cpu, Database, GitBranch, LoaderCircle,
  MessageSquare, Radio, Search, Send, Sparkles, TicketCheck, Workflow, XCircle, Zap,
} from 'lucide-react';
import './AgentDashboardPage.css';

type AgentEvent = {
  runId: string;
  agentId: string;
  agentName: string;
  from?: string;
  to?: string;
  eventType: string;
  timestamp: string;
  status: string;
  summary?: string;
  toolName?: string;
  sanitizedArguments?: Record<string, string | number | boolean>;
  toolResultSummary?: string;
  replyPreview?: string;
  durationMs?: number;
  tokenUsage?: { input: number; output: number };
  estimatedCostUsd?: number;
  errorCategory?: string;
};

type ConnectionState = 'connecting' | 'live' | 'reconnecting';
type Filter = 'all' | 'tools' | 'workflows' | 'replies' | 'errors';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const MAX_EVENTS = 360;

function eventKey(event: AgentEvent) {
  return `${event.runId}:${event.eventType}:${event.timestamp}`;
}

function mergeEvents(current: AgentEvent[], incoming: AgentEvent[]) {
  const merged = new Map(current.map(event => [eventKey(event), event]));
  for (const event of incoming) merged.set(eventKey(event), event);
  return [...merged.values()]
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .slice(-MAX_EVENTS);
}

function safeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date);
}

function elapsed(value?: number) {
  if (value === undefined) return '—';
  return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(2)} s`;
}

function shortId(value: string) {
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function titleFor(event: AgentEvent) {
  const titles: Record<string, string> = {
    'channel.received': 'Request received',
    'channel.replied': 'Reply delivered',
    'channel.failed': 'Channel delivery failed',
    'workflow.started': `${event.agentName} started`,
    'workflow.completed': `${event.agentName} completed`,
    'workflow.failed': `${event.agentName} failed`,
    'run.started': 'Runtime accepted request',
    'run.completed': 'Run completed',
    'run.failed': 'Run failed',
    'agent.started': `${event.agentName} started`,
    'agent.decided': 'Structured decision recorded',
    'agent.completed': 'Response composed',
    'agent.failed': `${event.agentName} failed`,
    'tool.started': `Hand-off → ${event.toolName ?? 'tool'}`,
    'tool.completed': `${event.toolName ?? 'Tool'} returned`,
    'tool.failed': `${event.toolName ?? 'Tool'} failed`,
  };
  return titles[event.eventType] ?? event.eventType;
}

function eventTone(event: AgentEvent) {
  if (event.status === 'failed' || event.eventType.endsWith('.failed')) return 'rose';
  if (event.eventType.startsWith('tool.')) return 'cyan';
  if (event.eventType.startsWith('workflow.')) return 'violet';
  if (event.eventType.startsWith('channel.')) return 'blue';
  if (event.eventType.includes('completed') || event.eventType === 'agent.decided') return 'emerald';
  return 'slate';
}

function eventIcon(event: AgentEvent) {
  if (event.status === 'failed' || event.eventType.endsWith('.failed')) return XCircle;
  if (event.eventType === 'channel.received') return ArrowDownLeft;
  if (event.eventType === 'channel.replied') return ArrowUpRight;
  if (event.eventType === 'tool.started') return ArrowRight;
  if (event.eventType.includes('completed') || event.eventType === 'agent.decided') return CheckCircle2;
  if (event.status === 'running') return CircleDashed;
  return Activity;
}

function isFailure(event: AgentEvent) {
  return event.status === 'failed' || event.eventType.endsWith('.failed');
}

const topology = [
  {
    id: 'channel', label: 'Channels', icon: MessageSquare, kind: 'ENTRY / EXIT',
    description: 'Telegram adapter · dashboard playground', tint: 'blue',
    matches: (e: AgentEvent) => e.eventType.startsWith('channel.'),
  },
  {
    id: 'intent', label: 'Conversation agent', icon: Bot, kind: '1 AUTONOMOUS AGENT',
    description: 'Understands intent · carries context · chooses a route', tint: 'violet',
    matches: (e: AgentEvent) => e.agentId === 'conversation-intent' || e.eventType.startsWith('agent.'),
  },
  {
    id: 'tools', label: 'Search tools', icon: GitBranch, kind: 'LIVE HAND-OFFS',
    description: 'movie_search · showtime_search · train_search', tint: 'cyan',
    matches: (e: AgentEvent) => e.eventType.startsWith('tool.'),
  },
  {
    id: 'workflows', label: 'Booking workflows', icon: Workflow, kind: 'DETERMINISTIC FLOWS',
    description: 'Movie seats · train passengers · guided confirmation', tint: 'amber',
    matches: (e: AgentEvent) => e.eventType.startsWith('workflow.'),
  },
  {
    id: 'data', label: 'Data & booking APIs', icon: Database, kind: 'BACKEND SERVICES',
    description: 'Cinema listings · demo rail inventory · booking services', tint: 'emerald',
    matches: (e: AgentEvent) => e.eventType.startsWith('tool.completed') || e.eventType.startsWith('workflow.'),
  },
  {
    id: 'delivery', label: 'Reply & ticket', icon: TicketCheck, kind: 'CUSTOMER RESPONSE',
    description: 'Telegram/web reply · booking and ticket references', tint: 'pink',
    matches: (e: AgentEvent) => e.eventType === 'channel.replied' || e.eventType === 'run.completed',
  },
];

const roleCards = [
  { id: 'conversation', label: 'Conversation & Intent', tint: 'violet', active: (e: AgentEvent) => e.agentId === 'conversation-intent' || e.eventType.startsWith('agent.') },
  { id: 'movie', label: 'Movie Booking', tint: 'cyan', active: (e: AgentEvent) => e.agentId === 'movie-booking-flow' || (e.eventType.startsWith('workflow.') && e.summary?.toLowerCase().includes('movie')) },
  { id: 'train', label: 'Train Booking', tint: 'amber', active: (e: AgentEvent) => e.agentId === 'train-booking-flow' || (e.eventType.startsWith('workflow.') && e.summary?.toLowerCase().includes('train')) },
  { id: 'booking', label: 'Booking & Payment', tint: 'emerald', active: (e: AgentEvent) => e.agentId === 'booking-payment' || /booking|payment|ticket/i.test(`${e.eventType} ${e.summary ?? ''}`) },
];

export default function AgentDashboardPage() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selectedRun, setSelectedRun] = useState('');
  const [selectedEventKey, setSelectedEventKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [playgroundBusy, setPlaygroundBusy] = useState(false);
  const [playgroundReply, setPlaygroundReply] = useState('');
  const [playgroundError, setPlaygroundError] = useState('');
  const [playgroundHistory, setPlaygroundHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [clock, setClock] = useState(Date.now());
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const playgroundConversation = useRef(`dashboard-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`);

  useEffect(() => {
    const source = new EventSource(`${API_BASE}/agent/events`);
    source.onopen = () => setConnection('live');
    source.onerror = () => setConnection('reconnecting');
    source.addEventListener('snapshot', message => {
      try {
        const snapshot = JSON.parse((message as MessageEvent<string>).data) as AgentEvent[];
        setEvents(current => mergeEvents(current, snapshot));
        setLastUpdate(Date.now());
      } catch { /* Ignore malformed frames; EventSource will retry. */ }
    });
    source.addEventListener('agent_event', message => {
      try {
        const event = JSON.parse((message as MessageEvent<string>).data) as AgentEvent;
        setEvents(current => mergeEvents(current, [event]));
        setLastUpdate(Date.now());
      } catch { /* Ignore malformed frames; EventSource will retry. */ }
    });
    return () => source.close();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const runs = useMemo(() => {
    const byRun = new Map<string, AgentEvent[]>();
    for (const event of events) byRun.set(event.runId, [...(byRun.get(event.runId) ?? []), event]);
    return [...byRun.entries()].map(([id, trace]) => {
      const latest = trace[trace.length - 1];
      const terminal = [...trace].reverse().find(item =>
        ['run.completed', 'run.failed', 'channel.replied', 'channel.failed', 'workflow.failed'].includes(item.eventType));
      const started = trace.find(item => ['run.started', 'channel.received', 'workflow.started'].includes(item.eventType));
      const status = terminal?.eventType.includes('failed') || terminal?.status === 'failed' ? 'failed'
        : terminal ? 'completed' : 'running';
      return { id, trace, latest, started, status };
    }).sort((a, b) => Date.parse(b.latest.timestamp) - Date.parse(a.latest.timestamp));
  }, [events]);

  useEffect(() => {
    if (!selectedRun && runs[0]) setSelectedRun(runs[0].id);
    else if (selectedRun && !runs.some(run => run.id === selectedRun) && runs[0]) setSelectedRun(runs[0].id);
  }, [runs, selectedRun]);

  const focusedRun = runs.find(run => run.id === selectedRun) ?? runs[0];
  const focusedEvents = focusedRun?.trace ?? [];
  const selectedEvent = focusedEvents.find(event => eventKey(event) === selectedEventKey) ?? focusedEvents[focusedEvents.length - 1];
  const recentToolCalls = events.filter(event => event.eventType === 'tool.started').length;
  const completedRuns = runs.filter(run => run.status === 'completed').length;
  const failedRuns = runs.filter(run => run.status === 'failed').length;
  const activeRuns = runs.filter(run => run.status === 'running').length;
  const durations = events.filter(event => event.eventType === 'run.completed' && event.durationMs !== undefined).map(event => event.durationMs!);
  const averageLatency = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null;
  const successRate = completedRuns + failedRuns ? Math.round(completedRuns / (completedRuns + failedRuns) * 100) : null;

  const visibleEvents = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...(focusedRun?.trace ?? [])].reverse().filter(event => {
      const matchesFilter = filter === 'all'
        || (filter === 'tools' && event.eventType.startsWith('tool.'))
        || (filter === 'workflows' && event.eventType.startsWith('workflow.'))
        || (filter === 'replies' && (event.eventType === 'agent.completed' || event.eventType === 'channel.replied' || event.eventType === 'run.completed'))
        || (filter === 'errors' && isFailure(event));
      const haystack = `${event.agentName} ${event.eventType} ${event.toolName ?? ''} ${event.summary ?? ''} ${event.toolResultSummary ?? ''}`.toLowerCase();
      return matchesFilter && (!term || haystack.includes(term));
    });
  }, [focusedRun, filter, query]);

  const submitPrompt = async (event: FormEvent) => {
    event.preventDefault();
    const message = prompt.trim();
    if (!message || playgroundBusy) return;
    setPlaygroundBusy(true);
    setPlaygroundError('');
    setPlaygroundReply('');
    setPrompt('');
    const runId = globalThis.crypto?.randomUUID?.() ?? `dash-${Date.now()}`;
    const history = playgroundHistory.slice(-10);
    try {
      const response = await fetch(`${API_BASE}/agent/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-jojo-run-id': runId },
        body: JSON.stringify({ message, conversationId: playgroundConversation.current, history }),
      });
      const envelope = await response.json() as { success?: boolean; data?: { runId?: string; reply?: string }; error?: { message?: string } };
      if (!response.ok || !envelope.success || !envelope.data?.reply) throw new Error(envelope.error?.message ?? `Agent API returned ${response.status}`);
      const reply = envelope.data.reply;
      setPlaygroundReply(reply);
      const nextHistory: Array<{ role: 'user' | 'assistant'; content: string }> = history.concat([
        { role: 'user' as const, content: message }, { role: 'assistant' as const, content: reply },
      ]).slice(-10);
      setPlaygroundHistory(nextHistory);
      setSelectedRun(envelope.data.runId ?? runId);
    } catch (error) {
      setPlaygroundError(error instanceof Error ? error.message : 'Could not reach the agent runtime.');
    } finally {
      setPlaygroundBusy(false);
    }
  };

  const filterOptions: Array<[Filter, string]> = [
    ['all', 'Everything'], ['tools', 'Tool hand-offs'], ['workflows', 'Workflows'], ['replies', 'Replies'], ['errors', 'Errors'],
  ];

  return (
    <div className="agent-page min-h-screen bg-[#070b13] pb-14 text-slate-100">
      <div className="agent-grid-bg relative overflow-hidden border-b border-white/[0.08]">
        <div className="agent-orb agent-orb-one" />
        <div className="agent-orb agent-orb-two" />
        <div className="relative mx-auto max-w-[1440px] px-4 pb-8 pt-9 sm:px-6 lg:px-10 lg:pb-10 lg:pt-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-300/20 bg-rose-300/10 text-rose-200"><Activity className="h-4 w-4" /></span>
              JoJo / Agent control room <span className="text-slate-600">·</span> Runtime observability
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] text-slate-400">
              <span className={`h-1.5 w-1.5 rounded-full ${connection === 'live' ? 'animate-pulse bg-emerald-400' : connection === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'}`} />
              {connection === 'live' ? 'STREAM CONNECTED' : connection === 'connecting' ? 'CONNECTING…' : 'RECONNECTING'}
              <span className="ml-1 text-slate-600">{new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(clock)}</span>
            </div>
          </div>

          <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-rose-200"><Sparkles className="h-3.5 w-3.5" /> Every hand-off. One trace.</div>
              <h1 className="max-w-4xl text-3xl font-black leading-[1.05] tracking-[-0.045em] text-white sm:text-5xl lg:text-[3.6rem]">
                See JoJo think in <span className="agent-title-gradient">routes, tools & actions.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-[15px]">
                Follow real requests from channel to agent, tool, booking workflow and reply. Run a live test below and watch its trace arrive in real time.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Runtime pulse</span>
                <Radio className={`h-4 w-4 ${connection === 'live' ? 'text-emerald-300' : 'text-slate-500'}`} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
            <HeroStat label="Calls" value={String(runs.length).padStart(2, '0')} />
                <HeroStat label="In flight" value={String(activeRuns).padStart(2, '0')} accent={activeRuns > 0} />
                <HeroStat label="Tool hops" value={String(recentToolCalls).padStart(2, '0')} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-3 text-[10px] text-slate-500">
                <span>{lastUpdate ? `Updated ${elapsed(clock - lastUpdate)} ago` : 'Waiting for first event'}</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> SSE · /api/agent/events</span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Calls in trace buffer" value={String(runs.length)} icon={Activity} detail="Retained live traces" />
            <Metric label="Successful turns" value={successRate === null ? '—' : `${successRate}%`} icon={BadgeCheck} detail={`${completedRuns} completed · ${failedRuns} failed`} />
            <Metric label="Avg. runtime" value={elapsed(averageLatency ?? undefined)} icon={Clock3} detail="Completed agent runs" />
            <Metric label="Specialist agents / roles" value="04" icon={Cpu} detail="Conversation · Movie · Train · Booking" />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] space-y-7 px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
        <section className="agent-panel overflow-hidden rounded-3xl border-cyan-300/20 shadow-[0_0_45px_rgba(34,211,238,0.07)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-5 sm:px-7">
            <div><Eyebrow>LIVE / Conversation flow</Eyebrow><h2 className="mt-1 text-xl font-extrabold text-white sm:text-2xl">How a request moves through JoJo</h2><p className="mt-1 text-xs text-slate-400">Live event timeline for the selected conversation. Internal chain-of-thought is never exposed.</p></div>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-1.5 font-mono text-[10px] text-cyan-200">{events.length} observed events</span>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-7">
            {(selectedRun ? runs.filter(run => run.id === selectedRun) : runs.slice(0, 1)).flatMap(run => run.trace).slice(-12).map((event, index, trace) => {
              const Icon = eventIcon(event);
              return <div key={eventKey(event)} className="relative min-h-[112px] rounded-2xl border border-white/10 bg-[#0b1220] p-4">
                {index < trace.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-cyan-300 lg:block" />}
                <div className="flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200"><Icon className="h-4 w-4" /></span><span className="font-mono text-[9px] text-slate-500">{safeDate(event.timestamp)}</span></div>
                <p className="mt-3 text-xs font-bold text-white">{titleFor(event)}</p><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400">{event.summary || event.agentName}</p>
                <p className="mt-2 truncate font-mono text-[9px] text-cyan-300/70">{event.from && event.to ? `${event.from} → ${event.to}` : `${event.agentName}${event.toolName ? ` → ${event.toolName}` : ''}`}</p>
              </div>;
            })}
            {!events.length && <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">Waiting for a conversation. Send a request in the playground or message the Telegram bot; each observed hand-off will appear here.</div>}
          </div>
        </section>
        <section className="agent-panel rounded-3xl p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3"><div><Eyebrow>LIVE / Four system roles</Eyebrow><h2 className="mt-1 text-xl font-extrabold text-white">Request participants</h2></div><span className="font-mono text-xs text-cyan-200">04 ROLES</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {roleCards.map(role => {
              const event = [...(focusedRun?.trace ?? [])].reverse().find(role.active);
              const active = Boolean(event && clock - Date.parse(event.timestamp) < 18_000);
              return <div key={role.id} className={`agent-node agent-node-${role.tint} ${active ? 'is-hot' : ''}`}><div className="flex items-center justify-between"><span className="text-sm font-bold text-white">{role.label}</span><span className={`agent-node-state ${active ? 'is-hot' : ''}`}>{active ? 'ACTIVE' : event ? 'IN TRACE' : 'READY'}</span></div><p className="mt-3 text-[10px] text-slate-400">{event ? event.summary || event.eventType : 'Activates when this role participates in the selected run.'}</p></div>;
            })}
          </div>
          <p className="mt-3 text-[10px] text-slate-500">Four observable system roles; only Conversation & Intent is currently an autonomous AI agent. Other roles are deterministic workflows.</p>
        </section>
        <section className="agent-panel overflow-hidden rounded-3xl">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.07] px-5 py-5 sm:px-7">
            <div>
              <Eyebrow>01 / System map</Eyebrow>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-white sm:text-2xl">The live communication graph</h2>
              <p className="mt-1 text-xs text-slate-500">Observed architecture · nodes illuminate when a matching event flows through.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[10px] text-slate-400">
              <span className="agent-live-dot" /> {events.length ? 'ACTIVITY DETECTED' : 'AWAITING TRAFFIC'}
            </div>
          </div>

          <div className="relative px-4 py-6 sm:px-7 sm:py-8">
            <div className="agent-graph-rail hidden lg:block" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {topology.map((node, index) => {
                const Icon = node.icon;
                const latest = [...events].reverse().find(node.matches);
                const hot = Boolean(latest && clock - Date.parse(latest.timestamp) < 18_000);
                return (
                  <div key={node.id} className="relative">
                    <div className={`agent-node agent-node-${node.tint} ${hot ? 'is-hot' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="agent-node-icon"><Icon className="h-[18px] w-[18px]" /></div>
                        <span className={`agent-node-state ${hot ? 'is-hot' : ''}`}>{hot ? 'LIVE' : latest ? 'RECENT' : 'READY'}</span>
                      </div>
                      <p className="mt-4 text-sm font-bold leading-5 text-white">{node.label}</p>
                      <p className="mt-1.5 min-h-[42px] text-[10px] leading-[1.5] text-slate-500">{node.description}</p>
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-2.5">
                        <span className="truncate font-mono text-[8px] font-bold tracking-[0.12em] text-slate-600">{node.kind}</span>
                        {latest && <span className="font-mono text-[9px] text-slate-500">{safeDate(latest.timestamp)}</span>}
                      </div>
                    </div>
                    {index < topology.length - 1 && <div className="agent-edge hidden lg:flex"><span className={hot ? 'is-hot' : ''}><ArrowRight className="h-3 w-3" /></span></div>}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Bot className="h-3.5 w-3.5 text-violet-300" /> 4 specialist roles: Conversation · Movie · Train · Booking</span>
              <span className="inline-flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5 text-cyan-300" /> Search is tool calls, not sub-agents</span>
              <span className="inline-flex items-center gap-1.5"><Workflow className="h-3.5 w-3.5 text-amber-300" /> Booking and payment are app workflows</span>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="agent-panel overflow-hidden rounded-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-5 sm:px-7">
              <div>
                <Eyebrow>02 / Live playground</Eyebrow>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-white">Send a real request</h2>
                <p className="mt-1 text-xs text-slate-500">Calls the same backend runtime used by the conversation agent.</p>
              </div>
              <span className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.06] px-2.5 py-1.5 font-mono text-[9px] text-emerald-200">POST /api/agent/chat</span>
            </div>
            <div className="p-5 sm:p-7">
              <div className="mb-3 flex flex-wrap gap-2">
                {['Show movies in Pune', 'Find trains from Pune to Mumbai tomorrow', 'How can you help me?'].map(example => (
                  <button type="button" key={example} onClick={() => { setPrompt(example); promptRef.current?.focus(); }} className="rounded-full border border-white/[0.09] bg-white/[0.025] px-3 py-1.5 text-[10px] text-slate-400 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.06] hover:text-cyan-100">{example}</button>
                ))}
              </div>
              <form onSubmit={submitPrompt}>
                <label className="sr-only" htmlFor="agent-live-prompt">Message the JoJo agent</label>
                <div className="rounded-2xl border border-white/[0.1] bg-[#090e18] p-2 transition focus-within:border-cyan-300/40 focus-within:shadow-[0_0_0_3px_rgba(103,232,249,0.06)]">
                  <textarea
                    ref={promptRef} id="agent-live-prompt" value={prompt} rows={2} maxLength={4000}
                    onChange={event => setPrompt(event.target.value)}
                    onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
                    placeholder="Ask a movie or train question…" className="min-h-[56px] w-full resize-y bg-transparent px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
                  />
                  <div className="flex items-center justify-between border-t border-white/[0.06] px-2 pt-2">
                    <span className="text-[9px] text-slate-600">Enter to send · Shift+Enter for a new line · live trace is privacy-filtered</span>
                    <button type="submit" disabled={!prompt.trim() || playgroundBusy} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
                      {playgroundBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      {playgroundBusy ? 'Running' : 'Run trace'}
                    </button>
                  </div>
                </div>
              </form>
              {playgroundError && <div role="alert" className="mt-3 flex gap-2 rounded-xl border border-rose-300/15 bg-rose-300/[0.06] p-3 text-xs leading-5 text-rose-200"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{playgroundError}</div>}
              {playgroundReply && <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.045] p-4">
                <div className="mb-2 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.17em] text-emerald-200"><CheckCircle2 className="h-3.5 w-3.5" /> Agent response · trace linked</div>
                <p className="whitespace-pre-wrap text-xs leading-5 text-slate-300">{playgroundReply}</p>
              </div>}
            </div>
          </div>

          <div className="agent-panel flex min-h-[310px] flex-col overflow-hidden rounded-3xl">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-5 sm:px-6">
              <div>
                <Eyebrow>03 / Current call</Eyebrow>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-white">Trace inspector</h2>
              </div>
              {focusedRun && <span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider ${focusedRun.status === 'failed' ? 'border-rose-300/20 bg-rose-300/[0.06] text-rose-200' : focusedRun.status === 'running' ? 'border-amber-300/20 bg-amber-300/[0.06] text-amber-100' : 'border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200'}`}>{focusedRun.status}</span>}
            </div>
            {!focusedRun ? (
              <EmptyState icon={Radio} title="No calls yet" detail="Run a request above or message the Telegram bot. Every observed event will appear here." />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-5 py-3 sm:px-6">
                  <span className="font-mono text-[10px] text-slate-500">RUN <span className="text-slate-300">{shortId(focusedRun.id)}</span></span>
                  <span className="text-[10px] text-slate-600">{focusedRun.trace.length} events <span className="px-1">·</span> started {safeDate(focusedRun.started?.timestamp ?? focusedRun.latest.timestamp)}</span>
                </div>
                <div className="agent-inspector-scroll flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                  {focusedEvents.map((event, index) => {
                    const Icon = eventIcon(event);
                    const tone = eventTone(event);
                    const active = eventKey(event) === eventKey(selectedEvent ?? event);
                    return (
                      <button type="button" key={eventKey(event)} onClick={() => setSelectedEventKey(eventKey(event))} className="agent-trace-row group flex w-full gap-3 text-left">
                        <div className="flex w-5 shrink-0 flex-col items-center">
                          <span className={`z-[1] flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-cyan-200/45 bg-cyan-300/15 text-cyan-100' : tone === 'rose' ? 'border-rose-300/20 bg-rose-300/[0.06] text-rose-300' : tone === 'emerald' ? 'border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-300' : 'border-white/10 bg-white/[0.04] text-slate-400'}`}><Icon className="h-3 w-3" /></span>
                          {index < focusedEvents.length - 1 && <span className="agent-trace-stem" />}
                        </div>
                        <div className={`mb-3 min-w-0 flex-1 rounded-xl border px-3 py-2.5 transition ${active ? 'border-cyan-300/20 bg-cyan-300/[0.055]' : 'border-transparent bg-white/[0.018] group-hover:border-white/[0.08]'}`}>
                          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                            <span className="truncate text-[11px] font-bold text-slate-200">{titleFor(event)}</span>
                            <span className="font-mono text-[9px] tabular-nums text-slate-600">{safeDate(event.timestamp)}</span>
                          </div>
                          <p className="mt-1 truncate text-[10px] text-slate-500">{event.summary || event.agentName}{event.durationMs !== undefined ? ` · ${elapsed(event.durationMs)}` : ''}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedEvent && <div className="border-t border-white/[0.07] bg-black/10 px-5 py-4 sm:px-6">
                  <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[9px] font-bold uppercase tracking-[0.17em] text-cyan-200">Selected event · {selectedEvent.agentName}</span><span className="font-mono text-[9px] text-slate-600">{selectedEvent.eventType}</span></div>
                  {selectedEvent.toolName && <p className="mb-2 font-mono text-[11px] text-cyan-100">{selectedEvent.toolName}</p>}
                  {selectedEvent.sanitizedArguments && <CodeBlock title="Sanitized input" value={selectedEvent.sanitizedArguments} />}
                  {selectedEvent.toolResultSummary && <p className="mt-2 rounded-lg border border-cyan-300/10 bg-cyan-300/[0.035] px-3 py-2 text-[10px] leading-4 text-cyan-100/80">{selectedEvent.toolResultSummary}</p>}
                  {selectedEvent.replyPreview && <div className="mt-2 rounded-lg border border-emerald-300/10 bg-emerald-300/[0.035] p-3"><p className="mb-1 text-[8px] font-bold uppercase tracking-[0.15em] text-emerald-200">Customer-facing reply</p><p className="max-h-32 overflow-y-auto whitespace-pre-wrap text-[10px] leading-4 text-slate-300">{selectedEvent.replyPreview}</p></div>}
                  {selectedEvent.errorCategory && <p className="mt-2 text-[10px] font-semibold text-rose-300">Failure category: {selectedEvent.errorCategory}</p>}
                  {!selectedEvent.toolName && !selectedEvent.summary && !selectedEvent.replyPreview && <p className="text-[10px] text-slate-500">No additional event payload.</p>}
                </div>}
              </>
            )}
          </div>
        </section>

        <section className="agent-panel overflow-hidden rounded-3xl">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.07] px-5 py-5 sm:px-7">
            <div>
              <Eyebrow>04 / Request history</Eyebrow>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-white sm:text-2xl">Every call, end to end</h2>
              <p className="mt-1 text-xs text-slate-500">Select a call to inspect its ordered messages, tool inputs, results and user reply.</p>
            </div>
            <label className="relative block w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search this trace" className="w-full rounded-xl border border-white/[0.08] bg-[#090e18] py-2.5 pl-9 pr-3 text-[11px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-300/25" />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3 sm:px-7">
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-black/20 p-1">
              {filterOptions.map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-semibold transition ${filter === value ? 'bg-white/[0.1] text-white shadow-sm' : 'text-slate-500 hover:text-slate-200'}`}>{label}</button>)}
            </div>
            <span className="font-mono text-[9px] text-slate-600">{visibleEvents.length} EVENTS IN SELECTED CALL</span>
          </div>
          <div className="grid lg:grid-cols-[310px_minmax(0,1fr)]">
            <div className="agent-run-list max-h-[460px] overflow-y-auto border-b border-white/[0.06] lg:border-b-0 lg:border-r">
              {runs.length === 0 ? <div className="p-6"><EmptyState icon={Activity} title="Listening for events" detail="The stream is connected. The first request will create a trace." /></div> : runs.map(run => {
                const input = run.trace.find(event => event.eventType === 'channel.received');
                const isSelected = run.id === focusedRun?.id;
                const icon = run.status === 'failed' ? XCircle : run.status === 'running' ? CircleDashed : CheckCircle2;
                const StatusIcon = icon;
                const toolCount = run.trace.filter(event => event.eventType === 'tool.started').length;
                return (
                  <button type="button" key={run.id} onClick={() => { setSelectedRun(run.id); setSelectedEventKey(''); }} className={`w-full border-b border-white/[0.045] px-4 py-3.5 text-left transition ${isSelected ? 'bg-cyan-300/[0.055]' : 'hover:bg-white/[0.025]'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-slate-400">{shortId(run.id)}</span>
                      <span className={`inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider ${run.status === 'failed' ? 'text-rose-300' : run.status === 'running' ? 'text-amber-200' : 'text-emerald-300'}`}><StatusIcon className="h-3 w-3" />{run.status}</span>
                    </div>
                    <p className="mt-1.5 truncate text-[10px] text-slate-300">{run.trace.find(event => event.eventType === 'agent.decided')?.summary ?? run.trace.find(event => event.eventType.startsWith('workflow.'))?.summary ?? input?.summary ?? run.latest.summary ?? 'Request trace'}</p>
                    <div className="mt-2 flex items-center justify-between text-[9px] text-slate-600"><span>{safeDate(run.started?.timestamp ?? run.latest.timestamp)}</span><span>{toolCount} tool hand-off{toolCount === 1 ? '' : 's'} · {run.trace.length} events</span></div>
                  </button>
                );
              })}
            </div>
            <div className="max-h-[460px] overflow-y-auto">
              {visibleEvents.length ? visibleEvents.map(event => {
                const Icon = eventIcon(event);
                const tone = eventTone(event);
                const eventSelected = eventKey(event) === eventKey(selectedEvent ?? event);
                return (
                  <button type="button" key={eventKey(event)} onClick={() => setSelectedEventKey(eventKey(event))} className={`grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-start gap-3 border-b border-white/[0.045] px-4 py-3 text-left transition sm:grid-cols-[28px_minmax(0,1fr)_100px] sm:px-6 ${eventSelected ? 'bg-white/[0.025]' : 'hover:bg-white/[0.018]'}`}>
                    <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg ${tone === 'rose' ? 'bg-rose-300/10 text-rose-300' : tone === 'cyan' ? 'bg-cyan-300/10 text-cyan-200' : tone === 'violet' ? 'bg-violet-300/10 text-violet-200' : tone === 'emerald' ? 'bg-emerald-300/10 text-emerald-200' : tone === 'blue' ? 'bg-blue-300/10 text-blue-200' : 'bg-white/[0.06] text-slate-400'}`}><Icon className="h-3.5 w-3.5" /></span>
                    <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-bold text-slate-200">{titleFor(event)}</span><span className="rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[8px] text-slate-500">{event.agentName}</span></span><span className="mt-1 block truncate text-[10px] text-slate-500">{event.summary || event.toolResultSummary || '—'}</span></span>
                    <span className="text-right font-mono text-[9px] tabular-nums text-slate-600">{safeDate(event.timestamp)}<span className="mt-1 block">{elapsed(event.durationMs)}</span></span>
                  </button>
                );
              }) : <div className="p-7"><EmptyState icon={Search} title="Nothing matches this filter" detail="Try another filter or search term." /></div>}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] bg-black/10 px-5 py-3 text-[9px] text-slate-600 sm:px-7">
            <span>In-memory trace buffer · up to 500 backend events · resets with the backend process</span>
            <span className="inline-flex items-center gap-1.5"><Zap className="h-3 w-3 text-cyan-300" /> Live Server-Sent Events</span>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <NoteCard icon={Cpu} title="Observable decisions, not hidden thoughts" detail="This view shows the structured intent, selected route, sanitized tool inputs/results and final reply. Private model chain-of-thought is intentionally never exposed." tint="violet" />
          <NoteCard icon={Database} title="Grounded hand-offs" detail="A tool event is emitted when the runtime invokes a real search tool. Result summaries are safe aggregates, not raw database records." tint="cyan" />
          <NoteCard icon={Workflow} title="Agents vs. workflows" detail="JoJo currently has one autonomous conversation agent. Train/movie booking, payment and ticketing are deterministic application workflows—not extra AI agents." tint="amber" />
        </section>
      </main>
    </div>
  );
}

function HeroStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="rounded-xl border border-white/[0.055] bg-white/[0.025] px-3 py-2"><p className="font-mono text-[9px] uppercase tracking-wider text-slate-600">{label}</p><p className={`mt-1 text-xl font-black tabular-nums ${accent ? 'text-amber-200' : 'text-white'}`}>{value}</p></div>;
}

function Metric({ label, value, icon: Icon, detail }: { label: string; value: string; icon: typeof Activity; detail: string }) {
  return <div className="rounded-2xl border border-white/[0.075] bg-white/[0.025] p-4 transition hover:border-white/[0.13] hover:bg-white/[0.04]">
    <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-slate-500">{label}</span><Icon className="h-4 w-4 text-slate-600" /></div>
    <p className="mt-2 text-2xl font-black tracking-tight text-white">{value}</p><p className="mt-1 text-[9px] text-slate-600">{detail}</p>
  </div>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-200/70">{children}</p>;
}

function CodeBlock({ title, value }: { title: string; value: Record<string, string | number | boolean> }) {
  return <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#070b12]"><div className="border-b border-white/[0.05] px-3 py-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-600">{title}</div><pre className="overflow-x-auto px-3 py-2 text-[9px] leading-4 text-cyan-100/80">{JSON.stringify(value, null, 2)}</pre></div>;
}

function EmptyState({ icon: Icon, title, detail }: { icon: typeof Activity; title: string; detail: string }) {
  return <div className="flex min-h-36 flex-col items-center justify-center px-5 text-center"><span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025] text-slate-500"><Icon className="h-5 w-5" /></span><p className="mt-3 text-xs font-bold text-slate-300">{title}</p><p className="mt-1 max-w-xs text-[10px] leading-4 text-slate-600">{detail}</p></div>;
}

function NoteCard({ icon: Icon, title, detail, tint }: { icon: typeof Activity; title: string; detail: string; tint: 'violet' | 'cyan' | 'amber' }) {
  const tintClass = tint === 'violet' ? 'text-violet-200 bg-violet-300/10' : tint === 'cyan' ? 'text-cyan-200 bg-cyan-300/10' : 'text-amber-200 bg-amber-300/10';
  return <div className="rounded-2xl border border-white/[0.065] bg-white/[0.02] p-4"><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tintClass}`}><Icon className="h-4 w-4" /></span><h3 className="mt-3 text-[11px] font-bold text-slate-200">{title}</h3><p className="mt-1.5 text-[10px] leading-4 text-slate-500">{detail}</p></div>;
}
