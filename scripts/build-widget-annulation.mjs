/**
 * Génère public/widget-annulation.js — aucune clé Supabase, pas de bouton flottant.
 * Le popup s'ouvre via :
 *   - window.cerydraOpenAnnulation()
 *   - tout élément avec data-cerydra-annuler
 *   - onclick="cerydraOpenAnnulation()"
 */
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const src = `/* CERYDRA Widget Annulation — aucune clé sensible, pas de bouton flottant.
   Usage :
     <script src="https://app.cerydra.fr/widget-annulation.js" data-resto="mon-slug"><\/script>
   Déclenchement :
     <button data-cerydra-annuler>Annuler ma réservation<\/button>
     ou onclick="cerydraOpenAnnulation()" */
;(function(){
  var el=document.currentScript||document.querySelector('script[src*="widget-annulation"]');
  var slug=el&&el.getAttribute('data-resto');
  if(!slug){console.warn('[CERYDRA Annulation] data-resto manquant');return;}

  var scriptSrc=el&&el.src||'';
  var API_BASE=scriptSrc?scriptSrc.replace(/\\/widget-annulation\\.js.*/,''):window.location.origin;

  function apiGet(email){
    return fetch(API_BASE+'/api/annulation?slug='+encodeURIComponent(slug)+'&email='+encodeURIComponent(email))
      .then(function(r){return r.json();});
  }
  function apiPost(token){
    return fetch(API_BASE+'/api/annulation',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({token:token})
    }).then(function(r){return r.json();});
  }

  function formatDate(d){
    return new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  }

  var CSS=\`
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    #can-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.5);backdrop-filter:blur(3px);display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;}
    #can-overlay.open{opacity:1;pointer-events:all;}
    #can-modal{background:#fff;width:100%;max-width:480px;max-height:90vh;border-radius:24px 24px 0 0;overflow-y:auto;transform:translateY(30px);transition:transform .25s cubic-bezier(.22,1,.36,1);}
    @media(min-width:540px){#can-overlay{align-items:center;}#can-modal{border-radius:20px;transform:scale(.95);}}
    #can-overlay.open #can-modal{transform:none;}
    .ch{position:sticky;top:0;background:#fff;border-bottom:1px solid #f3f4f6;padding:18px 22px 16px;display:flex;align-items:center;justify-content:space-between;}
    .ct{font-size:15px;font-weight:600;color:#1a1a2e;font-family:'Inter',system-ui,sans-serif;}
    .cn{font-size:12px;color:#9ca3af;margin-top:2px;font-family:'Inter',system-ui,sans-serif;}
    .cc{width:30px;height:30px;border-radius:50%;border:none;background:#f3f4f6;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#6b7280;}
    .cc:hover{background:#e5e7eb;}
    .cb{padding:22px 22px 28px;}
    .cf{display:flex;flex-direction:column;gap:5px;}
    label{font-size:11px;font-weight:500;color:#1a1a2e;font-family:'Inter',system-ui,sans-serif;}
    input{width:100%;padding:11px 13px;border:1.5px solid #e5e7eb;border-radius:12px;font-size:13px;color:#1f2937;background:#fff;outline:none;font-family:'Inter',system-ui,sans-serif;transition:border-color .15s;}
    input::placeholder{color:#d1d5db;}
    input:focus{border-color:#1a1a2e;}
    .btn-main{width:100%;padding:13px;background:#1a1a2e;color:#fff;border:none;border-radius:14px;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s;font-family:'Inter',system-ui,sans-serif;margin-top:14px;}
    .btn-main:hover{background:#2a2a4e;}
    .btn-main:disabled{opacity:.45;cursor:not-allowed;}
    .btn-cancel-resa{width:100%;padding:11px;background:#fef2f2;color:#dc2626;border:1.5px solid #fecaca;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;font-family:'Inter',system-ui,sans-serif;}
    .btn-cancel-resa:hover{background:#fee2e2;border-color:#fca5a5;}
    .btn-cancel-resa:disabled{opacity:.45;cursor:not-allowed;}
    .al{padding:10px 13px;border-radius:12px;font-size:12px;font-family:'Inter',system-ui,sans-serif;margin-top:12px;}
    .ae{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;}
    .aw{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;}
    .sp{display:flex;justify-content:center;padding:32px 0;}
    .sp::after{content:'';width:26px;height:26px;border:2.5px solid #1a1a2e;border-top-color:transparent;border-radius:50%;animation:cspin .7s linear infinite;}
    @keyframes cspin{to{transform:rotate(360deg);}}
    .resa-card{border:1.5px solid #e5e7eb;border-radius:14px;padding:14px 16px;margin-top:12px;}
    .resa-card:first-child{margin-top:0;}
    .resa-meta{font-size:13px;font-weight:600;color:#1a1a2e;font-family:'Inter',system-ui,sans-serif;margin-bottom:4px;}
    .resa-sub{font-size:12px;color:#6b7280;font-family:'Inter',system-ui,sans-serif;margin-bottom:10px;line-height:1.5;}
    .ok{padding:28px 22px 24px;text-align:center;}
    .oi{width:52px;height:52px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;}
    .ok h2{font-size:17px;font-weight:700;color:#1a1a2e;margin-bottom:6px;font-family:'Inter',system-ui,sans-serif;}
    .ok p{font-size:13px;color:#6b7280;line-height:1.6;font-family:'Inter',system-ui,sans-serif;}
    .cft{text-align:center;font-size:10px;color:#d1d5db;padding:8px 0 4px;font-family:'Inter',system-ui,sans-serif;}
    .cft b{color:#9ca3af;}
    .empty{text-align:center;padding:28px 0;font-size:13px;color:#9ca3af;font-family:'Inter',system-ui,sans-serif;}
    .step-label{font-size:11px;letter-spacing:.05em;color:#9ca3af;text-transform:uppercase;font-weight:500;margin-bottom:14px;font-family:'Inter',system-ui,sans-serif;}
  \`;

  function mkOverlay(restoNom){
    return '<div id="can-overlay" role="dialog" aria-modal="true">'
      +'<div id="can-modal">'
      +'<div class="ch"><div><div class="ct">Annuler une reservation</div>'
      +(restoNom?'<div class="cn">'+restoNom+'</div>':'')+'</div>'
      +'<button class="cc" id="can-x"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
      +'<div class="cb" id="can-fa"></div>'
      +'<div class="cft">Propulse par <b>CERYDRA</b></div>'
      +'</div></div>';
  }

  function mkEmailForm(){
    return '<div class="step-label">Etape 1 — Identification</div>'
      +'<form id="can-ef" novalidate>'
      +'<div class="cf"><label>Votre adresse email</label>'
      +'<input name="email" type="email" placeholder="jean@exemple.fr" required style="margin-top:5px;"/></div>'
      +'<div id="can-al" style="display:none" class="al"></div>'
      +'<button type="submit" class="btn-main" id="can-sb">Rechercher mes reservations</button>'
      +'</form>';
  }

  function mkResaList(resas){
    if(!resas.length){
      return '<div class="step-label">Reservations trouvees</div>'
        +'<div class="empty">Aucune reservation a venir<br>trouvee pour cet email.</div>';
    }
    var html='<div class="step-label">Etape 2 — Choisir la reservation</div>';
    resas.forEach(function(r){
      var dl=formatDate(r.date);
      var heure=r.heure?r.heure.slice(0,5):'';
      html+='<div class="resa-card">'
        +'<div class="resa-meta">'+dl+' a '+heure+'</div>'
        +'<div class="resa-sub">'+r.prenom+' '+r.nom+' &middot; '+r.nb_personnes+' personne'+(r.nb_personnes>1?'s':'')+'</div>'
        +'<button class="btn-cancel-resa" data-token="'+r.cancel_token+'" data-date="'+dl+'" data-heure="'+heure+'" data-nom="'+r.prenom+' '+r.nom+'">Annuler cette reservation</button>'
        +'</div>';
    });
    return html;
  }

  function mkConfirm(nom,date,heure){
    return '<div class="ok">'
      +'<div class="oi"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>'
      +'<h2>Reservation annulee</h2>'
      +'<p>La reservation de <strong>'+nom+'</strong><br>du <strong>'+date+' a '+heure+'</strong><br>a bien ete annulee.</p>'
      +'</div>';
  }

  function showAlert(sh,msg,type){
    var al=sh.getElementById('can-al');
    if(!al)return;
    al.className='al '+(type==='warn'?'aw':'ae');
    al.textContent=msg;
    al.style.display='block';
  }

  function bindEmailForm(sh){
    var form=sh.getElementById('can-ef');
    var sb=sh.getElementById('can-sb');
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var email=form.querySelector('input[name="email"]').value.trim();
      if(!email){showAlert(sh,'Veuillez entrer votre email.','err');return;}
      sb.disabled=true;sb.textContent='Recherche...';
      sh.getElementById('can-al').style.display='none';
      apiGet(email).then(function(data){
        if(data.error){showAlert(sh,data.error,'err');sb.disabled=false;sb.textContent='Rechercher mes reservations';return;}
        sh.getElementById('can-fa').innerHTML=mkResaList(data.reservations||[]);
        bindResaList(sh);
      }).catch(function(){showAlert(sh,'Erreur de connexion. Reessayez.','err');sb.disabled=false;sb.textContent='Rechercher mes reservations';});
    });
  }

  function bindResaList(sh){
    sh.querySelectorAll('.btn-cancel-resa').forEach(function(btn){
      btn.addEventListener('click',function(){
        var token=btn.getAttribute('data-token');
        var date=btn.getAttribute('data-date');
        var heure=btn.getAttribute('data-heure');
        var nom=btn.getAttribute('data-nom');
        btn.disabled=true;btn.textContent='Annulation...';
        apiPost(token).then(function(res){
          if(res.success){sh.getElementById('can-fa').innerHTML=mkConfirm(nom,date,heure);}
          else{btn.disabled=false;btn.textContent='Annuler cette reservation';var al=document.createElement('div');al.className='al ae';al.textContent=res.error||'Erreur.';al.style.marginTop='8px';btn.closest('.resa-card').appendChild(al);}
        }).catch(function(){btn.disabled=false;btn.textContent='Annuler cette reservation';});
      });
    });
  }

  // ── Init ──────────────────────────────────────────────────────────
  function init(){
    var host=document.createElement('div');
    host.id='cerydra-annulation-widget';
    document.body.appendChild(host);
    var sh=host.attachShadow({mode:'open'});
    var style=document.createElement('style');
    style.textContent=CSS;
    sh.appendChild(style);
    var overlayWrap=document.createElement('div');
    sh.appendChild(overlayWrap);

    var restoNom='',restoLoaded=false;

    // Pré-charge le nom du restaurant en arrière-plan
    fetch(API_BASE+'/api/widget?slug='+encodeURIComponent(slug))
      .then(function(r){return r.json();})
      .then(function(d){if(d.resto)restoNom=d.resto.nom;restoLoaded=true;})
      .catch(function(){restoLoaded=true;});

    function closeModal(){
      var ov=sh.getElementById('can-overlay');
      if(ov)ov.classList.remove('open');
      document.body.style.overflow='';
    }

    function openModal(){
      // Crée ou réinitialise l'overlay
      overlayWrap.innerHTML=mkOverlay(restoNom);
      var ov=sh.getElementById('can-overlay');
      sh.getElementById('can-x').addEventListener('click',closeModal);
      ov.addEventListener('click',function(e){if(e.target===ov)closeModal();});

      sh.getElementById('can-fa').innerHTML=mkEmailForm();
      ov.classList.add('open');
      document.body.style.overflow='hidden';
      bindEmailForm(sh);
      setTimeout(function(){var inp=sh.querySelector('input[name="email"]');if(inp)inp.focus();},200);
    }

    // Expose la fonction globale
    window.cerydraOpenAnnulation=openModal;

    // Accroche les éléments data-cerydra-annuler existants
    document.querySelectorAll('[data-cerydra-annuler]').forEach(function(el){
      el.addEventListener('click',openModal);
    });

    // Observe les éléments ajoutés dynamiquement
    var obs=new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes.forEach(function(n){
          if(n.nodeType!==1)return;
          if(n.hasAttribute&&n.hasAttribute('data-cerydra-annuler'))n.addEventListener('click',openModal);
          n.querySelectorAll&&n.querySelectorAll('[data-cerydra-annuler]').forEach(function(el){el.addEventListener('click',openModal);});
        });
      });
    });
    obs.observe(document.body,{childList:true,subtree:true});

    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
  }

  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();`

mkdirSync(resolve(root, 'public'), { recursive: true })
writeFileSync(resolve(root, 'public', 'widget-annulation.js'), src, 'utf8')
console.log('[widget-annulation] public/widget-annulation.js genere (sans bouton flottant)')
