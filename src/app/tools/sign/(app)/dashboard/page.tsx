import { redirect } from "next/navigation";
import { getCustomerSession, revokeCustomerSession } from "@/platform/auth";
import { Button } from "@/components/product-ui";

export default async function SignDashboardPage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/tools/sign/login");
  }

  async function signOut() {
    "use server";
    await revokeCustomerSession();
    redirect("/tools/sign/login");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
        <p className="text-[#A39F97]">
          Signed in as <span className="text-white">{session.customer.email}</span>
        </p>
      </div>
      <p className="text-sm text-[#A39F97] max-w-xl leading-relaxed">
        Document compose and sends ship next. You&apos;re authenticated with a{" "}
        <code className="text-[#FFC300]">kk_session</code> cookie — not NextAuth.
      </p>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
