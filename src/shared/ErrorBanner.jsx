// Bandeau d'erreur reutilisable, a la place du <p style={{color: ...}}>
// Erreur : {erreur}</p> disperse dans toutes les pages. `onRetry` est
// optionnel (omis quand il n'y a pas de fonction de rechargement
// evidente, ex: une soumission de formulaire).
function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="error-banner">
      <span className="error-banner-icon">⚠</span>
      <div className="error-banner-texts">
        <div className="error-banner-title">Une erreur est survenue</div>
        <div className="error-banner-message">{message}</div>
      </div>
      {onRetry && (
        <button type="button" className="error-banner-retry" onClick={onRetry}>
          ↺ Réessayer
        </button>
      )}
    </div>
  );
}

export default ErrorBanner;
