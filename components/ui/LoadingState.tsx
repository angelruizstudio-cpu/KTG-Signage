export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid min-h-52 place-items-center text-sm text-slate-400">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 animate-ping rounded-full bg-cyan" />
        {label}
      </div>
    </div>
  );
}
