/* CERYDRA Widget — généré automatiquement
   Usage: <script src="https://cerydra.fr/widget.js" data-resto="mon-slug"></script> */
;(function(){
var SB_URL="https://wuyltmbakpcvimqspqnb.supabase.co",SB_KEY="sb_publishable_yQYJXi9WLQPkht9QkfTXQg_1mX7Ojl8";
var el=document.currentScript||document.querySelector('script[data-resto]');
var slug=el&&el.getAttribute('data-resto');
if(!slug){console.warn('[CERYDRA] data-resto manquant');return;}

function get(table,q){
  return fetch(SB_URL+'/rest/v1/'+table+'?'+(q||''),{headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY}}).then(function(r){return r.json();});
}
function post(table,body){
  return fetch(SB_URL+'/rest/v1/'+table,{method:'POST',headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(body)}).then(function(r){if(!r.ok)return r.text().then(function(t){throw new Error(t);});return true;});
}

var JOURS={0:'dimanche',1:'lundi',2:'mardi',3:'mercredi',4:'jeudi',5:'vendredi',6:'samedi'};
function toMin(t){var p=t.split(':');return +p[0]*60+ +p[1];}
function slots(a,b){var o=[],c=toMin(a),e=toMin(b);while(c<e){o.push(('0'+Math.floor(c/60)).slice(-2)+':'+('0'+(c%60)).slice(-2));c+=30;}return o;}
function slotsForDate(hs,d){
  if(!d||!hs.length)return[];
  var j=JOURS[new Date(d).getDay()],h=hs.filter(function(x){return x.jour===j;})[0];
  if(!h||!h.ouvert)return[];
  return slots(h.midi_debut.slice(0,5),h.midi_fin.slice(0,5)).concat(slots(h.soir_debut.slice(0,5),h.soir_fin.slice(0,5)));
}
function minDate(n){var d=new Date();d.setHours(d.getHours()+(n||2));return d.toISOString().split('T')[0];}

var CSS=`
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
#crd-btn{position:fixed;bottom:28px;right:28px;z-index:2147483646;background:#1a1a2e;color:#fff;border:none;padding:14px 22px;border-radius:50px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 4px 24px rgba(26,26,46,.4);transition:transform .15s,box-shadow .15s;font-family:'Inter',system-ui,sans-serif;letter-spacing:-.01em;}
#crd-btn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(26,26,46,.5);}
#crd-btn svg{width:16px;height:16px;flex-shrink:0;}
#crd-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.5);backdrop-filter:blur(3px);display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;}
#crd-overlay.open{opacity:1;pointer-events:all;}
#crd-modal{background:#fff;width:100%;max-width:480px;max-height:92vh;border-radius:24px 24px 0 0;overflow-y:auto;transform:translateY(30px);transition:transform .25s cubic-bezier(.22,1,.36,1);}
@media(min-width:540px){#crd-overlay{align-items:center;}#crd-modal{border-radius:20px;transform:scale(.95);}}
#crd-overlay.open #crd-modal{transform:none;}
.ch{position:sticky;top:0;background:#fff;border-bottom:1px solid #f3f4f6;padding:18px 22px 16px;display:flex;align-items:center;justify-content:space-between;}
.ct{font-size:15px;font-weight:600;color:#1a1a2e;font-family:'Inter',system-ui,sans-serif;}
.cn{font-size:12px;color:#9ca3af;margin-top:2px;font-family:'Inter',system-ui,sans-serif;}
.cc{width:30px;height:30px;border-radius:50%;border:none;background:#f3f4f6;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#6b7280;}
.cc:hover{background:#e5e7eb;}
.cb{padding:20px 22px 28px;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.gw{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;}
.cf{display:flex;flex-direction:column;gap:5px;margin-top:12px;}
.g2 .cf,.gw .cf{margin-top:0;}
label{font-size:11px;font-weight:500;color:#1a1a2e;font-family:'Inter',system-ui,sans-serif;}
input,select,textarea{width:100%;padding:10px 13px;border:1.5px solid #e5e7eb;border-radius:12px;font-size:13px;color:#1f2937;background:#fff;outline:none;font-family:'Inter',system-ui,sans-serif;transition:border-color .15s;-webkit-appearance:none;appearance:none;}
input::placeholder,textarea::placeholder{color:#d1d5db;}
input:focus,select:focus,textarea:focus{border-color:#1a1a2e;}
textarea{resize:none;}
input:disabled{background:#f9fafb;color:#9ca3af;cursor:not-allowed;}
.al{margin-top:12px;padding:10px 13px;border-radius:12px;font-size:12px;font-family:'Inter',system-ui,sans-serif;}
.aw{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;}
.ae{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;}
.cs{margin-top:18px;width:100%;padding:13px;background:#1a1a2e;color:#fff;border:none;border-radius:14px;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s;font-family:'Inter',system-ui,sans-serif;}
.cs:hover{background:#2a2a4e;}
.cs:disabled{opacity:.45;cursor:not-allowed;}
.cf2{text-align:center;font-size:10px;color:#d1d5db;padding:8px 0 4px;font-family:'Inter',system-ui,sans-serif;}
.cf2 b{color:#9ca3af;}
.sp{display:flex;justify-content:center;padding:40px 0;}
.sp::after{content:'';width:28px;height:28px;border:2.5px solid #1a1a2e;border-top-color:transparent;border-radius:50%;animation:cspin .7s linear infinite;}
@keyframes cspin{to{transform:rotate(360deg);}}
.ok{padding:32px 22px 24px;text-align:center;}
.oi{width:56px;height:56px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;}
.ok h2{font-size:18px;font-weight:700;color:#1a1a2e;margin-bottom:8px;font-family:'Inter',system-ui,sans-serif;}
.ok p{font-size:13px;color:#6b7280;line-height:1.6;font-family:'Inter',system-ui,sans-serif;}
.rc{background:#f9fafb;border-radius:14px;padding:14px 16px;margin-top:16px;text-align:left;}
.rr{display:flex;justify-content:space-between;font-size:12px;padding:4px 0;font-family:'Inter',system-ui,sans-serif;}
.rr span:first-child{color:#9ca3af;}
.rr span:last-child{font-weight:500;color:#1a1a2e;}
`;

function mkBtn(){
  return '<button id="crd-btn" aria-label="Réserver une table">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    +'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>'
    +'<line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'
    +'</svg>Réserver</button>';
}

function mkOverlay(nom){
  return '<div id="crd-overlay" role="dialog" aria-modal="true">'
    +'<div id="crd-modal">'
    +'<div class="ch"><div><div class="ct">Réserver une table</div><div class="cn">'+nom+'</div></div>'
    +'<button class="cc" id="crd-x"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'<div class="cb" id="crd-fa"><div class="sp"></div></div>'
    +'<div class="cf2">Propulsé par <b>CERYDRA</b></div>'
    +'</div></div>';
}

function mkForm(resto,hs){
  var min=minDate(resto.delai_minimum_heures),maxP=resto.nb_couverts_max||10,opts='';
  for(var i=1;i<=maxP;i++)opts+='<option value="'+i+'"'+(i===2?' selected':'')+'>'+i+' personne'+(i>1?'s':'')+'</option>';
  return '<form id="crd-f" novalidate>'
    +'<div class="g2"><div class="cf"><label>Prénom *</label><input name="prenom" placeholder="Jean" required autocomplete="given-name"/></div>'
    +'<div class="cf"><label>Nom *</label><input name="nom" placeholder="Dupont" required autocomplete="family-name"/></div></div>'
    +'<div class="gw"><div class="cf" style="margin-top:0"><label>Email *</label><input name="email" type="email" placeholder="jean@exemple.fr" required/></div>'
    +'<div class="cf" style="margin-top:0"><label>Téléphone *</label><input name="telephone" placeholder="06 12 34 56 78" required/></div></div>'
    +'<div class="gw"><div class="cf" style="margin-top:0"><label>Date *</label><input name="date" type="date" min="'+min+'" required id="crd-d"/></div>'
    +'<div class="cf" style="margin-top:0"><label>Personnes *</label><select name="nb_personnes">'+opts+'</select></div></div>'
    +'<div class="cf"><label>Heure *</label>'
    +'<input id="crd-hp" disabled placeholder="Choisissez une date d&#39;abord"/>'
    +'<select name="heure" id="crd-hs" style="display:none" required></select></div>'
    +'<div class="cf"><label>Message</label><textarea name="message" rows="2" placeholder="Allergies, occasion spéciale..."></textarea></div>'
    +'<div id="crd-al" style="display:none" class="al"></div>'
    +'<button type="submit" class="cs" id="crd-sb">Confirmer la réservation</button>'
    +'</form>';
}

function mkConfirm(resto,f){
  var dl=new Date(f.date+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  return '<div class="ok"><div class="oi"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>'
    +'<h2>Réservation confirmée !</h2><p>'+(resto.message_confirmation||'Merci '+f.prenom+', à bientôt chez '+resto.nom+' !')+'</p>'
    +'<div class="rc">'
    +'<div class="rr"><span>Restaurant</span><span>'+resto.nom+'</span></div>'
    +'<div class="rr"><span>Date</span><span>'+dl+'</span></div>'
    +'<div class="rr"><span>Heure</span><span>'+f.heure+'</span></div>'
    +'<div class="rr"><span>Personnes</span><span>'+f.nb_personnes+'</span></div>'
    +'<div class="rr"><span>Nom</span><span>'+f.prenom+' '+f.nom+'</span></div>'
    +'</div></div>';
}

function bindForm(sh,resto,hs){
  var form=sh.getElementById('crd-f'),dateEl=sh.getElementById('crd-d'),
      hp=sh.getElementById('crd-hp'),hsel=sh.getElementById('crd-hs'),
      al=sh.getElementById('crd-al'),sb=sh.getElementById('crd-sb');

  dateEl.addEventListener('change',function(){
    var s=slotsForDate(hs,dateEl.value);
    al.style.display='none';
    if(!dateEl.value){hp.style.display='';hsel.style.display='none';return;}
    if(!s.length){
      hp.style.display='';hsel.style.display='none';
      al.className='al aw';al.textContent='Le restaurant est fermé ce jour-là.';al.style.display='block';
      sb.disabled=true;return;
    }
    sb.disabled=false;
    hsel.innerHTML='<option value="">Choisir un horaire</option>'+s.map(function(t){return'<option value="'+t+'">'+t+'</option>';}).join('');
    hp.style.display='none';hsel.style.display='';
  });

  form.addEventListener('submit',function(e){
    e.preventDefault();
    var fd=new FormData(form),f={};
    fd.forEach(function(v,k){f[k]=v;});
    if(!f.heure){al.className='al ae';al.textContent='Veuillez sélectionner un horaire.';al.style.display='block';return;}
    sb.disabled=true;sb.textContent='Envoi...';
    post('reservations',{restaurant_id:resto.id,prenom:f.prenom,nom:f.nom,email:f.email,telephone:f.telephone,date:f.date,heure:f.heure,nb_personnes:Number(f.nb_personnes),message:f.message||null,statut:'en_attente'})
      .then(function(){sh.getElementById('crd-fa').innerHTML=mkConfirm(resto,f);})
      .catch(function(err){console.error('[CERYDRA]',err);al.className='al ae';al.textContent='Erreur. Veuillez réessayer.';al.style.display='block';sb.disabled=false;sb.textContent='Confirmer la réservation';});
  });
}

function init(){
  // 1. Crée le Shadow DOM
  var host=document.createElement('div');
  host.id='cerydra-widget';
  document.body.appendChild(host);
  var sh=host.attachShadow({mode:'open'});
  var style=document.createElement('style');
  style.textContent=CSS;
  sh.appendChild(style);
  var wrap=document.createElement('div');
  sh.appendChild(wrap);

  // 2. Injecte le bouton IMMÉDIATEMENT (pas d'attente réseau)
  wrap.innerHTML=mkBtn();

  var restoCache=null,horairesCache=null,loaded=false,loading=false;

  // 3. Crée l'overlay (caché) dès le départ
  var overlayWrap=document.createElement('div');
  sh.appendChild(overlayWrap);

  function closeModal(){
    var ov=sh.getElementById('crd-overlay');
    if(ov){ov.classList.remove('open');}
    document.body.style.overflow='';
  }

  function openModal(resto,hs){
    // Crée ou réutilise l'overlay
    if(!sh.getElementById('crd-overlay')){
      overlayWrap.innerHTML=mkOverlay(resto.nom);
      var ov=sh.getElementById('crd-overlay');
      sh.getElementById('crd-x').addEventListener('click',closeModal);
      ov.addEventListener('click',function(e){if(e.target===ov)closeModal();});
    }
    var fa=sh.getElementById('crd-fa');
    fa.innerHTML=mkForm(resto,hs);
    sh.getElementById('crd-overlay').classList.add('open');
    document.body.style.overflow='hidden';
    bindForm(sh,resto,hs);
  }

  sh.getElementById('crd-btn').addEventListener('click',function(){
    if(loading)return;

    // Données déjà chargées → ouvre directement
    if(loaded){
      if(restoCache)openModal(restoCache,horairesCache);
      return;
    }

    // Première ouverture → crée l'overlay de chargement et fetche
    overlayWrap.innerHTML=mkOverlay('Chargement...');
    var ov=sh.getElementById('crd-overlay');
    sh.getElementById('crd-x').addEventListener('click',closeModal);
    ov.addEventListener('click',function(e){if(e.target===ov)closeModal();});
    ov.classList.add('open');
    document.body.style.overflow='hidden';
    loading=true;

    get('restaurants','slug=eq.'+slug+'&select=*')
      .then(function(restos){
        if(!restos||!restos.length){
          sh.getElementById('crd-fa').innerHTML='<div style="padding:32px 22px;text-align:center;font-family:Inter,system-ui,sans-serif;color:#6b7280;font-size:13px;">Restaurant introuvable.</div>';
          loading=false;return;
        }
        restoCache=restos[0];
        return get('horaires','restaurant_id=eq.'+restoCache.id+'&select=*').then(function(hs){
          horairesCache=hs||[];
          loaded=true;loading=false;
          // Met à jour le nom dans le header
          var cn=sh.querySelector('.cn');if(cn)cn.textContent=restoCache.nom;
          var ct=sh.querySelector('.ct');if(ct)ct.textContent='Réserver une table';
          // Affiche le formulaire
          sh.getElementById('crd-fa').innerHTML=mkForm(restoCache,horairesCache);
          bindForm(sh,restoCache,horairesCache);
        });
      })
      .catch(function(e){
        console.error('[CERYDRA]',e);
        sh.getElementById('crd-fa').innerHTML='<div style="padding:32px 22px;text-align:center;font-family:Inter,system-ui,sans-serif;color:#dc2626;font-size:13px;">Erreur de connexion.</div>';
        loading=false;
      });
  });

  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();