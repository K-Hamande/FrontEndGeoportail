import { useState } from "react";
import { useAuth } from "../shared/AuthContext";
import { adminPost } from "../shared/backofficeApiClient";
import ErrorBanner from "../shared/ErrorBanner";

function ResetPasswordModal({ userId, onClose, onSaved }) {
  const { getAuthHeader } = useAuth();
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [erreur, setErreur] = useState(null);
  const [enregistrement, setEnregistrement] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setEnregistrement(true);
    try {
      await adminPost(`/backoffice/api/v1/users/${userId}/reset-password`, getAuthHeader(), { nouveauMotDePasse });
      onSaved();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
        <h2>Réinitialiser le mot de passe</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Nouveau mot de passe *</label>
            <input
              type="password"
              value={nouveauMotDePasse}
              onChange={(e) => setNouveauMotDePasse(e.target.value)}
              required
              autoFocus
            />
          </div>

          <ErrorBanner message={erreur} />

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={enregistrement}>
              {enregistrement ? "Enregistrement..." : "Réinitialiser"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordModal;