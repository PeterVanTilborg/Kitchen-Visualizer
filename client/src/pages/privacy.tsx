import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="link-back-home">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-8" data-testid="text-privacy-title">Privacy Policy</h1>

        <div className="prose dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Last updated: 24 May 2026</p>

          <section>
            <p>This policy explains, in plain language, what data WrapUp AI collects when you use our car wrap visualisation service, why we collect it, who we share it with, and what rights you have. If anything here is unclear, please email us at <a href="mailto:info@wrap-up.app" className="underline">info@wrap-up.app</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">1. What we collect</h2>
            <p>When you use WrapUp AI, we collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>The photo you upload.</strong> The car photo you submit so we can generate a wrap visualisation on it.</li>
              <li><strong>The generated render.</strong> The output image produced for your chosen colour and options.</li>
              <li><strong>Your email address.</strong> Used to verify you are a real person (anti-abuse), to send your render, and &mdash; if you create an account &mdash; to manage your account.</li>
              <li><strong>Approximate location.</strong> We derive a city, country, and rough latitude/longitude from your IP address using a local copy of the MaxMind GeoLite2 database. The lookup runs on our server; your raw IP address is not sent to MaxMind. We store the derived geo on render records, not the IP itself.</li>
              <li><strong>Account information.</strong> If you register an account, we store your name, email, a hashed password, your credit balance, and (where applicable) your ambassador or referral status.</li>
              <li><strong>Payment information.</strong> If you buy credits or a partner subscription, Stripe processes the payment on its own hosted checkout. We do not see or store your card details &mdash; we receive only the confirmation, a Stripe customer ID, and the amount.</li>
              <li><strong>Basic technical data.</strong> For certain protected or rate-limited actions we record the request IP address and user-agent in an internal audit log, for security and abuse-prevention purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. How we use your information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To generate, store, and deliver your wrap visualisation.</li>
              <li>To verify your email address and prevent abuse of the free tier.</li>
              <li>To process payments and apply credits to your account.</li>
              <li>To send transactional emails: your render, account verification codes, password resets, and welcome messages.</li>
              <li>To operate, secure, and improve the service (rate limiting, fraud detection, basic error monitoring).</li>
              <li>To understand aggregate usage (such as which countries renders come from) and to attribute referrals through our ambassador programme.</li>
            </ul>
            <p>We do not sell your personal data. We do not use your data for advertising. We do not share your email with third parties for marketing.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Image processing and AI</h2>
            <p>To create your visualisation, your uploaded photo is sent to Google&rsquo;s Gemini API, which is the AI model that produces the wrap render. We send only the image plus a short text prompt describing the chosen colour and options &mdash; no email address, account information, or location data is included in that call. Google&rsquo;s handling of data submitted to Gemini is governed by Google&rsquo;s own terms and privacy policy.</p>
            <p>Both your uploaded photo and the generated render are stored in our database alongside the render record, so that the render can be retrieved, re-sent, or shown in your account history.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Third-party services we use (sub-processors)</h2>
            <p>We rely on a small number of trusted providers to run the service. Each receives only the data needed for its role:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Google (Gemini API)</strong> &mdash; AI image generation. Receives the uploaded photo and a text prompt.</li>
              <li><strong>Stripe</strong> &mdash; payment processing for credits and partner subscriptions. Receives your email and your payment details, entered on Stripe&rsquo;s hosted checkout (never on our site).</li>
              <li><strong>SendGrid (Twilio)</strong> &mdash; transactional email delivery: verification codes, render results, password resets, welcome messages. Receives the recipient email address and the message content, including the rendered image when a render is delivered by email.</li>
              <li><strong>Twilio</strong> &mdash; SMS delivery if you choose to send a render to a phone number. Receives the phone number and a link to the render.</li>
              <li><strong>MaxMind (GeoLite2 database)</strong> &mdash; IP-to-location lookup. We use a local copy of the database on our server, so your IP address is not transmitted to MaxMind during a lookup.</li>
              <li><strong>Cloudflare Turnstile</strong> &mdash; bot and spam protection on sign-up, email verification, and admin login. Loads a small script in your browser to verify you are a human visitor.</li>
              <li><strong>Railway</strong> &mdash; cloud hosting for our application servers and database.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Data retention</h2>
            <p>We retain your data &mdash; including uploaded photos, generated renders, and account information &mdash; for as long as your account or relationship with the service exists, and for a reasonable period afterwards for legal, accounting, and abuse-prevention purposes. We do not currently delete renders or uploaded images on a fixed schedule. If you would like your data removed sooner, see &lsquo;Your rights&rsquo; below.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Cookies</h2>
            <p>We use a small number of strictly functional cookies. We do not use advertising cookies, Google Analytics, the Meta Pixel, or any third-party tracking cookies.</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Session cookie</strong> (<code>connect.sid</code>) &mdash; keeps you signed in to your account. Required for the site to work when you are logged in.</li>
              <li><strong>Free-tier token cookie</strong> (<code>wup_consumer_token</code>) &mdash; remembers that this browser has verified an email address, so you do not have to re-verify on every render. Lasts up to two years.</li>
              <li><strong>Referral cookie</strong> (<code>wup_ref</code>) &mdash; if you arrive through an ambassador link, this remembers who referred you so they can be credited if you sign up. Lasts 30 days.</li>
            </ul>
            <p>Cloudflare Turnstile (see section 4) may also set its own cookies on pages where the anti-bot challenge appears. You can clear or block cookies in your browser settings; the site will not work fully without the session cookie while you are signed in.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. International data transfer</h2>
            <p>Several of the providers listed above (Google, Stripe, SendGrid/Twilio, MaxMind, Cloudflare) are based in the United States, and our hosting provider Railway may host data in the US or in other regions. This means your personal data may be transferred to, stored, and processed outside the European Economic Area or your own country. We rely on the safeguards each provider has in place for international transfers, such as Standard Contractual Clauses where applicable.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Your rights</h2>
            <p>Depending on where you live, you may have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Access</strong> &mdash; request a copy of the personal data we hold about you.</li>
              <li><strong>Correction</strong> &mdash; ask us to fix data that is wrong or out of date.</li>
              <li><strong>Deletion</strong> &mdash; ask us to delete your account and associated data, subject to records we may be required to keep for legal or accounting reasons.</li>
              <li><strong>Objection or restriction</strong> &mdash; ask us to stop or limit certain processing.</li>
              <li><strong>Data portability</strong> &mdash; request your data in a portable format.</li>
              <li><strong>Withdraw consent</strong> &mdash; where we rely on your consent, you can withdraw it at any time.</li>
              <li><strong>Do Not Sell or Share</strong> (California residents, under the CCPA/CPRA) &mdash; we do not sell your personal information and we do not share it for cross-context behavioural advertising. There is therefore nothing to opt out of, but you have the right to confirm this.</li>
              <li><strong>Complain to a regulator</strong> &mdash; EU/EEA residents may complain to their national data protection authority; UK residents may complain to the ICO.</li>
            </ul>
            <p>To exercise any of these rights, email <a href="mailto:info@wrap-up.app" className="underline">info@wrap-up.app</a> from the address tied to your account. We aim to respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Children</h2>
            <p>WrapUp AI is not intended for use by children under 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will delete it.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Security</h2>
            <p>We protect your data with industry-standard measures: HTTPS in transit, hashed passwords, restricted database access, audit logging for sensitive operations, and bot protection on authentication endpoints. No system is perfectly secure; if we ever become aware of a breach that affects your personal data, we will notify you and the relevant authorities as required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Updates to this policy</h2>
            <p>We may update this policy as the service evolves or as the law requires. When we make material changes, we will update the &lsquo;Last updated&rsquo; date at the top, and where appropriate notify account holders by email.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">12. Contact</h2>
            <p>For privacy-related questions, requests, or complaints, please email <a href="mailto:info@wrap-up.app" className="underline">info@wrap-up.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
