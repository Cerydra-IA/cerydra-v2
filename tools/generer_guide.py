# -*- coding: utf-8 -*-
"""Guide d'utilisation CERYDRA — PDF 3 pages, style navy/blanc."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

NAVY = HexColor('#1a1a2e')
NAVY_LIGHT = HexColor('#2a2a4e')
GRAY = HexColor('#6b7280')
GRAY_LIGHT = HexColor('#9ca3af')
BG_LIGHT = HexColor('#f5f6fa')
GREEN = HexColor('#16a34a')
YELLOW = HexColor('#d97706')
RED = HexColor('#dc2626')
BLUE = HexColor('#1a6bff')

W, H = A4
M = 18 * mm  # marge

OUT = r"C:\Users\PC\Desktop\Guide_Utilisation_CERYDRA.pdf"
c = canvas.Canvas(OUT, pagesize=A4)


def header(page_title, page_num):
    # bandeau navy
    c.setFillColor(NAVY)
    c.rect(0, H - 22 * mm, W, 22 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 15)
    c.drawString(M, H - 14 * mm, 'CERYDRA')
    c.setFont('Helvetica', 10)
    c.setFillColor(HexColor('#c7c9d9'))
    c.drawString(M + 32 * mm, H - 14 * mm, '—  Guide d’utilisation')
    c.setFont('Helvetica-Bold', 11)
    c.setFillColor(white)
    c.drawRightString(W - M, H - 14 * mm, page_title)
    # footer
    c.setFillColor(GRAY_LIGHT)
    c.setFont('Helvetica', 8)
    c.drawCentredString(W / 2, 10 * mm, f'CERYDRA  ·  cerydra.fr  ·  contact@cerydra.fr  —  page {page_num}/5')


def section_title(y, num, title):
    c.setFillColor(NAVY)
    c.circle(M + 4 * mm, y + 1.6 * mm, 4 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 12)
    c.drawCentredString(M + 4 * mm, y - 0.1 * mm, str(num))
    c.setFillColor(NAVY)
    c.setFont('Helvetica-Bold', 14)
    c.drawString(M + 11 * mm, y, title)
    return y - 9 * mm


def step(y, n, text, sub=None):
    c.setFillColor(BLUE)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(M + 4 * mm, y, f'{n}.')
    c.setFillColor(NAVY)
    c.setFont('Helvetica', 10.5)
    c.drawString(M + 10 * mm, y, text)
    y -= 5.2 * mm
    if sub:
        c.setFillColor(GRAY)
        c.setFont('Helvetica', 9)
        c.drawString(M + 10 * mm, y, sub)
        y -= 5.2 * mm
    return y


def badge(x, y, label, color, desc=None):
    c.setFillColor(color)
    c.roundRect(x, y - 1.5 * mm, 24 * mm, 6 * mm, 3 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 8)
    c.drawCentredString(x + 12 * mm, y, label)
    if desc:
        c.setFillColor(GRAY)
        c.setFont('Helvetica', 9.5)
        c.drawString(x + 28 * mm, y, desc)


def shot(path, y, w_mm, caption=None):
    """Insère une capture d'écran centrée, avec ombre légère et légende."""
    from PIL import Image as PILImage
    im = PILImage.open(path)
    w = w_mm * mm
    h = w * im.height / im.width
    x = (W - w) / 2
    # ombre
    c.setFillColor(HexColor('#e2e4ec'))
    c.roundRect(x + 1.2 * mm, y - h - 1.2 * mm, w, h, 2 * mm, fill=1, stroke=0)
    # image + bord
    c.drawImage(path, x, y - h, w, h, preserveAspectRatio=True, mask='auto')
    c.setStrokeColor(HexColor('#e5e7eb'))
    c.setLineWidth(0.7)
    c.roundRect(x, y - h, w, h, 0.5 * mm, fill=0, stroke=1)
    y2 = y - h - 5 * mm
    if caption:
        c.setFillColor(GRAY_LIGHT)
        c.setFont('Helvetica-Oblique', 8.5)
        c.drawCentredString(W / 2, y2, caption)
        y2 -= 5 * mm
    return y2


