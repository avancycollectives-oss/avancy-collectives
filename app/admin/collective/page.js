import CollectiveModeration from "./CollectiveModeration";

export const dynamic = "force-dynamic";

export default function AdminCollectivePage() {
  return (
    <main className="admin-page">
      <CollectiveModeration />
    </main>
  );
}
