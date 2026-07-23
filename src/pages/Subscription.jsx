import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, CreditCard, Loader2, Send } from 'lucide-react';
import { subscriptionAPI } from '../services/api';

export default function Subscription() {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [requests, setRequests] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansResponse, subscriptionResponse, requestsResponse] = await Promise.all([
        subscriptionAPI.getPlans(true),
        subscriptionAPI.getMySubscription().catch(() => ({ data: null })),
        subscriptionAPI.getMyRequests().catch(() => ({ data: [] })),
      ]);
      const nextPlans = plansResponse.data || [];
      setPlans(nextPlans);
      setSubscription(subscriptionResponse.data);
      setRequests(requestsResponse.data || []);
      if (!selectedPlan && nextPlans[0]?.id) setSelectedPlan(nextPlans[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitRequest = async () => {
    if (!selectedPlan) {
      setMessage('Please select a subscription plan.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      await subscriptionAPI.createRequest({
        subscription_id: selectedPlan,
        payment_screenshot_url: paymentScreenshotUrl || null,
        payment_reference: paymentReference || null,
        note: note || null,
      });
      setPaymentScreenshotUrl('');
      setPaymentReference('');
      setNote('');
      setMessage('Request submitted. Admin approval will unlock the app.');
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Could not submit subscription request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-3">
          <CreditCard className="h-7 w-7 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Subscription</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Submit your payment proof and wait for admin approval.</p>
          </div>
        </div>
      </section>

      {subscription ? (
        <section className="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-500/30 dark:bg-green-500/10">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            <div>
              <h2 className="font-semibold text-green-900 dark:text-green-100">Active subscription</h2>
              <p className="text-sm text-green-700 dark:text-green-200">
                {subscription.subscription_name || 'Approved plan'} is active until {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : 'the plan end date'}.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`rounded-xl border bg-white p-5 text-left shadow-sm transition dark:bg-slate-800 ${selectedPlan === plan.id ? 'border-primary-400 ring-2 ring-primary-200 dark:border-primary-400 dark:ring-primary-500/30' : 'border-slate-200 hover:border-primary-300 dark:border-slate-700'}`}
            >
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{plan.name}</h2>
              <p className="mt-1 text-2xl font-bold text-primary-600 dark:text-primary-300">₹{plan.price} <span className="text-sm font-normal text-slate-500">/ {plan.duration_days} days</span></p>
              {plan.description && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>}
            </button>
          ))}
        </section>
      )}

      {!subscription && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input value={paymentScreenshotUrl} onChange={(event) => setPaymentScreenshotUrl(event.target.value)} placeholder="Payment screenshot URL" className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
            <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Payment reference or UTR" className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for admin" rows={3} className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-white md:col-span-2" />
          </div>
          <button onClick={submitRequest} disabled={submitting} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 font-medium text-white transition hover:bg-primary-700 disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Request approval
          </button>
          {message && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{message}</p>}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-950 dark:text-white"><Clock className="h-5 w-5 text-primary-500" /> Requests</h2>
        <div className="space-y-3">
          {requests.length ? requests.map((request) => (
            <div key={request.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-300">{request.payment_reference || request.subscription_id}</span>
              <span className="font-medium capitalize text-slate-950 dark:text-white">{request.status}</span>
            </div>
          )) : <p className="text-sm text-slate-500 dark:text-slate-400">No requests yet.</p>}
        </div>
      </section>
    </div>
  );
}