def bullet(y, text, indent=4):
    c.setFillColor(BLUE)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(M + indent * mm, y, '•')
    c.setFillColor(NAVY)
    c.setFont('Helvetica', 10)
    c.drawString(M + (indent + 5) * mm, y, text)
    return y - 5.6 * mm



# ═══════════════════ PAGE 0 — Couverture ═══════════════════
from PIL import Image as _PILImage
_logo = r"C:/Users/PC/Desktop/CERYDRA/cerydra-v2/public/logo.png"
_li = _PILImage.open(_logo)
_lw = 95 * mm
_lh = _lw * _li.height / _li.width
c.drawImage(_logo, (W - _lw) / 2, H - 60 * mm - _lh, _lw, _lh, preserveAspectRatio=True, mask='auto')

c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 40)
c.drawCentredString(W / 2, H - 175 * mm, 'CERYDRA')
c.setFillColor(GRAY)
c.setFont('Helvetica', 15)
c.drawCentredString(W / 2, H - 186 * mm, "Guide d'utilisation")

c.setStrokeColor(HexColor('#e5e7eb'))
c.setLineWidth(0.8)
c.line(W / 2 - 30 * mm, H - 193 * mm, W / 2 + 30 * mm, H - 193 * mm)

c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 13)
c.drawCentredString(W / 2, H - 203 * mm, 'Vos réservations en pilote automatique.')

c.setFillColor(GRAY)
c.setFont('Helvetica', 10.5)
c.drawCentredString(W / 2, H - 213 * mm, 'Réservations en ligne 24h/24 · Confirmation instantanée · Rappels automatiques')
c.drawCentredString(W / 2, H - 219 * mm, 'Plan de salle en temps réel · Avis Google · Notifications sur votre téléphone')

c.setFillColor(NAVY)
c.rect(0, 0, W, 16 * mm, fill=1, stroke=0)
c.setFillColor(white)
c.setFont('Helvetica', 9)
c.drawCentredString(W / 2, 6.5 * mm, 'cerydra.fr  ·  contact@cerydra.fr')

c.showPage()

# ═══════════════════ PAGE 1 — Réservations ═══════════════════
header('Vos réservations', 1)
y = H - 36 * mm

c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 20)
c.drawString(M, y, 'Votre quotidien avec CERYDRA')
y -= 7 * mm
c.setFillColor(GRAY)
c.setFont('Helvetica', 10.5)
c.drawString(M, y, 'Tout ce dont vous avez besoin au jour le jour. 5 minutes de lecture.')
y -= 14 * mm

y = section_title(y, 1, 'Gérer les réservations')
c.setFillColor(GRAY)
c.setFont('Helvetica', 10)
c.drawString(M, y, 'Ouvrez l’application CERYDRA sur votre téléphone → onglet Réservations.')
y -= 9 * mm

# statuts
c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 10.5)
c.drawString(M + 4 * mm, y, 'Chaque réservation a un statut :')
y -= 8 * mm
badge(M + 6 * mm, y, 'CONFIRMÉE', GREEN, 'Réservation validée automatiquement — le client est attendu.')
y -= 8.5 * mm
badge(M + 6 * mm, y, 'EN ATTENTE', YELLOW, 'Cas rare : réservation à valider manuellement (bouton Confirmer).')
y -= 8.5 * mm
badge(M + 6 * mm, y, 'ANNULÉE', RED, 'Réservation annulée (par vous ou par le client).')
y -= 12 * mm

c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 10.5)
c.drawString(M + 4 * mm, y, 'Bon à savoir : tout est automatique')
y -= 6.5 * mm
y = step(y, 1, 'Les réservations en ligne sont confirmées automatiquement s’il reste de la place.',
         sub='Le client reçoit son email de confirmation immédiatement — vous n’avez rien à valider.')
y -= 4 * mm

