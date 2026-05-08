import { useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Badge } from '@/shared/components/Badge';
import { Toolbar } from '@/shared/components/Toolbar';
import { Pagination, usePagination } from '@/shared/components/Pagination';
import { formatRM, formatRMShort } from '@/shared/lib/format';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from './hooks';
import { ProductModal } from './ProductModal';
import { PRODUCT_CATEGORIES, margin, stockStatus } from './types';
import type { Product, ProductInsert } from './types';

type ModalMode = Product | 'new' | 'new-service' | null;
type FilterCat = 'All' | (typeof PRODUCT_CATEGORIES)[number];
type View = 'products' | 'services';

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: C.slate,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  borderBottom: `1px solid ${C.border}`,
};

export function ProductsScreen() {
  const { data: products = [] } = useProducts();
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const deleteMut = useDeleteProduct();
  const [view, setView] = useState<View>('products');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<FilterCat>('All');
  const [modal, setModal] = useState<ModalMode>(null);

  const physicalProducts = products.filter((p) => !p.is_service);
  const serviceProducts = products.filter((p) => p.is_service);

  const filteredProducts = physicalProducts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filterCat !== 'All') return p.category === filterCat;
    return true;
  });

  const filteredServices = serviceProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  );

  const productsPagination = usePagination(filteredProducts);
  const servicesPagination = usePagination(filteredServices);

  const totalSkus = physicalProducts.length;
  const stockValue = physicalProducts.reduce((s, p) => s + p.cost * (p.qty ?? 0), 0);
  const lowOrOutCount = physicalProducts.filter((p) => stockStatus(p) !== 'In Stock').length;
  const avgMargin = products.length > 0 ? products.reduce((s, p) => s + margin(p), 0) / products.length : 0;

  const handleSave = (row: ProductInsert) => {
    if (modal === 'new' || modal === 'new-service') {
      createMut.mutate(row, { onSuccess: () => setModal(null) });
    } else if (modal && typeof modal !== 'string') {
      updateMut.mutate({ id: modal.id, patch: row }, { onSuccess: () => setModal(null) });
    }
  };

  const viewToggle = (
    <div style={{ display: 'flex', gap: 4, background: C.divider, borderRadius: 99, padding: 3 }}>
      {(['products', 'services'] as View[]).map((v) => (
        <button
          key={v}
          onClick={() => { setView(v); setFilterCat('All'); setSearch(''); }}
          style={{
            padding: '6px 14px',
            borderRadius: 99,
            border: 'none',
            background: view === v ? C.white : 'transparent',
            color: view === v ? C.green : C.slate,
            fontFamily: 'Figtree',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            textTransform: 'capitalize',
          }}
        >
          {v === 'products' ? `Products (${physicalProducts.length})` : `Services (${serviceProducts.length})`}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Total SKUs" value={totalSkus} sub="Across all categories" accent />
        <KPICard label="Stock Value (cost)" value={formatRMShort(stockValue)} sub="At cost" />
        <KPICard label="Low / Out of Stock" value={lowOrOutCount} sub="Needs reorder" />
        <KPICard label="Avg Gross Margin" value={`${avgMargin.toFixed(1)}%`} sub="Selling vs cost" />
      </div>

      {view === 'products' ? (
        <Toolbar
          filters={['All', ...PRODUCT_CATEGORIES] as string[]}
          filter={filterCat}
          onFilterChange={(f) => setFilterCat(f as FilterCat)}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search products / SKU…"
          primaryLabel="+ New Product"
          onPrimary={() => setModal('new')}
          extra={viewToggle}
        />
      ) : (
        <Toolbar
          filters={[]}
          filter=""
          onFilterChange={() => {}}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search services…"
          primaryLabel="+ New Service"
          onPrimary={() => setModal('new-service')}
          extra={viewToggle}
        />
      )}

      {view === 'products' && (
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.seasalt }}>
                {['SKU', 'Name', 'Category', 'Stock', 'Cost', 'Price', 'Margin', 'Status'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productsPagination.pageItems.map((p) => {
                const stockPct = p.reorder_level > 0
                  ? Math.min(100, ((p.qty ?? 0) / (p.reorder_level * 2)) * 100)
                  : 100;
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
                        {p.qty ?? 0} <span style={{ color: C.slate, fontWeight: 500 }}>/ reorder {p.reorder_level}</span>
                      </div>
                      <div style={{ background: C.divider, borderRadius: 99, height: 5, marginTop: 4 }}>
                        <div style={{ width: `${stockPct}%`, height: '100%', background: stockStatus(p) === 'In Stock' ? C.green : C.yellow, borderRadius: 99 }} />
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
          {filteredProducts.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>No products found.</div>
          )}
          <Pagination
            page={productsPagination.page}
            totalPages={productsPagination.totalPages}
            totalItems={productsPagination.totalItems}
            pageSize={productsPagination.pageSize}
            from={productsPagination.from}
            to={productsPagination.to}
            onPageChange={productsPagination.setPage}
          />
        </div>
      )}

      {view === 'services' && (
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.seasalt }}>
                {['ID', 'Name', 'Default Description', 'Default Price', 'Cost', 'Margin'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {servicesPagination.pageItems.map((p) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: `1px solid ${C.divider}`, cursor: 'pointer' }}
                  onClick={() => setModal(p)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverRow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{p.id}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: '13px 16px', color: C.slate, maxWidth: 320 }}>
                    {p.description ? (
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.description}
                      </span>
                    ) : (
                      <span style={{ fontStyle: 'italic', color: C.slate }}>No description set</span>
                    )}
                  </td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{formatRM(p.price)}</td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{formatRM(p.cost)}</td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{margin(p).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredServices.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>
              No services yet. Click <strong>+ New Service</strong> to add one.
            </div>
          )}
          <Pagination
            page={servicesPagination.page}
            totalPages={servicesPagination.totalPages}
            totalItems={servicesPagination.totalItems}
            pageSize={servicesPagination.pageSize}
            from={servicesPagination.from}
            to={servicesPagination.to}
            onPageChange={servicesPagination.setPage}
          />
        </div>
      )}

      {modal && (
        <ProductModal
          product={modal === 'new' || modal === 'new-service' ? null : modal}
          isService={modal === 'new-service' || (typeof modal !== 'string' && modal?.is_service)}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={(id) => deleteMut.mutate(id, { onSuccess: () => setModal(null) })}
        />
      )}
    </div>
  );
}
