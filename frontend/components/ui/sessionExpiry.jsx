export default function SessionExpiry() {
  return (
    <main>
      <p className="eyebrow">Session required</p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-950">
        Unable to load dashboard
      </h1>
      <p className="mt-3 text-sm text-slate-600">
        {state.error || "Please sign in again."}
      </p>
      <button
        className="btn-primary mt-6"
        onClick={() => router.replace("/")}
        type="button"
      >
        Back to login
      </button>
    </main>
  );
}
