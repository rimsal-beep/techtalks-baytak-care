"use client";

import { useSyncExternalStore } from "react";

function greetingFor(hour: number) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

const subscribe = () => () => {};

/**
 * "Good morning" / "Good afternoon" / "Good evening" for the visitor's own clock.
 * The server doesn't know the visitor's time zone, so it renders a neutral "Welcome back"
 * and the browser swaps in the right greeting as soon as the page loads.
 */
export default function Greeting() {
  const text = useSyncExternalStore(
    subscribe,
    () => greetingFor(new Date().getHours()),
    () => "Welcome back"
  );

  return <>{text}</>;
}
