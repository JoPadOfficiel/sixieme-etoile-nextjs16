# CollectAPI - Référence Technique

## 🔧 Classes et Services

### CollectAPIService

Service principal pour l'intégration avec l'API CollectAPI.

```typescript
import { CollectAPIService } from '@/lib/services/collect-api';

// Initialisation
const service = new CollectAPIService('organization-id');

// Configuration personnalisée
const service = new CollectAPIService('organization-id', {
  timeout: 15000,
  retryAttempts: 5
});
```

#### Méthodes Principales

##### `getFuelPricesByCoordinates(lat, lng, type?)`

Récupère les prix de carburant par coordonnées GPS.

```typescript
const prices = await service.getFuelPricesByCoordinates(
  48.8566, // Latitude
  2.3522,  // Longitude
  FuelType.GASOLINE // Optionnel
);

// Retour
{
  country: "France",
  gasoline: "2.008",
  diesel: "1.940",
  lpg: "1.158",
  currency: "usd"
}
```

##### `getEuropeanFuelPrices()`

Récupère tous les prix européens.

```typescript
const prices = await service.getEuropeanFuelPrices();

// Retour : Array<EuropeanFuelPrice>
[
  {
    country: 'France',
    currency: 'euro',
    gasoline: '1.710',
    diesel: '1.641',
    lpg: '0.985'
  }
];
```

##### `calculateFuelCost(distance, consumption, coordinates, fuelType)`

Calcule le coût de carburant pour un trajet.

```typescript
const cost = await service.calculateFuelCost(
  150,                                    // Distance en km
  7.5,                                   // Consommation L/100km
  { lat: 48.8566, lng: 2.3522 },       // Coordonnées
  FuelType.GASOLINE                      // Type de carburant
);

// Retour : FuelCalculationResult
{
  fuelNeeded: 11.25,      // Litres nécessaires
  pricePerLiter: 2.008,   // Prix par litre
  totalCost: 22.59,       // Coût total
  currency: "usd",        // Devise
  country: "France",      // Pays
  coordinates: { lat: 48.8566, lng: 2.3522 }
}
```

## 📊 Types TypeScript

### Enums

```typescript
// Types de carburant
enum FuelType {
  GASOLINE = 'gasoline',
  DIESEL = 'diesel',
  LPG = 'lpg',
  PREMIUM = 'premium'
}

// Sources de données
enum FuelPriceSource {
  COLLECTAPI = 'CollectAPI',
  CACHE = 'Cache',
  FALLBACK = 'Fallback',
  MANUAL = 'Manual'
}

// Devises supportées
enum Currency {
  EUR = 'euro',
  USD = 'usd',
  TRY = 'try'
}

// Codes d'erreur
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

### Interfaces Principales

```typescript
// Prix de carburant avec métadonnées
interface FuelPrice {
  fuelType: FuelType;
  price: number;
  currency: Currency;
  lastUpdated: Date;
  source: FuelPriceSource;
  country?: string;
  region?: string;
  coordinates?: Coordinates;
  isStale?: boolean;
}

// Réponse API standardisée
interface FuelPriceAPIResponse {
  success: boolean;
  data?: FuelPrice | FuelPrice[] | CoordinatesFuelPrices | EuropeanFuelPrice[];
  error?: string;
  message?: string;
  metadata?: {
    timestamp: string;
    source: FuelPriceSource;
    cacheHit?: boolean;
    requestId?: string;
  };
}

// Résultat de calcul de coût
interface FuelCalculationResult {
  fuelNeeded: number; // Litres
  pricePerLiter: number; // Prix par litre
  totalCost: number; // Coût total
  currency: Currency; // Devise
  country?: string; // Pays
  coordinates?: Coordinates; // Coordonnées
}

// Erreur structurée
interface CollectAPIError {
  code: CollectAPIErrorCode;
  message: string;
  details?: any;
  timestamp: Date;
  endpoint?: string;
  retryable: boolean;
}
```

## 🛠️ Fonctions Utilitaires

### Type Guards

```typescript
import { isCurrency, isFuelType } from '@/types/collectapi';

