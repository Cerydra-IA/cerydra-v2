# -*- coding: utf-8 -*-
"""Document commercial « Comment ça marche » — PDF 4 pages, style CERYDRA."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from PIL import Image as PILImage

NAVY = HexColor('#1a1a2e')
GRAY = HexColor('#6b7280')
GRAY_LIGHT = HexColor('#9ca3af')
BG_LIGHT = HexColor('#f5f6fa')
GREEN = HexColor('#16a34a')
YELLOW = HexColor('#d97706')
RED = HexColor('#dc2626')
BLUE = HexColor('#1a6bff')

W, H = A4
M = 18 * mm
ICI = os.path.dirname(os.path.abspath(__file__))
OUT = r"C:\Users\PC\Desktop\CERYDRA_Comment_ca_marche.pdf"

c = canvas.Canvas(OUT, pagesize=A4)


def header(titre, num):
    c.setFillColor(NAVY)
    c.rect(0, H - 22 * mm, W, 22 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 15)
    c.drawString(M, H - 14 * mm, 'CERYDRA')
    c.setFont('Helvetica', 10)
    c.setFillColor(HexColor('#c7c9d9'))
    c.drawString(M + 32 * mm, H - 14 * mm, '—  Comment ça marche')
    c.setFont('Helvetica-Bold', 11)
    c.setFillColor(white)
    c.drawRightString(W - M, H - 14 * mm, titre)
    c.setFillColor(GRAY_LIGHT)
    c.setFont('Helvetica', 8)
    c.drawCentredString(W / 2, 10 * mm,
                        f'CERYDRA  ·  cerydra.fr  ·  contact@cerydra.fr  —  page {num}/4')


def titre_section(y, num, texte):
    c.setFillColor(NAVY)
    c.circle(M + 4 * mm, y + 1.6 * mm, 4 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 12)
    c.drawCentredString(M + 4 * mm, y - 0.1 * mm, str(num))
    c.setFillColor(NAVY)
    c.setFont('Helvetica-Bold', 14)
    c.drawString(M + 11 * mm, y, texte)
    return y - 9 * mm


def para(y, lignes, taille=10.5, couleur=GRAY, indent=4, inter=5.4):
    c.setFillColor(couleur)
    c.setFont('Helvetica', taille)
    for l in lignes:
        c.drawString(M + indent * mm, y, l)
        y -= inter * mm
    return y


def gras(y, texte, taille=10.5, indent=4):
    c.setFillColor(NAVY)
    c.setFont('Helvetica-Bold', taille)
    c.drawString(M + indent * mm, y, texte)
    return y - 6 * mm


def puce(y, texte, indent=4):
    c.setFillColor(BLUE)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(M + indent * mm, y, '•')
    c.setFillColor(GRAY)
    c.setFont('Helvetica', 10)
    c.drawString(M + (indent + 5) * mm, y, texte)
    return y - 5.6 * mm


def encadre(y, hauteur, titre, lignes, fond=BG_LIGHT):
    c.setFillColor(fond)
    c.roundRect(M, y - hauteur, W - 2 * M, hauteur + 2 * mm, 3 * mm, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont('Helvetica-Bold', 10.5)
    c.drawString(M + 5 * mm, y - 5 * mm, titre)
    c.setFillColor(GRAY)
    c.setFont('Helvetica', 9.5)
    yy = y - 11 * mm
    for l in lignes:
        c.drawString(M + 5 * mm, yy, l)
        yy -= 4.8 * mm
    return y - hauteur - 6 * mm


def pastille(x, y, label, couleur, desc):
    c.setFillColor(couleur)
    c.roundRect(x, y - 1.5 * mm, 20 * mm, 6 * mm, 3 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 8)
    c.drawCentredString(x + 10 * mm, y, label)
    c.setFillColor(GRAY)
    c.setFont('Helvetica', 9.5)
    c.drawString(x + 24 * mm, y, desc)


def image(chemin, y, largeur_mm, legende=None):
    im = PILImage.open(chemin)
    w = largeur_mm * mm
    h = w * im.height / im.width
    x = (W - w) / 2
    c.setFillColor(HexColor('#e2e4ec'))
    c.roundRect(x + 1.2 * mm, y - h - 1.2 * mm, w, h, 2 * mm, fill=1, stroke=0)
    c.drawImage(chemin, x, y - h, w, h, preserveAspectRatio=True, mask='auto')
    c.setStrokeColor(HexColor('#e5e7eb'))
    c.setLineWidth(0.7)
    c.roundRect(x, y - h, w, h, 0.5 * mm, fill=0, stroke=1)
    y2 = y - h - 5 * mm
    if legende:
        c.setFillColor(GRAY_LIGHT)
        c.setFont('Helvetica-Oblique', 8.5)
        c.drawCentredString(W / 2, y2, legende)
        y2 -= 5 * mm
    return y2


# ═══════════ PAGE 1 ═══════════
header('Votre restaurant', 1)
y = H - 36 * mm

c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 22)
c.drawString(M, y, 'Vos réservations, en pilote automatique')
y -= 8 * mm
c.setFillColor(GRAY)
c.setFont('Helvetica', 11)
c.drawString(M, y, 'Ce qui se passe, du premier clic de votre client jusqu’à son avis Google.')
y -= 15 * mm

y = titre_section(y, 1, 'Chez vous, il n’y a rien à installer')
y = para(y, [
    'On ajoute une ligne sur votre site : un bouton « Réserver » apparaît. C’est tout.',
    'Pas de logiciel, pas de matériel, pas de nouvelle caisse.',
    '',
    'Pas de site internet ? Vous avez quand même une page de réservation à votre nom,',
    'à mettre sur Google, Instagram ou Facebook.',
])
y -= 6 * mm

y = titre_section(y, 2, 'Ce que vit votre client')
y = para(y, [
    'Il est 23 h, votre restaurant est fermé. Une cliente veut réserver pour samedi.',
])
y -= 2 * mm
y = para(y, [
    'Elle clique sur « Réserver » : elle voit vos horaires et vos créneaux disponibles.',
    'Nom, téléphone, heure, nombre de couverts. Trente secondes.',
])
y -= 2 * mm
y = encadre(y, 20 * mm, 'Elle reçoit sa confirmation immédiatement', [
    'Pas « votre demande a été reçue » — une vraie confirmation, à votre nom.',
    'Un client sans réponse rapide réserve ailleurs en parallèle.',
])

y = titre_section(y, 3, 'Ce que vous vivez, vous')
y = para(y, [
    'Votre téléphone sonne une fois :',
])
c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 11)
c.drawString(M + 8 * mm, y, '« Nouvelle réservation — Sophie Martin, samedi 20h, 2 personnes »')
y -= 8 * mm
y = para(y, [
    'Même application fermée, même si vous êtes en cuisine.',
    'Vous n’avez rien à valider : la réservation est déjà dans votre carnet.',
])

c.showPage()

# ═══════════ PAGE 2 ═══════════
header('Pendant le service', 2)
y = H - 36 * mm

y = titre_section(y, 4, 'Votre salle, en direct')
y = para(y, [
    'Sur votre téléphone ou une tablette, vous voyez vos tables en couleurs :',
])
y -= 4 * mm
pastille(M + 6 * mm, y, 'LIBRE', GREEN, 'Table disponible.')
y -= 8.5 * mm
pastille(M + 6 * mm, y, 'RÉSERVÉE', YELLOW, 'Un client arrive bientôt — son nom s’affiche.')
y -= 8.5 * mm
pastille(M + 6 * mm, y, 'OCCUPÉE', RED, 'Des clients sont installés.')
y -= 8.5 * mm
pastille(M + 6 * mm, y, 'BLOQUÉE', HexColor('#9ca3af'), 'Table hors service — le système n’y touche jamais.')
y -= 12 * mm

plan = os.path.join(ICI, 'shot_plan.png')
if os.path.exists(plan):
    y = image(plan, y, 100, 'Les réservations du jour à placer, et votre salle en un coup d’œil.')

y -= 2 * mm
y = gras(y, 'Trois gestes, c’est tout')
y = puce(y, 'Placer une réservation : vous tapez le nom, puis la table.')
y = puce(y, 'Client sans réservation : vous tapez la table — même pas besoin de son nom.')
y = puce(y, 'Clients partis : vous tapez « Libre ». Si vous oubliez, la table se libère seule.')
y -= 4 * mm

y = encadre(y, 16 * mm, 'Vous travaillez à plusieurs ?', [
    'Ce que fait votre collègue apparaît sur votre écran en temps réel,',
    'sans rien rafraîchir.',
])

c.showPage()

# ═══════════ PAGE 3 ═══════════
header('Ce qui tourne tout seul', 3)
y = H - 36 * mm

y = titre_section(y, 5, 'Sans que vous ayez rien à faire')
y = para(y, [
    'La veille du repas   →  votre client reçoit un rappel automatique.',
    '                        Moins de tables vides parce qu’on a oublié.',
    '',
    'Le lendemain          →  il reçoit une invitation à laisser un avis Google.',
    '                        Votre note monte sans que vous ayez à le demander.',
    '',
    'Un empêchement        →  il annule lui-même depuis son email.',
    '                        La table se libère dans votre planning, sans un appel.',
])
y -= 8 * mm

y = titre_section(y, 6, 'Ce qui vous protège, sans que vous le voyiez')
y = para(y, [
    'C’est la partie que personne ne remarque, et c’est là que tout se joue.',
])
y -= 3 * mm
y = puce(y, 'Le système connaît votre salle : si tout est pris à 20 h, il refuse et')
y = para(y, ['propose un autre horaire. Impossible d’accepter 40 couverts pour 24 places.'], indent=9)
y = puce(y, 'Il compte aussi les clients sans réservation que vous avez installés :')
y = para(y, ['votre salle réelle et votre planning en ligne disent la même chose.'], indent=9)
y = puce(y, 'Il refuse tout ce qui est hors de vos horaires, et les arrivées trop')
y = para(y, ['tardives dans le service (par défaut, rien dans la dernière heure).'], indent=9)
y = puce(y, 'Vous partez en congés : vous ajoutez les dates, les réservations sont')
y = para(y, ['bloquées pour cette période.'], indent=9)
y = puce(y, 'Et il écarte les mauvais plaisantins : pas de fausses réservations en')
y = para(y, ['rafale, pas de doublons.'], indent=9)

c.showPage()

# ═══════════ PAGE 4 ═══════════
header('Vous gardez la main', 4)
y = H - 36 * mm

y = titre_section(y, 7, 'C’est votre salle, vous décidez')
y = puce(y, 'Un client appelle ? Vous ajoutez la réservation en 10 secondes.')
y = para(y, ['Le système vous dit s’il reste de la place — sans jamais vous en empêcher.'], indent=9)
y = puce(y, 'Vous gardez une table pour un habitué ? Vous la bloquez, personne n’y touche.')
y = puce(y, 'Vos statistiques : couverts, jours qui marchent, évolution mois par mois.')
y = puce(y, 'Vos réservations s’exportent vers Excel quand vous voulez.')
y -= 10 * mm

y = titre_section(y, 8, 'Le point le plus important')
c.setFillColor(NAVY)
c.setFont('Helvetica-Bold', 15)
c.drawString(M + 4 * mm, y, 'Vos clients sont à vous.')
y -= 10 * mm
y = para(y, [
    'Leurs coordonnées sont dans votre carnet, exportables à tout moment.',
    'Aucune plateforme ne les récupère, aucune commission sur vos couverts,',
    'aucun intermédiaire qui vous les revend ensuite.',
    '',
    'Un abonnement fixe. Que vous fassiez 50 ou 500 couverts, c’est le même prix.',
])
y -= 12 * mm

# Encadré final
c.setFillColor(NAVY)
c.roundRect(M, y - 42 * mm, W - 2 * M, 44 * mm, 4 * mm, fill=1, stroke=0)
c.setFillColor(white)
c.setFont('Helvetica-Bold', 16)
c.drawCentredString(W / 2, y - 12 * mm, 'Premier mois gratuit, sans engagement')
c.setFillColor(HexColor('#c7c9d9'))
c.setFont('Helvetica', 11)
c.drawCentredString(W / 2, y - 21 * mm, 'Installation en 24 h · Aucun matériel · Vous êtes accompagné')
c.setFillColor(white)
c.setFont('Helvetica-Bold', 13)
c.drawCentredString(W / 2, y - 33 * mm, 'cerydra.fr   ·   contact@cerydra.fr')

c.showPage()
c.save()
print('OK ->', OUT)
