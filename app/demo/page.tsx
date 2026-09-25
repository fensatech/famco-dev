'use client'
import { useState, useEffect, useCallback } from 'react'

// ── sample data ──────────────────────────────────────────────────────────────

const EVENTS = [
  { id: 1, title: "Emma's Soccer Practice", date: 'Thu, 25 Sep', time: '4:00 PM', color: '#EC4899', who: 'Emma' },
  { id: 2, title: 'Dentist — Liam', date: 'Thu, 25 Sep', time: '11:00 AM', color: '#EF4444', who: 'Liam' },
  { id: 3, title: 'School Parents Meeting', date: 'Fri, 26 Sep', time: '6:30 PM', color: '#0EA5E9', who: 'Both' },
  { id: 4, title: "Emma's Birthday Party", date: 'Sun, 28 Sep', time: '3:00 PM', color: '#F59E0B', who: 'Emma' },
  { id: 5, title: 'Mike — Work Trip', date: 'Mon, 29 Sep', time: 'All day', color: '#6366F1', who: 'Mike' },
  { id: 6, title: 'Swimming Lessons — Liam', date: 'Tue, 30 Sep', time: '5:15 PM', color: '#10B981', who: 'Liam' },
]

const TASKS = [
  { id: 1, title: "Pick up Emma's prescription", done: false, priority: 'high', assignee: 'Sarah' },
  { id: 2, title: "Email Liam's teacher about field trip", done: false, priority: 'medium', assignee: 'Mike' },
  { id: 3, title: 'Renew car insurance', done: false, priority: 'high', assignee: 'Sarah' },
  { id: 4, title: 'Book swimming lessons for Liam', done: false, priority: 'low', assignee: 'Mike' },
  { id: 5, title: 'Buy birthday cake', done: true, priority: 'medium', assignee: 'Sarah' },
  { id: 6, title: "RSVP Emma's party invites", done: true, priority: 'low', assignee: 'Mike' },
]

const EXPENSES = [
  { id: 1, title: 'Woolworths', amount: 142.50, category: 'Groceries', date: 'Sep 24', icon: '🛒' },
  { id: 2, title: 'Origin Energy', amount: 180.00, category: 'Utilities', date: 'Sep 23', icon: '⚡' },
  { id: 3, title: 'Soccer Club Fees', amount: 85.00, category: 'Kids Activities', date: 'Sep 22', icon: '⚽' },
  { id: 4, title: 'Spotify Family', amount: 17.99, category: 'Subscriptions', date: 'Sep 21', icon: '🎵' },
  { id: 5, title: 'Petbarn', amount: 62.40, category: 'Pets', date: 'Sep 20', icon: '🐾' },
  { id: 6, title: 'School Supplies', amount: 48.95, category: 'Education', date: 'Sep 19', icon: '📚' },
]

const DOCUMENTS = [
  { id: 1, title: 'Medicare Cards', type: 'Health', updated: 'Aug 15', icon: '🏥' },
  { id: 2, title: 'House Insurance Policy', type: 'Finance', updated: 'Jul 1', icon: '🏠' },
  { id: 3, title: 'Emma — Birth Certificate', type: 'Legal', updated: 'Jan 10', icon: '📄' },
  { id: 4, title: 'Liam — Vaccination Record', type: 'Health', updated: 'Jun 20', icon: '💉' },
  { id: 5, title: 'Car Registration', type: 'Vehicle', updated: 'Mar 1', icon: '🚗' },
]

const INSIGHTS = [
  { id: 1, title: "Liam's field trip form due Friday", source: 'School email', urgency: 'high', action: 'Print & sign form' },
  { id: 2, title: "Emma's dentist found in calendar", source: 'Google Calendar', urgency: 'medium', action: 'Confirm appointment' },
  { id: 3, title: 'Car service reminder from Toyota', source: 'Email', urgency: 'low', action: 'Book service' },
  { id: 4, title: 'School holidays Sep 29 – Oct 13', source: 'School newsletter', urgency: 'medium', action: 'Plan childcare' },
]

