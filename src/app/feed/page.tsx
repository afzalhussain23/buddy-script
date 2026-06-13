import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { FeedHeader } from "./feed-header";

export default async function FeedPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return (
    <div style={{ minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <FeedHeader name={session.user.name} />
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", fontWeight: 600 }}>
          Welcome, {session.user.name}!
        </h1>
        <p style={{ color: "#6b7280" }}>
          You are signed in as {session.user.email}.
        </p>
      </main>
    </div>
  );
}
