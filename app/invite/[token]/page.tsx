
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { acceptInvitation } from "@/app/actions/invitation";

export default function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [accepted, setAccepted] = useState(false);

  async function handleAccept() {
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const result = await acceptInvitation(token);
      setMessage(
        result.success ? result.message : result.error
      );
      setAccepted(result.success);
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-2xl font-bold">
        Caretaker Invitation
      </h1>

      <p className="mb-6">
        Sign in or register as a caretaker using the invited
        email address, then accept the invitation.
      </p>

      {!accepted && (
        <>
          <div className="mb-6 flex gap-4">
            <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="underline">
              Sign in
            </Link>
            <Link href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`} className="underline">
              Register
            </Link>
          </div>

          <button
            type="button"
            onClick={handleAccept}
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Processing..." : "Accept Invitation"}
          </button>
        </>
      )}

      {message && (
        <p role="status" className="mt-4">
          {message}
        </p>
      )}

      {accepted && (
        <Link href="/" className="mt-4 block underline">
          Continue
        </Link>
      )}
    </main>
  );
}
