import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Toolbar } from '@/shared/components/Toolbar';
import { useSeoAlerts, useAcknowledgeAlert } from '../hooks';
import { AlertItem } from '../components/AlertItem';

export function AlertsTab() {
  const { data: alerts = [] } = useSeoAlerts();
  const ackMut = useAcknowledgeAlert();
  const [filter, setFilter] = useState<'All' | 'Open' | 'High' | 'Medium' | 'Low' | 'Acknowledged'>('Open');

  const filtered = alerts.filter((a) => {
    switch (filter) {
      case 'All':          return true;
      case 'Open':         return !a.acknowledged_at;
      case 'High':         return a.severity === 'high' && !a.acknowledged_at;
      case 'Medium':       return a.severity === 'medium' && !a.acknowledged_at;
      case 'Low':          return a.severity === 'low' && !a.acknowledged_at;
      case 'Acknowledged': return !!a.acknowledged_at;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Toolbar
        filters={['Open', 'High', 'Medium', 'Low', 'Acknowledged', 'All']}
        filter={filter}
        onFilterChange={(f) => setFilter(f as typeof filter)}
      />

      {filtered.length === 0 ? (
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>
          {filter === 'Open' || filter.startsWith('H') || filter.startsWith('M') || filter.startsWith('L')
            ? 'No alerts at this severity. Things look healthy.'
            : 'No alerts match this filter.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((a) => (
            <AlertItem
              key={a.id}
              alert={a}
              busy={ackMut.isPending}
              onAcknowledge={() => ackMut.mutate(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
