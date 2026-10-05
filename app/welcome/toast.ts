let timer: number | undefined;

/** Shows the small confirmation popup rendered by <Toast /> for a few seconds. */
export function showToast(message: string) {
  const root = document.querySelector(".bcl");
  const toast = root?.querySelector<HTMLElement>("#toast");
  const text = root?.querySelector<HTMLElement>("#toastMsg");
  if (!toast || !text) return;
  text.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(timer);
  timer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}