/* ─────────────────────────────────────────────────────────────────
   CERYDRA Widget — widget.js
   Usage: <script src="https://cerydra.fr/widget.js" data-resto="mon-slug"></script>
───────────────────────────────────────────────────────────────── */

;(function () {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

  // ── Récupère le slug depuis l'attribut data-resto du script ──────
  const scriptTag = document.currentScript ||
    document.querySelector('script[data-resto]')
  const slug = scriptTag?.getAttribute('data-resto')
  if (!slug) return console.warn('[CERYDRA] Attribut data-resto manquant.')

  // ── API Supabase (REST direct) ────────────────────────────────────
  async function sbGet(table, params = '') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  async function sbPost(table, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await res.text())
    return true
  }

  // ── Utilitaires horaires ──────────────────────────────────────────
  const JOURS = { 0:'dimanche',1:'lundi',2:'mardi',3:'mercredi',4:'jeudi',5:'vendredi',6:'samedi' }

  function toMin(t) { const [h,m]=t.split(':').map(Number); return h*60+m }

  function slots(debut, fin) {
    const out = []
    let c = toMin(debut), e = toMin(fin)
    while (c < e) {
      out.push(`${String(Math.floor(c/60)).padStart(2,'0')}:${String(c%60).padStart(2,'0')}`)
      c += 30
    }
    return out
  }

  function getSlotsForDate(horaires, dateStr) {
    if (!dateStr || !horaires.length) return []
    const jour = JOURS[new Date(dateStr).getDay()]
    const h = horaires.find(x => x.jour === jour)
    if (!h || !h.ouvert) return []
    return [
      ...slots(h.midi_debut.slice(0,5), h.midi_fin.slice(0,5)),
      ...slots(h.soir_debut.slice(0,5), h.soir_fin.slice(0,5)),
    ]
  }

  function minDate(delai) {
    const d = new Date()
    d.setHours(d.getHours() + (delai || 2))
    return d.toISOString().split('T')[0]
  }

  // ── CSS injecté dans le Shadow DOM ────────────────────────────────
  const CSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    :host { font-family: 'Inter', system-ui, sans-serif; }

    /* Bouton flottant */
    #crd-btn {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 99998;
      background: #1a1a2e;
      color: #fff;
      border: none;
      padding: 14px 22px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 24px rgba(26,26,46,.35);
      transition: transform .15s, box-shadow .15s;
      letter-spacing: -.01em;
    }
    #crd-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(26,26,46,.4); }
    #crd-btn svg { width: 16px; height: 16px; }

    /* Overlay */
    #crd-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(0,0,0,.45);
      backdrop-filter: blur(3px);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity .2s;
    }
    #crd-overlay.open { opacity: 1; pointer-events: all; }

    /* Modal */
    #crd-modal {
      background: #fff;
      width: 100%;
      max-width: 480px;
      max-height: 92vh;
      border-radius: 24px 24px 0 0;
      overflow-y: auto;
      transform: translateY(40px);
      transition: transform .25s cubic-bezier(.22,1,.36,1);
      padding: 0 0 32px;
    }
    @media (min-width: 540px) {
      #crd-overlay { align-items: center; }
      #crd-modal { border-radius: 20px; transform: scale(.96) translateY(8px); }
    }
    #crd-overlay.open #crd-modal { transform: none; }

    /* Header modal */
    .crd-header {
      position: sticky;
      top: 0;
      background: #fff;
      border-bottom: 1px solid #f3f4f6;
      padding: 18px 22px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 1;
    }
    .crd-title { font-size: 15px; font-weight: 600; color: #1a1a2e; }
    .crd-resto { font-size: 12px; color: #9ca3af; margin-top: 2px; }
    .crd-close {
      width: 30px; height: 30px;
      border-radius: 50%;
      border: none;
      background: #f3f4f6;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #6b7280;
      flex-shrink: 0;
    }
    .crd-close:hover { background: #e5e7eb; }

    /* Corps formulaire */
    .crd-body { padding: 20px 22px 0; }

    .crd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .crd-field { display: flex; flex-direction: column; gap: 5px; }
    .crd-field + .crd-field { margin-top: 12px; }
    .crd-grid2 .crd-field { margin-top: 0; }

    label { font-size: 11px; font-weight: 500; color: #1a1a2e; }

    input, select, textarea {
      width: 100%;
      padding: 10px 13px;
      border: 1.5px solid #e5e7eb;
      border-radius: 12px;
      font-size: 13px;
      color: #1f2937;
      background: #fff;
      outline: none;
      font-family: inherit;
      transition: border-color .15s;
      -webkit-appearance: none;
    }
    input::placeholder, textarea::placeholder { color: #d1d5db; }
    input:focus, select:focus, textarea:focus { border-color: #1a1a2e; }
    textarea { resize: none; }
    input[disabled], select[disabled] {
      background: #f9fafb;
      color: #d1d5db;
      cursor: not-allowed;
    }

    .crd-alert {
      margin-top: 12px;
      padding: 10px 13px;
      border-radius: 12px;
      font-size: 12px;
    }
    .crd-alert.warn { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
    .crd-alert.err  { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

    .crd-submit {
      margin-top: 18px;
      width: 100%;
      padding: 13px;
      background: #1a1a2e;
      color: #fff;
      border: none;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s;
      font-family: inherit;
      letter-spacing: -.01em;
    }
    .crd-submit:hover { background: #2a2a4e; }
    .crd-submit:disabled { opacity: .45; cursor: not-allowed; }

    .crd-footer {
      text-align: center;
      font-size: 10px;
      color: #d1d5db;
      margin-top: 14px;
      padding: 0 22px;
    }
    .crd-footer span { color: #9ca3af; font-weight: 500; }

    /* Spinner */
    .crd-spinner {
      display: flex; justify-content: center; align-items: center;
      padding: 40px 0;
    }
    .crd-spinner::after {
      content: '';
      width: 28px; height: 28px;
      border: 2.5px solid #1a1a2e;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Confirmation */
    .crd-confirm {
      padding: 40px 22px 0;
      text-align: center;
    }
    .crd-confirm-icon {
      width: 56px; height: 56px;
      background: #f0fdf4;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
    }
    .crd-confirm-icon svg { width: 28px; height: 28px; color: #16a34a; }
    .crd-confirm h2 { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; }
    .crd-confirm p  { font-size: 13px; color: #6b7280; line-height: 1.6; }
    .crd-recap {
      background: #f9fafb;
      border-radius: 14px;
      padding: 16px;
      margin: 18px 0 0;
      text-align: left;
    }
    .crd-recap-row {
      display: flex; justify-content: space-between;
      font-size: 12px; padding: 4px 0;
    }
    .crd-recap-row span:first-child { color: #9ca3af; }
    .crd-recap-row span:last-child  { font-weight: 500; color: #1a1a2e; }
  `

  // ── HTML du widget ─────────────────────────────────────────────────
  function buildHTML(resto) {
    return `
      <button id="crd-btn" aria-label="Réserver une table">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Réserver
      </button>

      <div id="crd-overlay" role="dialog" aria-modal="true">
        <div id="crd-modal">
          <div class="crd-header">
            <div>
              <div class="crd-title">Réserver une table</div>
              <div class="crd-resto">${resto.nom}</div>
            </div>
            <button class="crd-close" id="crd-close-btn" aria-label="Fermer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="crd-body" id="crd-form-area"></div>
          <div class="crd-footer">Propulsé par <span>CERYDRA</span></div>
        </div>
      </div>
    `
  }

  function buildForm(resto, horaires) {
    const min = minDate(resto.delai_minimum_heures)
    const maxP = resto.nb_couverts_max || 10
    const personnesOpts = Array.from({length: maxP}, (_,i) =>
      `<option value="${i+1}"${i+1===2?' selected':''}>${i+1} personne${i+1>1?'s':''}</option>`
    ).join('')

    return `
      <form id="crd-form" novalidate>
        <div class="crd-grid2">
          <div class="crd-field">
            <label>Prénom *</label>
            <input name="prenom" placeholder="Jean" required autocomplete="given-name"/>
          </div>
          <div class="crd-field">
            <label>Nom *</label>
            <input name="nom" placeholder="Dupont" required autocomplete="family-name"/>
          </div>
        </div>

        <div class="crd-grid2" style="margin-top:12px">
          <div class="crd-field">
            <label>Email *</label>
            <input name="email" type="email" placeholder="jean@exemple.fr" required autocomplete="email"/>
          </div>
          <div class="crd-field">
            <label>Téléphone *</label>
            <input name="telephone" placeholder="06 12 34 56 78" required autocomplete="tel"/>
          </div>
        </div>

        <div class="crd-grid2" style="margin-top:12px">
          <div class="crd-field">
            <label>Date *</label>
            <input name="date" type="date" min="${min}" required id="crd-date"/>
          </div>
          <div class="crd-field">
            <label>Personnes *</label>
            <select name="nb_personnes">${personnesOpts}</select>
          </div>
        </div>

        <div class="crd-field" style="margin-top:12px" id="crd-heure-wrap">
          <label>Heure *</label>
          <input disabled placeholder="Sélectionnez d'abord une date" id="crd-heure-placeholder"/>
          <select name="heure" id="crd-heure-select" style="display:none" required></select>
        </div>

        <div class="crd-field" style="margin-top:12px">
          <label>Message</label>
          <textarea name="message" rows="2" placeholder="Allergies, occasion spéciale, chaise haute..."></textarea>
        </div>

        <div id="crd-alert" style="display:none"></div>

        <button type="submit" class="crd-submit" id="crd-submit-btn">
          Confirmer la réservation
        </button>
      </form>
    `
  }

  function buildConfirm(resto, f) {
    const dateLabel = new Date(f.date + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    return `
      <div class="crd-confirm">
        <div class="crd-confirm-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <h2>Réservation confirmée !</h2>
        <p>${resto.message_confirmation || `Merci ${f.prenom}, à très bientôt chez ${resto.nom} !`}</p>
        <div class="crd-recap">
          <div class="crd-recap-row"><span>Restaurant</span><span>${resto.nom}</span></div>
          <div class="crd-recap-row"><span>Date</span><span>${dateLabel}</span></div>
          <div class="crd-recap-row"><span>Heure</span><span>${f.heure}</span></div>
          <div class="crd-recap-row"><span>Personnes</span><span>${f.nb_personnes}</span></div>
          <div class="crd-recap-row"><span>Nom</span><span>${f.prenom} ${f.nom}</span></div>
        </div>
      </div>
    `
  }

  // ── Init principal ────────────────────────────────────────────────
  async function init() {
    let resto, horaires

    try {
      const [restos] = await sbGet('restaurants', `slug=eq.${slug}&select=*`)
      if (!restos) return console.warn(`[CERYDRA] Restaurant "${slug}" introuvable.`)
      resto = restos
      horaires = await sbGet('horaires', `restaurant_id=eq.${resto.id}&select=*`)
    } catch (e) {
      return console.error('[CERYDRA] Erreur chargement données:', e)
    }

    // Crée le Shadow DOM
    const host = document.createElement('div')
    host.id = 'cerydra-widget'
    document.body.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })

    // Injecte styles + HTML
    const style = document.createElement('style')
    style.textContent = CSS
    shadow.appendChild(style)

    const container = document.createElement('div')
    container.innerHTML = buildHTML(resto)
    shadow.appendChild(container)

    const overlay = shadow.getElementById('crd-overlay')
    const formArea = shadow.getElementById('crd-form-area')

    // Ouvre/ferme la modal
    function open() {
      formArea.innerHTML = buildForm(resto, horaires)
      overlay.classList.add('open')
      document.body.style.overflow = 'hidden'
      bindForm()
    }
    function close() {
      overlay.classList.remove('open')
      document.body.style.overflow = ''
    }

    shadow.getElementById('crd-btn').addEventListener('click', open)
    shadow.getElementById('crd-close-btn').addEventListener('click', close)
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close() })

    // Logique formulaire
    function bindForm() {
      const form = shadow.getElementById('crd-form')
      const dateInput = shadow.getElementById('crd-date')
      const heurePlaceholder = shadow.getElementById('crd-heure-placeholder')
      const heureSelect = shadow.getElementById('crd-heure-select')
      const alert = shadow.getElementById('crd-alert')
      const submitBtn = shadow.getElementById('crd-submit-btn')

      dateInput.addEventListener('change', () => {
        const s = getSlotsForDate(horaires, dateInput.value)
        if (!dateInput.value) {
          heurePlaceholder.style.display = ''
          heureSelect.style.display = 'none'
          alert.style.display = 'none'
          return
        }
        if (s.length === 0) {
          heurePlaceholder.style.display = ''
          heureSelect.style.display = 'none'
          alert.className = 'crd-alert warn'
          alert.textContent = 'Le restaurant est fermé ce jour-là.'
          alert.style.display = 'block'
          submitBtn.disabled = true
          return
        }
        alert.style.display = 'none'
        submitBtn.disabled = false
        heureSelect.innerHTML = '<option value="">Choisir un horaire</option>' +
          s.map(t => `<option value="${t}">${t}</option>`).join('')
        heurePlaceholder.style.display = 'none'
        heureSelect.style.display = 'block'
      })

      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const fd = new FormData(form)
        const f = Object.fromEntries(fd.entries())

        if (!f.heure) {
          alert.className = 'crd-alert err'
          alert.textContent = 'Veuillez sélectionner un horaire.'
          alert.style.display = 'block'
          return
        }

        submitBtn.disabled = true
        submitBtn.textContent = 'Envoi...'

        try {
          await sbPost('reservations', {
            restaurant_id: resto.id,
            prenom: f.prenom,
            nom: f.nom,
            email: f.email,
            telephone: f.telephone,
            date: f.date,
            heure: f.heure,
            nb_personnes: Number(f.nb_personnes),
            message: f.message || null,
            statut: 'en_attente',
          })
          formArea.innerHTML = buildConfirm(resto, f)
        } catch (err) {
          console.error(err)
          alert.className = 'crd-alert err'
          alert.textContent = 'Une erreur est survenue. Veuillez réessayer.'
          alert.style.display = 'block'
          submitBtn.disabled = false
          submitBtn.textContent = 'Confirmer la réservation'
        }
      })
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
