import { Children, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// Combobox "select" avec un champ de recherche integre a l'interieur
// du menu deroulant (et non plus au-dessus du <select>) : on clique sur
// le controle, un panneau s'ouvre avec un champ de recherche en haut et
// la liste des options filtrees en dessous. On garde exactement la
// meme API que le <select> natif cote appelant (value/onChange/name/
// required/disabled/children) donc aucune page appelante n'a besoin de
// changer sa logique - seul ce composant a ete reecrit.
//
// Un <select> natif est conserve, invisible mais toujours "rendu" (pas
// de display:none), pour que la validation HTML5 required continue de
// fonctionner exactement comme avant.
function extraireOptions(children) {
  return Children.toArray(children)
    .filter((enfant) => enfant && enfant.props)
    .map((enfant) => ({
      value: enfant.props.value ?? "",
      label: enfant.props.children,
    }));
}

function SearchableSelect({
  children,
  searchPlaceholder = "Rechercher...",
  className = "",
  selectClassName = "",
  value,
  name,
  onChange,
  required,
  disabled,
}) {
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const conteneurRef = useRef(null);
  const rechercheRef = useRef(null);

  const options = useMemo(() => extraireOptions(children), [children]);

  const optionsFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return options;
    return options.filter((opt) => {
      if (opt.value === "") return true; // garder l'option "vide" visible
      return String(opt.label ?? "").toLowerCase().includes(terme);
    });
  }, [options, recherche]);

  const selection = options.find((opt) => String(opt.value) === String(value ?? ""));

  useEffect(() => {
    function fermerSiExterieur(e) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target)) {
        setOuvert(false);
        setRecherche("");
      }
    }
    document.addEventListener("mousedown", fermerSiExterieur);
    return () => document.removeEventListener("mousedown", fermerSiExterieur);
  }, []);

  useEffect(() => {
    if (ouvert && rechercheRef.current) rechercheRef.current.focus();
  }, [ouvert]);

  function ouvrirFermer() {
    if (disabled) return;
    setOuvert((o) => !o);
  }

  function choisir(opt) {
    onChange?.({ target: { name, value: opt.value } });
    setOuvert(false);
    setRecherche("");
  }

  return (
    <div className={`searchable-select-combo ${className}`} ref={conteneurRef}>
      <button
        type="button"
        className={`searchable-select-trigger ${selectClassName}`}
        onClick={ouvrirFermer}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
      >
        <span className="searchable-select-trigger-label">
          {selection ? selection.label : "—"}
        </span>
        <ChevronDown size={13} className="searchable-select-caret" />
      </button>

      {ouvert && (
        <div className="searchable-select-menu" role="listbox">
          <input
            ref={rechercheRef}
            type="text"
            className="searchable-select-menu-search"
            placeholder={searchPlaceholder}
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOuvert(false);
                setRecherche("");
              }
            }}
          />
          <div className="searchable-select-menu-list">
            {optionsFiltrees.map((opt) => (
              <div
                key={String(opt.value)}
                role="option"
                aria-selected={String(opt.value) === String(value ?? "")}
                className={`searchable-select-menu-option ${
                  String(opt.value) === String(value ?? "") ? "is-selected" : ""
                }`}
                onClick={() => choisir(opt)}
              >
                {opt.label}
              </div>
            ))}
            {optionsFiltrees.length === 0 && (
              <div className="searchable-select-menu-empty">Aucun résultat</div>
            )}
          </div>
        </div>
      )}

      {/* <select> natif invisible : conserve la validation HTML5 (required)
          et le comportement de formulaire, sans etre visible a l'ecran. */}
      <select
        className="searchable-select-native"
        name={name}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
      >
        {children}
      </select>
    </div>
  );
}

export default SearchableSelect;