import { getNewsletterSubscribers } from "@/lib/actions";
import { SubscribersList } from "@/components/admin/SubscribersList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Subscribers | karmakoders Admin",
};

export default async function SubscribersPage() {
  const subscribers = await getNewsletterSubscribers();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Email subscribers</h2>
        <p className="text-slate-400 mt-1">People who signed up from the blog CTA or footer newsletter form</p>
      </div>

      <SubscribersList
        subscribers={subscribers.map((row) => ({
          id: row.id,
          email: row.email,
          createdAt: row.createdAt.toISOString(),
        }))}
      />

      <div className="text-slate-600 text-sm">
        Showing {subscribers.length} total {subscribers.length === 1 ? "subscriber" : "subscribers"}
      </div>
    </div>
  );
}
