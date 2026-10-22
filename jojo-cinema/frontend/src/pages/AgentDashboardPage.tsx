import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDown, ArrowRight, Bot, CheckCircle2, CircleDashed, Clock3,
  CreditCard, Film, Radio, Search, TicketCheck, Workflow, XCircle,
} from 'lucide-react';

type AgentEvent = {
  runId: string;
  agentId: string;
  agentName: string;
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

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const agentRoles = [
  {
    name: 'Orchestrator & Intent Agent', icon: Bot, status: 'Active agent', tone: 'emerald',
    detail: 'Interprets requests, carries conversation context, and routes cinema questions.',
    liveName: 'Conversation and Intent Agent',
  },
  {
    name: 'Search & Discovery Agent', icon: Search, status: 'Tool-backed', tone: 'blue',
    detail: 'The active agent calls movie_search and showtime_search against the cinema database.',
    liveName: 'movie_search · showtime_search',
  },
  {
    name: 'Booking & Seat Selection Agent', icon: TicketCheck, status: 'Booking workflow', tone: 'violet',
    detail: 'Telegram booking flow guides city, movie, cinema, showtime, seat selection, and seat locks.',
    liveName: 'Telegram booking flow',
  },
  {
    name: 'Payment Agent', icon: CreditCard, status: 'Simulated payment', tone: 'amber',
    detail: 'Checkout and payment confirmation are demonstrated through the mock payment workflow.',
    liveName: 'Payment service',
  },
  {
    name: 'Confirmation & Ticket Delivery Agent', icon: Film, status: 'Ticket API', tone: 'slate',
    detail: 'The backend can create and retrieve ticket references; messaging and reminder delivery are not connected.',
    liveName: 'Ticket service',
  },
];

const toneClasses: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};

function eventTitle(event: AgentEvent): string {
  if (event.eventType === 'tool.started') return `Handing off to ${event.toolName ?? 'search tool'}`;
  if (event.eventType === 'tool.completed') return `${event.toolName ?? 'Search tool'} returned results`;
  if (event.eventType === 'tool.failed') return `${event.toolName ?? 'Search tool'} failed`;
  if (event.eventType === 'agent.started') return `${event.agentName} started`;
  if (event.eventType === 'agent.completed') return 'Customer-facing reply produced';
  if (event.eventType === 'agent.failed') return `${event.agentName} failed`;
  if (event.eventType === 'run.started') return 'Request accepted by the runtime';
  if (event.eventType === 'run.completed') return 'Run completed';
  if (event.eventType === 'run.failed') return 'Run failed';
  return event.summary ?? event.eventType;
}

function eventIcon(event: AgentEvent) {
  if (event.status === 'failed' || event.eventType.endsWith('.failed')) return XCircle;
  if (event.eventType === 'tool.started') return ArrowRight;
  if (event.eventType === 'agent.completed' || event.eventType === 'run.completed') return CheckCircle2;
  if (event.status === 'running') return CircleDashed;
  return Activity;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value));
}

