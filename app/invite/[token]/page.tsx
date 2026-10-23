"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  acceptInvitation,
  declineInvitation,
  getInvitationPreview,
} from "@/app/actions/invitation";
import AuthShell from "@/app/Components/AuthShell";
import f from "@/app/Components/AuthShell.module.css";

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
  const [isError, setIsError] = useState(false);
  const [completed, setCompleted] = useState(false);

  const nextUrl = encodeURIComponent(`/invite/${token}`);

  useEffect(() => {
    let active = true;

    async function loadPreview() {
      try {
        const result = await getInvitationPreview(token);

        if (!active) return;

        if (result.success) {
          setPreview(result.preview);
        } else {
          setIsError(true);
          setMessage(result.error);
        }
      } catch {
        if (active) {
          setIsError(true);
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

      setIsError(!result.success);
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
      setIsError(true);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  const statusBox = message && (
    <div
      className={isError ? f.error : f.notice}
      role={isError ? "alert" : "status"}
      aria-live="polite"
    >
      {message}
    </div>
  );

  return (
    <AuthShell>
      {loading && (
        <>
          <div className={f.spinner} aria-hidden="true" />
          <h1 className={f.title}>Loading invitation</h1>
          <p className={f.sub}>One moment...</p>
        </>
      )}

      {!loading && !preview && (
        <>
          <h1 className={f.title}>Invitation unavailable</h1>
          <p className={f.sub}>
            This invitation may have expired, been cancelled, or already been
            used.
          </p>
          {statusBox}
          <Link href="/login" className={f.secondary}>
            Go to login
          </Link>
        </>
      )}

      {!loading && preview && (
        <>
          <h1 className={f.title}>You&apos;ve been invited</h1>
          <p className={f.sub}>
            {preview.ownerName} invited you to look after a property on Baytak
            Care.
          </p>

          <div className={f.details}>
            <div className={f.detailRow}>
              <span className={f.detailLabel}>Owner</span>
              <span className={f.detailValue}>{preview.ownerName}</span>
            </div>
            <div className={f.detailRow}>
              <span className={f.detailLabel}>Location</span>
              <span className={f.detailValue}>{preview.location}</span>
            </div>
            <div className={f.detailRow}>
              <span className={f.detailLabel}>Expires</span>
              <span className={f.detailValue}>
                {new Date(preview.expiresAt).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {completed ? (
            <>
              {statusBox}
              <Link href="/caretaker/dashboard" className={f.btnPrimary}>
                Continue to dashboard
              </Link>
            </>
          ) : (
            <>
              <p className={f.step}>Step 1</p>
              <p className={f.stepText}>
                Create an account or log in with the email address this
                invitation was sent to.
              </p>
              <div className={f.actionsRow}>
                <Link
                  href={`/signup?next=${nextUrl}`}
                  className={f.btnPrimary}
                >
                  Create account
                </Link>
                <Link href={`/login?next=${nextUrl}`} className={f.secondary}>
                  Log in
                </Link>
              </div>

              <div className={f.divider} />

              <p className={f.step}>Step 2</p>
              <p className={f.stepText}>
                Once you&apos;re logged in with your caretaker account, accept or
                decline the invitation.
              </p>
              {statusBox}
              <div className={f.actionsRow}>
                <button
                  type="button"
                  onClick={() => handleDecision("accept")}
                  disabled={processing}
                  className={f.btnPrimary}
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision("decline")}
                  disabled={processing}
                  className={f.secondary}
                >
                  Decline
                </button>
              </div>
            </>
          )}
        </>
      )}
    </AuthShell>
  );
}