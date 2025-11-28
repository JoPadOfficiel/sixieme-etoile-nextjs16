# Guide d'Intégration CollectAPI - Auto-École Management

## 🎯 Vue d'Ensemble

Ce guide détaille l'intégration complète de l'API CollectAPI pour la gestion des prix de carburant dans le système d'auto-école. L'intégration fournit des données de prix en temps réel pour optimiser les coûts de formation et les calculs de devis.

## 🏗️ Architecture

### Composants Principaux

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│                 API Routes (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│              Services Layer (TypeScript)                   │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ CollectAPIService│  │ FuelPriceCache  │                 │
│  └─────────────────┘  └─────────────────┘                 │
├─────────────────────────────────────────────────────────────┤
│                   Database (PostgreSQL)                    │
├─────────────────────────────────────────────────────────────┤
│                  External API (CollectAPI)                 │
└─────────────────────────────────────────────────────────────┘
```

### Flux de Données

1. **Requête Client** → API Route Next.js
2. **Validation** → Paramètres et authentification
3. **Cache Check** → Vérification des données en cache
4. **API Call** → CollectAPI (si nécessaire)
5. **Data Processing** → Transformation et validation
6. **Cache Update** → Mise en cache des nouvelles données
7. **Response** → Retour des données formatées

## 🔧 Configuration

### 1. Variables d'Environnement

```bash
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/autoecole"

# Authentification
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3001"
```

### 2. Configuration de la Clé API

La clé API CollectAPI est stockée dans la base de données au niveau de l'organisation :

```sql
-- Structure de la table Organization
ALTER TABLE "Organization" 
ADD COLUMN "fuelPriceApiKey" TEXT;

-- Exemple d'insertion
UPDATE "Organization" 
SET "fuelPriceApiKey" = 'your-collectapi-key'
WHERE id = 'organization-id';
```

### 3. Sanitisation Automatique

Le système détecte et supprime automatiquement les préfixes courants :
- `apikey `
- `api_key `
- `key `

## 📡 Endpoints API

### 1. Prix par Coordonnées GPS

**Endpoint :** `GET /api/fuel-prices?action=coordinates`

**Paramètres :**
- `lat` (required) : Latitude (-90 à 90)
- `lng` (required) : Longitude (-180 à 180)
- `type` (optional) : Type de carburant (`gasoline`, `diesel`, `lpg`)

**Exemple :**
```bash
curl "http://localhost:3001/api/fuel-prices?action=coordinates&lat=48.8566&lng=2.3522&type=gasoline"
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "country": "France",
    "gasoline": "2.008",
    "diesel": "1.940",
    "lpg": "1.158",
    "currency": "usd"
  }
}
```

### 2. Prix Européens

**Endpoint :** `GET /api/fuel-prices?action=european`

**Exemple :**
```bash
curl "http://localhost:3001/api/fuel-prices?action=european"
```

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "country": "France",
      "currency": "euro",
      "gasoline": "1.710",
      "diesel": "1.641",
      "lpg": "0.985"
    },
    {
      "country": "Germany",
      "currency": "euro",
      "gasoline": "1.714",
      "diesel": "1.615",
      "lpg": "1.035"
    }
  ]
}
```

### 3. Prix en Cache

**Endpoint :** `GET /api/fuel-prices?action=cached`

**Paramètres :**
- `fuelType` (required) : Type de carburant
- `country` (optional) : Pays pour filtrer

**Exemple :**
```bash
curl "http://localhost:3001/api/fuel-prices?action=cached&fuelType=gasoline&country=France"
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "price": 1.71,
    "currency": "euro",
    "country": "France",
    "source": "Cache",
    "lastUpdated": "2025-07-04T07:37:06.535Z",
    "isStale": false
  }
}
```

## 🔒 Gestion des Erreurs

### Types d'Erreurs

```typescript
enum CollectAPIErrorCode {
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_COORDINATES = 'INVALID_COORDINATES',
  COUNTRY_NOT_SUPPORTED = 'COUNTRY_NOT_SUPPORTED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

### Réponses d'Erreur

```json
{
  "success": false,
  "error": "Failed to fetch fuel prices",
  "message": "CollectAPI request failed: 500 Internal Server Error",
  "code": "NETWORK_ERROR",
  "retryable": true
}
```

### Stratégie de Fallback

1. **Cache Local** : Utilisation des données en cache si disponibles
2. **Prix par Défaut** : Valeurs de fallback configurées
3. **Retry Logic** : Tentatives automatiques avec backoff exponentiel

## 🎨 Utilisation Frontend

### Hook React Personnalisé

```typescript
import { useFuelPrices } from '@/hooks/use-fuel-prices';

