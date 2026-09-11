import { Check, TriangleAlert, X, CircleHelp } from "lucide-react";

// Code couleur universel (§5.1, §5.3 du CDC) :
// Vert = operationnel, Rouge = panne, Orange = alerte/degrade.
const COLORS = {
  OK: "#0D9B5A",
  WARN: "#C97C0A",
  KO: "#D93535",
  UNKNOWN: "#6B7280",
};

const LABELS = {
  OK: "Actif",
  WARN: "Alerte",
  KO: "Indisponible",
  UNKNOWN: "Inconnu",
};

// Icone Lucide associee a chaque statut - remplace les symboles
// unicode/emoji (✓ ⚠ ✕ ?) precedemment concatenes dans les libelles.
const ICONS = {
  OK: Check,
  WARN: TriangleAlert,
  KO: X,
  UNKNOWN: CircleHelp,
};

export function getStatusColor(status) {
  return COLORS[status] || COLORS.UNKNOWN;
}

export function getStatusLabel(status) {
  return LABELS[status] || LABELS.UNKNOWN;
}

export function getStatusIcon(status) {
  return ICONS[status] || ICONS.UNKNOWN;
}
