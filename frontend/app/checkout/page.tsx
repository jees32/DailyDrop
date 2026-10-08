import CheckoutGate from "@/components/CheckoutGate";
import CheckoutView from "@/components/CheckoutView";

export default function CheckoutPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <h2 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">
          Checkout
        </h2>
        <p className="mt-1 mb-6 text-sm text-gray-500">
          Sign in to place your order. Your cart and delivery location are
          saved for this session.
        </p>
        <CheckoutGate>
          <CheckoutView />
        </CheckoutGate>
    </main>
  );
}
