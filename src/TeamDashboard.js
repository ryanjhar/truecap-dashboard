import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ComposedChart, Area, BarChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { TEAM_BY_CODE } from './teams';

// ─── semantic palette (non-team) ────────────────────────────────────────────
const GREEN = '#34d399';
const AMBER = '#fbbf24';
const RED   = '#f87171';
const MUTED = '#60a5fa';

// ─── parse helpers ───────────────────────────────────────────────────────────
const parseMktDelta = (v) => {
  if (!v) return null;
  const m = String(v).match(/^([+-]?\d+)%/);
  return m ? parseInt(m[1], 10) : null;
};

const parseDollars = (str) => {
  if (!str || str === '-') return 0;
  const m = String(str).split('\n')[0].match(/\$?([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) || 0 : 0;
};

const fmt = (n) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return sign + '$' + (abs / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000)     return sign + '$' + (abs / 1_000).toFixed(0) + 'K';
  return sign + '$' + abs;
};

const fmtPct = (n, total) => ((n / total) * 100).toFixed(1) + '%';

// ─── grade / value helpers ───────────────────────────────────────────────────
const GRADE_COLOR = (g) => {
  if (!g) return 'var(--text-3)';
  if (g.startsWith('A')) return GREEN;
  if (g.startsWith('B')) return MUTED;
  if (g.startsWith('C')) return AMBER;
  return RED;
};

// ─── position grouping ───────────────────────────────────────────────────────
const POS_GROUP = {
  QB:'QB', WR:'WR', RB:'RB', TE:'TE',
  LT:'OL', RT:'OL', G:'OL', C:'OL', T:'OL',
  DL:'DL', DT:'DL', DE:'DL',
  ED:'EDGE', OLB:'EDGE',
  LB:'LB', CB:'CB', S:'S',
  K:'ST', P:'ST', LS:'ST',
};
const GROUP_ORDER = ['QB','WR','RB','TE','OL','DL','EDGE','LB','CB','S','ST'];

// ─── bar palette (generates shades from team primary) ────────────────────────
const BAR_PALETTE = (primary) => {
  const hex2rgb = (h) => [
    parseInt(h.slice(1,3),16),
    parseInt(h.slice(3,5),16),
    parseInt(h.slice(5,7),16),
  ];
  const [r,g,b] = hex2rgb(primary || '#60a5fa');
  return GROUP_ORDER.map((_, i) => {
    const t = i / (GROUP_ORDER.length - 1);
    const lr = Math.round(r + (180-r)*t*0.55);
    const lg = Math.round(g + (180-g)*t*0.55);
    const lb = Math.round(b + (180-b)*t*0.55);
    return `rgb(${lr},${lg},${lb})`;
  });
};

// ─── shared micro-components ─────────────────────────────────────────────────

// Terminal-style stat card
const StatCard = ({ label, value, sub, accent, index = 0 }) => (
  <div
    className="tc-fade-up"
    style={{
      animationDelay: `${index * 60}ms`,
      background: 'var(--surface)',
      borderRadius: 10,
      padding: '18px 20px 16px',
      borderTop: `2px solid ${accent}`,
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {/* subtle ambient glow */}
    <div style={{
      position: 'absolute', top: -1, left: 0, right: 0, height: 48,
      background: `linear-gradient(180deg, ${accent}0c 0%, transparent 100%)`,
      pointerEvents: 'none',
    }} />
    <p style={{
      fontFamily: 'var(--font-data)',
      margin: '0 0 10px',
      fontSize: 9,
      color: 'var(--text-3)',
      textTransform: 'uppercase',
      letterSpacing: '1.4px',
      fontWeight: 500,
    }}>
      {label}
    </p>
    <p style={{
      fontFamily: 'var(--font-data)',
      fontSize: 26,
      fontWeight: 600,
      margin: '0 0 5px',
      color: accent,
      letterSpacing: '-0.8px',
      lineHeight: 1,
    }}>
      {value}
    </p>
    <p style={{ color: 'var(--text-3)', fontSize: 11, margin: 0, fontWeight: 400 }}>{sub}</p>
  </div>
);

const GradeBadge = ({ grade }) => (
  <span style={{
    background: GRADE_COLOR(grade) + '1a',
    color: GRADE_COLOR(grade),
    border: `1px solid ${GRADE_COLOR(grade)}33`,
    padding: '2px 7px', borderRadius: 5,
    fontSize: 11, fontWeight: 700,
    fontFamily: 'var(--font-data)',
  }}>
    {grade || '—'}
  </span>
);

const ValueBadge = ({ delta }) => {
  if (delta === null || delta === undefined) return <span style={{ color: 'var(--text-4)' }}>—</span>;
  const color = delta <= -5 ? GREEN : delta <= 5 ? 'var(--text-2)' : delta <= 15 ? AMBER : RED;
  const label = delta <= -5 ? 'UNDER' : delta <= 5 ? 'FAIR' : 'OVER';
  return (
    <span style={{ fontFamily: 'var(--font-data)', color, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      <span style={{ opacity: 0.75 }}>{delta > 0 ? '+' : ''}{delta}%</span>
      {' '}
      <span style={{ fontSize: 9, letterSpacing: '0.5px' }}>{label}</span>
    </span>
  );
};

const DecisionBadge = ({ yr, type }) => {
  const color = yr <= 2026 ? RED : yr === 2027 ? AMBER : 'var(--text-3)';
  const TYPE_LABEL = { extend: 'EXT', cut: 'CUT', void: 'VOID', restructure: 'RESTR', monitor: 'MON' };
  return (
    <span style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-data)' }}>
      <span style={{ fontWeight: 600, color, fontSize: 12 }}>{yr}</span>
      <span style={{ color: 'var(--text-4)', marginLeft: 4, fontSize: 9, fontWeight: 600, letterSpacing: '0.5px' }}>
        {TYPE_LABEL[type] || type?.toUpperCase()}
      </span>
    </span>
  );
};

const PosBadge = ({ pos, teamPrimary }) => {
  const color = teamPrimary || MUTED;
  return (
    <span style={{
      background: color + '1a', color,
      border: `1px solid ${color}33`,
      padding: '2px 7px', borderRadius: 5,
      fontSize: 10, fontWeight: 600,
      fontFamily: 'var(--font-data)',
      letterSpacing: '0.3px',
    }}>
      {pos}
    </span>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface-3)', border: '1px solid var(--border-2)',
      borderRadius: 8, padding: '10px 14px',
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--text-1)', fontSize: 13 }}>{label}</p>
      {payload.map((p, i) => {
        const name = (p.name === 'Ceiling' && label !== '2026') ? 'Est. Cap Ceiling' : p.name;
        return (
          <p key={i} style={{ margin: '2px 0', color: p.color || p.stroke, fontSize: 12, fontFamily: 'var(--font-data)' }}>
            <span style={{ color: 'var(--text-3)', marginRight: 6 }}>{name}:</span>
            {typeof p.value === 'number' && p.value > 10_000 ? fmt(p.value) : p.value}
          </p>
        );
      })}
    </div>
  );
};

// ─── cap trajectory ───────────────────────────────────────────────────────────
const CapTrajectory = ({ trajectory, teamPrimary }) => {
  const primary = teamPrimary || MUTED;
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '22px 22px 12px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.2px' }}>
            Cap Trajectory · 2026–2028
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>
            Committed cap vs ceiling · 2026 official Top-51 · 2027–28 from contract schedules
          </p>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 18, height: 2.5, background: primary, display: 'inline-block', borderRadius: 2 }} />
            <span style={{ color: 'var(--text-2)' }}>Committed</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 18, height: 0, borderTop: `2px dashed var(--text-3)`, display: 'inline-block' }} />
            <span style={{ color: 'var(--text-2)' }}>Ceiling</span>
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <ComposedChart data={trajectory} margin={{ top: 22, right: 18, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="tcGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={primary} stopOpacity={0.35} />
              <stop offset="95%" stopColor={primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="year" stroke="transparent" tick={{ fill: 'var(--text-3)', fontSize: 12, fontFamily: 'var(--font-data)', fontWeight: 500 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => '$' + (v/1_000_000).toFixed(0) + 'M'} stroke="transparent" tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-data)' }} axisLine={false} tickLine={false} width={50} domain={[0, 350_000_000]} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-2)', strokeWidth: 1 }} />
          <Area type="monotone" dataKey="committed" name="Committed" stroke={primary} strokeWidth={2} fill="url(#tcGrad)"
            dot={{ r: 4, fill: primary, strokeWidth: 2, stroke: 'var(--bg)' }}
            activeDot={{ r: 6, fill: primary }} />
          <Line type="monotone" dataKey="ceiling" name="Ceiling" stroke="var(--text-3)" strokeWidth={1.5} strokeDasharray="7 4"
            dot={{ r: 3, fill: 'var(--text-3)', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: 'var(--text-3)' }} />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 20, paddingTop: 10, borderTop: '1px solid var(--border)', marginTop: 2 }}>
        {trajectory.map((t) => (
          <div key={t.year} style={{ flex: 1 }}>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--text-3)' }}>
              {t.year} {t.year === '2026' ? 'space' : 'est.'}
            </span>
            <span style={{
              marginLeft: 8, fontFamily: 'var(--font-data)',
              fontWeight: 600, fontSize: 12,
              color: t.space > 50_000_000 ? GREEN : AMBER,
            }}>
              {fmt(t.space)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── contract intelligence panel ─────────────────────────────────────────────
const Shimmer = ({ h = 13, w = '100%' }) => (
  <div style={{
    height: h, width: w, borderRadius: 4, marginBottom: 8,
    background: 'linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)',
    backgroundSize: '200% 100%',
    animation: 'tc-shimmer 1.4s infinite',
  }} />
);

const PanelSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    {['THE VERDICT','MARKET CONTEXT','RISK SIGNALS','THE DECISION'].map((t) => (
      <div key={t}>
        <Shimmer h={9} w={100} />
        <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 16 }}>
          <Shimmer w="90%" /><Shimmer w="76%" /><Shimmer w="52%" />
        </div>
      </div>
    ))}
  </div>
);

