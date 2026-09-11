import { Globe, Check, X } from "lucide-react";
import { getStatusLabel, getStatusIcon } from "../shared/statusStyles";

function badgeClass(status) {
  if (status === "KO") return "badge-ko";
  if (status === "WARN") return "badge-warn";
  if (status === "OK") return "badge-ok";
  return "badge-unknown";
}

function boxClass(status) {
  if (status === "KO") return "ko";
  if (status === "WARN") return "warn";
  return "ok";
}

// Couleur du libelle "Qualite", basee sur le niveau normalise renvoye
// par le backend (AnpticStatusService.calculerQualite) - pas sur le
// texte lui-meme, pour rester independant du libelle exact affiche.
function qualiteColor(niveau) {
  if (niveau === "KO") return "var(--color-ko)";
  if (niveau === "WARN") return "var(--color-warn)";
  if (niveau === "OK") return "var(--color-ok)";
  return "var(--text-secondary, #5B6478)";
}

function AnpticStatusCard({ data }) {
  if (!data) {
    return <div className="status-card">Chargement...</div>;
  }

  const StatutIcon = getStatusIcon(data.status);

  return (
    <div className="status-card">
      <div className="card-top">
        <div className="card-icon"><Globe size={19} /></div>
        <div className="card-titles">
          <div className="card-title">Réseau ANPTIC</div>
          <div className="card-subtitle">Infrastructure nationale — RESINA</div>
        </div>
        <span className={`status-badge ${badgeClass(data.status)}`}>
          <StatutIcon size={12} strokeWidth={3} /> {getStatusLabel(data.status)}
        </span>
      </div>

      <div className={`message-box ${boxClass(data.status)}`}>
        <span className="message-icon">{data.disponible ? <Check size={16} /> : <X size={16} />}</span>
        <div>
          <div className="message-title">{data.message}</div>
          <div className="message-text">
            {data.disponible
              ? "Le bâtiment est bien connecté au réseau national RESINA. Toutes les liaisons sont actives."
              : `Indisponible depuis ${data.indisponibleDepuis ?? "une date inconnue"}. ${data.actionMessage ?? ""}`}
          </div>
        </div>
      </div>

      {data.disponible && (
        <div className="metrics-grid">
          <div className="metric-box">
            <div className="metric-label">Upload</div>
            <div className="metric-value">
              {data.debitMontantMbps} <span className="metric-unit">Mbit/s</span>
            </div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Download</div>
            <div className="metric-value">
              {data.debitDescendantMbps} <span className="metric-unit">Mbit/s</span>
            </div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Liaison</div>
            <div className="metric-value" style={{ fontFamily: "var(--font-main)" }}>{data.typeLiaison}</div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Qualité</div>
            <div className="metric-value" style={{ fontFamily: "var(--font-main)", color: qualiteColor(data.qualiteNiveau) }}>
              {data.qualiteSignal ?? "—"}
            </div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Latence</div>
            <div className="metric-value">
              {data.latenceMs} <span className="metric-unit">ms</span>
            </div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Dispo 30j</div>
            <div className="metric-value">
              {data.disponibilite30Jours} <span className="metric-unit">%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnpticStatusCard;
