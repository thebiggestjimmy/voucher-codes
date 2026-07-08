import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api, UnauthorizedError } from '../api';
import { useLayout } from '../Layout';
import { Sidebar } from '../components/Sidebar';
import { VoucherCard } from '../components/VoucherCard';
import { EditVoucherModal } from '../components/EditVoucherModal';
import type { Voucher } from '../types';

export function ReviewPage() {
  const { isAdmin, categories, sites, showToast, bumpPendingCount, refreshCategoriesAndSites } = useLayout();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Voucher | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await api.listVouchers({
        status: 'pending',
        includeExpired: true,
        sort: 'new',
      });
      setVouchers(results);
    } catch (err) {
      if (!(err instanceof UnauthorizedError)) {
        showToast(err instanceof Error ? err.message : 'Failed to load queue', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const handleApprove = async (voucher: Voucher) => {
    try {
      await api.approveVoucher(voucher.id);
      setVouchers((prev) => prev.filter((v) => v.id !== voucher.id));
      bumpPendingCount(-1);
      refreshCategoriesAndSites();
      showToast(`Approved ${voucher.code || 'deal'} for ${voucher.siteName}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Approval failed', 'error');
    }
  };

  const handleReject = async (voucher: Voucher) => {
    if (!confirm(`Reject and delete ${voucher.code}?`)) return;
    try {
      await api.deleteVoucher(voucher.id);
      setVouchers((prev) => prev.filter((v) => v.id !== voucher.id));
      bumpPendingCount(-1);
      refreshCategoriesAndSites();
      showToast(`Rejected ${voucher.code || 'deal'}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reject failed', 'error');
    }
  };


  return (
    <>
      <Helmet>
        <title>Review submissions</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="app__body">
        <Sidebar categories={categories} />
        <main className="main">
          <div className="main__head">
            <h2 className="main__title">Review queue</h2>
            <p className="main__count">{loading ? 'Loading…' : `${vouchers.length} pending`}</p>
          </div>

          <div className="banner banner--warn">
            <strong>Review queue:</strong> these codes were submitted by
            visitors and aren't visible to anyone until you approve them.
          </div>

          {loading ? (
            <div className="loading"><span className="spinner" /> Loading queue…</div>
          ) : vouchers.length === 0 ? (
            <div className="empty">
              <p className="empty__title">Nothing to review</p>
              <p>All caught up — new submissions will appear here.</p>
            </div>
          ) : (
            <div className="voucher-list">
              {vouchers.map((v) => (
                <VoucherCard
                  key={v.id}
                  voucher={v}
                  mode="review"
                  isAdmin={isAdmin}
                  onVote={() => undefined}
                  onRedeem={() => undefined}
                  onApprove={() => handleApprove(v)}
                  onReject={() => handleReject(v)}
                  onEdit={() => setEditing(v)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {editing && (
        <EditVoucherModal
          voucher={editing}
          sites={sites}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setEditing(null);
            setVouchers((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
          }}
        />
      )}
    </>
  );
}
