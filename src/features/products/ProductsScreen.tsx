import { useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Badge } from '@/shared/components/Badge';
import { Toolbar } from '@/shared/components/Toolbar';
import { formatRM, formatRMShort } from '@/shared/lib/format';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from './hooks';
import { ProductModal } from './ProductModal';
import { PRODUCT_CATEGORIES, margin, stockStatus } from './types';
import type { Product, ProductInsert } from './types';

export function ProductsScreen() {
  const { data: products = [] } = useProducts();
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const deleteMut = useDeleteProduct();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<'All' | (typeof PRODUCT_CATEGORIES)[number]>('All');
  const [modal, setModal] = useState<Product | 'new' | null>(null);

  const filtered = products.filter(
    (p) =>
      (filterCat === 'All' || p.category === filterCat) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()))
  );

  const totalSkus = products.length;
  const stockValue = products.reduce((s, p) => s + p.cost * p.qty, 0);
  const lowOrOutCount = products.filter((p) => stockStatus(p) !== 'In Stock').length;
  const avgMargin =
    products.length > 0 ? products.reduce((s, p) => s + margin(p), 0) / products.length : 0;

  const handleSave = (row: ProductInsert) => {
    if (modal === 'new') createMut.mutate(row, { onSuccess: () => setModal(null) });
    else if (modal && typeof modal !== 'string')
      updateMut.mutate({ id: modal.id, patch: row }, { onSuccess: () => setModal(null) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Total SKUs" value={totalSkus} sub="Across all categories" accent />
        <KPICard label="Stock Value (cost)" value={formatRMShort(stockValue)} sub="At cost" />
        <KPICard label="Low / Out of Stock" value={lowOrOutCount} sub="Needs reorder" />
        <KPICard label="Avg Gross Margin" value={`${avgMargin.toFixed(1)}%`} sub="Selling vs cost" />
      </div>

      <Toolbar
        filters={['All', ...PRODUCT_CATEGORIES]}
        filter={filterCat}
        onFilterChange={(f) => setFilterCat(f as typeof filterCat)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search products / SKU…"
        primaryLabel="+ New Product"
        onPrimary={() => setModal('new')}
      />

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.seasalt }}>
              {['SKU', 'Name', 'Category', 'Stock', 'Cost', 'Price', 'Margin', 'Status'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.slate,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const stockPct = p.reorder_level > 0 ? Math.min(100, (p.qty / (p.reorder_level * 2)) * 100) : 100;
              return (
                <tr
                  key={p.id}
                  style={{ borderBottom: `1px solid ${C.divider}`, cursor: 'pointer' }}
                  onClick={() => setModal(p)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverRow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{p.id}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{p.category}</td>
                  <td style={{ padding: '13px 16px', minWidth: 140 }}>
                    <div style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>
                      {p.qty} <span style={{ color: C.slate, fontWeight: 500 }}>/ reorder {p.reorder_level}</span>
                    </div>
                    <div style={{ background: C.divider, borderRadius: 99, height: 5, marginTop: 4 }}>
                      <div
                        style={{
                          width: `${stockPct}%`,
                          height: '100%',
                          background: stockStatus(p) === 'In Stock' ? C.green : C.yellow,
                          borderRadius: 99,
                        }}
                      />
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{formatRM(p.cost)}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{formatRM(p.price)}</td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{margin(p).toFixed(1)}%</td>
                  <td style={{ padding: '13px 16px' }}>
                    <Badge status={stockStatus(p)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>No products found.</div>
        )}
      </div>

      {modal && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={(id) => deleteMut.mutate(id, { onSuccess: () => setModal(null) })}
        />
      )}
    </div>
  );
}
