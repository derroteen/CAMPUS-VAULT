import Link from "next/link";

export default function TermsPage() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-warm-bg text-charcoal font-space-grotesk">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-2xl shadow-slate-950/40 sm:p-10">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl font-space-grotesk">Terms of Service</h1>
          <p className="mt-4 text-slate-600">Last updated: {currentDate}</p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-700">
          <section>
            <p>
              These terms govern your use of MVCorner, an independently operated resource-sharing platform for the Maseno University community.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-forest">Account Responsibilities</h2>
            <p className="mt-4">
              Users must provide accurate information at signup and are responsible for maintaining the security of their account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-coral">Uploaded Content</h2>
            <p className="mt-4">
              Users retain ownership of content they upload, but grant MVCorner a license to host, display, and distribute it to other users on the platform. Users must only upload content they have the right to share (their own notes, or resources they&apos;re permitted to redistribute). Uploading copyrighted material without permission is strictly prohibited. All uploads are subject to admin review before becoming publicly visible.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-forest">Marketplace Listings</h2>
            <p className="mt-4">
              Users are responsible for the accuracy of their marketplace listings and for ensuring that any item they offer is legal to sell and permitted under applicable law and university rules. MVCorner is not a buyer, seller, reseller, broker, or other party to transactions between users, and we do not guarantee the quality, safety, or delivery of listed items. MVCorner reserves the right to remove any listing that violates these terms or appears deceptive, prohibited, or unsafe.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-coral">Access Model</h2>
            <p className="mt-4">
              Access requires uploading 4 approved resources, which unlocks unlimited downloads for 24 hours. There is no paid option to unlock downloads.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-forest">Prohibited Conduct</h2>
            <p className="mt-4">
              No uploading of harmful, illegal, or plagiarized content; no attempts to abuse or circumvent the payment/unlock system; no harassment of other users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-coral">Content Removal</h2>
            <p className="mt-4">
              MVCorner reserves the right to remove any content or suspend any account that violates these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-forest">No Warranty</h2>
            <p className="mt-4">
              The platform is provided &quot;as is&quot; without guarantees of uninterrupted availability; MVCorner is not liable for the accuracy of user-submitted academic content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-coral">Changes to These Terms</h2>
            <p className="mt-4">
              Terms may be updated as the platform develops; continued use after changes means acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-forest">Contact</h2>
            <p className="mt-4">
              For any questions or concerns regarding these terms, contact us at{" "}
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