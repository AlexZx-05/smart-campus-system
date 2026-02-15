function Card({ title, value, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      {title && <p className="text-sm text-slate-500">{title}</p>}
      {value && <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>}
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      {children}
    </div>
  );
}

export default Card;
