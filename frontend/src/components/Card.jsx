function Card({ title, value, subtitle, children, onClick, className = "" }) {
  const isInteractive = typeof onClick === "function";

  return (
    <div
      className={`rounded-xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/55 to-blue-50/70 shadow-[0_8px_24px_-20px_rgba(30,64,175,0.45)] p-5 transition-colors ${
        isInteractive
          ? "cursor-pointer hover:border-blue-300 hover:shadow-[0_12px_28px_-18px_rgba(30,64,175,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          : ""
      } ${className}`}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      {title && <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>}
      {value && <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>}
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
      {children}
    </div>
  );
}

export default Card;