const FACTS = [
  { id: 1, cat: 'Medical', title: "Emma's allergies", value: 'Peanuts, tree nuts — carries EpiPen', icon: '⚕️', color: '#EF4444' },
  { id: 2, cat: 'Medical', title: "Liam's GP", value: 'Dr. Patel — City Medical — 03 9000 1234', icon: '👨‍⚕️', color: '#EF4444' },
  { id: 3, cat: 'School', title: "Emma's teacher", value: "Ms. Reynolds — Year 3B", icon: '🏫', color: '#0EA5E9' },
  { id: 4, cat: 'School', title: 'School hours', value: '8:45 AM – 3:15 PM, Mon–Fri', icon: '🕐', color: '#0EA5E9' },
  { id: 5, cat: 'Home', title: 'Emergency contacts', value: 'Grandma Joan — 0412 000 111', icon: '📞', color: '#10B981' },
  { id: 6, cat: 'Pets', title: 'Biscuit the dog', value: 'Border Collie, 3 yrs — Dr. Kim 03 9555 0001', icon: '🐕', color: '#F59E0B' },
]

const COPARENTING = [
  { day: 'Mon', who: 'Sarah', events: ['School drop-off', 'After-school care'] },
  { day: 'Tue', who: 'Sarah', events: ['School drop-off', 'Swimming — Liam'] },
  { day: 'Wed', who: 'Mike', events: ['School drop-off', 'Soccer — Emma'] },
  { day: 'Thu', who: 'Mike', events: ['School drop-off', 'Dentist — Liam'] },
  { day: 'Fri', who: 'Sarah', events: ['School drop-off', 'Parents evening'] },
  { day: 'Sat', who: 'Mike', events: ['Weekend custody'] },
  { day: 'Sun', who: 'Both', events: ["Emma's birthday party"] },
]

// ── nav ──────────────────────────────────────────────────────────────────────

const NAV = [
  { id: 'home',       label: 'Home',             color: '#6366F1', emoji: '🏠' },
  { id: 'calendar',   label: 'Calendar',          color: '#0EA5E9', emoji: '📅' },
  { id: 'tasks',      label: 'Tasks',             color: '#EC4899', emoji: '✅' },
  { id: 'insights',   label: 'Insights',          color: '#F59E0B', emoji: '✨' },
  { id: 'data',       label: 'Family Knowledge',  color: '#10B981', emoji: '🧠' },
  { id: 'expenses',   label: 'Expenses',          color: '#F97316', emoji: '💰' },
  { id: 'documents',  label: 'Documents',         color: '#3B82F6', emoji: '📁' },
  { id: 'coparenting',label: 'Co-Parenting',      color: '#06B6D4', emoji: '👨‍👩‍👧‍👦' },
  { id: 'settings',   label: 'Manage Family',     color: '#8B5CF6', emoji: '⚙️' },
  { id: 'billing',    label: 'Billing',           color: '#14B8A6', emoji: '💳' },
]

// ── shared styles ─────────────────────────────────────────────────────────────

const card = {
  background: '#fff',
  border: '1px solid rgba(60,60,67,0.10)',
  borderRadius: '16px',
  boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
  padding: '1.25rem',
} as React.CSSProperties

const pill = (color: string) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 10px',
  borderRadius: '99px',
  fontSize: '0.7rem',
  fontWeight: 600,
  background: color + '1a',
  color,
} as React.CSSProperties)

const chip = (color: string) => ({
  width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0,
} as React.CSSProperties)

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '10px',
        border: '1px solid rgba(60,60,67,0.14)',
        background: '#fff',
        color: '#6366F1',
        fontWeight: 600,
        fontSize: '0.8rem',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

// ── tab views ─────────────────────────────────────────────────────────────────

