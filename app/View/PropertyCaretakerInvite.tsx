"use client";

import { FormEvent, useState } from "react";
import { inviteCaretaker } from "../actions/property";
import styles from "./PropertyCaretakerInvite.module.css";

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
		<section className={styles.card}>
			<div className={styles.eyebrow}>Caretaker</div>
			<h2 className={styles.title}>Invite a caretaker</h2>
			<p className={styles.description}>
				Caretakers receive an email invitation and must sign in or register, then explicitly accept it.
			</p>

			<form onSubmit={handleSubmit} className={styles.form}>
				<label htmlFor="caretaker-email" className={styles.label}>Caretaker email</label>
				<input
					id="caretaker-email"
					type="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					placeholder="caretaker@example.com"
					required
					disabled={loading}
					className={styles.input}
				/>
				<button
					type="submit"
					disabled={loading}
					className={styles.button}
				>
					{loading ? "Sending..." : "Send invite"}
				</button>
			</form>

			{message && <p className={styles.success} role="status">{message}</p>}
			{error && <p className={styles.error} role="alert">{error}</p>}
		</section>
	);
}
