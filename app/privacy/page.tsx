import Link from "next/link";

export default function PrivacyPolicyPage() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-warm-bg text-charcoal font-space-grotesk">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-2xl shadow-slate-950/40 sm:p-10">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl font-space-grotesk">Privacy Policy</h1>
          <p className="mt-4 text-slate-600">Last updated: {currentDate}</p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-700">
          <section>
            <p>
              MVCorner is an independently operated platform (not a registered company) built to help Maseno University students share and access academic resources. This policy explains what data we collect and how it&apos;s used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-forest">Information We Collect</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>Full name and email address</li>
              <li>University and course selection</li>
              <li>Uploaded files and their metadata (title, type, unit)</li>
              <li>Payment transaction records (via Paystack) for unlock payments</li>
            </ul>
            <p className="mt-4">
              <strong>Note:</strong> MVCorner does not store raw M-Pesa or card details. All payment processing is securely handled by Paystack.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-forest">How We Use Your Information</h2>
            <p className="mt-4">
              We use your information strictly to operate your account, moderate uploaded content, process unlock payments, and improve the platform. We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-coral">Marketplace Visibility</h2>
            <p className="mt-4">
              Marketplace listings are intended to be visible to other users of the platform.
              This includes listing details, photos, and contact information you choose to provide,
              such as a phone number for calls or WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-forest">Data Storage</h2>
            <p className="mt-4">
              Data is stored securely using Supabase (a backend infrastructure provider). Uploaded files are kept in private storage and only made accessible per the platform&apos;s access rules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-coral">Your Rights</h2>
            <p className="mt-4">
              You can request account deletion or data removal at any time by contacting us at{" "}
              <a href="mailto:infodteqsolutions@gmail.com" className="text-forest hover:text-leaf underline">
                infodteqsolutions@gmail.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-forest">Changes to This Policy</h2>
            <p className="mt-4">
              This policy may be updated as the platform grows. Continued use of MVCorner after changes means you accept the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-coral">Contact</h2>
            <p className="mt-4">
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:infodteqsolutions@gmail.com" className="text-forest hover:text-leaf underline">
                infodteqsolutions@gmail.com
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="text-sm text-forest hover:text-leaf underline">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
