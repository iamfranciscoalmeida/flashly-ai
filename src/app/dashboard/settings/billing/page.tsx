"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, Download, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/language-provider";
import { createClient } from "@/supabase/client";

interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  plan: 'free' | 'pro' | 'premium';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  created: string;
  invoice_pdf?: string;
}

export default function BillingSettingsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load subscription data (you'll need to implement this based on your schema)
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subData) {
        setSubscription(subData);
      }

      // Load invoice history
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created', { ascending: false })
        .limit(10);

      if (invoiceData) {
        setInvoices(invoiceData);
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      // Call your billing portal endpoint
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast({
        title: "Error",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      // Call your checkout endpoint
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: 'pro' }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', variant: 'default' as const, icon: CheckCircle },
      canceled: { label: 'Canceled', variant: 'secondary' as const, icon: AlertCircle },
      past_due: { label: 'Past Due', variant: 'destructive' as const, icon: AlertCircle },
      trialing: { label: 'Trial', variant: 'outline' as const, icon: Calendar },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
            <p className="text-gray-600">Manage your subscription and billing information</p>
          </div>
        </div>

        {/* Current Subscription */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Subscription
            </CardTitle>
            <CardDescription>
              Your current plan and billing information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold capitalize">
                      {subscription.plan} Plan
                    </h3>
                    <p className="text-gray-600">
                      {subscription.cancel_at_period_end 
                        ? `Cancels on ${formatDate(subscription.current_period_end)}`
                        : `Renews on ${formatDate(subscription.current_period_end)}`
                      }
                    </p>
                  </div>
                  {getStatusBadge(subscription.status)}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleManageSubscription}
                    disabled={loading}
                    variant="outline"
                  >
                    Manage Subscription
                  </Button>
                  {subscription.plan === 'free' && (
                    <Button
                      onClick={handleUpgrade}
                      disabled={loading}
                    >
                      Upgrade to Pro
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-2">Free Plan</h3>
                <p className="text-gray-600 mb-4">
                  You're currently on the free plan. Upgrade to unlock premium features.
                </p>
                <Button onClick={handleUpgrade} disabled={loading}>
                  Upgrade to Pro
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Comparison */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>
              Choose the plan that best fits your needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Free Plan */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Free Plan</h3>
                <p className="text-2xl font-bold mb-4">$0<span className="text-sm font-normal">/month</span></p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 10 flashcards per month</li>
                  <li>• Basic study modes</li>
                  <li>• Community support</li>
                </ul>
              </div>

              {/* Pro Plan */}
              <div className="border-2 border-blue-500 rounded-lg p-4 relative">
                <div className="absolute -top-3 left-4">
                  <Badge className="bg-blue-500">Most Popular</Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">Pro Plan</h3>
                <p className="text-2xl font-bold mb-4">$9.99<span className="text-sm font-normal">/month</span></p>
                <ul className="space-y-2 text-sm text-gray-600 mb-4">
                  <li>• Unlimited flashcards</li>
                  <li>• Advanced study modes</li>
                  <li>• AI-powered features</li>
                  <li>• Priority support</li>
                  <li>• Export capabilities</li>
                </ul>
                {(!subscription || subscription.plan === 'free') && (
                  <Button onClick={handleUpgrade} disabled={loading} className="w-full">
                    Upgrade Now
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>
              Your recent invoices and payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(invoice.created)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(invoice.status)}
                      {invoice.invoice_pdf && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(invoice.invoice_pdf, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No billing history available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 