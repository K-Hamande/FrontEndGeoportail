import { useEffect, useState } from "react";
import { useAuth } from "../shared/AuthContext";
import { adminGet, adminPost } from "../shared/backofficeApiClient";
import ErrorBanner from "../shared/ErrorBanner";
import Topbar from "./Topbar";

const ROLE_LABELS = {
  SUPER_ADMIN: "Super administrateur",
  ADMIN_DEST: "Administrateur DEST",
  ADMIN_DIG: "Administrateur DIG",
};

function MonProfilPage() {
  const { getAuthHeader, updatePassword } = useAuth();
  const [profil, setProfil] = useState(null);
  const [erreur, setErreur] = useState(null);

  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreurMotDePasse, setErreurMotDePasse] = useState(null);
  const [messageSucces, setMessageSucces] = useState(null);
  const [enregistrement, setEnregistrement] = useState(false);

  function charger() {
    adminGet("/backoffice/api/v1/me", getAuthHeader()).then(setProfil).catch((e) => setErreur(e.message));
  }

  useEffect(() => { charger(); }, []);

  async function changerMotDePasse(e) {
    e.preventDefault();
    setErreurMotDePasse(null);
    setMessageSucces(null);

    if (nouveauMotDePasse !== confirmation) {
      setErreurMotDePasse("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    if (nouveauMotDePasse.length < 6) {
      setErreurMotDePasse("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setEnregistrement(true);
    try {
      await adminPost("/backoffice/api/v1/me/password", getAuthHeader(), { motDePasseActuel, nouveauMotDePasse });
      // Voir le commentaire dans AuthContext.updatePassword : indispensable
      // avec l'authentification HTTP Basic, sinon le prochain appel API
      // (par ex. le rechargement de cette meme page) echoue avec l'ancien
      // mot de passe.
      updatePassword(nouveauMotDePasse);
      setMotDePasseActuel("");
      setNouveauMotDePasse("");
      setConfirmation("");
      setMessageSucces("Mot de passe modifié avec succès.");
    } catch (err) {
      setErreurMotDePasse(
        err.message === "Erreur API (400) sur /backoffice/api/v1/me/password"
          ? "Mot de passe actuel incorrect."
          : err.message
      );
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <>
      <Topbar title="Mon profil" subtitle="Informations de votre compte et mot de passe" onRefresh={charger} />
      <div className="backoffice-content">
        <ErrorBanner message={erreur} onRetry={charger} />

        <div className="panel">
          <div className="panel-header">
            <h2>Informations du compte</h2>
          </div>
          {profil ? (
            <div className="form-grid">
              <div className="form-field">
                <label>Login</label>
                <input value={profil.login} disabled />
              </div>
              <div className="form-field">
                <label>Nom complet</label>
                <input value={profil.nomComplet || ""} disabled />
              </div>
              <div className="form-field">
                <label>Rôle</label>
                <input value={ROLE_LABELS[profil.role] ?? profil.role} disabled />
              </div>
            </div>
          ) : (
            !erreur && <p>Chargement...</p>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Changer mon mot de passe</h2>
          </div>
          <form onSubmit={changerMotDePasse}>
            <div className="form-grid">
              <div className="form-field" style={{ gridColumn: "span 2" }}>
                <label>Mot de passe actuel *</label>
                <input type="password" value={motDePasseActuel}
                  onChange={(e) => setMotDePasseActuel(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Nouveau mot de passe *</label>
                <input type="password" value={nouveauMotDePasse}
                  onChange={(e) => setNouveauMotDePasse(e.target.value)} required minLength={6} />
              </div>
              <div className="form-field">
                <label>Confirmer le nouveau mot de passe *</label>
                <input type="password" value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)} required minLength={6} />
              </div>
            </div>

            {erreurMotDePasse && <p style={{ color: "var(--bo-ko)" }}>Erreur : {erreurMotDePasse}</p>}
            {messageSucces && <p style={{ color: "var(--bo-ok)" }}>{messageSucces}</p>}

            <div className="modal-actions">
              <button type="submit" className="btn-primary" disabled={enregistrement}>
                {enregistrement ? "Enregistrement..." : "Changer le mot de passe"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default MonProfilPage;