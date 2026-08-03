/**
 * The Razorpay checkout widget, loaded from their CDN at runtime.
 *
 * Typed here rather than reached for through `window as any`, so a wrong
 * option name or a mis-shaped handler response is a compile error.
 */

interface RazorpayHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string | undefined;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpayHandlerResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

interface Window {
  /** Undefined until the CDN script has loaded. */
  Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
}
