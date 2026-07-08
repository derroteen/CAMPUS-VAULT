import Link from "next/link";

export default function TermsPage() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-slate-950/40 sm:p-10">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Terms of Service</h1>
          <p className="mt-4 text-slate-400">Last updated: {currentDate}</p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300">
          <section>
            <p>
              These terms govern your use of Campus Vault, an independently operated resource-sharing platform for Maseno University students.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Account Responsibilities</h2>
            <p className="mt-4">
              Users must provide accurate information at signup and are responsible for maintaining the security of their account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Uploaded Content</h2>
            <p className="mt-4">
              Users retain ownership of content they upload, but grant Campus Vault a license to host, display, and distribute it to other users on the platform. Users must only upload content they have the right to share (their own notes, or resources they&apos;re permitted to redistribute). Uploading copyrighted material without permission is strictly prohibited. All uploads are subject to admin review before becoming publicly visible.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Access Model</h2>
            <p className="mt-4">
              Free access requires uploading 4 approved resources; alternatively, a KES 30 payment via M-Pesa unlocks unlimited downloads for 7 hours. Payments are processed by Paystack and are generally non-refundable once the unlock period has started, except where required by law or at our discretion for a genuine service failure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Prohibited Conduct</h2>
            <p className="mt-4">
              No uploading of harmful, illegal, or plagiarized content; no attempts to abuse or circumvent the payment/unlock system; no harassment of other users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Content Removal</h2>
            <p className="mt-4">
              Campus Vault reserves the right to remove any content or suspend any account that violates these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">No Warranty</h2>
            <p className="mt-4">
              The platform is provided &quot;as is&quot; without guarantees of uninterrupted availability; Campus Vault is not liable for the accuracy of user-submitted academic content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Changes to These Terms</h2>
            <p className="mt-4">
              Terms may be updated as the platform develops; continued use after changes means acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Contact</h2>
            <p className="mt-4">
              For any questions or concerns regarding these terms, contact us at{" "}
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
