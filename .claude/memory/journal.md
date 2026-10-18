---
register: journal
---

## 2026-10-16

Création de l'app de calcul d'escalier béton (Vite + React + TS + Tailwind) pour les dessinateurs béton. Elle gère les types droit, quart et demi tournant, le jour droit ou arrondi, le balancement par la méthode de la herse, les niveaux finis / bruts et les finitions (sol, palier, marche, contremarche), la paillasse et la dalle. Toutes les valeurs sont en cm.

Vues : saisie directement sur des schémas de plan et de coupe, plan calculé (brut en trait plein, fini en pointillé, annotations), tracé de la herse, coupe développée, détail du départ, lexique et tableau des valeurs repliable. Les contrôles sont limités aux règles du bureau. La convention de saisie des volées a été corrigée après comparaison avec un tracé main (612,8 → 421,4 cm de foulée).

**Entrées clés :**

- [BDR-001](decisions/BDR-001.md) — volées cotées jusqu'au mur du fond
- [BDR-002](decisions/BDR-002.md) — règles du bureau uniquement
- [LRN-001](learnings/LRN-001.md) — formule fermée de la herse
- [ZBLK-002](archive/blockers/ZBLK-002.md) — export DWG en attente

---

Amorçage du projet avec `/project-init` : mémoire projet et `CLAUDE.md`, plugins Vite (checker, qrcode), `CHANGELOG.md`, README en anglais et en français. `vite-plugin-mkcert` a été installé puis retiré : l'aperçu intégré refusait le certificat, même après le `mkcert -install` de Baptiste. Le serveur de dev reste en HTTP.

