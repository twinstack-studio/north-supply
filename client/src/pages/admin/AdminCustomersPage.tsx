import { useEffect, useState } from 'react';
import { EmptyState, Spinner } from '../../components/ui';
import { api } from '../../lib/api';
import { dateShort, money } from '../../lib/format';

interface AdminCustomer {
  id: number;
  email: string;
  name: string;
  role: 'customer' | 'admin';
  createdAt: string;
  orderCount: number;
  lifetimeValue: number;
}

export function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ customers: AdminCustomer[] }>('/admin/customers')
      .then((res) => setCustomers(res.customers))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading customers" />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="display text-3xl">Customers</h1>
        <p className="mt-1.5 text-[13px] text-muted">{customers.length} accounts</p>
      </div>

      {customers.length === 0 ? (
        <EmptyState title="No customers yet" body="Accounts appear here as people register." />
      ) : (
        <div className="overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[620px] text-left">
            <thead className="border-b border-line">
              <tr className="text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="px-5 py-3.5 font-bold">Customer</th>
                <th className="px-5 py-3.5 font-bold">Joined</th>
                <th className="px-5 py-3.5 font-bold">Orders</th>
                <th className="px-5 py-3.5 font-bold">Lifetime value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-paper-warm/60">
                  <td className="px-5 py-3.5">
                    <p className="text-[14px] font-bold">
                      {customer.name}
                      {customer.role === 'admin' && (
                        <span className="ml-2 bg-blaze px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                          Admin
                        </span>
                      )}
                    </p>
                    <p className="text-[12px] text-muted">{customer.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-muted">
                    {dateShort(customer.createdAt)}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] font-bold tabular-nums">
                    {customer.orderCount}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] font-bold tabular-nums">
                    {money(customer.lifetimeValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
