import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Mail } from "lucide-react";

/**
 * Public Privacy Policy for Praetoria Group websites and the Praetoria
 * Ops Hub mobile app (Admin / Worker / Subcontractor / Customer portals).
 *
 * Route: /privacy-policy (also reachable at /privacy)
 * No authentication required — must remain publicly accessible.
 */
export default function PrivacyPolicyPage() {
  const lastUpdated = "May 29, 2026";
  const supportEmail = "support@praetoriagroup.ca";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Privacy Policy — Praetoria Group &amp; Praetoria Ops Hub</title>
        <meta
          name="description"
          content="Privacy Policy for Praetoria Group websites and the Praetoria Ops Hub mobile app — what we collect, how we use it, and how to request deletion."
        />
        <link rel="canonical" href="https://praetoriagroup.ca/privacy-policy" />
        <meta property="og:title" content="Privacy Policy — Praetoria Group" />
        <meta
          property="og:description"
          content="Privacy Policy for Praetoria Group and the Praetoria Ops Hub mobile app."
        />
        <meta property="og:url" content="https://praetoriagroup.ca/privacy-policy" />
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="border-b border-border bg-card/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <a
            href={`mailto:${supportEmail}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Mail className="h-4 w-4" /> {supportEmail}
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: {lastUpdated}
        </p>

        <article className="prose prose-sm sm:prose max-w-none dark:prose-invert space-y-6">
          <section>
            <p>
              This Privacy Policy explains how <strong>Praetoria Group</strong>{" "}
              (&ldquo;Praetoria&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;,
              &ldquo;our&rdquo;) collects, uses, shares, and protects
              information when you use the Praetoria Group websites
              (including <a href="https://praetoriagroup.ca">praetoriagroup.ca</a>{" "}
              and its service-line subdomains) and the{" "}
              <strong>Praetoria Ops Hub</strong> mobile and web application,
              including the Admin, Worker, Subcontractor, and Customer
              portals.
            </p>
            <p>
              The Praetoria Ops Hub app is operated and developed by{" "}
              <strong>Ryan Persaud / Praetoria Group</strong>, based in
              Regina, Saskatchewan, Canada.
            </p>
          </section>

          <section>
            <h2>1. Information you provide</h2>
            <p>
              When you interact with our websites, request a quote, or use
              the Praetoria Ops Hub portals, you may provide:
            </p>
            <ul>
              <li>Your name, email address, phone number, and mailing or service address;</li>
              <li>Customer and property details (site notes, gate codes, hazards, access instructions);</li>
              <li>Account login details (email and password, or social sign-in identifiers);</li>
              <li>Service requests, quotes, jobs, schedules, visits, and field forms;</li>
              <li>Invoices, payment records, billing details, and accounting information;</li>
              <li>Messages, notes, and support communications sent through the app;</li>
              <li>Uploaded files and job photos (before/after work images, site verification photos, signed documents, service documentation).</li>
            </ul>
          </section>

          <section>
            <h2>2. How we use your information</h2>
            <p>We use the information to:</p>
            <ul>
              <li>Operate the Customer, Worker, Subcontractor, and Admin portals;</li>
              <li>Schedule and dispatch work, manage routes, and assign field crews;</li>
              <li>Manage service requests, prepare and send quotes, and generate invoices;</li>
              <li>Process payments for real-world property services;</li>
              <li>Communicate with you about your account, requests, jobs, visits, and invoices;</li>
              <li>Provide customer support and resolve disputes;</li>
              <li>Keep secure business, accounting, tax, and service-history records;</li>
              <li>Protect the security and integrity of our systems and prevent abuse.</li>
            </ul>
          </section>

          <section>
            <h2>3. Service providers and tools</h2>
            <p>
              We rely on a small number of trusted third-party service
              providers to run the platform. These providers process data
              only on our behalf and under their own privacy and security
              terms:
            </p>
            <ul>
              <li><strong>Supabase</strong> — backend, authentication, database, and file storage;</li>
              <li><strong>Stripe</strong> and, where applicable, external payment links — to process real-world service payments;</li>
              <li>Email and SMS providers (such as Resend, IONOS, or comparable carriers) for transactional notifications;</li>
              <li>Hosting and domain providers for our websites and app;</li>
              <li>Analytics and error-monitoring tools (such as Google Analytics) where used, to understand site usage and diagnose issues.</li>
            </ul>
          </section>

          <section>
            <h2>4. Payments</h2>
            <p>
              Praetoria Ops Hub <strong>does not sell digital goods,
              subscriptions, or in-app digital content</strong>. Any payments
              processed through our websites or app are exclusively for
              real-world property services — such as snow removal, landscaping,
              property maintenance, junk removal, fencing &amp; decking,
              roofing &amp; exterior, cleaning, power washing, property
              management, or related services. Card and bank details are
              handled by our payment processor (Stripe) and are not stored
              on our servers.
            </p>
          </section>

          <section>
            <h2>5. Photos and files</h2>
            <p>
              Workers, subcontractors, customers, and admins may upload or
              view job photos, before/after work images, signed agreements,
              field forms, and other service documentation. These files are
              stored securely in our backend and are visible only to
              authorized users with a legitimate role in the relevant job
              or customer account.
            </p>
          </section>

          <section>
            <h2>6. Data sharing</h2>
            <p>
              We do not sell your personal information. Information is used
              for Praetoria operations and is shared only:
            </p>
            <ul>
              <li>With authorized Praetoria staff, workers, and subcontractors who need it to deliver your service;</li>
              <li>With our service providers (listed above) acting on our behalf;</li>
              <li>With payment processors to complete a transaction you have authorized;</li>
              <li>Where required by law, court order, tax authority, or to protect rights, property, or safety.</li>
            </ul>
          </section>

          <section>
            <h2>7. Security</h2>
            <p>
              We use reasonable administrative, technical, and physical
              safeguards — including encrypted transport, role-based access
              control, row-level security in our database, and audit
              logging — to protect your information. However, no system
              connected to the internet can be guaranteed to be 100% secure,
              and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2>8. Data retention</h2>
            <p>
              We keep records for as long as needed to operate the service
              and to meet our legal, tax, accounting, warranty, dispute
              resolution, service-history, and business-administration
              obligations. When information is no longer required, it is
              deleted or anonymized.
            </p>
          </section>

          <section>
            <h2>9. Account deletion and data deletion</h2>
            <p>
              You may request deletion of your account or your personal
              data at any time:
            </p>
            <ul>
              <li>
                Inside the app, sign in and visit{" "}
                <strong>Account &amp; Privacy</strong> (
                <Link to="/account-privacy" className="underline">
                  /account-privacy
                </Link>
                ), then tap <em>Start Account Deletion</em>; or
              </li>
              <li>
                Email us at{" "}
                <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with
                the subject line &ldquo;Account Deletion Request&rdquo;.
              </li>
            </ul>
            <p>
              We will remove or anonymize your personal profile, login
              credentials, contact information, and saved preferences.
              Business records that we are legally required to keep (such
              as invoices, tax records, signed agreements, and completed
              job/service history) may be retained in anonymized form to
              comply with Canadian record-keeping laws.
            </p>
          </section>

          <section>
            <h2>10. Children</h2>
            <p>
              Praetoria Ops Hub and the Praetoria Group websites are
              intended for use by businesses and adult customers. The
              service is not directed to children under 13, and we do not
              knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2>11. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material
              changes will be communicated through the app or our website.
              The &ldquo;Last updated&rdquo; date at the top of this page
              indicates when it was last revised.
            </p>
          </section>

          <section>
            <h2>12. Contact</h2>
            <p>
              For any privacy, support, or data-deletion request, contact:
            </p>
            <p>
              <strong>Praetoria Group</strong>
              <br />
              Regina, Saskatchewan, Canada
              <br />
              Email:{" "}
              <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
            </p>
          </section>
        </article>

        <footer className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>© {new Date().getFullYear()} Praetoria Group. All rights reserved.</span>
          <Link to="/" className="hover:text-foreground">Return to Praetoria Group</Link>
        </footer>
      </main>
    </div>
  );
}
