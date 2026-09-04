import { useEffect, useState } from 'react';
import { EmptyState, ReturnStatusPill, Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { api, ApiError } from '../../lib/api';
import { dateShort, money } from '../../lib/format';
import type { ReturnRecord, ReturnStatus } from '../../types';

const STATUSES: Array<ReturnStatus | 'all'> = [
  'all', 'requested', 'approved', 'rejected', 'received', 'refunded',
];

export function AdminReturnsPage() {
  const { push } = useToast();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReturnStatus | 'all'>('all');
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ status: ReturnStatus; staffNote: string; refundAmount: string }>({
    status: 'approved',
    staffNote: '',
    refundAmount: '',
  });

  async function load(status: ReturnStatus | 'all') {
    setLoading(true);
    try {
      const res = await api.get<{ returns: ReturnRecord[] }>(`/admin/returns?status=${status}`);
      setReturns(res.returns);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filter);
  }, [filter]);

  /** Refund suggestion: what the returned units were actually charged at. */
  const lineValue = (ret: ReturnRecord) =>
    ret.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  function beginEdit(ret: ReturnRecord) {
    setEditing(ret.id);
    setDraft({
      status: ret.status,
      staffNote: ret.staffNote,
      refundAmount: ret.refundAmount !== null ? String(ret.refundAmount) : lineValue(ret).toFixed(2),
    });
  }

  async function save(ret: ReturnRecord) {
    try {
      const res = await api.patch<{ return: ReturnRecord }>(`/admin/returns/${ret.id}`, {
        status: draft.status,
        staffNote: draft.staffNote,
        refundAmount: draft.refundAmount === '' ? null : Number(draft.refundAmount),
      });
      setReturns((cur) => cur.map((r) => (r.id === ret.id ? res.return : r)));
      setEditing(null);
      push(
        draft.status === ret.status
          ? `${ret.rmaNumber} updated.`
          : `${ret.rmaNumber} marked ${draft.status} — customer emailed.`,
      );
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not update that return.', 'error');
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="display text-3xl">Returns</h1>
        <p className="mt-1.5 text-[13px] text-muted">
          {returns.length} shown · marking one <strong>received</strong> puts the stock back on sale
        </p>
      </div>

      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`chip shrink-0 ${filter === status ? 'chip-active' : 'hover:border-ink'}`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner label="Loading returns" />
      ) : returns.length === 0 ? (
        <EmptyState title="No returns" body="Nothing matches that status filter." />
      ) : (
        <ul className="space-y-3">
          {returns.map((ret) => (
            <li key={ret.id} className="border border-line bg-white">
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <p className="font-mono text-[14px] font-bold">{ret.rmaNumber}</p>
                  <p className="truncate text-[12px] text-muted">
                    {ret.email} · order{' '}
                    <span className="font-mono">{ret.orderNumber}</span> ·{' '}
                    {dateShort(ret.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <ReturnStatusPill status={ret.status} />
                  <span className="text-[15px] font-bold tabular-nums">
                    {money(ret.refundAmount ?? lineValue(ret))}
                  </span>
                  <button
                    type="button"
                    onClick={() => (editing === ret.id ? setEditing(null) : beginEdit(ret))}
                    className="chip hover:border-ink"
                  >
                    {editing === ret.id ? 'Close' : 'Manage'}
                  </button>
                </div>
              </div>

              <div className="border-t border-line px-6 py-4">
                <ul className="divide-y divide-line">
                  {ret.items.map((item) => (
                    <li key={item.orderItemId} className="flex items-center gap-4 py-3">
                      <img
                        src={item.imageUrl ?? ''}
                        alt=""
                        className="h-14 w-11 shrink-0 bg-paper-warm object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold">{item.productName}</p>
                        <p className="text-[12px] text-muted">
                          {item.size} · {item.color} · Qty {item.quantity}
                          {item.reason && ` · ${item.reason}`}
                        </p>
                      </div>
                      <span className="text-[13px] font-bold tabular-nums">
                        {money(item.unitPrice * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                {ret.reason && (
                  <p className="mt-4 border-l-4 border-line-strong bg-paper-warm px-4 py-3 text-[13px]">
                    <strong>Customer said:</strong> {ret.reason}
                  </p>
                )}

                {editing === ret.id && (
                  <div className="mt-5 border border-ink p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`st-${ret.id}`} className="label">
                          Status
                        </label>
                        <select
                          id={`st-${ret.id}`}
                          value={draft.status}
                          onChange={(e) =>
                            setDraft({ ...draft, status: e.target.value as ReturnStatus })
                          }
                          className="field"
                        >
                          {STATUSES.filter((s) => s !== 'all').map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`rf-${ret.id}`} className="label">
                          Refund amount (USD)
                        </label>
                        <input
                          id={`rf-${ret.id}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={draft.refundAmount}
                          onChange={(e) => setDraft({ ...draft, refundAmount: e.target.value })}
                          className="field tabular-nums"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor={`nt-${ret.id}`} className="label">
                          Note to the customer
                        </label>
                        <textarea
                          id={`nt-${ret.id}`}
                          rows={2}
                          value={draft.staffNote}
                          onChange={(e) => setDraft({ ...draft, staffNote: e.target.value })}
                          className="field resize-none"
                          placeholder="Included in the email we send them."
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex gap-3">
                      <button type="button" onClick={() => void save(ret)} className="btn-primary btn-sm">
                        Save & notify
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className="btn-ghost btn-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
