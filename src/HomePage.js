import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TEAMS, DIVISIONS } from './teams';

// ─── helpers ──────────────────────────────────────────────────────────────────
const parseDollars = (str) => {
  if (!str || str === '-') return 0;
  const m = String(str).split('\n')[0].match(/\$?([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) || 0 : 0;
};

const fmtM = (n) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return sign + '$' + (abs / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000)     return sign + '$' + (abs / 1_000).toFixed(0) + 'K';
  return sign + '$' + abs;
};

function loadAllCapData() {
  return TEAMS.map((team) => {
    try {
      const data = require(`./data/${team.fileCode}_contracts.json`);
      const capSpace = parseDollars(data.cap_summary?.['Cap Space (Top-51)']);
      const capUsed  = parseDollars(data.cap_summary?.['Cap Allocations (Top-51)']);
      const adjCap   = parseDollars(data.cap_summary?.['Adjusted Salary Cap']) || 301_200_000;
      return { ...team, capSpace, capUsed, adjCap };
    } catch (_) {
      return { ...team, capSpace: 0, capUsed: 0, adjCap: 301_200_000 };
    }
  });
}

// ─── team card ────────────────────────────────────────────────────────────────
function TeamCard({ team, onClick }) {
  const [logoFailed, setLogoFailed] = useState(false);

  const usedPct = team.adjCap > 0 ? Math.min((team.capUsed / team.adjCap) * 100, 100) : 0;
  const primary = team.primary || '#4a5568';

  const spaceColor =
    team.capSpace > 40_000_000 ? 'var(--green)' :
    team.capSpace > 10_000_000 ? 'var(--amber)' : 'var(--red)';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${primary}`,
        borderRadius: 8,
        padding: '13px 14px 12px',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
    >
      {/* team name + logo/badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)', lineHeight: 1.3 }}>
          {team.name}
        </div>
        {!logoFailed ? (
          <img
            src={`https://a.espncdn.com/i/teamlogos/nfl/500/${team.fileCode}.png`}
            alt={team.code}
            onError={() => setLogoFailed(true)}
            style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0, marginLeft: 8 }}
          />
        ) : (
          <span style={{
            fontFamily: 'var(--font-data)',
            background: 'var(--surface-3)',
            color: '#999',
            border: '1px solid var(--border-2)',
            padding: '2px 7px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.5px',
            flexShrink: 0,
            marginLeft: 8,
          }}>
            {team.code}
          </span>
        )}
      </div>

      {/* available cap space */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: '#777', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2 }}>
          Available · Top-51
        </div>
        <div style={{
          fontFamily: 'var(--font-data)',
          fontSize: 20,
          fontWeight: 600,
          color: spaceColor,
          letterSpacing: '-0.4px',
          lineHeight: 1.2,
        }}>
          {fmtM(team.capSpace)}
        </div>
      </div>

      {/* cap used bar — green→amber→red gradient revealed by usage % */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: '#777', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Cap Used</span>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: '#999' }}>{usedPct.toFixed(1)}%</span>
        </div>
        {/* track: full gradient; overlay covers unused portion */}
        <div style={{
          position: 'relative', height: 5, borderRadius: 3, overflow: 'hidden',
          background: 'linear-gradient(90deg, var(--green) 0%, var(--amber) 50%, var(--red) 100%)',
        }}>
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: (100 - usedPct) + '%',
            background: 'var(--surface-3)',
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── homepage ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate  = useNavigate();
  const allTeams  = useMemo(() => loadAllCapData(), []);

  const byDivision = useMemo(() => {
    const map = {};
    for (const d of DIVISIONS) map[d] = [];
    for (const t of allTeams) if (map[t.division]) map[t.division].push(t);
    return map;
  }, [allTeams]);

  const totalCapSpace = allTeams.reduce((s, t) => s + t.capSpace, 0);
  const mostCap  = useMemo(() => [...allTeams].sort((a, b) => b.capSpace - a.capSpace)[0], [allTeams]);
  const leastCap = useMemo(() => [...allTeams].sort((a, b) => a.capSpace - b.capSpace)[0], [allTeams]);

  return (
    <div style={{ fontFamily: 'var(--font-ui)', background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── header ── */}
      <header className="tc-page-header" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '18px 32px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.8px', color: 'var(--text-1)', lineHeight: 1, marginBottom: 5 }}>
              TrueCap
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>
              The real numbers behind every NFL contract.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4, fontFamily: 'var(--font-data)' }}>
              League Cap Space
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 20, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.4px' }}>
              {fmtM(totalCapSpace)}
            </div>
          </div>
        </div>
      </header>

      {/* ── substack banner ── */}
      <div style={{
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 32px',
      }}>
        <div style={{
          maxWidth: 1440, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
            Get TrueCap cap intelligence in your inbox — free weekly analysis.
          </span>
          <a
            href="https://truecap.substack.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: 'var(--surface-3)',
              color: 'var(--text-1)',
              border: '1px solid var(--border-2)',
              borderRadius: 6,
              padding: '5px 14px',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              letterSpacing: '0.2px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-3)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
          >
            Subscribe on Substack →
          </a>
        </div>
      </div>

      {/* ── stat banner ── */}
      <section style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="tc-stat-banner" style={{ maxWidth: 1440, margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', height: 80 }}>

          {/* most flexible */}
          <div
            onClick={() => navigate(`/team/${mostCap.code}`)}
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5 }}
          >
            <span style={{ fontSize: 9, fontFamily: 'var(--font-data)', color: '#888', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
              Most Flexible
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 18, fontWeight: 700, color: 'var(--green)', letterSpacing: '-0.4px' }}>
                {fmtM(mostCap.capSpace)}
              </span>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: '#999', fontWeight: 600 }}>
                {mostCap.code}
              </span>
              <span style={{ fontSize: 11, color: '#666' }}>
                {mostCap.name}
              </span>
            </div>
          </div>

          {/* league total — center */}
          <div style={{
            textAlign: 'center', padding: '0 56px',
            borderLeft: '1px solid var(--border-2)', borderRight: '1px solid var(--border-2)',
            height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5,
          }}>
            <span style={{ fontSize: 9, fontFamily: 'var(--font-data)', color: '#888', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
              League Cap Space · 2026
            </span>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 26, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-1px', lineHeight: 1 }}>
              {fmtM(totalCapSpace)}
            </span>
          </div>

          {/* most constrained */}
          <div
            onClick={() => navigate(`/team/${leastCap.code}`)}
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}
          >
            <span style={{ fontSize: 9, fontFamily: 'var(--font-data)', color: '#888', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
              Most Constrained
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 18, fontWeight: 700, color: 'var(--red)', letterSpacing: '-0.4px' }}>
                {fmtM(leastCap.capSpace)}
              </span>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: '#999', fontWeight: 600 }}>
                {leastCap.code}
              </span>
              <span style={{ fontSize: 11, color: '#666' }}>
                {leastCap.name}
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* ── team grid ── */}
      <main className="tc-page-main" style={{ padding: '28px 32px 80px', maxWidth: 1440, margin: '0 auto' }}>
        {['AFC', 'NFC'].map((conf) => (
          <div key={conf} style={{ marginBottom: 44 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{
                fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 700,
                color: conf === 'AFC' ? 'var(--red)' : 'var(--blue)',
                letterSpacing: '2.5px', textTransform: 'uppercase',
              }}>
                {conf}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <div className="tc-team-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              {DIVISIONS.filter((d) => d.startsWith(conf)).map((division) => (
                <div key={division}>
                  <div style={{
                    fontSize: 9.5, fontWeight: 600, color: '#777',
                    textTransform: 'uppercase', letterSpacing: '1.3px',
                    marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)',
                  }}>
                    {division.replace(`${conf} `, '')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(byDivision[division] || []).map((team) => (
                      <TeamCard
                        key={team.code}
                        team={team}
                        onClick={() => navigate(`/team/${team.code}`)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* ── footer ── */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', maxWidth: 1440, margin: '0 auto' }}>
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--text-4)' }}>
          TRUECAP · 2026 NFL CAP INTELLIGENCE
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-4)' }}>
          Data sourced from Spotrac · AI grades are estimates
        </span>
      </div>
    </div>
  );
}