function FuelPriceDisplay() {
  const { data, loading, error } = useFuelPrices({
    coordinates: { lat: 48.8566, lng: 2.3522 },
    fuelType: 'gasoline'
  });

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  return (
    <div>
      Prix essence: {data.price} {data.currency}
    </div>
  );
}
```

### Composant de Calcul de Coût

```typescript
import { FuelCostCalculator } from '@/components/fuel/fuel-cost-calculator';

function RouteCalculator() {
  return (
    <FuelCostCalculator
      distance={150} // km
      consumption={7.5} // L/100km
      coordinates={{ lat: 48.8566, lng: 2.3522 }}
      fuelType="gasoline"
      onCalculated={(result) => {
        console.log('Coût carburant:', result.totalCost);
      }}
    />
  );
}
```

## 🧪 Tests

### Tests Unitaires

```bash
# Exécuter les tests TypeScript
npm test __tests__/collectapi-types.test.ts

# Tests d'intégration
npm test __tests__/collectapi-integration.test.ts
```

### Tests Manuels

```bash
# Test de connectivité
curl "http://localhost:3001/api/fuel-prices?action=cached&fuelType=gasoline"

# Test avec coordonnées
curl "http://localhost:3001/api/fuel-prices?action=coordinates&lat=48.8566&lng=2.3522"

# Test européen
curl "http://localhost:3001/api/fuel-prices?action=european"
```

## 📊 Monitoring et Performance

### Métriques Clés

- **Taux de succès API** : > 95%
- **Temps de réponse** : < 2 secondes
- **Taux de cache hit** : > 80%
- **Disponibilité** : > 99.5%

### Logs et Debugging

```typescript
// Activation des logs détaillés
process.env.DEBUG_COLLECTAPI = 'true';

// Logs automatiques dans la console
console.log('CollectAPI Request:', { endpoint, params });
console.log('CollectAPI Response:', { success, data, duration });
```

## 🚀 Déploiement

### Variables de Production

```bash
# Clé API de production
COLLECTAPI_API_KEY="production-key"

# Configuration cache
FUEL_PRICE_CACHE_TTL=21600  # 6 heures
FUEL_PRICE_CACHE_MAX_SIZE=1000

# Timeouts
COLLECTAPI_TIMEOUT=10000  # 10 secondes
COLLECTAPI_RETRY_ATTEMPTS=3
```

### Vérifications Post-Déploiement

1. ✅ Test de connectivité API
2. ✅ Validation des clés API
3. ✅ Vérification du cache
4. ✅ Tests de performance
5. ✅ Monitoring des erreurs

## 🔄 Maintenance

### Mise à Jour des Prix

Les prix sont automatiquement mis à jour selon la configuration du cache (6 heures par défaut).

### Rotation des Clés API

```sql
-- Mise à jour de la clé API
UPDATE "Organization"
SET "fuelPriceApiKey" = 'new-api-key'
WHERE id = 'organization-id';
```

### Nettoyage du Cache

```typescript
// Via l'API admin
POST /api/admin/fuel-cache/clear

// Programmatiquement
import { FuelPriceCacheService } from '@/lib/services/fuel-price-cache';
const cacheService = new FuelPriceCacheService();
await cacheService.clearCache();
```

## 📋 Checklist de Validation

### ✅ Tests Fonctionnels Réalisés

- [x] **API CollectAPI** : Connexion et récupération de données réelles
- [x] **Sanitisation des clés** : Suppression automatique des préfixes
- [x] **Gestion d'erreurs** : Codes d'erreur structurés et fallback
- [x] **Types TypeScript** : Interfaces complètes et type safety
- [x] **Cache système** : Fonctionnement du cache local
- [x] **Endpoints multiples** : Coordonnées, européen, cache
- [x] **Validation des paramètres** : Coordonnées et types de carburant
- [x] **Configuration organisation** : Stockage sécurisé des clés API

### 🎯 Améliorations Apportées

1. **Correction du bug de reset de formulaire** dans les paramètres API
2. **Sanitisation automatique** des clés API avec préfixes
3. **Types TypeScript avancés** avec validation et utilitaires
4. **Gestion d'erreurs robuste** avec codes d'erreur spécifiques
5. **Documentation complète** avec exemples pratiques
6. **Tests unitaires** pour la validation des types

### 🚀 Prêt pour Production

L'intégration CollectAPI est maintenant **production-ready** avec :
- ✅ Sécurité renforcée
- ✅ Gestion d'erreurs complète
- ✅ Performance optimisée
- ✅ Documentation exhaustive
- ✅ Tests de validation