Clôture avec `/session-close` : `git init` (le dossier n'était pas un repo), verrous AutoCAD `.dwl` / `.dwl2` exclus du suivi, react-doctor passé de 92 à 100/100 en sortant les utilitaires SVG de `Annot.tsx` vers `src/components/svg.ts` (règle only-export-components), puis premier commit `757c509`. Toutes les entrées de cette clôture sont gardées en mémoire locale, à la demande de Baptiste.

**Entrées clés :**

- [BDR-004](decisions/BDR-004.md) — serveur de dev en HTTP, mkcert retiré
- [LRN-004](learnings/LRN-004.md) — verrous AutoCAD à ignorer dans git

---

Migration de l'UI vers shadcn/ui (style base-nova) à la demande de Baptiste : alias `@` ajouté dans `tsconfig.json` et `vite.config.ts`, puis Card, Button, Input, Label, NativeSelect, Checkbox, Alert, Badge, Table et Collapsible remplacent le Tailwind posé sur les éléments natifs. Les figures et panneaux repliables passent par deux enveloppes partagées (`FigureCard`, `CollapsibleCard`). Le CLI a cassé le build sous Windows (import `cn`, paquet npm `cn`, `utils.ts` circulaire), corrigé à la main. Lint, build, `stair.check.ts` et vérification dans le navigateur OK. Commits `9ee05ac` (UI) et `888795a` (changelog), poussés. Le thème reste neutre : les tokens « Mètre ruban » restent à appliquer.

**Entrées clés :**

- [BDR-005](decisions/BDR-005.md) — UI sur shadcn/ui, thème neutre provisoire
- [ZBLK-004](archive/blockers/ZBLK-004.md) — build cassé par le CLI shadcn sous Windows

---

Export DXF du plan pour AutoCAD (`src/dxf.ts`, bouton « Export DXF » dans l'en-tête de la carte Plan). Un DWG natif étant hors de portée sans bibliothèque, l'export produit un DXF R12 que les dessinateurs ouvrent ou insèrent dans AutoCAD. Itérations avec Baptiste, captures AutoCAD à l'appui : calques du gabarit ABAK à la place de calques maison, 1re et dernière CM brute en vu, ligne de foulée sur `ABAK_A-COTA` avec double ligne de départ et flèche ouverte, numéros 01, 02… en italique côté jour près de la contremarche. Un bouton de rotation a été livré puis remplacé par l'export des 4 orientations côte à côte. Les numéros touchaient les traits dans AutoCAD (police plus large que l'aperçu, texte horizontal dans les vues tournées) : réglé par une recherche de la position libre la plus proche, vérifiée sur 5 escaliers. [ZBLK-002](archive/blockers/ZBLK-002.md) (DWG illisible) est clos et archivé, comme [ZBLK-004](archive/blockers/ZBLK-004.md). Toutes les entrées restent locales, à la demande de Baptiste. Commit `6c5033a`, poussé.

**Entrées clés :**

- [BDR-007](decisions/BDR-007.md) — correspondance avec les calques ABAK
- [BDR-008](decisions/BDR-008.md) — 4 orientations dans l'export
- [ZBLK-005](archive/blockers/ZBLK-005.md) — numéros en contact avec les traits

---

Réorganisation des résultats à la demande de Baptiste. Le volet _Tableau des valeurs par contremarche_ est sorti de `Results.tsx` dans `ValuesTable.tsx` et placé sous le plan, après deux déplacements faux du composant `Results` entier (le libellé n'avait pas été cherché dans le code). Coupe développée, détail au départ et plan passent en volets repliables (`CollapsibleCard`, qui gagne les props `legend` et `action`, `FigureCard` supprimé) ; seul le plan est ouvert au chargement, Export DXF visible même replié, et le lexique est désormais fermé. react-doctor 100/100 sur les fichiers modifiés. [ZBLK-005](archive/blockers/ZBLK-005.md) archivé. Entrées gardées en local, à la demande de Baptiste. Commit `e7b7241`, poussé.

**Entrées clés :**

- [BDR-009](decisions/BDR-009.md) — résultats en volets repliables, seul le plan ouvert
- [ZBLK-006](archive/blockers/ZBLK-006.md) — « tableau des valeurs » mal identifié

---

Vue 3D de l'escalier sous le Plan, après comparaison de quatre approches (three.js vanilla, react-three-fiber, axonométrie SVG, export glTF) : three.js retenu, chargé à l'ouverture d'un volet fermé par défaut. Itérations avec Baptiste sur le rendu : la première paillasse en redans a été remplacée par une sous-face continue alignée sur la convention de la Coupe, les finitions de contremarche ajoutées, puis deux coches (finitions, balancées en bleu). Les arêtes automatiques traçaient des traits parasites sur les flancs ; leur suppression rendait la vue de dessus illisible, d'où un tracé manuel des seules vraies arêtes. Lenteur à la saisie mesurée dans le navigateur (≈100 ms par frappe avec la 3D ouverte) : reconstruction différée de 200 ms, géométries fusionnées et pixel ratio plafonné ramènent la frappe à ≈17 ms. Au passage, les volets se refermaient à chaque saisie, parce qu'une valeur intermédiaire invalide démontait toute la section de résultats : elle est désormais masquée et garde son état. react-doctor 100/100, commit `d58facf` (non poussé). [ZBLK-006](archive/blockers/ZBLK-006.md) archivé ; trois learnings passés en global (GLRN-343 à GLRN-345).

**Entrées clés :**

- [BDR-010](decisions/BDR-010.md) — vue 3D three.js lazy-loadée
- [BDR-011](decisions/BDR-011.md) — paillasse 3D alignée sur la Coupe
- [ZBLK-007](archive/blockers/ZBLK-007.md) — volets refermés à chaque saisie

---

Refonte complète de l'identité visuelle via `/brand-creator`, à la place de « Mètre ruban » et du thème shadcn neutre. Six directions UI proposées (Calque, Cordeau, Coffrage, Herse, Niveau, Finition), contrastes WCAG calculés : Baptiste retient Cordeau. Moodboard logo en deux passes : RulerDimensionLine puis Ruler pour les basiques, et deux séries de concepts sur-mesure (Paillasse / Balancement / Chaîne de cotes, puis Mètre pliant / Équerre / Moulage) ; une planche dédiée croise Moulage avec le trait de craie et les fonds H / C, choix final R1. og:image : template ogimagecn Logo, une planche de six sous-titres, choix T2 « Le calculateur d'escaliers béton du dessinateur. », rendu Satori + resvg dans le scratchpad. Assets PWA régénérés en bleu. Les tokens Cordeau sont ensuite appliqués à `src/index.css`, avec le logo et le trait de craie dans le header ; `pnpm add` des polices bloqué par `minimumReleaseAge`, donc Google Fonts en attendant. Correctif du halo blanc autour des annotations SVG. react-doctor 100/100, lint et build verts, commit `31760ea` ; push refusé (403, pas de droit d'écriture sur le repo de Matthieu). [ZBLK-007](archive/blockers/ZBLK-007.md), [ZBLK-008](archive/blockers/ZBLK-008.md) et [ZBLK-009](archive/blockers/ZBLK-009.md) archivés.

**Entrées clés :**

- [BDR-012](decisions/BDR-012.md) — identité « Cordeau » appliquée à l'app
- [BLK-010](blockers/BLK-010.md) — `pnpm add` bloqué par `minimumReleaseAge`
- [ZBLK-011](archive/blockers/ZBLK-011.md) — push refusé sur le repo de Matthieu

## 2026-10-17

Session de finition du panneau de saisie, au fil des retours de Baptiste sur captures. Serveur de dev relancé (config `escalier`, HTTP). La ligne Type / Sens / contremarches reçoit d'abord un titre, puis devient repliable ; Baptiste demande ensuite d'y englober Plan et Coupe : toute la saisie passe dans le `CollapsibleCard` partagé « Saisie de l'escalier », ouvert par défaut, avec une prop `regionLabel` pour conserver le repère `region` des lecteurs d'écran (expliquée simplement après une première remarque trop jargonneuse). Ajout d'un cadenas par valeur pour éviter les fautes de frappe, état remonté dans `Saisie` parce que le panneau Base UI démonte son contenu replié. Les cadenas élargissaient les cartes et faisaient passer la configuration sur deux lignes : taille `icon-2xs`, champs resserrés et cartes opaques ramènent tout sur une ligne (mesuré à 1400 px). Légende rouge du plan centrée sur le dessin de l'escalier (centre propre à chaque type) puis espacée de la cote ; repère « Finition marche » de la coupe corrigé, il pointait dans le béton. Les captures d'écran de l'aperçu échouaient : vérifications faites par script (DOM, `isPointInFill`). react-doctor 96/100 sans problème, lint et build verts, commit `b313784` (non poussé).

**Entrées clés :**

- [BDR-013](decisions/BDR-013.md) — saisie dans un CollapsibleCard nommé region
- [BDR-014](decisions/BDR-014.md) — verrous de saisie non persistés

---

Session sur les coupes. Lignes de coupe A, B, C… ajoutées au plan, à 20 cm de chaque mur extérieur, regard vers le jour ; d'abord rapprochées pour ne plus toucher les cotes, puis allongées au-delà des cotes à la demande de Baptiste. Le moteur expose `cutLines()` / `cutProfile()` et l'export DXF trace les coupes sur une ligne sous les 4 vues en plan (fini en CA, brut et sous-face en COFFRAGE-VU), puis les lignes de coupe sur les vues en plan. Retours successifs après ouverture dans AutoCAD : 100 cm de plancher au départ et de palier à l'arrivée, nouveau champ « Plancher bas », lignes de coupe et traits de fin de coupe sur `ABAK_A-AXE` (traversant la finition), puis jonction monolithe entre le plancher bas et la paillasse. Deux retouches du schéma de saisie (légende masquée, repère caché). Vérifications par aperçu SVG du DXF servi par le serveur de dev ; contrôles ajoutés dans `stair.check.ts`. Une commande Bash a bloqué 120 s sur une ligne `cat >` parasite, et un `grep` via rtk a laissé croire à tort qu'un `sed` avait échoué. react-doctor 96/100, lint et build verts, commit `b8c2e67` poussé : le push fonctionne de nouveau, [ZBLK-011](archive/blockers/ZBLK-011.md) archivé.

**Entrées clés :**

- [BDR-015](decisions/BDR-015.md) — coupes à 20 cm de chaque mur extérieur
- [BDR-016](decisions/BDR-016.md) — calques des coupes DXF
- [BDR-017](decisions/BDR-017.md) — plancher et jonction monolithe

---

Session sur l'export DXF, au fil des retours de Baptiste. Ajout d'une ligne de plans bruts entre les plans finis et les coupes (sans contremarches finies, puis sans foulée ni numéros, contremarches intermédiaires sur `COFFRAGE-FIN` en couleur du calque) et fermeture des limons jusqu'à la dernière contremarche brute dans toutes les vues en plan. Relevé des 18 calques du gabarit dans `docs/calques.md` (après deux fautes de frappe sur le nom du dossier) ; ce relevé a révélé que les lignes de coupe étaient sur `ABAK_A-AXE` au lieu de `ABAK_A-AXES`, corrigé dans le code et dans [BDR-016](decisions/BDR-016.md). Le DWG d'exemple du bureau, illisible tel quel (AC1032), a été décodé avec libredwg-web en Node pour relever le style des numéros (`ABAK_ANNO_RESA`, Tahoma oblique 20°, hauteur 6) et des bouts de coupe (triangle plein 10 × 3 sur `A-HACHURES`, lettre Arial gras italique) ; l'export embarque désormais une table `STYLE`, validée avec `ezdxf`. Un retour « trop petit » venait d'un DXF exporté par un ancien code (hauteur 4,4) : Baptiste teste avec CadCraft chez lui, AutoCAD au bureau. Question annexe expliquée : DXF plutôt que DWG ([BDR-006](decisions/BDR-006.md)). Lint et build verts, commit `ab9e2dc` poussé.

**Entrées clés :**

- [BDR-018](decisions/BDR-018.md) — ligne de plans bruts
- [BDR-019](decisions/BDR-019.md) — annotations calquées sur le DWG d'exemple
- [ZBLK-012](archive/blockers/ZBLK-012.md) — DXF testé issu d'un ancien code

---

Grosse session UX sur l'orientation et la saisie. On a d'abord remplacé les 4 orientations de l'export DXF par des boutons pictogrammes (barre, L, U avec flèche de montée), d'abord comme boutons d'export, puis — à la demande de Baptiste — déplacés dans la configuration pour choisir l'orientation, l'export redevenant un bouton unique dans le volet Plan. Le type, le sens (« Inverser ») et le jour droit/arrondi sont aussi passés en boutons visuels, sur deux lignes. Ensuite gros changement : les schémas de saisie et le plan annoté tournent selon l'orientation, comme le DXF. Plusieurs retours visuels étape par étape : champs de cote verticaux qui mordaient sur l'escalier (résolu en ancrant le champ tourné à côté de la cote), droit haut/bas ramené à une seule présentation avec flèche inversée, emmarchement élargi, échelle constante en portrait, schémas centrés. Le plan annoté place désormais ses étiquettes au plus près de leur cible (recherche par anneaux avec obstacles et emprise interdite), dans des cartes bleues assorties aux champs de saisie, eux aussi passés en bleu. Petites finitions : plus de « ,0 » sur les schémas, titres en gras, plan brut à droite du fini dans le DXF. Vérifications surtout par mesure DOM, le volet navigateur ne rendant plus de captures par moments. Commit 9cf6762 poussé.

**Entrées clés :**

- [BDR-020](decisions/BDR-020.md) — Orientation choisie en config, plans et DXF tournés ensemble
- [LRN-023](learnings/LRN-023.md) — Overlay HTML vertical : coller un bord au point d'ancrage

---

Ajout d'un import/export des paramètres de saisie. Les boutons « Importer » et « Exporter » remplacent le bouton Imprimer dans l'en-tête (`src/App.tsx`). L'export télécharge le `StairInput` courant en `escalier.json`. L'import relit le fichier, le fusionne par-dessus `DEFAULTS` pour rester compatible avec les fichiers plus anciens, et affiche une alerte si le JSON est invalide. Le `Button` base-nova (Base UI) n'ayant pas de `asChild`, l'import passe par un `<input type="file" hidden>` déclenché via une ref. Le CHANGELOG remplace l'entrée « Impression de la page » par l'import/export. Lint et build OK, commit `24ef213` poussé. Pas testé dans le navigateur.

**Entrées clés :**

- [BDR-021](decisions/BDR-021.md) — Fichier de paramètres = StairInput brut en JSON
## 2026-10-18

Session cotation de l'export DXF, vue en plan. Le style des cotes a été relevé dans `EXEMPLE ESCALIER.dwg` avec libredwg-web (`ABAK_BA`, annotatif 1:20 : oblique 2,6, lignes d'attache fixes de 13, Tahoma 5, rangées de 16). Les cotes globales ont d'abord été livrées en lignes et texte, puis passées en vraies entités `DIMENSION` R12 avec blocs `*Dn` et table `DIMSTYLE`. Les points cotés sont choisis automatiquement (angles visibles depuis l'extérieur) : chaîne type 90 / 10 / 90, puis le total.

Gros malentendu sur fini et brut : plusieurs allers-retours avant d'établir que la saisie est au fini mais que l'export doit être coté au béton (trait plein à trait plein) pour le maçon ; le DWG d'exemple l'a confirmé. Corrections du tracé au passage : le bout de limon au départ passe sur le calque de finition et disparaît du plan brut, et les traits de longueur nulle aux angles d'un jour droit sont supprimés. Sur le gabarit, les cotes étaient minuscules (style annotatif du gabarit à l'échelle 1) : une surcharge DIMSCALE 20 par cote règle le problème, validée par Baptiste. Titre de saisie renommé « Plan — dimensions FINIES ». Commit 70da3b1 poussé. Prochaine étape : les cotes obliques de giron intérieur et extérieur.

**Entrées clés :**

- [BDR-022](decisions/BDR-022.md) — saisie au fini, export coté au brut
- [BDR-023](decisions/BDR-023.md) — vraies DIMENSION au style ABAK_BA
- [ZBLK-014](archive/blockers/ZBLK-014.md) — malentendu fini / brut

---

Emmarchement par volée : `largeur` (départ) et `largeur2` (arrivée) en quart et demi tournant. Le moteur gère une ligne parallèle au jour à distance variable : la foulée passe de f(W1) à f(W2) selon l'angle tourné, avec inversion quadratique de la longueur d'arc pour placer les nez. En quart, chaque volée se cote jusqu'au mur extérieur de l'autre. Pour le demi, j'avais d'abord pris le plus large des deux emmarchements comme profondeur du tournant ; après plusieurs reformulations (Baptiste ne voyait pas de quelle profondeur je parlais avant sa capture d'écran), il a choisi un champ « Profondeur du tournant » saisi. Le plan cote les deux emmarchements et la profondeur ; les anciens JSON restent lisibles. Le hook formateur a reformaté `Plan.tsx` et `stair.check.ts` au style Prettier par défaut ; le second était déjà commité, remis au style du projet dans le commit suivant. Commits `a521b4c` et `44fa2b5`, poussés.

**Entrées clés :**

- [BDR-024](decisions/BDR-024.md) — emmarchement par volée, profondeur du demi-tour saisie
- [BLK-015](blockers/BLK-015.md) — hook formateur hors style du projet

---

Cotes de giron intérieur et extérieur dans l'export DXF. Baptiste a montré sa capture et le DWG d'exemple : les « cotes obliques » sont les chaînes au style `ABAK_BA-RESA` (texte Tahoma oblique 20°, hauteur 4) posées le long de chaque limon droit, entre les contremarches brutes. Relevé fait en réutilisant le `db.json` d'une session précédente (DIMENSION puis bloc anonyme pour les longueurs réelles). Le helper `dim()` de `dxf.ts` est paramétré par un `DimLook` (style, hauteur, écart du texte, attaches, trait) et accepte toute direction ; un second DIMSTYLE et un style de texte oblique entrent dans les tables. Validé sur droit, quart, demi (jour droit et arrondi) et vue tournée : 0 erreur ezdxf, rendu proche de l'exemple. Commit `fe12a70` poussé. Reste à vérifier dans AutoCAD au bureau (taille une fois insérées dans le gabarit, petites cotes de 1 à 2 cm aux bouts qui se chevauchent).

**Entrées clés :**

- [BDR-025](decisions/BDR-025.md) — Cotes de giron DXF au style ABAK_BA-RESA

---

Enrichissement des coupes DXF. Les traits d'axe aux bouts des coupes ne ferment plus que les planchers coupés. Un bout de coupe qui tombe dans la volée (coupes A/B/C d'un quart tournant) est fermé en béton brut, avec la finition descendue jusqu'au brut. Numérotation des marches dans les coupes : d'abord seules les marches dont la contremarche est traversée, puis aussi la marche entamée au bord. Recherche anti-collision pour le cas d'une marche entamée courte, orientée vers l'extérieur à la demande de Baptiste. Commit 56e1d0c.

**Entrées clés :**

- [BDR-026](decisions/BDR-026.md) — Coupes : axe aux planchers, fermeture brute dans la volée
- [BDR-027](decisions/BDR-027.md) — Coupes : numéros de marche, marche entamée comprise

---

Plan DXF coté : les cotes de giron extérieur sortent de l'escalier (12 du limon, côté mur) pour libérer l'intérieur, les girons intérieurs restent dedans, et les cotes globales de coffrage reculent de 12 sur les côtés concernés (lignes de coupe allongées). Ajout d'une cote intérieure brute par volée : longueur du limon jusqu'au bout du jour puis profondeur jusqu'au mur du fond, mesurée après l'arrondi pour retomber sur la profondeur saisie (90 au lieu de 95). Vérifié par aperçu SVG (arrondi sens gauche, jour droit sens droite : 124,5 + 90 = 214,5, 117 + 90 = 207), check, lint et build. Une interruption a laissé `dxf.ts` reformaté en entier : checkout et réapplication par script. Serveurs de dev orphelins coupés. Commit 873c8fe.

**Entrées clés :**

- [BDR-028](decisions/BDR-028.md) — cote intérieure brute jusqu'au bout du jour
- [LRN-026](learnings/LRN-026.md) — fichier reformaté en entier : checkout + script

---

Cotation des coupes de l'export DXF. D'abord une chaîne de cotes verticales côté départ, de brut à brut, avec les hauteurs égales regroupées en « n x h » par texte imposé (comme la capture du bureau) ; `addDim` est sortie de la vue en plan pour servir aussi aux coupes. Puis deux cotes de finition orange (calque `ABAK_BC-STR METAL`) sur la marche du milieu : épaisseur de finition de marche et de contremarche. Baptiste a fait recaler leur position deux fois : au milieu du giron et à mi-hauteur de la contremarche, puis mesurés sur le brut et non sur le fini. Leur emprise est réservée pour que les numéros ne les touchent pas. Vérifié par aperçu PNG ezdxf en sens gauche et droite ; pas encore ouvert dans AutoCAD. Commit `67a70fc` poussé.

**Entrées clés :**

- [BDR-029](decisions/BDR-029.md) — cote de hauteur brute groupée « n x h »
- [BDR-030](decisions/BDR-030.md) — cotes de finition sur la marche du milieu