const PanelSection = ({ title, children, accent }) => (
  <div>
    <p style={{
      margin: '0 0 8px',
      fontFamily: 'var(--font-data)', fontSize: 9,
      fontWeight: 600, color: accent || MUTED,
      textTransform: 'uppercase', letterSpacing: '1.8px',
    }}>
      {title}
    </p>
    <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '14px 16px' }}>
      {children}
    </div>
  </div>
);

const SIGNAL_COLORS = { green: GREEN, yellow: AMBER, red: RED };

function ContractPanel({ player, onClose, teamName, teamCode, capCeiling, teamPrimary }) {
  const [intel,   setIntel]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const primary = teamPrimary || MUTED;

  useEffect(() => {
    if (!player) return;
    setLoading(true); setIntel(null); setError(null);

    const system = `You are an NFL contract analyst specializing in the ${teamName}. Return ONLY valid JSON — no markdown fences, no commentary — with exactly this structure:
{
  "verdict": "2-3 sentences of plain English on whether this contract is good or bad value and why",
  "marketContext": [
    {"player":"First Last","team":"Team","apy":"$XM","capPct":"X.X%","note":"one phrase"},
    {"player":"First Last","team":"Team","apy":"$XM","capPct":"X.X%","note":"one phrase"},
    {"player":"First Last","team":"Team","apy":"$XM","capPct":"X.X%","note":"one phrase"}
  ],
  "riskSignals": [
    {"level":"green","text":"one sentence on a contract strength"},
    {"level":"yellow","text":"one sentence on a moderate concern"},
    {"level":"red","text":"one sentence on the biggest risk"}
  ],
  "decision": "2-3 sentences on the specific cap decision the ${teamName} front office faces on this contract in the next 12 months"
}`;

    const userMsg = `Player: ${player.fullName}
Position: ${player.position}
Team: ${teamName}
Age: ${player.age || 'unknown'}
Guaranteed money remaining (dead cap): ${fmt(player.dead)}
Years remaining: ${player.yrs}
Market delta: ${player.mktDelta > 0 ? '+' : ''}${player.mktDelta ?? 0}% vs position market
Contract grade: ${player.grade}
Scout note: ${player.note}`;

    const apiUrl = process.env.NODE_ENV === 'production'
      ? '/api/claude'
      : '/api/anthropic/v1/messages';

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system,
        messages: [{ role: 'user', content: userMsg }],
      }),
    })
      .then((r) => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json(); })
      .then((r) => {
        const raw = (r.content?.[0]?.text || '{}')
          .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        setIntel(JSON.parse(raw));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [player?.fullName]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = !!player;

  return (
    <>
      {visible && (
        <div
          onClick={onClose}
          className="tc-fade-in"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 99 }}
        />
      )}

      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh',
        width: '36%', minWidth: 460,
        background: 'var(--surface)', borderLeft: '1px solid var(--border-2)',
        zIndex: 100, overflowY: 'auto', padding: '26px 26px 56px',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}>
        {/* colored top stripe */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${primary}, ${primary}55)`,
        }} />

        {player && (
          <>
            {/* panel header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, marginTop: 6 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.4px' }}>
                  {player.fullName}
                </h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                  <PosBadge pos={player.position} teamPrimary={primary} />
                  {player.age && <span style={{ color: 'var(--text-3)', fontSize: 11 }}>Age {player.age}</span>}
                  <span style={{ color: 'var(--border-2)' }}>·</span>
                  <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{player.yrs} yr{player.yrs !== 1 ? 's' : ''} remaining</span>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text-2)', width: 30, height: 30, borderRadius: 8,
                  cursor: 'pointer', fontSize: 16, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'var(--border-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                ×
              </button>
            </div>

            {/* quick stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
              {[
                { label: 'Dead Cap',  value: fmt(player.dead),
                  color: RED },
                { label: 'vs Market',
                  value: (player.mktDelta > 0 ? '+' : '') + (player.mktDelta ?? 0) + '%',
                  color: (player.mktDelta ?? 0) < -5 ? GREEN : (player.mktDelta ?? 0) > 5 ? RED : 'var(--text-2)' },
                { label: 'Grade',     value: player.grade || '—', color: GRADE_COLOR(player.grade) },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center',
                  border: '1px solid var(--border)',
                }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-data)', fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {label}
                  </p>
                  <p style={{ margin: '5px 0 0', fontFamily: 'var(--font-data)', fontSize: 17, fontWeight: 600, color }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {loading && <PanelSkeleton />}

            {error && (
              <div style={{ background: RED + '12', border: `1px solid ${RED}2e`, borderRadius: 8, padding: 16 }}>
                <p style={{ margin: 0, color: RED, fontSize: 13 }}>Analysis failed: {error}</p>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-3)' }}>
                  Make sure REACT_APP_ANTHROPIC_API_KEY is set in your .env file.
                </p>
              </div>
            )}

            {intel && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <PanelSection title="The Verdict" accent={primary}>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: 'var(--text-1)', fontWeight: 400 }}>
                    {intel.verdict}
                  </p>
                </PanelSection>

                <PanelSection title="Market Context" accent={primary}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Player','Team','APY','% Cap','Note'].map((h) => (
                          <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontFamily: 'var(--font-data)', fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500 }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ background: primary + '12', borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '9px 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{player.fullName}</td>
                        <td style={{ padding: '9px 8px', fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--text-2)' }}>{teamCode}</td>
                        <td style={{ padding: '9px 8px', fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: 600, color: primary }}>{fmt(player.dead)}</td>
                        <td style={{ padding: '9px 8px', fontFamily: 'var(--font-data)', fontSize: 11, color: primary }}>{fmtPct(player.dead, capCeiling)}</td>
                        <td style={{ padding: '9px 8px', fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>this contract</td>
                      </tr>
                      {(intel.marketContext || []).map((c, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '9px 8px', fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{c.player}</td>
                          <td style={{ padding: '9px 8px', fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--text-2)' }}>{c.team}</td>
                          <td style={{ padding: '9px 8px', fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{c.apy}</td>
                          <td style={{ padding: '9px 8px', fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--text-2)' }}>{c.capPct}</td>
                          <td style={{ padding: '9px 8px', fontSize: 11, color: 'var(--text-3)' }}>{c.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </PanelSection>

                <PanelSection title="Risk Signals" accent={primary}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {(intel.riskSignals || []).map((s, i) => {
                      const col = SIGNAL_COLORS[s.level] || 'var(--text-2)';
                      return (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: col, flexShrink: 0, marginTop: 5 }} />
                          <span style={{ fontSize: 12.5, color: 'var(--text-1)', lineHeight: 1.65, fontWeight: 400 }}>{s.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </PanelSection>

                <PanelSection title="The Decision" accent={primary}>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: 'var(--text-1)', fontWeight: 400 }}>
                    {intel.decision}
                  </p>
                </PanelSection>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── main dashboard ───────────────────────────────────────────────────────────
export default function TeamDashboard() {
  const { teamCode: teamCodeParam } = useParams();
  const navigate = useNavigate();

  const teamCode = teamCodeParam?.toUpperCase();
  const team     = TEAM_BY_CODE[teamCode];

  useEffect(() => { if (!team) navigate('/'); }, [team, navigate]);

  const { rawData, perfData } = useMemo(() => {
    if (!team) return { rawData: null, perfData: null };
    try {
      const raw  = require(`./data/${team.fileCode}_contracts.json`); // eslint-disable-line
      const perf = require(`./data/${team.fileCode}_performance.json`); // eslint-disable-line
      return { rawData: raw, perfData: perf };
    } catch (_) {
      return { rawData: null, perfData: null };
    }
  }, [team]);

  // ── derived data ────────────────────────────────────────────────────────────
  const { ALL_PLAYERS, ACTIVE, DEAD_TOTAL, CAP_CEILING, adj2026Cap, traj2026,
          capSpaceOfficial, TRAJECTORY, ALL_POSITIONS, PERF_MAP } = useMemo(() => {
    if (!rawData) return {
      ALL_PLAYERS: [], ACTIVE: [], DEAD_TOTAL: 0, CAP_CEILING: 301_200_000,
      adj2026Cap: 301_200_000, traj2026: 0, capSpaceOfficial: 0,
      TRAJECTORY: [], ALL_POSITIONS: ['ALL'], PERF_MAP: {},
    };

    const mapRow = (p, isReleased) => {
      const fullName = p.full_name || '';
      if (!fullName) return null;
      const capHit = parseDollars(p.cap_hit);
      const dead   = isReleased ? capHit : parseDollars(p.dead_cap);
      const age    = parseInt(p.age, 10) || null;
      const status = isReleased ? (p.roster_status || 'released') : null;
      const group  = POS_GROUP[p.position] || p.position || 'Other';
      const capSchedule = (p.cap_schedule || []).filter((e) => !e.status?.includes('void'));
      const yrs    = capSchedule.filter((e) => e.year >= 2026).length || 1;
      const enrich     = p.enrich || {};
      const grade      = enrich.grade              ?? null;
      const mktDelta   = parseMktDelta(enrich.value);
      const note       = enrich.note               ?? '';
      const decisionYr   = enrich.decision?.year   ?? 2026;
      const decisionType = enrich.decision?.type   ?? 'cut';
      return { fullName, status, position: p.position, group, age, dead, capHit, capSchedule, yrs, grade, mktDelta, note, decisionYr, decisionType };
    };

    const allPlayers = [
      ...(rawData.roster   || []).map((p) => mapRow(p, false)),
      ...(rawData.released || []).map((p) => mapRow(p, true)),
    ].filter(Boolean);

    const active    = allPlayers.filter((p) => !p.status && p.position);
    const deadTotal = allPlayers.reduce((s, p) => s + p.dead, 0);
    const summary   = rawData.cap_summary || {};
    const pd        = (key) => parseDollars(summary[key] || '0');

    const capCeiling   = pd('2026 NFL Salary Cap') || 301_200_000;
    const adj2026      = pd('Adjusted Salary Cap') || 323_032_099;
    const traj26       = pd('Cap Allocations (Top-51)') || active.reduce((s, p) => s + p.capHit, 0);
    const capSpace     = pd('Cap Space (Top-51)');
    const CAP_CEILINGS = { 2026: adj2026, 2027: 317_000_000, 2028: 334_000_000 };

    const scheduleSum = (yr) =>
      active.reduce((s, p) => {
        const e = (p.capSchedule || []).find((x) => x.year === yr);
        return s + (e ? parseDollars(e.cap_hit) : 0);
      }, 0);

    const traj27 = scheduleSum(2027);
    const traj28 = scheduleSum(2028);
    const trajectory = [
      { year: '2026', committed: traj26, ceiling: CAP_CEILINGS[2026], space: CAP_CEILINGS[2026] - traj26 },
      { year: '2027', committed: traj27, ceiling: CAP_CEILINGS[2027], space: CAP_CEILINGS[2027] - traj27 },
      { year: '2028', committed: traj28, ceiling: CAP_CEILINGS[2028], space: CAP_CEILINGS[2028] - traj28 },
    ];

    const allPositions = ['ALL', ...Array.from(new Set(active.map((p) => p.position))).sort()];
    const perfMap = Object.fromEntries(((perfData?.players) || []).map((p) => [p.name, p]));

    return {
      ALL_PLAYERS: allPlayers, ACTIVE: active, DEAD_TOTAL: deadTotal,
      CAP_CEILING: capCeiling, adj2026Cap: adj2026, traj2026: traj26,
      capSpaceOfficial: capSpace, TRAJECTORY: trajectory,
      ALL_POSITIONS: allPositions, PERF_MAP: perfMap,
    };
  }, [rawData, perfData]);

  const parseSummaryDollars = (key) => parseDollars((rawData?.cap_summary || {})[key] || '0');

  const EXTENSION_CANDIDATES = useMemo(() => {
    const EXT_EXCLUDE = teamCode === 'DET'
      ? new Set(['Aidan Hutchinson','Jared Goff','Amon-Ra St. Brown','Penei Sewell','Jameson Williams','Kerby Joseph'])
      : new Set();
    const SKILL_POS = new Set(['QB','RB','WR','TE','FB']);
    const STAT_THRESHOLD = {
      RB:   (p) => p.rush_yards >= 700,
      WR:   (p) => p.receptions >= 60,
      TE:   (p) => p.receptions >= 40,
      EDGE: (p) => p.sacks >= 6,
      ED:   (p) => p.sacks >= 6,
      CB:   (p) => p.def_ints >= 3 || p.def_pbu >= 12,
    };
    const yrsRemaining = (player) =>
      (player.capSchedule || []).filter((e) => e.year >= 2026).length;

    return ACTIVE
      .filter((p) => !EXT_EXCLUDE.has(p.fullName))
      .map((p) => {
        const perf  = PERF_MAP[p.fullName] || null;
        const yrs   = yrsRemaining(p);
        const pos   = p.position;
        const age   = p.age || 99;
        const tier1 = perf && (perf.recent_pro_bowl || perf.recent_all_pro) && yrs <= 2;
        const threshold = STAT_THRESHOLD[pos];
        const tier2 = SKILL_POS.has(pos) && threshold && perf && threshold(perf) && age <= 28 && yrs <= 2;
        if (!tier1 && !tier2) return null;
        return { ...p, _perf: perf, _tier: tier1 ? 1 : 2, _yrs: yrs };
      })
      .filter(Boolean)
      .sort((a, b) => a._tier !== b._tier ? a._tier - b._tier : b.capHit - a.capHit);
  }, [ACTIVE, PERF_MAP, teamCode]);

  const byGroup = useMemo(() =>
    GROUP_ORDER
      .map((g) => ({
        group: g,
        dead:  ALL_PLAYERS.filter((p) => p.group === g).reduce((s, p) => s + p.dead, 0),
        count: ALL_PLAYERS.filter((p) => p.group === g).length,
      }))
      .filter((g) => g.dead > 0),
  [ALL_PLAYERS]);

  const byGroupSorted = useMemo(() => [...byGroup].sort((a, b) => b.dead - a.dead), [byGroup]);
  const topDead       = useMemo(() => [...ALL_PLAYERS].filter((p) => p.dead > 0).sort((a, b) => b.dead - a.dead).slice(0, 5), [ALL_PLAYERS]);
  const cutCandidates = useMemo(() =>
    ACTIVE.filter((p) => p.yrs === 1 && p.grade?.startsWith('C') && p.dead < 5_000_000)
      .sort((a, b) => a.dead - b.dead).slice(0, 8),
  [ACTIVE]);

  const [tab,            setTab]            = useState('overview');
  const [sortKey,        setSortKey]        = useState('dead');
  const [filterPos,      setFilterPos]      = useState('ALL');
  const [shareBasis,     setShareBasis]     = useState('cap');

  const rosterRows = useMemo(() => {
    let rows = filterPos === 'ALL' ? ACTIVE : ACTIVE.filter((p) => p.position === filterPos);
    return [...rows].sort((a, b) => {
      if (sortKey === 'dead')  return b.capHit - a.capHit;
      if (sortKey === 'age')   return (b.age || 0) - (a.age || 0);
      if (sortKey === 'yrs')   return b.yrs - a.yrs;
      if (sortKey === 'grade') return (a.grade || 'Z').localeCompare(b.grade || 'Z');
      return a.fullName.localeCompare(b.fullName);
    });
  }, [sortKey, filterPos, ACTIVE]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  if (!team || !rawData) {
    return (
      <div style={{ fontFamily: 'var(--font-ui)', background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-3)', fontFamily: 'var(--font-data)' }}>Loading…</p>
      </div>
    );
  }

  const primary  = team.primary;
  const accent   = team.accent || team.secondary;
  const barPalette = BAR_PALETTE(primary);
  const tabs     = [['overview','Overview'],['roster','Roster'],['contracts','Contracts'],['deadcap','Dead Cap']];

  return (
    <div style={{ fontFamily: 'var(--font-ui)', background: 'var(--bg)', minHeight: '100vh', color: 'var(--text-1)', padding: '0 0 60px' }}>

      {/* ── header ── */}
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* team primary stripe */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${primary}, ${accent}88, transparent)` }} />

        <div style={{ padding: '14px 36px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* back */}
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-2)', padding: '5px 12px',
              borderRadius: 7, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              transition: 'color 0.15s, border-color 0.15s',
              letterSpacing: '0.2px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'var(--border-2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            ← All Teams
          </button>

          {/* team identity */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.8px' }}>
              {team.name}
            </span>
            <span style={{
              fontFamily: 'var(--font-data)', fontSize: 9,
              color: 'var(--text-3)', letterSpacing: '1.5px', textTransform: 'uppercase',
            }}>
              {team.division} · 2026
            </span>
          </div>

          {/* team selector */}
          <select
            value={teamCode}
            onChange={(e) => navigate(`/team/${e.target.value}`)}
            style={{
              marginLeft: 'auto',
              background: 'var(--surface-2)', color: 'var(--text-1)',
              border: '1px solid var(--border)', padding: '5px 10px',
              borderRadius: 7, fontSize: 11, cursor: 'pointer', maxWidth: 200,
              fontFamily: 'var(--font-ui)',
            }}
          >
            {Object.values(TEAM_BY_CODE)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((t) => (
                <option key={t.code} value={t.code}>{t.name}</option>
              ))}
          </select>
        </div>
      </header>

      {/* ── main content ── */}
      <div style={{ padding: '24px 36px 0', maxWidth: 1440, margin: '0 auto' }}>

        {/* stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          <StatCard index={0} label="Cap Used (Top-51)"    value={fmt(traj2026)}               sub={'of ' + fmt(adj2026Cap) + ' adjusted ceiling'} accent={primary} />
          <StatCard index={1} label="Cap Space"            value={fmt(capSpaceOfficial || adj2026Cap - traj2026)} sub="Top-51 remaining" accent={GREEN} />
          <StatCard index={2} label="Active Contracts"     value={ACTIVE.length}               sub={cutCandidates.length + ' cut candidates'} accent={AMBER} />
          <StatCard index={3} label="Extension Watch"      value={EXTENSION_CANDIDATES.length} sub="tier 1/2 candidates" accent={RED} />
        </div>

        {/* adjusted cap footnote */}
        <p style={{ fontFamily: 'var(--font-data)', color: 'var(--text-4)', fontSize: 10, margin: '-4px 0 14px', textAlign: 'right', letterSpacing: '0.2px' }}>
          Adjusted {fmt(adj2026Cap)} = {fmt(CAP_CEILING)} base + {fmt(parseSummaryDollars('2025 Rollover Cap'))} rollover + {fmt(parseSummaryDollars('Adjustment'))} other
        </p>

        {/* trajectory */}
        <div style={{ marginBottom: 16 }}>
          <CapTrajectory trajectory={TRAJECTORY} teamPrimary={primary} />
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '10px 20px', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, letterSpacing: '0.2px',
                background: 'transparent',
                color: tab === key ? 'var(--text-1)' : 'var(--text-3)',
                borderBottom: tab === key ? `2px solid ${primary}` : '2px solid transparent',
                marginBottom: -1,
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* tab panels */}
        <div style={{ paddingTop: 18 }}>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (() => {
            const basis      = shareBasis === 'dead' ? DEAD_TOTAL : CAP_CEILING;
            const basisLabel = shareBasis === 'dead' ? '% of dead cap' : '% of $301.2M cap';
            const Toggle = () => (
              <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 6, padding: 2, gap: 2 }}>
                {[['dead','Dead Cap'],['cap','2026 Cap']].map(([val, label]) => (
                  <button key={val} onClick={() => setShareBasis(val)} style={{
                    padding: '4px 10px', border: 'none', cursor: 'pointer', borderRadius: 4,
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.3px',
                    background: shareBasis === val ? primary : 'transparent',
                    color: shareBasis === val ? '#fff' : 'var(--text-3)',
                    transition: 'all 0.15s',
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            );
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>
                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '20px 20px 12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: '-0.2px' }}>
                        {shareBasis === 'dead' ? 'Dead Cap by Position Group' : 'Cap by Position Group'}
                      </h3>
                      <p style={{ margin: '3px 0 14px', fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>
                        {shareBasis === 'dead' ? 'Share of total dead cap' : 'Share of $301.2M cap ceiling'}
                      </p>
                    </div>
                    <Toggle />
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={byGroup} margin={{ top: 10, right: 10, left: 6, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="group" stroke="transparent" tick={{ fill: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-data)' }} axisLine={false} tickLine={false} />
                      {shareBasis === 'dead'
                        ? <YAxis tickFormatter={(v) => '$'+(v/1_000_000).toFixed(0)+'M'} stroke="transparent" tick={{ fill:'var(--text-3)', fontSize:10, fontFamily:'var(--font-data)' }} axisLine={false} tickLine={false} width={46} />
                        : <YAxis tickFormatter={(v) => ((v/CAP_CEILING)*100).toFixed(0)+'%'} stroke="transparent" tick={{ fill:'var(--text-3)', fontSize:10, fontFamily:'var(--font-data)' }} axisLine={false} tickLine={false} width={38} />
                      }
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: `${primary}0a` }} />
                      <Bar dataKey="dead" name={shareBasis === 'dead' ? 'Dead Cap' : 'Cap Share'} radius={[4,4,0,0]} maxBarSize={50}>
                        {byGroup.map((_, i) => <Cell key={i} fill={barPalette[i % barPalette.length]} />)}
                        <LabelList dataKey="dead" position="top"
                          formatter={(v) => shareBasis === 'dead' ? fmt(v) : ((v/CAP_CEILING)*100).toFixed(1)+'%'}
                          style={{ fill: 'var(--text-3)', fontSize: 9, fontFamily: 'var(--font-data)' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '20px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: '-0.2px' }}>Position Share</h3>
                      <p style={{ margin: '3px 0 10px', fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>{basisLabel}</p>
                    </div>
                    <Toggle />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {byGroupSorted.map((g, i) => {
                      const pct = (g.dead / basis) * 100;
                      const col = barPalette[i % barPalette.length];
                      return (
                        <div key={g.group}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-data)' }}>{g.group}</span>
                            <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--text-2)' }}>
                              {fmt(g.dead)} · {pct.toFixed(1)}%
                            </span>
                          </div>
                          <div style={{ background: 'var(--surface-3)', borderRadius: 2, height: 4 }}>
                            <div style={{ width: Math.min(pct,100)+'%', height: 4, borderRadius: 2, background: col, transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── ROSTER ── */}
          {tab === 'roster' && (
            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '20px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={filterPos} onChange={(e) => setFilterPos(e.target.value)}
                  style={{ background: 'var(--surface-2)', color: 'var(--text-1)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  {ALL_POSITIONS.map((p) => <option key={p} value={p}>{p === 'ALL' ? 'All Positions' : p}</option>)}
                </select>
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}
                  style={{ background: 'var(--surface-2)', color: 'var(--text-1)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  <option value="dead">Sort: Cap Hit</option>
                  <option value="yrs">Sort: Years Left</option>
                  <option value="grade">Sort: Grade</option>
                  <option value="age">Sort: Age</option>
                  <option value="name">Sort: Name</option>
                </select>
                <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4 }}>
                  {rosterRows.length} players · click any row for contract intelligence
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-2)' }}>
                    {['#','Player','Pos','Age','Cap Hit','% Cap','Yrs','Grade','vs Mkt','Decision','Scout Note'].map((h) => (
                      <th key={h} style={{
                        padding: '7px 10px', fontFamily: 'var(--font-data)',
                        color: 'var(--text-3)', fontSize: 9,
                        textTransform: 'uppercase', letterSpacing: '0.8px',
                        fontWeight: 500, textAlign: 'left', whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rosterRows.map((p, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                      onClick={() => setSelectedPlayer(p)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-data)', color: 'var(--text-4)', fontSize: 11 }}>{i+1}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{p.fullName}</span>
                          {EXTENSION_CANDIDATES.some((c) => c.fullName === p.fullName) && (
                            <span style={{ background: GREEN+'18', color: GREEN, border: `1px solid ${GREEN}33`, padding: '1px 5px', borderRadius: 4, fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700, letterSpacing: '0.6px' }}>
                              EXTEND
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '9px 10px' }}><PosBadge pos={p.position} teamPrimary={primary} /></td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-data)', color: 'var(--text-2)', fontSize: 12 }}>{p.age || '—'}</td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-data)', fontWeight: 600, fontSize: 12, color: p.capHit > 0 ? 'var(--text-1)' : 'var(--text-4)' }}>
                        {p.capHit > 0 ? fmt(p.capHit) : '—'}
                      </td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--text-3)' }}>
                        {p.capHit > 0 ? fmtPct(p.capHit, CAP_CEILING) : '—'}
                      </td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: 600, color: p.yrs === 1 ? AMBER : p.yrs >= 3 ? GREEN : 'var(--text-1)' }}>
                        {p.yrs}yr
                      </td>
                      <td style={{ padding: '9px 10px' }}><GradeBadge grade={p.grade} /></td>
                      <td style={{ padding: '9px 10px' }}><ValueBadge delta={p.mktDelta} /></td>
                      <td style={{ padding: '9px 10px' }}><DecisionBadge yr={p.decisionYr} type={p.decisionType} /></td>
                      <td style={{ padding: '9px 10px', fontSize: 11, color: 'var(--text-3)', maxWidth: 220 }}>{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── CONTRACTS ── */}
          {tab === 'contracts' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* cut candidates */}
              <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '20px', border: '1px solid var(--border)' }}>
                <h3 style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, letterSpacing: '-0.2px' }}>Cut Candidates</h3>
                <p style={{ color: 'var(--text-3)', fontSize: 11, margin: '0 0 16px', fontWeight: 400 }}>
                  1-year deals · grade C or below · dead cap under $5M
                </p>
                {cutCandidates.length === 0
                  ? <p style={{ color: 'var(--text-4)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No candidates meet current thresholds</p>
                  : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {cutCandidates.map((p, i) => (
                        <div key={i} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border)' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                              <span style={{ fontWeight: 700, fontSize: 13 }}>{p.fullName}</span>
                              <PosBadge pos={p.position} teamPrimary={primary} />
                              <GradeBadge grade={p.grade} />
                            </div>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>{p.note}</p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ margin: 0, fontFamily: 'var(--font-data)', fontWeight: 600, fontSize: 13, color: AMBER }}>
                              {fmt(p.dead)}
                            </p>
                            <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--text-3)' }}>
                              {fmtPct(p.dead, CAP_CEILING)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>

              {/* extension candidates */}
              <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '20px', border: '1px solid var(--border)' }}>
                <h3 style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, letterSpacing: '-0.2px' }}>Extension Candidates</h3>
                <p style={{ color: 'var(--text-3)', fontSize: 11, margin: '0 0 4px', fontWeight: 400 }}>
                  <span style={{ color: AMBER, fontWeight: 700 }}>T1</span> Pro Bowl/All-Pro · ≤2 yrs remaining
                  &nbsp;·&nbsp;
                  <span style={{ color: MUTED, fontWeight: 700 }}>T2</span> Stat threshold · age ≤28 · ≤2 yrs
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 13 }}>
                  {EXTENSION_CANDIDATES.map((p, i) => {
                    const perf = p._perf;
                    const tier = p._tier;
                    const yrs  = p._yrs;
                    const isAP = perf?.recent_all_pro;
                    const isPB = perf?.recent_pro_bowl;
                    const pos  = p.position;
                    const tierColor = tier === 1 ? AMBER : MUTED;

                    const statLine = (() => {
                      if (!perf) return null;
                      if (pos === 'RB')               return `${perf.rush_yards?.toLocaleString()} rush yds · ${perf.receptions} rec`;
                      if (pos === 'WR')               return `${perf.receptions} receptions`;
                      if (pos === 'TE')               return `${perf.receptions} receptions`;
                      if (pos === 'EDGE' || pos==='ED') return `${perf.sacks} sacks · ${perf.def_pressures} pressures`;
                      if (pos === 'CB')               return `${perf.def_ints} INT · ${perf.def_pbu} PBU`;
                      return `${perf.snap_pct}% snap rate`;
                    })();

                    return (
                      <div key={i} style={{
                        background: 'var(--surface-2)', borderRadius: 8, padding: '11px 13px',
                        display: 'flex', alignItems: 'center', gap: 10,
                        border: '1px solid var(--border)',
                        borderLeft: `3px solid ${tierColor}55`,
                      }}>
                        <div style={{ width: 18, flexShrink: 0, textAlign: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, color: tierColor, letterSpacing: '0.3px' }}>T{tier}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{p.fullName}</span>
                            <PosBadge pos={p.position} teamPrimary={primary} />
                            <GradeBadge grade={p.grade} />
                            {isAP && <span style={{ background: '#fbbf2418', color: AMBER, border: `1px solid ${AMBER}33`, padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700 }}>ALL-PRO</span>}
                            {isPB && !isAP && <span style={{ background: MUTED+'18', color: MUTED, border: `1px solid ${MUTED}33`, padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700 }}>PRO BOWL</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 10, fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--text-3)', flexWrap: 'wrap' }}>
                            <span>{yrs}yr remaining</span>
                            <span>age {p.age || '—'}</span>
                            {statLine && <span style={{ color: 'var(--text-2)' }}>{statLine}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ margin: 0, fontFamily: 'var(--font-data)', fontWeight: 600, fontSize: 13, color: GREEN }}>{fmt(p.capHit)}</p>
                          <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--text-3)' }}>2026 cap hit</p>
                        </div>
                      </div>
                    );
                  })}
                  {EXTENSION_CANDIDATES.length === 0 && (
                    <p style={{ color: 'var(--text-4)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                      No candidates meet current thresholds
                    </p>
                  )}
                </div>
              </div>

              {/* grade distribution */}
              <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '20px', border: '1px solid var(--border)', gridColumn: '1 / -1' }}>
                <h3 style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, letterSpacing: '-0.2px' }}>Contract Grade Distribution by Position</h3>
                <p style={{ margin: '0 0 16px', fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>
                  How well is each group paid relative to market?
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {GROUP_ORDER.filter((g) => ACTIVE.some((p) => p.group === g)).map((g) => {
                    const players = ACTIVE.filter((p) => p.group === g);
                    const grades  = { A: 0, B: 0, C: 0, D: 0 };
                    players.forEach((p) => { const t = (p.grade || 'C')[0]; grades[t] = (grades[t] || 0) + 1; });
                    const total = players.length || 1;
                    return (
                      <div key={g} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '11px 13px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontFamily: 'var(--font-data)', fontWeight: 600, fontSize: 12 }}>{g}</span>
                          <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--text-3)' }}>{players.length}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 2, height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 7 }}>
                          {grades.A > 0 && <div style={{ flex: grades.A, background: GREEN }} />}
                          {grades.B > 0 && <div style={{ flex: grades.B, background: MUTED }} />}
                          {grades.C > 0 && <div style={{ flex: grades.C, background: AMBER }} />}
                          {grades.D > 0 && <div style={{ flex: grades.D, background: RED }} />}
                        </div>
                        <div style={{ display: 'flex', gap: 8, fontFamily: 'var(--font-data)', fontSize: 9 }}>
                          {Object.entries(grades).filter(([,v]) => v > 0).map(([k,v]) => (
                            <span key={k} style={{ color: GRADE_COLOR(k) }}>{k}: {((v/total)*100).toFixed(0)}%</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── DEAD CAP ── */}
          {tab === 'deadcap' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '20px', border: '1px solid var(--border)' }}>
                <h3 style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, letterSpacing: '-0.2px' }}>Top 5 Dead Cap Risks</h3>
                <p style={{ color: 'var(--text-3)', fontSize: 11, margin: '0 0 22px', fontWeight: 400 }}>
                  Cap charge if player released today · includes released players
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {topDead.map((p, i) => {
                    const pct    = topDead[0].dead > 0 ? (p.dead / topDead[0].dead) * 100 : 0;
                    const colors = [RED, AMBER, AMBER, MUTED, MUTED];
                    const col    = colors[i];
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span style={{
                              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                              background: col + '18', border: `1px solid ${col}44`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 700, color: col,
                            }}>{i+1}</span>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{p.fullName}</span>
                            <PosBadge pos={p.position} teamPrimary={primary} />
                            {p.status && (
                              <span style={{ background: AMBER+'18', color: AMBER, border: `1px solid ${AMBER}33`, padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 600 }}>
                                {p.status}
                              </span>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontFamily: 'var(--font-data)', fontWeight: 700, fontSize: 14, color: col }}>{fmt(p.dead)}</span>
                            <span style={{ marginLeft: 6, fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--text-3)' }}>{fmtPct(p.dead, CAP_CEILING)}</span>
                          </div>
                        </div>
                        <div style={{ background: 'var(--surface-3)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <div style={{ width: pct+'%', height: 6, borderRadius: 4, background: `linear-gradient(90deg, ${col}, ${col}77)`, transition: 'width 0.5s ease' }} />
                        </div>
                        {p.age && (
                          <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--text-3)' }}>
                            Age {p.age} · {p.note || ''}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '20px 20px 12px', border: '1px solid var(--border)' }}>
                <h3 style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, letterSpacing: '-0.2px' }}>Dead Cap by Position</h3>
                <p style={{ margin: '0 0 16px', fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>
                  Aggregate obligation per group
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={byGroupSorted} layout="vertical" margin={{ top: 0, right: 68, left: 28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => '$'+(v/1_000_000).toFixed(0)+'M'} stroke="transparent" tick={{ fill:'var(--text-3)', fontSize:9, fontFamily:'var(--font-data)' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="group" stroke="transparent" tick={{ fill:'var(--text-3)', fontSize:11, fontFamily:'var(--font-data)' }} axisLine={false} tickLine={false} width={34} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: `${primary}0a` }} />
                    <Bar dataKey="dead" name="Dead Cap" radius={[0,4,4,0]} maxBarSize={22}>
                      {byGroupSorted.map((_, i) => <Cell key={i} fill={barPalette[i % barPalette.length]} />)}
                      <LabelList dataKey="dead" position="right" formatter={(v) => fmt(v)} style={{ fill:'var(--text-3)', fontSize:10, fontFamily:'var(--font-data)' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* footer */}
      <p style={{ fontFamily: 'var(--font-data)', color: 'var(--text-4)', fontSize: 10, marginTop: 32, textAlign: 'center', letterSpacing: '0.3px' }}>
        TRUECAP · {team.name.toUpperCase()} 2026 · Grades & trajectory are estimates based on available contract data
      </p>

      <ContractPanel
        player={selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        teamName={team.name}
        teamCode={teamCode}
        capCeiling={CAP_CEILING}
        teamPrimary={primary}
      />
    </div>
  );
}
