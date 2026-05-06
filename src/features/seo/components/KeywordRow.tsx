import { C } from '@/shared/tokens';
import { Sparkline } from '@/shared/components/charts/Sparkline';
import { TrendChip } from './TrendChip';
import type { SeoKeyword } from '../types';

interface Props {
  keyword: SeoKeyword;
  position: number | null;
  delta: number | null;
  history: number[];
}

export function KeywordRow({ keyword, position, delta, history }: Props) {
  return (
    <tr style={{ borderBottom: `1px solid ${C.divider}` }}>
      <td style={{ padding: '13px 16px' }}>
        <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{keyword.keyword}</div>
        {keyword.target_url && (
          <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>{keyword.target_url}</div>
        )}
      </td>
      <td style={{ padding: '13px 16px', color: C.slate, fontSize: 12 }}>{keyword.country}</td>
      <td style={{ padding: '13px 16px', color: C.slate, fontSize: 12, textTransform: 'capitalize' }}>{keyword.device}</td>
      <td style={{ padding: '13px 16px' }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: position && position <= 3 ? C.green : position && position <= 10 ? '#1a1a1a' : C.slate,
          }}
        >
          {position ?? '—'}
        </span>
      </td>
      <td style={{ padding: '13px 16px' }}>
        <TrendChip delta={delta} invert />
      </td>
      <td style={{ padding: '13px 16px' }}>
        {history.length > 0 ? (
          <Sparkline data={history} color={C.green} height={28} />
        ) : (
          <span style={{ fontSize: 11, color: C.slate }}>—</span>
        )}
      </td>
    </tr>
  );
}
