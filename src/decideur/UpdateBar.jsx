function UpdateBar({ lastUpdated, onRefresh, isLoading }) {
  const formatted = lastUpdated.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="toolbar">
      <span>
        Mis à jour : <strong>{formatted}</strong>
      </span>
      <button className="btn-refresh" onClick={onRefresh} disabled={isLoading}>
        <span className={isLoading ? "btn-refresh-icon spinning" : "btn-refresh-icon"}>↻</span>
        {isLoading ? "Actualisation..." : "Actualiser"}
      </button>
    </div>
  );
}

export default UpdateBar;