// Validation de type de carburant
if (isFuelType(userInput)) {
  // userInput est maintenant de type FuelType
  console.log('Type valide:', userInput);
}

// Validation de devise
if (isCurrency(currencyInput)) {
  // currencyInput est maintenant de type Currency
  console.log('Devise valide:', currencyInput);
}
```

### Parsing et Formatage

```typescript
import { CurrencyFormatterService } from '@/lib/services/currency/currency-formatter';
import { parsePrice } from '@/types/collectapi';

// Parsing sécurisé des prix
const price = parsePrice('1,50'); // 1.50
const price2 = parsePrice('1.99'); // 1.99

// Formatage pour affichage (USD-backend architecture)
// Convert USD amount to organization currency and format
const formatted = await CurrencyFormatterService.formatUSDForOrganization(
  1.5, // USD amount from backend
  organizationId
);
// Returns: { formattedAmount: "1,50 €", convertedAmount: 1.27, ... }

// Direct formatting if currency is known
const directFormatted = CurrencyFormatterService.formatAmount(
  1.5,
  'EUR',
  'fr-FR'
);
// "1,50 €"
```

## 🔄 Gestion du Cache

### Configuration

```typescript
interface CacheConfig {
  ttl: number; // Durée de vie en secondes
  maxSize: number; // Taille maximale du cache
  checkPeriod: number; // Période de vérification
}

// Configuration par défaut
const defaultConfig: CacheConfig = {
  ttl: 21600, // 6 heures
  maxSize: 1000, // 1000 entrées
  checkPeriod: 600 // 10 minutes
};
```

### Utilisation

```typescript
import { FuelPriceCacheService } from '@/lib/services/fuel-price-cache';

const cache = new FuelPriceCacheService();

// Récupération avec cache
const cachedPrice = await cache.get('gasoline-france');

// Mise en cache
await cache.set('gasoline-france', priceData, 3600); // 1 heure

// Nettoyage
await cache.clear();
```

## 🚨 Gestion d'Erreurs

### Try-Catch Pattern

```typescript
import { CollectAPIService } from '@/lib/services/collect-api';
import { CollectAPIError, CollectAPIErrorCode } from '@/types/collectapi';

try {
  const prices = await service.getFuelPricesByCoordinates(48.8566, 2.3522);
  console.log('Prix récupérés:', prices);
} catch (error) {
  if (error instanceof CollectAPIError) {
    switch (error.code) {
      case CollectAPIErrorCode.INVALID_API_KEY:
        console.error('Clé API invalide');
        break;
      case CollectAPIErrorCode.RATE_LIMIT_EXCEEDED:
        console.error('Limite de taux dépassée');
        if (error.retryable) {
          // Retry logic
        }
        break;
      case CollectAPIErrorCode.NETWORK_ERROR:
        console.error('Erreur réseau');
        break;
      default:
        console.error('Erreur inconnue:', error.message);
    }
  } else {
    console.error('Erreur non-CollectAPI:', error);
  }
}
```

### Retry avec Backoff

```typescript
async function fetchWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof CollectAPIError && !error.retryable) {
        throw error; // Ne pas retry si non-retryable
      }

      if (attempt === maxRetries) {
        throw error; // Dernière tentative
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

// Utilisation
const prices = await fetchWithRetry(() =>
  service.getFuelPricesByCoordinates(48.8566, 2.3522)
);
```

## 📈 Monitoring et Logs

### Métriques Personnalisées

```typescript
interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorsByType: Record<CollectAPIErrorCode, number>;
}

// Collecte de métriques
class MetricsCollector {
  private metrics: APIMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    errorsByType: {}
  };

  recordRequest(success: boolean, responseTime: number, fromCache: boolean) {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    // Mise à jour des autres métriques...
  }
}
```

### Logging Structuré

```typescript
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  service: 'CollectAPI';
  operation: string;
  duration?: number;
  success: boolean;
  error?: CollectAPIError;
  metadata?: Record<string, any>;
}

// Logger personnalisé
class CollectAPILogger {
  log(entry: LogEntry) {
    const logData = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify(logData));
  }
}
```
