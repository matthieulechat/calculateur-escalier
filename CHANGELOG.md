# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this
project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Calcul d'escaliers béton droits, quart tournants et demi tournants (tourne à gauche ou à droite), avec jour droit ou arrondi.
- Nombre de contremarches automatique respectant les règles du bureau : h ≤ 18 cm, g ≥ 24 cm, 60 < 2h + g < 64, avec contrôles affichés.
- Balancement des marches par la méthode de la herse, avec le tracé de la herse pour chaque côté du tournant.
- Niveaux finis et bruts, finitions (sol de départ, palier, dessus de marche, contremarche) et hauteurs de contremarches brutes (1re, courante, dernière).
- Saisie des dimensions directement sur des schémas de plan et de coupe.
- Plan annoté : contremarches brutes en trait plein, finies en pointillé, ligne de foulée avec flèche de montée, cotes des volées, de l'emmarchement et du giron.
- Coupe développée sur la ligne de foulée (profil fini, profil brut, paillasse, dalle palier) et détail annoté du départ.
- Tableau des valeurs par contremarche (girons, collets, cumuls de traçage) et lexique du vocabulaire, en panneaux repliables.
- Import et export des paramètres de saisie dans un fichier JSON, pour reprendre un escalier plus tard ou le partager.
- Application installable (PWA) avec icônes, logo et image d'aperçu pour le partage de lien.
- Export DXF du plan pour AutoCAD : tracés sur les calques du bureau (limons, contremarches brutes et finies), ligne de foulée avec double ligne de départ et flèche d'arrivée, numéros de marche côté jour, dans l'orientation choisie pour se caler sur le plan archi.
- Vue 3D orientable de l'escalier (rotation, zoom, déplacement) : marches et paillasse en béton brut, finitions de marche et de contremarche, marches balancées en bleu, avec des cases à cocher pour masquer les finitions ou la couleur des balancées. Chargée seulement à l'ouverture de son panneau.
- Cadenas à côté de chaque valeur de saisie pour la verrouiller et éviter les fautes de frappe.
- Lignes de coupe A, B, C… sur le plan, à 20 cm de chaque mur extérieur, avec flèches de regard vers le jour.
- Coupes dans l'export DXF, sous les vues en plan : profil fini, béton brut et paillasse, avec 100 cm de plancher au départ et de palier à l'arrivée ; lignes de coupe et traits de fin de coupe sur le calque axe, y compris sur les vues en plan.
- Saisie de l'épaisseur du plancher bas, représenté dans les coupes exportées.
- Vue en plan brute dans l'export DXF, à droite du plan fini : sans contremarches finies, ligne de foulée ni numéros, contremarches intermédiaires sur le calque fin.
- Cotes globales de coffrage sur le plan fini de l'export DXF, pour le maçon : contour de l'escalier en béton brut, de trait plein à trait plein, en chaîne (ex. 90 / 10 / 90) puis cote totale sur chaque côté. Ce sont de vraies cotes AutoCAD, étirables, au style `ABAK_BA` du bureau, à la bonne taille une fois insérées dans le gabarit.
- Emmarchement saisi par volée (départ et arrivée) pour les quart et demi tournants : la ligne de foulée passe progressivement d'une distance au jour à l'autre dans le tournant, et le plan cote les deux emmarchements. En demi-tournant, la profondeur du tournant (du bout du jour au mur du fond) se saisit à part. Les anciens fichiers de paramètres reprennent le même emmarchement sur les deux volées, et le plus grand des deux comme profondeur.

### Changed

- Interface refondue avec des composants homogènes (cartes, champs, listes déroulantes, cases à cocher, badges de contrôle, tableau).
- Résultats réorganisés : synthèse et contrôles en tête, puis plan, tableau des valeurs, herse, coupe développée, détail et lexique. Toutes ces sections se replient ; seul le plan est ouvert au départ, avec l'export DXF accessible même replié.
- Nouvelle identité visuelle « Cordeau » : fond béton clair, bleu cordeau, police Archivo, logo en haut à gauche et trait de craie sous l'en-tête ; nouvelle icône d'application et nouvelle image d'aperçu pour le partage de lien.
- Saisie regroupée dans un panneau repliable « Saisie de l'escalier », avec des titres Configuration, Plan et Coupe ; cartes de cotes opaques et plus compactes, légende du plan centrée sous le schéma.
- Export DXF : numéros de marche au style du bureau (Tahoma oblique, hauteur 6 cm) collés à la foulée côté jour, et bouts des lignes de coupe en triangle plein avec lettre en gras italique, comme dans les plans du bureau.
- Configuration en boutons visuels : type d'escalier (droit, 1/4, 1/2 tournant) avec pictogramme, bouton « Inverser » pour le sens, bouton jour droit / arrondi dont le dessin suit le choix.
- Orientation du plan choisie par 4 boutons pictogrammes (flèche = sens de montée) : les schémas de saisie, le plan annoté et l'export DXF tournent ensemble.
- Cotes verticales des schémas de saisie écrites à la verticale, collées à leur cote, et emmarchement dessiné plus large ; schémas centrés et à la même échelle dans toutes les orientations.
- Étiquettes du plan annoté placées au plus près de leur cible, sans recouvrir le dessin, dans des cartes bleues assorties aux champs de saisie (cartes bleues aussi en saisie).
- Sur les schémas, plus de décimale inutile (220 au lieu de 220,0).
- Titre « Plan — dimensions FINIES » dans la saisie, pour rappeler que les cotes saisies sont finies.

### Fixed

- Les panneaux de résultats ne se referment plus quand une saisie passe par une valeur invalide (champ vidé ou en cours de frappe).
- Sur le schéma de coupe, le repère « Finition marche » pointe de nouveau sur la finition de la marche et non dans le béton.
- Export DXF : les limons vont jusqu'à la dernière contremarche brute pour fermer l'escalier en plan, et les lignes de coupe tombent sur le calque `ABAK_A-AXES` du gabarit (nom corrigé).
- Export DXF : au départ, le bout de limon devant la 1re contremarche brute est sur le calque de finition, et n'apparaît plus sur le plan brut ; plus de traits de longueur nulle aux angles d'un jour droit.