c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 10.5)
c.drawString(M + 4 * mm, y, 'Annuler une réservation')
y -= 6.5 * mm
y = step(y, 1, 'Touchez le bouton rouge « Annuler » sur la carte de la réservation.')
y = step(y, 2, 'La table redevient disponible.')
y -= 4 * mm

c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 10.5)
c.drawString(M + 4 * mm, y, 'Un client réserve par téléphone ou sur place ?')
y -= 6.5 * mm
y = step(y, 1, 'Touchez le bouton « + Nouvelle réservation » en haut de l’écran.')
y = step(y, 2, 'Remplissez nom, date, heure — l’email est facultatif.',
         sub='S’il est renseigné, le client reçoit la confirmation et le rappel automatiques.')
y -= 4 * mm

# encadré filtres
c.setFillColor(BG_LIGHT)
c.roundRect(M, y - 16 * mm, W - 2 * M, 18 * mm, 3 * mm, fill=1, stroke=0)
c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 10)
c.drawString(M + 5 * mm, y - 4 * mm, 'Astuce — les filtres en haut de l’écran :')
c.setFillColor(GRAY)
c.setFont('Helvetica', 9.5)
c.drawString(M + 5 * mm, y - 9.5 * mm, '« À venir » affiche uniquement les prochains services.')
c.drawString(M + 5 * mm, y - 14 * mm, '« Exporter CSV » : export Excel. « Supprimer » : réservé aux erreurs de saisie, préférez « Annuler ».')
y -= 26 * mm

shot('shot_reservations.png', y, 132, 'Votre écran Réservations : boutons Confirmer / Annuler sur chaque ligne.')

c.showPage()

# ═══════════════════ PAGE 2 — Plan de salle ═══════════════════
header('Plan de salle', 2)
y = H - 36 * mm

y = section_title(y, 2, 'Le plan de salle pendant le service')
c.setFillColor(GRAY)
c.setFont('Helvetica', 10)
c.drawString(M, y, 'Onglet « Plan de salle ». Vos tables apparaissent avec un code couleur :')
y -= 9 * mm

badge(M + 6 * mm, y, 'LIBRE', GREEN, 'Table disponible.')
y -= 8.5 * mm
badge(M + 6 * mm, y, 'RÉSERVÉE', YELLOW, 'Un client va arriver — son nom est affiché sur la table.')
y -= 8.5 * mm
badge(M + 6 * mm, y, 'OCCUPÉE', RED, 'Des clients sont installés.')
y -= 8.5 * mm
badge(M + 6 * mm, y, 'BLOQUÉE', GRAY, 'Table hors service (réparation, réservée au personnel…).')
y -= 10 * mm

y = shot('shot_plan.png', y, 104, 'Le bandeau « à placer » en haut, les tables en couleur.')
y -= 3 * mm

c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 10.5)
c.drawString(M + 4 * mm, y, 'Placer une réservation sur une table')
y -= 6.5 * mm
y = step(y, 1, 'Le bandeau en haut liste les réservations « à placer ».')
y = step(y, 2, 'Touchez la réservation dans le bandeau.')
y = step(y, 3, 'Touchez la table souhaitée, puis validez.',
         sub='La table passe en jaune avec le nom du client.')
y -= 4 * mm

c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 10.5)
c.drawString(M + 4 * mm, y, 'Installer un client (avec ou sans réservation)')
y -= 6.5 * mm
y = step(y, 1, 'Touchez une table libre ou réservée.')
y = step(y, 2, 'Choisissez « Occupée » — ou « Client sans réservation » pour un passage.')
y -= 4 * mm

c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 10.5)
c.drawString(M + 4 * mm, y, 'Libérer une table (les clients sont partis)')
y -= 6.5 * mm
y = step(y, 1, 'Touchez la table.')
y = step(y, 2, 'Choisissez « Libre ». La table repasse en vert, prête pour les suivants.')
y -= 6 * mm

