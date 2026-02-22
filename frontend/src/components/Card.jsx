function Card({ title, value, subtitle, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 transition-colors">
      {title && <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>}
      {value && <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>}
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
      {children}
    </div>
  );
}

export default Card;
