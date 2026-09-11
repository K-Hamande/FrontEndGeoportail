import { useState } from "react";
import { Building2, Plug, MessageCircle, Phone, ChevronDown } from "lucide-react";
import { getStatusIcon } from "../shared/statusStyles";

function classFor(status) {
  if (status === "KO") return "ko";
  if (status === "WARN") return "warn";
  if (status === "UNKNOWN") return "unknown";
  return "ok";
}

const TYPE_LABELS = { BORNE_WIFI: "Borne Wi-Fi", COMMUTATEUR: "Commutateur" };

function normaliserNumero(numero) {
  if (!numero) return null;
  const chiffres = numero.replace(/\D/g, "");
  if (chiffres.length === 8) return "226" + chiffres;
  if (chiffres.length === 9 && chiffres.startsWith("0")) return "226" + chiffres.slice(1);
  return chiffres;
}

function ignorerClicParent(event) {
  event.stopPropagation();
}

function BoutonWhatsapp(props) {
  const lien = "https://wa.me/" + props.numero;
  return (
    <a className="lan-contact-btn lan-contact-btn-whatsapp" href={lien} target="_blank" rel="noopener noreferrer" onClick={ignorerClicParent}>
      <MessageCircle size={14} /> WhatsApp
    </a>
  );
}

function BoutonAppel(props) {
  const lien = "tel:" + props.numero;
  return (
    <a className="lan-contact-btn lan-contact-btn-appel" href={lien} onClick={ignorerClicParent}>
      <Phone size={14} /> Appeler
    </a>
  );
}

function ContactDsiPanel(props) {
  const contact = props.contact;

  if (!contact) {
    return (
      <p className="lan-contact-absent">
        Aucun contact DSI renseigné pour ce site. Ajoutez-le depuis le backoffice.
      </p>
    );
  }

  const numeroWhatsapp = normaliserNumero(contact.telephone);
  const numeroAppel = contact.telephone ? contact.telephone.replace(/\s/g, "") : null;

  return (
    <div className="lan-contact-card">
      <div className="lan-contact-nom">{contact.nom || "Contact DSI"}</div>
      {contact.email && <div className="lan-contact-detail">{contact.email}</div>}
      {contact.telephone && <div className="lan-contact-detail">{contact.telephone}</div>}

      <div className="lan-contact-buttons">
        {numeroWhatsapp && <BoutonWhatsapp numero={numeroWhatsapp} />}
        {numeroAppel && <BoutonAppel numero={numeroAppel} />}
      </div>
    </div>
  );
}

function LanStatusCard({ data }) {
  const [etagesOuverts, setEtagesOuverts] = useState(new Set());

  if (!data) {
    return <div className="status-card">Chargement...</div>;
  }

  function basculerEtage(nom) {
    setEtagesOuverts((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(nom)) suivant.delete(nom);
      else suivant.add(nom);
      return suivant;
    });
  }

  const globalStatusPourBadge = data.globalStatus === "KO" ? "KO" : data.globalStatus === "WARN" ? "WARN" : "OK";
  const badgeClass = globalStatusPourBadge === "KO" ? "badge-ko" : globalStatusPourBadge === "WARN" ? "badge-warn" : "badge-ok";
  const BadgeIcone = getStatusIcon(globalStatusPourBadge);
  const badgeTexte = globalStatusPourBadge === "KO" ? "Incident" : globalStatusPourBadge === "WARN" ? "Alerte" : "Normal";

  // Aucun equipement LAN synchronise pour ce site : afficher un vrai etat
  // vide plutot que 3 compteurs a "0" qui ressemblent a une erreur.
  if (data.equipementsTotal === 0) {
    return (
      <div className="status-card">
        <div className="card-top">
          <div className="card-icon"><Building2 size={19} /></div>
          <div className="card-titles">
            <div className="card-title">Réseau du bâtiment</div>
            <div className="card-subtitle">LAN interne — Wi-Fi &amp; commutateurs</div>
          </div>
        </div>

        <div className="lan-empty-state">
          <div className="lan-empty-icon"><Plug size={22} /></div>
          <p className="lan-empty-title">Aucun équipement LAN synchronisé</p>
          <p className="lan-empty-text">
            Ce site n'a pas encore d'équipements Wi-Fi/commutateurs découverts depuis NetXMS,
            ou ils n'ont pas encore été rattachés à ce site dans le backoffice.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="status-card">
      <div className="card-top">
        <div className="card-icon"><Building2 size={19} /></div>
        <div className="card-titles">
          <div className="card-title">Réseau du bâtiment</div>
          <div className="card-subtitle">LAN interne — Wi-Fi &amp; commutateurs</div>
        </div>
        <span className={`status-badge ${badgeClass}`}>
          <BadgeIcone size={12} strokeWidth={3} /> {badgeTexte}
        </span>
      </div>

      <div className="counters-row">
        <div className="counter-box">
          <div className="counter-value">{data.equipementsActifs}</div>
          <div className="counter-label">actifs sur {data.equipementsTotal}</div>
        </div>
        <div className="counter-box">
          <div className={`counter-value ${data.equipementsEnPanne > 0 ? "danger" : ""}`}>{data.equipementsEnPanne}</div>
          <div className="counter-label">en panne</div>
        </div>
        <div className="counter-box">
          <div className="counter-value">{data.etats.length}</div>
          <div className="counter-label">niveaux surveillés</div>
        </div>
      </div>

      <div className="lan-split">
        <div className="lan-floors-col">
          <div className="floors-title">État par niveau</div>

          {data.etats.map((etage) => {
            const ouvert = etagesOuverts.has(etage.etage);

            return (
              <div
                key={etage.etage}
                className={`floor-row ${classFor(etage.status)} ${ouvert ? "expanded" : ""}`}
                onClick={() => basculerEtage(etage.etage)}
              >
                <div className="floor-row-header">
                  <span className={`floor-dot ${classFor(etage.status)}`}></span>
                  <div>
                    <div className="floor-name">{etage.etage}</div>
                    <div className="floor-detail">{etage.detail}</div>
                  </div>
                  <ChevronDown size={14} className="floor-chevron" />
                </div>

                {ouvert && (
                  <div className="floor-equipment-list" onClick={ignorerClicParent}>
                    {etage.equipements.map((eq) => (
                      <div key={eq.id} className="floor-equipment-item">
                        <span className={`floor-equipment-dot ${classFor(eq.status)}`}></span>
                        <span className="floor-equipment-name">{eq.libelleAffiche}</span>
                        <span className="floor-equipment-type">{TYPE_LABELS[eq.type] ?? eq.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className={`lan-action-col ${data.actionMessage ? "lan-action-col-alerte" : ""}`}>
          <div className="lan-action-title">Action requise</div>
          {data.actionMessage && <p className="lan-action-message">{data.actionMessage}</p>}
          <ContactDsiPanel contact={data.contactDsi} />
        </div>
      </div>
    </div>
  );
}

export default LanStatusCard;
