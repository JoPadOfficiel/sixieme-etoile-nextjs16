# Story 19-11: Add Address Field to Operating Base Form

**ID:** 19-11  
**Titre:** Add Address Field to Operating Base Form  
**Epic:** 19 - Bug Fixes & UX Improvements  
**Priorité:** Medium  
**Points:** 5

---

## 📋 Description

**En tant qu'** opérateur VTC,  
**Je veux** pouvoir saisir une adresse complète avec auto-complétion Google Places dans le formulaire de base opérationnelle,  
**Afin de** géocoder automatiquement les coordonnées GPS sans saisie manuelle et réduire les erreurs.

#### Contexte

Le formulaire actuel `BaseForm.tsx` requiert la saisie manuelle des coordonnées lat/lng. Cela est source d'erreurs et peu ergonomique. L'ajout d'un champ d'adresse avec auto-complétion Google Places permettra :

- Saisie rapide via auto-complétion
- Géocodage automatique des coordonnées
- Remplissage automatique des champs `city`, `postalCode`, `addressLine1`

---

## ✅ Critères d'Acceptation (AC)

| AC# | Critère                                                                                                     | Vérification             |
| --- | ----------------------------------------------------------------------------------------------------------- | ------------------------ |
| AC1 | Un champ "Recherche d'adresse" avec auto-complétion Google Places est affiché en haut de la section adresse | UI visible               |
| AC2 | La sélection d'une adresse remplit automatiquement `addressLine1`, `city`, `postalCode`                     | Champs pré-remplis       |
| AC3 | La sélection d'une adresse met à jour automatiquement `latitude` et `longitude`                             | Coordonnées mises à jour |
| AC4 | Les champs individuels restent éditables manuellement après auto-complétion                                 | Édition possible         |
| AC5 | Le champ lat/lng reste visible mais en lecture seule (ou éditable en mode avancé)                           | UX cohérente             |
| AC6 | Le formulaire fonctionne en mode création ET édition                                                        | Deux modes OK            |
| AC7 | Les traductions FR/EN sont présentes pour les nouveaux labels                                               | i18n complet             |

---

## 🧪 Cas de Tests

#### Test 1: Auto-complétion d'adresse

- **Given:** L'utilisateur ouvre le formulaire de création de base
- **When:** Il tape "24 Avenue du Gué Langlois, Bussy" dans le champ adresse
- **Then:** Des suggestions Google Places apparaissent
- **And:** La sélection d'une suggestion remplit les champs

#### Test 2: Géocodage automatique

- **Given:** L'utilisateur sélectionne "24-30 Avenue du Gué Langlois, 77600 Bussy-Saint-Martin"
- **When:** L'adresse est sélectionnée
- **Then:** `latitude` ≈ 48.8495 et `longitude` ≈ 2.6905

#### Test 3: Édition manuelle post-auto-complétion

- **Given:** L'adresse a été auto-complétée
- **When:** L'utilisateur modifie manuellement `addressLine1`
- **Then:** La modification est conservée

#### Test 4: Mode édition

- **Given:** L'utilisateur édite une base existante
- **When:** Le formulaire s'ouvre
- **Then:** L'adresse existante est affichée dans le champ auto-complétion

---

## 🔗 Contraintes & Dépendances

| Type           | Description                                         |
| -------------- | --------------------------------------------------- |
| **Dépendance** | Google Maps JavaScript API avec Places Library      |
| **Dépendance** | Composant `AddressAutocomplete` existant ou à créer |
| **Contrainte** | Clé API Google Maps configurée dans l'organisation  |
| **Contrainte** | Respect du multi-tenancy (organizationId)           |

---

## 📁 Fichiers Impactés

| Fichier                                                           | Action                 |
| ----------------------------------------------------------------- | ---------------------- |
| `apps/web/modules/saas/fleet/components/BaseForm.tsx`             | Modifier               |
| `apps/web/modules/saas/shared/components/AddressAutocomplete.tsx` | Réutiliser (existant)  |
| `packages/i18n/translations/fr.json`                              | Modifier (traductions) |
| `packages/i18n/translations/en.json`                              | Modifier (traductions) |

---

## 🏗️ Implémentation

### 1. Modification de BaseForm.tsx

#### Import du composant existant

```tsx
import { AddressAutocomplete } from "@saas/shared/components/AddressAutocomplete";
```

#### Handler d'adresse

```tsx
const handleAddressChange = (result: {
  address: string;
  latitude: number | null;
  longitude: number | null;
}) => {
  // Parse address components to fill individual fields
  const addressParts = result.address.split(",");
  const mainAddress = addressParts[0]?.trim() || "";
  const cityPart = addressParts[addressParts.length - 1]?.trim() || "";

  // Extract postal code and city from the last part
  let postalCode = "";
  let city = "";
  const cityMatch = cityPart.match(/(\d{5})\s+(.+)$/);
  if (cityMatch) {
    postalCode = cityMatch[1];
    city = cityMatch[2];
  } else {
    city = cityPart;
  }

  setFormData((prev) => ({
    ...prev,
    addressLine1: mainAddress,
    city,
    postalCode,
    latitude: result.latitude ?? 48.8566, // Default to Paris if null
    longitude: result.longitude ?? 2.3522, // Default to Paris if null
  }));
};
```

#### Intégration dans le formulaire

```tsx
{
  /* Address Autocomplete */
}
<AddressAutocomplete
  id="baseAddress"
  label={t("fleet.bases.form.addressAutocomplete")}
  value={`${formData.addressLine1}, ${formData.postalCode} ${formData.city}`}
  onChange={handleAddressChange}
  placeholder={t("fleet.bases.form.addressAutocompletePlaceholder")}
  className="mb-4"
/>;
```

### 2. Traductions ajoutées

#### Français (fr.json)

```json
"addressAutocomplete": "Recherche d'adresse",
"addressAutocompletePlaceholder": "Tapez une adresse pour rechercher..."
```

#### Anglais (en.json)

```json
"addressAutocomplete": "Address Search",
"addressAutocompletePlaceholder": "Type an address to search..."
```

---

## ✅ Validation

### Tests manuels à effectuer

1. **Test d'auto-complétion**

   - Ouvrir le formulaire de création de base
   - Taper "24 Avenue du Gué Langlois"
   - Vérifier que des suggestions apparaissent
   - Sélectionner une suggestion et vérifier le remplissage automatique

2. **Test de géocodage**

   - Sélectionner une adresse complète
   - Vérifier que lat/lng sont automatiquement remplies

3. **Test d'édition**

   - Après auto-complétion, modifier manuellement un champ
   - Vérifier que la modification est conservée

4. **Test de traduction**
   - Changer la langue de l'interface
   - Vérifier que les nouveaux labels sont traduits

---

## 📊 Notes Techniques

1. **Réutilisation** : Le composant `AddressAutocomplete` existant est utilisé sans modification
2. **Google Maps** : L'API est déjà disponible via `GoogleMapsProvider` dans `OrganizationProviders`
3. **Fallback** : Si l'API Google n'est pas disponible, le composant affiche un message et permet la saisie manuelle
4. **Parsing** : Le parsing d'adresse est simple et fonctionne pour les adresses françaises standard

---

## 🎯 Résultat Attendu

L'opérateur peut maintenant :

- Rechercher une adresse avec auto-complétion Google Places
- Bénéficier du géocodage automatique des coordonnées
- Garder le contrôle manuel sur chaque champ si nécessaire
- Utiliser l'interface en français ou en anglais

Cette amélioration réduit les erreurs de saisie et accélère la création/modification des bases opérationnelles.
