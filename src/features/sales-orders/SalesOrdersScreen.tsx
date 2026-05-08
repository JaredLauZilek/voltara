import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';

export function SalesOrdersScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Open Orders" value={0} sub="Awaiting fulfilment" accent />
        <KPICard label="Confirmed" value={0} sub="Customer PO received" />
        <KPICard label="Fulfilled" value={0} sub="Delivered / completed" />
        <KPICard label="Order Value" value="RM 0" sub="Across open orders" />
      </div>

      <div
        style={{
          background: C.white,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          padding: 48,
          textAlign: 'center',
          color: C.slate,
          fontSize: 14,
        }}
      >
        Sales Orders are coming soon. This is where won quotations will be promoted into
        fulfilment-ready orders with their customer PO documents attached.
      </div>
    </div>
  );
}
