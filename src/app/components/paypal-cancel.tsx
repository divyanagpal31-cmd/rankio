import { Link } from "react-router";
import { Button } from "./ui/button";

export function PayPalCancel() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-border/60 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-primary">Checkout cancelled</h1>
        <p className="mt-4 text-muted-foreground">
          No worries — your PayPal payment was not completed. You can try again whenever you’re ready.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/dashboard/subscription">Back to plans</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