# encadré temps réel
c.setFillColor(BG_LIGHT)
c.roundRect(M, y - 15 * mm, W - 2 * M, 17 * mm, 3 * mm, fill=1, stroke=0)
c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 10)
c.drawString(M + 5 * mm, y - 4.5 * mm, 'Bon à savoir')
c.setFillColor(GRAY)
c.setFont('Helvetica', 9.5)
c.drawString(M + 5 * mm, y - 9.5 * mm, 'Le plan se met à jour en temps réel : si votre serveur change une table sur sa')
c.drawString(M + 5 * mm, y - 13.5 * mm, 'tablette, vous le voyez instantanément sur votre téléphone.')

c.showPage()

# ═══════════════════ PAGE 3 — Notifications + FAQ ═══════════════════
header('Notifications & questions', 3)
y = H - 36 * mm

y = section_title(y, 3, 'Les notifications')
c.setFillColor(GRAY)
c.setFont('Helvetica', 10)
c.drawString(M, y, 'Vous êtes prévenu automatiquement, même l’application fermée.')
y -= 8 * mm

y = bullet(y, 'Nouvelle réservation → notification sur votre téléphone, immédiatement.')
y = bullet(y, 'Le client reçoit : confirmation par email, rappel la veille, invitation à laisser un')
c.setFillColor(NAVY); c.setFont('Helvetica', 10)
c.drawString(M + 9 * mm, y, 'avis Google le lendemain — tout est automatique, vous n’avez rien à faire.')
y -= 12 * mm

y = section_title(y, 4, 'Questions fréquentes')
y -= 2 * mm

faqs = [
    ('Je ne reçois plus les notifications, que faire ?',
     ['1.  Vérifiez que l’application CERYDRA est bien installée sur votre écran d’accueil',
      '     (pas ouverte dans Safari ou Chrome).',
      '2.  Vérifiez : Réglages → Notifications → Cerydra → autorisées.',
      '3.  Sinon : supprimez l’icône de l’écran d’accueil, réinstallez-la depuis app.cerydra.fr,',
      '     et acceptez les notifications quand la question apparaît.',
      '4.  Toujours rien ? Écrivez-nous (voir en bas) — les emails continuent d’arriver',
      '     dans tous les cas.']),
    ('Comment voir mes statistiques ?',
     ['Onglet « Statistiques » : nombre de réservations, couverts, évolution par semaine',
      'et par mois. Idéal pour anticiper vos commandes et vos plannings.']),
    ('Je pars en congés, comment bloquer les réservations ?',
     ['Configuration → « Fermetures exceptionnelles » : ajoutez les dates concernées.',
      'Le module de réservation refusera automatiquement ces jours-là.']),
    ('Un client veut annuler par téléphone, comment faire ?',
     ['Ouvrez « Réservations », retrouvez sa réservation (filtre « À venir »), touchez',
      '« Annuler ». C’est immédiat.']),
    ('Le client peut-il annuler tout seul ?',
     ['Oui — chaque email de confirmation et de rappel contient un lien d’annulation.',
      'La réservation passe alors en « Annulée » automatiquement.']),
]

for q, lines in faqs:
    c.setFillColor(NAVY)
    c.setFont('Helvetica-Bold', 11)
    c.drawString(M + 4 * mm, y, q)
    y -= 6 * mm
    c.setFillColor(GRAY)
    c.setFont('Helvetica', 9.5)
    for ln in lines:
        c.drawString(M + 8 * mm, y, ln)
        y -= 4.8 * mm
    y -= 6 * mm

# encadré contact final
y -= 2 * mm
c.setFillColor(NAVY)
c.roundRect(M, y - 30 * mm, W - 2 * M, 32 * mm, 4 * mm, fill=1, stroke=0)
c.setFillColor(white)
c.setFont('Helvetica-Bold', 13)
c.drawCentredString(W / 2, y - 9 * mm, 'Un problème ? Une question ?')
c.setFont('Helvetica', 11)
c.setFillColor(HexColor('#c7c9d9'))
c.drawCentredString(W / 2, y - 16 * mm, 'Écrivez-nous, nous répondons rapidement :')
c.setFont('Helvetica-Bold', 14)
c.setFillColor(white)
c.drawCentredString(W / 2, y - 24 * mm, 'contact@cerydra.fr')