function shortRun(value: string): string {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

export default function AgentDashboardPage() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connection, setConnection] = useState<'connecting' | 'live' | 'reconnecting'>('connecting');
  const [filter, setFilter] = useState<'all' | 'handoffs' | 'replies' | 'errors'>('all');

  useEffect(() => {
    const source = new EventSource(`${API_BASE}/agent/events`);
    source.onopen = () => setConnection('live');
    source.onerror = () => setConnection('reconnecting');
    source.addEventListener('snapshot', message => {
      setEvents(JSON.parse((message as MessageEvent<string>).data) as AgentEvent[]);
    });
    source.addEventListener('agent_event', message => {
      const event = JSON.parse((message as MessageEvent<string>).data) as AgentEvent;
      setEvents(current => [...current, event].slice(-160));
    });
    return () => source.close();
  }, []);

  const visibleEvents = useMemo(() => [...events].reverse().filter(event => {
    if (filter === 'handoffs') return event.eventType.startsWith('tool.');
    if (filter === 'replies') return event.eventType === 'agent.completed' || event.eventType === 'run.completed';
    if (filter === 'errors') return event.status === 'failed' || event.eventType.endsWith('.failed');
    return true;
  }), [events, filter]);

  const runs = useMemo(() => {
    const state = new Map<string, string>();
    for (const event of events) {
      if (event.eventType === 'run.started') state.set(event.runId, 'running');
      if (event.eventType === 'run.completed') state.set(event.runId, 'completed');
      if (event.eventType === 'run.failed') state.set(event.runId, 'failed');
    }
    return state;
  }, [events]);
  const activeRuns = [...runs.values()].filter(status => status === 'running').length;
  const failedRuns = [...runs.values()].filter(status => status === 'failed').length;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-600">
                <Workflow className="h-3.5 w-3.5" /> Agent operations
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">JoJo agent dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">See the project’s agent roles, database tool handoffs, run status, and customer-facing replies.</p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold ${connection === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              <span className={`h-2 w-2 rounded-full ${connection === 'live' ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`} />
              {connection === 'live' ? 'Live event stream' : connection === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Designed agent roles" value="05" icon={Workflow} note="From the approved project design" />
            <Metric label="Standalone AI agents active" value="01" icon={Bot} note="Intent agent coordinates search tools" />
            <Metric label="Active runs" value={String(activeRuns).padStart(2, '0')} icon={Radio} note="In this server session" />
            <Metric label="Failed runs seen" value={String(failedRuns).padStart(2, '0')} icon={XCircle} note={`${events.length} trace events buffered`} />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section>
          <SectionHeading eyebrow="The architecture" title="Five roles in the booking journey" subtitle="Role cards show the approved design and the implementation status of this cinema demo." />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {agentRoles.map((role, index) => {
              const Icon = role.icon;
              return (
                <div key={role.name} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><Icon className="h-5 w-5" /></div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${toneClasses[role.tone]}`}>{role.status}</span>
                  </div>
                  <h3 className="mt-4 text-sm font-bold leading-5 text-slate-900">{role.name}</h3>
                  <p className="mt-2 min-h-16 text-xs leading-5 text-slate-500">{role.detail}</p>
                  <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-400">{role.liveName}</div>
                  {index < agentRoles.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-slate-50 text-slate-400 xl:block" />}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
            <Activity className="mt-0.5 h-4 w-4 shrink-0" />
            <p><strong>Implementation note:</strong> the current app runs one AI conversation/intent agent. Search is exposed as tools; booking, payment, and ticket confirmation run as application workflows, not as separate autonomous AI agents.</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
            <SectionHeading eyebrow="Live operations" title="Agent communication trace" subtitle="Operational handoffs, safe summaries, timing, and final replies. Private model reasoning is not shown." />
            <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
              {([
                ['all', 'All events'], ['handoffs', 'Tool handoffs'], ['replies', 'Replies'], ['errors', 'Errors'],
              ] as const).map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${filter === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
              ))}
            </div>
          </div>

          {visibleEvents.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <div className="rounded-2xl bg-slate-100 p-4 text-slate-400"><Activity className="h-7 w-7" /></div>
              <h3 className="mt-4 font-bold text-slate-800">Waiting for agent activity</h3>
              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">Send a cinema question through Telegram or the chat client while this dashboard is open. New runtime events will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleEvents.map((event, index) => {
                const Icon = eventIcon(event);
                return (
                  <article key={`${event.runId}-${event.eventType}-${event.timestamp}-${index}`} className="grid gap-3 px-5 py-4 sm:grid-cols-[92px_36px_1fr] sm:px-6">
                    <div className="flex items-center gap-2 pt-1 text-[11px] font-medium tabular-nums text-slate-400"><Clock3 className="h-3.5 w-3.5" />{formatTime(event.timestamp)}</div>
                    <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${event.status === 'failed' ? 'bg-rose-50 text-rose-600' : event.eventType.startsWith('tool.') ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800">{eventTitle(event)}</h3>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">{event.agentName}</span>
                        <span className="rounded-md border border-slate-200 px-2 py-0.5 font-mono text-[10px] text-slate-400">run {shortRun(event.runId)}</span>
                      </div>
                      {event.summary && <p className="mt-1 text-xs leading-5 text-slate-500">{event.summary}</p>}
                      {event.sanitizedArguments && <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 px-3 py-2 text-[11px] leading-5 text-emerald-200">{JSON.stringify(event.sanitizedArguments, null, 2)}</pre>}
                      {event.toolResultSummary && <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">{event.toolResultSummary}</p>}
                      {event.replyPreview && <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3"><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Reply preview</p><p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{event.replyPreview}</p></div>}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
                        {event.durationMs !== undefined && <span>{event.durationMs} ms</span>}
                        {event.tokenUsage && <span>{event.tokenUsage.input + event.tokenUsage.output} tokens</span>}
                        {event.estimatedCostUsd !== undefined && <span>${event.estimatedCostUsd.toFixed(5)}</span>}
                        {event.errorCategory && <span className="font-semibold text-rose-600">{event.errorCategory}</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] text-slate-400 sm:px-6">
            <span>Showing up to 160 recent events from this backend process</span>
            <span className="inline-flex items-center gap-1"><ArrowDown className="h-3 w-3" />Newest first</span>
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, icon: Icon, note }: { label: string; value: string; icon: typeof Bot; note: string }) {
  return (
    <div className="flex items-start justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{value}</p><p className="mt-1 text-[10px] text-slate-400">{note}</p></div>
      <Icon className="h-4 w-4 text-slate-400" />
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500">{eyebrow}</p><h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p></div>;
}
