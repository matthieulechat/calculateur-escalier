---
id: ZBLK-014
type: blocker
date: 2026-10-18
summary: "Fini / brut : 4 allers-retours sur l'attache des cotes"
tags: [cotation, fini, brut, communication, dxf, convention]
status: résolu
---

# ZBLK-014 — Fini / brut : 4 allers-retours sur le point d'attache des cotes

**Friction** : Baptiste répétait que la cote « partait du brut » ou « devait partir du trait plein », alors que je la recalais à chaque fois sur la contremarche finie (égale à la saisie). Captures et contre-propositions se sont enchaînées sans converger.

**Cause réelle** : J'assimilais « cotes saisies au fini » à « cotes exportées au fini ». Or l'export sert au maçon et doit être coté au béton, alors que seule la saisie est au fini.

**Solution** : Lire les calques et positions réels dans `EXEMPLE ESCALIER.dwg` (cotes attachées aux lignes `VU`), puis reformuler la convention en une phrase à faire valider avant de coder.

## Références

- [BDR-022](../../decisions/BDR-022.md) — convention retenue