c.showPage()

# ═══════════════════ PAGE 4 — Installer l'application ═══════════════════
header("Installer l'application", 4)
y = H - 36 * mm

y = section_title(y, 5, "Installer CERYDRA sur votre téléphone")
c.setFillColor(GRAY)
c.setFont('Helvetica', 10)
c.drawString(M, y, "2 minutes, une seule fois. Indispensable pour recevoir les notifications. (iPhone / Safari)")
y -= 10 * mm


def pwa_step(x, y_top, w, num, img, caption_lines):
    from PIL import Image as PILImage
    im = PILImage.open(img)
    h = w * im.height / im.width
    # pastille numero
    c.setFillColor(NAVY)
    c.circle(x + 4 * mm, y_top - 1 * mm, 3.6 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(x + 4 * mm, y_top - 2.3 * mm, str(num))
    # image
    c.drawImage(img, x, y_top - 6 * mm - h, w, h, preserveAspectRatio=True, mask='auto')
    c.setStrokeColor(HexColor('#e5e7eb'))
    c.setLineWidth(0.7)
    c.roundRect(x, y_top - 6 * mm - h, w, h, 1.5 * mm, fill=0, stroke=1)
    # legende
    c.setFillColor(NAVY)
    c.setFont('Helvetica', 8.6)
    ty = y_top - 9 * mm - h
    for ln in caption_lines:
        c.drawCentredString(x + w / 2, ty, ln)
        ty -= 3.8 * mm
    return y_top - 9 * mm - h - len(caption_lines) * 3.8 * mm


# Rangée 1 : 3 etapes
col_w = 50 * mm
gap = (W - 2 * M - 3 * col_w) / 2
x0 = M
row_y = y
b1 = pwa_step(x0, row_y, col_w, 1, 'pwa1.png',
              ["Ouvrez app.cerydra.fr", "dans Safari, touchez (...)"])
b2 = pwa_step(x0 + col_w + gap, row_y, col_w, 2, 'pwa2.png',
              ["Touchez « Partager »"])
b3 = pwa_step(x0 + 2 * (col_w + gap), row_y, col_w, 3, 'pwa3.png',
              ["Choisissez", "« Sur l'écran d'accueil »"])
y = min(b1, b2, b3) - 8 * mm

# Rangée 2 : 2 etapes
col2_w = 62 * mm
gap2 = 16 * mm
x0 = (W - 2 * col2_w - gap2) / 2
b4 = pwa_step(x0, y, col2_w, 4, 'pwa4.png',
              ["Touchez « Ajouter »"])
b5 = pwa_step(x0 + col2_w + gap2, y, col2_w, 5, 'pwa5.png',
              ["C'est installé ! Ouvrez l'app depuis", "cette icône — pas depuis Safari."])
y = min(b4, b5) - 8 * mm

# Encadre notifications + Android
c.setFillColor(BG_LIGHT)
c.roundRect(M, y - 20 * mm, W - 2 * M, 22 * mm, 3 * mm, fill=1, stroke=0)
c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 10)
c.drawString(M + 5 * mm, y - 5 * mm, "Important")
c.setFillColor(GRAY)
c.setFont('Helvetica', 9.5)
c.drawString(M + 5 * mm, y - 10 * mm, "Au premier lancement, acceptez les notifications quand la question apparaît —")
c.drawString(M + 5 * mm, y - 14.5 * mm, "c'est ce qui vous permet d'être prévenu à chaque nouvelle réservation.")
c.setFillColor(GRAY_LIGHT)
c.setFont('Helvetica-Oblique', 8.5)
c.drawString(M + 5 * mm, y - 18.5 * mm, "Sur Android : ouvrez app.cerydra.fr dans Chrome, menu (3 points) > « Installer l'application ».")

c.showPage()

c.save()
print('OK ->', OUT)
