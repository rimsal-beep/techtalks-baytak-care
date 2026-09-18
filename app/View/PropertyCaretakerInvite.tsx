"use client";

import { FormEvent, useState } from "react";
import { inviteCaretaker } from "../actions/property";

type PropertyCaretakerInviteProps = {
	propertyId: string;
	currentCaretakerEmail?: string | null;
};

export default function PropertyCaretakerInvite({
	propertyId,
	currentCaretakerEmail,
}: PropertyCaretakerInviteProps) {
	const [email, setEmail] = useState(currentCaretakerEmail ?? "");
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMessage("");
		setError("");
		setLoading(true);

		const result = await inviteCaretaker(propertyId, email);

		if (result.success) setMessage(result.message);
		else setError(result.error);

		setLoading(false);
	}

	return (
		<section className="rounded-2xl bg-white p-6 shadow-sm">
			<h2 className="text-xl font-semibold text-[#17324D]">Invite a caretaker</h2>
			<p className="mt-1 text-sm text-slate-500">
				Existing caretaker accounts are linked immediately. New accounts are linked after signup.
			</p>

			<form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
				<label htmlFor="caretaker-email" className="sr-only">Caretaker email</label>
				<input
					id="caretaker-email"
					type="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					placeholder="caretaker@example.com"
					required
					disabled={loading}
					className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm text-[#17324D] outline-none focus:border-[#17324D] focus:ring-2 focus:ring-[#17324D]/20 disabled:bg-slate-100"
				/>
				<button
					type="submit"
					disabled={loading}
					className="rounded-xl bg-[#17324D] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{loading ? "Sending..." : "Send invite"}
				</button>
			</form>

			{message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
			{error && <p className="mt-3 text-sm text-red-700">{error}</p>}
		</section>
	);
}
