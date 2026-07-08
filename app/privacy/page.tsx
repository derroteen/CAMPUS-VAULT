import Link from "next/link";

export default function PrivacyPolicyPage() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-slate-950/40 sm:p-10">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Privacy Policy</h1>
          <p className="mt-4 text-slate-400">Last updated: {currentDate}</p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300">
          <section>
            <p>
              Campus Vault is an independently operated platform (not a registered company) built to help Maseno University students share and access academic resources. This policy explains what data we collect and how it&apos;s used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Information We Collect</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>Full name and email address</li>
              <li>University and course selection</li>
              <li>Uploaded files and their metadata (title, type, unit)</li>
              <li>Payment transaction records (via Paystack) for unlock payments</li>
            </ul>
            <p className="mt-4">
              <strong>Note:</strong> Campus Vault does not store raw M-Pesa or card details. All payment processing is securely handled by Paystack.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">How We Use Your Information</h2>
            <p className="mt-4">
              We use your information strictly to operate your account, moderate uploaded content, process unlock payments, and improve the platform. We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Data Storage</h2>
            <p className="mt-4">
              Data is stored securely using Supabase (a backend infrastructure provider). Uploaded files are kept in private storage and only made accessible per the platform&apos;s access rules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Your Rights</h2>
            <p className="mt-4">
              You can request account deletion or data removal at any time by contacting us at{" "}
              <a href="mailto:infodteqsolutions@gmail.com" className="text-sky-400 hover:underline">
                infodteqsolutions@gmail.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Changes to This Policy</h2>
            <p className="mt-4">
              This policy may be updated as the platform grows. Continued use of Campus Vault after changes means you accept the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Contact</h2>
            <p className="mt-4">
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:infodteqsolutions@gmail.com" className="text-sky-400 hover:underline">
                infodteqsolutions@gmail.com
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="text-sm text-slate-400 transition hover:text-white">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