function HomeTab({ ro }: { ro: () => void }) {
  const todayEvents = EVENTS.slice(0, 2)
  const pendingTasks = TASKS.filter(t => !t.done).slice(0, 3)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.875rem' }}>
        {[
          { label: 'Events Today', value: '2', color: '#6366F1' },
          { label: 'Pending Tasks', value: '4', color: '#EC4899' },
          { label: 'New Insights', value: '4', color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#8E8E93', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Today's Events</span>
          <Btn onClick={ro}>+ Add</Btn>
        </div>
        {todayEvents.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(60,60,67,0.07)' }}>
            <div style={chip(e.color)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{e.title}</div>
              <div style={{ fontSize: '0.72rem', color: '#8E8E93' }}>{e.time} · {e.who}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Pending Tasks</span>
          <Btn onClick={ro}>+ Add</Btn>
        </div>
        {pendingTasks.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(60,60,67,0.07)' }}>
            <input type="checkbox" onChange={ro} style={{ accentColor: '#6366F1', width: 16, height: 16, cursor: 'pointer' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.title}</div>
              <div style={{ fontSize: '0.72rem', color: '#8E8E93' }}>{t.assignee}</div>
            </div>
            <span style={pill(t.priority === 'high' ? '#EF4444' : t.priority === 'medium' ? '#F59E0B' : '#10B981')}>
              {t.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalendarTab({ ro }: { ro: () => void }) {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const eventDays = [3, 8, 11, 14, 16, 18, 20, 23, 25, 28]
  const today = 25
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 700 }}>September 2026</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Btn onClick={ro}>‹</Btn>
            <Btn onClick={ro}>›</Btn>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', textAlign: 'center' }}>
          {days.map(d => <div key={d} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8E8E93', padding: '4px 0' }}>{d}</div>)}
          {/* First week starts on Tuesday */}
          <div />
          {Array.from({ length: 30 }, (_, i) => i + 1).map(d => {
            const isToday = d === today
            const hasEvent = eventDays.includes(d)
            return (
              <div
                key={d}
                onClick={ro}
                style={{
                  padding: '6px 0',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: isToday ? 700 : 400,
                  background: isToday ? '#6366F1' : 'transparent',
                  color: isToday ? '#fff' : '#1C1C1E',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {d}
                {hasEvent && !isToday && (
                  <span style={{ position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: '#6366F1', display: 'block' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.875rem' }}>Upcoming Events</div>
        {EVENTS.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(60,60,67,0.07)' }}>
            <div style={{ width: 38, height: 38, borderRadius: '10px', background: e.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              📌
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{e.title}</div>
              <div style={{ fontSize: '0.72rem', color: '#8E8E93' }}>{e.date} · {e.time}</div>
            </div>
            <span style={pill(e.color)}>{e.who}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TasksTab({ ro }: { ro: () => void }) {
  const pending = TASKS.filter(t => !t.done)
  const done = TASKS.filter(t => t.done)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Pending ({pending.length})</span>
          <Btn onClick={ro}>+ Add Task</Btn>
        </div>
        {pending.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(60,60,67,0.07)' }}>
            <input type="checkbox" onChange={ro} style={{ accentColor: '#EC4899', width: 16, height: 16, cursor: 'pointer' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.title}</div>
              <div style={{ fontSize: '0.72rem', color: '#8E8E93' }}>Assigned to {t.assignee}</div>
            </div>
            <span style={pill(t.priority === 'high' ? '#EF4444' : t.priority === 'medium' ? '#F59E0B' : '#10B981')}>
              {t.priority}
            </span>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.875rem', color: '#8E8E93' }}>Completed ({done.length})</div>
        {done.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(60,60,67,0.07)', opacity: 0.55 }}>
            <input type="checkbox" checked readOnly style={{ accentColor: '#10B981', width: 16, height: 16 }} />
            <div style={{ fontSize: '0.875rem', textDecoration: 'line-through', color: '#8E8E93' }}>{t.title}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InsightsTab({ ro }: { ro: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ ...card, background: 'linear-gradient(135deg,#FEF9C3,#FFF7E0)', border: '1px solid #FDE047' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🤖</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>AI Inbox Scan</div>
            <div style={{ fontSize: '0.72rem', color: '#92400E' }}>Last scanned 14 minutes ago · 4 items found</div>
          </div>
          <button onClick={ro} style={{ marginLeft: 'auto', padding: '0.4rem 0.875rem', borderRadius: '8px', background: '#F59E0B', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
            Scan now
          </button>
        </div>
      </div>
      {INSIGHTS.map(i => (
        <div key={i.id} style={card}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
              background: i.urgency === 'high' ? '#FEE2E2' : i.urgency === 'medium' ? '#FEF3C7' : '#D1FAE5',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
            }}>
              {i.urgency === 'high' ? '🔴' : i.urgency === 'medium' ? '🟡' : '🟢'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>{i.title}</div>
              <div style={{ fontSize: '0.72rem', color: '#8E8E93', marginBottom: '0.625rem' }}>Source: {i.source}</div>
              <button onClick={ro} style={{ padding: '0.3rem 0.75rem', borderRadius: '8px', background: '#6366F11a', color: '#6366F1', border: 'none', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
                {i.action}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function DataTab({ ro }: { ro: () => void }) {
  const cats = Array.from(new Set(FACTS.map(f => f.cat)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn onClick={ro}>+ Add Fact</Btn>
      </div>
      {cats.map(cat => (
        <div key={cat} style={card}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.875rem', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
            {cat}
          </div>
          {FACTS.filter(f => f.cat === cat).map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(60,60,67,0.07)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '10px', background: f.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                {f.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 1 }}>{f.title}</div>
                <div style={{ fontSize: '0.78rem', color: '#8E8E93' }}>{f.value}</div>
              </div>
              <button onClick={ro} style={{ fontSize: '0.75rem', color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function ExpensesTab({ ro }: { ro: () => void }) {
  const total = EXPENSES.reduce((s, e) => s + e.amount, 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        <div style={{ ...card, padding: '1.125rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#8E8E93', marginBottom: 4 }}>September Total</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F97316' }}>${total.toFixed(2)}</div>
        </div>
        <div style={{ ...card, padding: '1.125rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#8E8E93', marginBottom: 4 }}>Transactions</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366F1' }}>{EXPENSES.length}</div>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Recent Expenses</span>
          <Btn onClick={ro}>+ Add</Btn>
        </div>
        {EXPENSES.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(60,60,67,0.07)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#F9730615', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              {e.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{e.title}</div>
              <div style={{ fontSize: '0.72rem', color: '#8E8E93' }}>{e.category} · {e.date}</div>
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1C1C1E' }}>${e.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DocumentsTab({ ro }: { ro: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn onClick={ro}>+ Upload</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '0.875rem' }}>
        {DOCUMENTS.map(d => (
          <div key={d.id} onClick={ro} style={{ ...card, cursor: 'pointer', padding: '1.125rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.625rem' }}>{d.icon}</div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>{d.title}</div>
            <div style={{ fontSize: '0.72rem', color: '#8E8E93' }}>
              <span style={pill('#3B82F6')}>{d.type}</span>
              <span style={{ marginLeft: 6 }}>Updated {d.updated}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CoParentingTab({ ro }: { ro: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        {[
          { name: 'Sarah', role: 'Primary', days: 'Mon, Tue, Fri, Sat', color: '#6366F1' },
          { name: 'Mike', role: 'Secondary', days: 'Wed, Thu, Sun', color: '#0EA5E9' },
        ].map(p => (
          <div key={p.name} style={{ ...card, borderTop: `3px solid ${p.color}` }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: '0.72rem', color: '#8E8E93', marginBottom: 4 }}>{p.role} Carer</div>
            <div style={{ fontSize: '0.78rem' }}>{p.days}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.875rem' }}>This Week's Schedule</div>
        {COPARENTING.map(d => (
          <div key={d.day} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(60,60,67,0.07)' }}>
            <div style={{ width: 36, textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#8E8E93', flexShrink: 0 }}>{d.day}</div>
            <div style={{ flex: 1 }}>
              {d.events.map((e, i) => <div key={i} style={{ fontSize: '0.82rem', color: '#1C1C1E' }}>{e}</div>)}
            </div>
            <span style={pill(d.who === 'Sarah' ? '#6366F1' : d.who === 'Mike' ? '#0EA5E9' : '#10B981')}>{d.who}</span>
          </div>
        ))}
      </div>

      <div style={{ ...card, background: '#F0FDF4', border: '1px solid #86EFAC' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span>🔄</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Swap Request — Pending</div>
            <div style={{ fontSize: '0.72rem', color: '#166534' }}>Mike requested Saturday Sep 27 swap with Sarah</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button onClick={ro} style={{ padding: '0.3rem 0.75rem', background: '#22C55E', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Accept</button>
            <button onClick={ro} style={{ padding: '0.3rem 0.75rem', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Decline</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsTab({ ro }: { ro: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>Profile</div>
        {[
          { label: 'Name', value: 'Sarah Johnson' },
          { label: 'Email', value: 'sarah@johnson.family' },
          { label: 'Role', value: 'Primary Carer' },
          { label: 'Household', value: 'The Johnson Family' },
        ].map(f => (
          <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(60,60,67,0.07)', fontSize: '0.875rem' }}>
            <span style={{ color: '#8E8E93' }}>{f.label}</span>
            <span style={{ fontWeight: 500 }}>{f.value}</span>
          </div>
        ))}
        <div style={{ marginTop: '0.875rem' }}>
          <Btn onClick={ro}>Edit Profile</Btn>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>Family Members</div>
        {[
          { name: 'Mike Johnson', role: 'Co-Parent', emoji: '👨' },
          { name: 'Emma Johnson', role: 'Child · Age 8', emoji: '👧' },
          { name: 'Liam Johnson', role: 'Child · Age 5', emoji: '👦' },
        ].map(m => (
          <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(60,60,67,0.07)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366F115', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{m.emoji}</div>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{m.name}</div>
              <div style={{ fontSize: '0.72rem', color: '#8E8E93' }}>{m.role}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: '0.875rem' }}>
          <Btn onClick={ro}>+ Invite Member</Btn>
        </div>
      </div>
    </div>
  )
}

function BillingTab({ ro }: { ro: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ ...card, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', border: 'none' }}>
        <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 4 }}>Current Plan</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Famco Family</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.875rem' }}>$9.99 / month · Billed monthly</div>
        <div style={{ display: 'inline-flex', padding: '3px 12px', borderRadius: '99px', background: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', fontWeight: 700 }}>
          ✓ Active
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.875rem' }}>Plan Includes</div>
        {[
          'Unlimited family members',
          'AI inbox scanning (100/mo)',
          'Google & Outlook calendar sync',
          'Document vault (5 GB)',
          'Co-parenting schedule',
          'Expense tracking',
        ].map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', fontSize: '0.875rem' }}>
            <span style={{ color: '#10B981', fontWeight: 700 }}>✓</span> {f}
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.875rem' }}>Payment Method</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
          <div style={{ padding: '0.4rem 0.75rem', background: '#F3F4F6', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>💳 Visa ···· 4242</div>
          <span style={{ fontSize: '0.75rem', color: '#8E8E93' }}>Expires 09/27</span>
        </div>
        <Btn onClick={ro}>Update Payment</Btn>
      </div>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [tab, setTab] = useState('home')
  const [toast, setToast] = useState(false)
  const [sideOpen, setSideOpen] = useState(false)

  const ro = useCallback(() => {
    setToast(true)
    setTimeout(() => setToast(false), 2200)
  }, [])

  const activeNav = NAV.find(n => n.id === tab)!

  const tabContent: Record<string, React.ReactNode> = {
    home:        <HomeTab ro={ro} />,
    calendar:    <CalendarTab ro={ro} />,
    tasks:       <TasksTab ro={ro} />,
    insights:    <InsightsTab ro={ro} />,
    data:        <DataTab ro={ro} />,
    expenses:    <ExpensesTab ro={ro} />,
    documents:   <DocumentsTab ro={ro} />,
    coparenting: <CoParentingTab ro={ro} />,
    settings:    <SettingsTab ro={ro} />,
    billing:     <BillingTab ro={ro} />,
  }

  return (
    <>
      {/* demo banner */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: 'linear-gradient(90deg,#6366F1,#8B5CF6)',
        color: '#fff', textAlign: 'center',
        fontSize: '0.75rem', fontWeight: 600, padding: '6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
      }}>
        <span>👁 Demo Mode — read only · sample data only</span>
        <a href="/" style={{ color: '#fff', opacity: 0.85, textDecoration: 'underline', fontSize: '0.72rem' }}>Sign in →</a>
      </div>

      {/* toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1C1C1E', color: '#fff',
          padding: '0.625rem 1.25rem', borderRadius: '12px',
          fontSize: '0.82rem', fontWeight: 500,
          zIndex: 9998, boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}>
          🔒 Demo mode — editing disabled
        </div>
      )}

      <div style={{ display: 'flex', minHeight: '100vh', paddingTop: 33 }}>
        {/* sidebar overlay (mobile) */}
        {sideOpen && (
          <div onClick={() => setSideOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
        )}

        {/* sidebar */}
        <aside style={{
          width: 256, flexShrink: 0,
          background: '#fff', borderRight: '1px solid rgba(60,60,67,0.10)',
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 33, bottom: 0, left: 0,
          zIndex: 201,
          transform: sideOpen ? 'translateX(0)' : undefined,
          transition: 'transform 0.25s ease',
        }} className="sidebar-desktop">
          {/* logo */}
          <div style={{ padding: '1.25rem 1.25rem 0.875rem', borderBottom: '1px solid rgba(60,60,67,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#6366F1,#c084fc)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>🏠</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.02em' }}>Famco</div>
                <div style={{ fontSize: '0.68rem', color: '#8E8E93' }}>The Johnson Family</div>
              </div>
            </div>
          </div>

          {/* nav items */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.75rem' }}>
            {NAV.map(n => {
              const active = n.id === tab
              return (
                <button
                  key={n.id}
                  onClick={() => { setTab(n.id); setSideOpen(false) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.6rem 0.75rem', borderRadius: '10px', border: 'none',
                    background: active ? n.color + '15' : 'transparent',
                    color: active ? n.color : '#1C1C1E',
                    fontWeight: active ? 600 : 400,
                    fontSize: '0.85rem', cursor: 'pointer', marginBottom: 2,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>{n.emoji}</span>
                  {n.label}
                  {active && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: n.color }} />}
                </button>
              )
            })}
          </nav>

          {/* user */}
          <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid rgba(60,60,67,0.07)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>S</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>Sarah Johnson</div>
              <div style={{ fontSize: '0.68rem', color: '#8E8E93' }}>Demo account</div>
            </div>
          </div>
        </aside>

        {/* main area */}
        <div style={{ flex: 1, marginLeft: 256, display: 'flex', flexDirection: 'column', minWidth: 0 }} className="main-area">
          {/* topbar */}
          <header style={{
            position: 'sticky', top: 33,
            background: 'rgba(242,242,247,0.9)', backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(60,60,67,0.09)',
            padding: '0.875rem 1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            zIndex: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* mobile menu */}
              <button onClick={() => setSideOpen(s => !s)} className="mobile-menu-btn" style={{ display: 'none', background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', padding: 0 }}>☰</button>
              <span style={{ fontSize: '1.1rem' }}>{activeNav.emoji}</span>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{activeNav.label}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#8E8E93' }}>Thu 25 Sep 2026</span>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>S</div>
            </div>
          </header>

          {/* content */}
          <main style={{ flex: 1, padding: '1.5rem', maxWidth: 900, width: '100%', margin: '0 auto' }}>
            {tabContent[tab]}
          </main>
        </div>
      </div>

      {/* mobile nav bar */}
      <nav className="mobile-nav" style={{
        display: 'none',
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid rgba(60,60,67,0.10)',
        padding: '8px 0 env(safe-area-inset-bottom)',
        zIndex: 100,
        gridTemplateColumns: `repeat(5,1fr)`,
      }}>
        {NAV.slice(0, 5).map(n => (
          <button
            key={n.id}
            onClick={() => setTab(n.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.6rem', fontWeight: tab === n.id ? 700 : 400,
              color: tab === n.id ? n.color : '#8E8E93',
              padding: '4px 0',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>{n.emoji}</span>
            {n.label.split(' ')[0]}
          </button>
        ))}
      </nav>

      <style>{`
        @media (max-width: 680px) {
          .sidebar-desktop { display: none !important; }
          .main-area { margin-left: 0 !important; }
          .mobile-menu-btn { display: flex !important; }
          .mobile-nav { display: grid !important; }
          main { padding-bottom: 80px !important; }
        }
        @media (max-width: 680px) {
          .sidebar-desktop.open { display: flex !important; }
        }
      `}</style>
    </>
  )
}
