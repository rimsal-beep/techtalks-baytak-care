
"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  acceptInvitation,
  declineInvitation,
  getInvitationPreview,
} from "@/app/actions/invitation";

type Preview = {
  ownerName: string;
  location: string;
  expiresAt: string;
};

export default function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadPreview() {
      try {
        const result = await getInvitationPreview(token);

        if (!active) return;

        if (result.success) {
          setPreview(result.preview);
        } else {
          setMessage(result.error);
        }
      } catch {
        if (active) {
          setMessage("Unable to load invitation.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPreview();

    return () => {
      active = false;
    };
  }, [token]);

  async function handleDecision(decision: "accept" | "decline") {
    if (processing) return;

    setProcessing(true);
    setMessage("");

    try {
      const result =
        decision === "accept"
          ? await acceptInvitation(token)
          : await declineInvitation(token);

      setMessage(result.success ? result.message : result.error);

      if (result.success) {
  setCompleted(true);

  if (decision === "accept" && result.propertyId) {
    router.replace(
      `/caretaker/dashboard?property=${encodeURIComponent(result.propertyId)}`
    );
  }
}
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-2xl font-bold">
        Caretaker Invitation
      </h1>

      {loading && <p>Loading invitation...</p>}

      {!loading && preview && (
        <>
          <p className="mb-4">
            You have been invited to manage a property.
          </p>

          <div className="mb-6 rounded border p-4">
            <p>
              <strong>Owner:</strong> {preview.ownerName}
            </p>
            <p>
              <strong>Location:</strong> {preview.location}
            </p>
            <p>
              <strong>Expires:</strong>{" "}
              {new Date(preview.expiresAt).toLocaleDateString()}
            </p>
          </div>

          {!completed && (
            <>
              <p className="mb-4">
                Sign in or register using the invited email address.
                You must verify your email before responding.
              </p>

              <div className="mb-6 flex gap-4">
                <Link
                  href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                  className="underline"
                >
                  Sign in
                </Link>

                <Link
                  href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`}
                  className="underline"
                >
                  Register
                </Link>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleDecision("accept")}
                  disabled={processing}
                  className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  Accept
                </button>

                <button
                  type="button"
                  onClick={() => handleDecision("decline")}
                  disabled={processing}
                  className="rounded border px-4 py-2 disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </>
          )}

          {completed && (
              <Link href="/caretaker/dashboard" className="mt-4 block underline">
                 Continue to Dashboard
              </Link>
           )}
        </>
      )}

      {message && (
        <p role="status" className="mt-4">
          {message}
        </p>
      )}
    </main>
  );
}
