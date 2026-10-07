"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { logout } from "../actions/logout";
import s from "./LogoutButton.module.css";

type Props = {
  className?: string;
  children: ReactNode;
};

export default function LogoutButton({ className, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className={className} onClick={() => dialogRef.current?.showModal()}>
        {children}
      </button>

      <dialog ref={dialogRef} className={s.dialog}>
        <h2 className={s.title}>Log out?</h2>
        <p className={s.text}>You will need to log in again to see your properties.</p>

        <div className={s.actions}>
          <button type="button" className={s.cancel} onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>

          <form action={logout}>
            <button type="submit" className={s.confirm}>
              Log out
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}