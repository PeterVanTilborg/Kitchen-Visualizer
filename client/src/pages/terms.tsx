import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="link-back-home">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-8" data-testid="text-terms-title">Terms and Conditions</h1>

        <div className="prose dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing and using Wrap Up AI, you accept and agree to be bound by these Terms and Conditions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Use of Service</h2>
            <p>Wrap Up AI provides AI-powered car wrap visualization services. You agree to use the service only for lawful purposes and in accordance with these terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. User Content</h2>
            <p>You retain ownership of any images you upload. By using our service, you grant us a limited license to process your images for visualization purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Payment Terms</h2>
            <p>Paid features are billed as described at the time of purchase. All payments are non-refundable unless otherwise stated.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Limitation of Liability</h2>
            <p>Wrap Up AI is provided "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Changes to Terms</h2>
            <p>We may update these terms at any time. Continued use of the service constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Contact</h2>
            <p>For questions about these terms, please contact us through our website.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
