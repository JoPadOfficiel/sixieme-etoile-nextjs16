# Guide Technique - Intégration CollectAPI

## 🛠️ Implémentation Technique

### Architecture des Services

```typescript
// Structure des services
src/
├── lib/
│   ├── services/
│   │   ├── fuel-price.ts          # Service principal
│   │   ├── collect-api.ts         # Client API CollectAPI
│   │   └── fuel-autonomy.ts       # Calculs d'autonomie
│   └── pricing-engine.ts          # Intégration moteur
├── app/api/fuel-prices/
│   └── route.ts                   # Endpoint API
└── types/
    └── fuel-management.ts         # Types TypeScript
```

### Service Principal - fuel-price.ts

```typescript
import NodeCache from 'node-cache';

// Configuration du cache (6 heures)
const fuelPriceCache = new NodeCache({ stdTTL: 21600 });

export async function getCurrentFuelPrice(
  fuelType: FuelType, 
  apiKey?: string
): Promise<FuelPrice> {
  try {
    // 1. Vérification du cache
    const cacheKey = `fuel_price_${fuelType}`;
    const cachedPrice = fuelPriceCache.get<FuelPrice>(cacheKey);
    
    if (cachedPrice) {
      return cachedPrice;
    }

    // 2. Appel API CollectAPI
    const response = await fetch('https://api.collectapi.com/gasPrice/turkey', {
      method: 'GET',
      headers: {
        'Authorization': `apikey ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // 3. Traitement de la réponse
    const data: CollectAPIResponse = await response.json();
    const price = extractPriceFromResponse(data, fuelType);
    
    // 4. Conversion TRY → EUR
    const priceInEuros = price * 0.03; // Conversion approximative
    
    // 5. Mise en cache
    const fuelPriceData: FuelPrice = {
      fuelType,
      price: Math.round(priceInEuros * 100) / 100,
      lastUpdated: new Date(),
      source: 'CollectAPI'
    };
    
    fuelPriceCache.set(cacheKey, fuelPriceData);
    return fuelPriceData;
    
  } catch (error) {
    // 6. Fallback en cas d'erreur
    return getFallbackPrice(fuelType);
  }
}
```

### Client CollectAPI - collect-api.ts

```typescript
export class CollectAPIClient {
  private readonly baseURL = 'https://api.collectapi.com';
  private readonly timeout = 10000; // 10 secondes
  
  constructor(private apiKey: string) {}

  async getFuelPrices(endpoint: string = '/gasPrice/turkey'): Promise<CollectAPIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `apikey ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw new Error(`CollectAPI Error: ${error.message}`);
    }
  }

  // Méthodes spécialisées pour différents endpoints
  async getTurkeyPrices(): Promise<CollectAPIResponse> {
    return this.getFuelPrices('/gasPrice/turkey');
  }

  async getEuropeanPrices(): Promise<CollectAPIResponse> {
    return this.getFuelPrices('/gasPrice/europeanCountries');
  }

  async getPricesByCoordinates(lat: string, lng: string): Promise<CollectAPIResponse> {
    return this.getFuelPrices(`/gasPrice/fromCoordinates?lat=${lat}&lng=${lng}`);
  }
}
```

### Calculs d'Autonomie - fuel-autonomy.ts

```typescript
export interface VehicleFuelData {
  tankCapacity: number;      // Capacité en litres
  currentFuelLevel: number;  // Niveau actuel en litres
  fuelConsumption: number;   // Consommation en L/100km
  fuelType: FuelType;
}

export interface FuelStopCalculation {
  autonomyKm: number;           // Autonomie actuelle en km
  fuelStopsNeeded: number;      // Nombre d'arrêts nécessaires
  fuelStopLocations: string[];  // Emplacements suggérés
  totalFuelCost: number;        // Coût total du carburant
}

export function calculateVehicleAutonomy(vehicle: VehicleFuelData): number {
  return (vehicle.currentFuelLevel / vehicle.fuelConsumption) * 100;
}

export function calculateFuelStops(
  vehicle: VehicleFuelData,
  tripDistance: number
): FuelStopCalculation {
  const autonomy = calculateVehicleAutonomy(vehicle);
  const fuelStopsNeeded = Math.max(0, Math.ceil(tripDistance / autonomy) - 1);
  
  return {
    autonomyKm: autonomy,
    fuelStopsNeeded,
    fuelStopLocations: [], // À implémenter avec Google Places API
    totalFuelCost: 0       // Calculé séparément
  };
}

export function calculateOptimalRefuelAmount(
  vehicle: VehicleFuelData,
  remainingDistance: number
): number {
  const fuelNeeded = (remainingDistance * vehicle.fuelConsumption) / 100;
  const availableCapacity = vehicle.tankCapacity - vehicle.currentFuelLevel;
  
  // Faire le plein ou juste ce qui est nécessaire + marge de sécurité
  return Math.min(fuelNeeded * 1.2, availableCapacity);
}
```

### Intégration Moteur de Tarification

```typescript
// Dans pricing-engine.ts
export async function calculateQuote(input: QuoteInputData): Promise<CalculatedQuote> {
  // ... autres calculs ...

  // Calcul du coût de carburant avec gestion avancée
  const vehicle = await getVehicleData(input.vehicleId, organizationId);
  const fuelCost = await calculateAdvancedFuelCost(
    tripDetails.distance,
    vehicle,
    organization.fuelPriceApiKey
  );

  // ... intégration au coût total ...
}

async function calculateAdvancedFuelCost(
  distance: number,
  vehicle: VehicleData,
  apiKey?: string
): Promise<number> {
  // 1. Calcul de l'autonomie actuelle
  const autonomy = calculateVehicleAutonomy(vehicle);
  
  // 2. Détermination des arrêts carburant nécessaires
  const fuelStops = calculateFuelStops(vehicle, distance);
  
  // 3. Calcul du coût pour chaque arrêt
  let totalCost = 0;
  
  if (fuelStops.fuelStopsNeeded > 0) {
    const fuelPrice = await getCurrentFuelPrice(vehicle.fuelType, apiKey);
    
    for (let i = 0; i < fuelStops.fuelStopsNeeded; i++) {
      const refuelAmount = calculateOptimalRefuelAmount(vehicle, distance);
      totalCost += refuelAmount * fuelPrice.price;
    }
  }
  
  // 4. Coût du carburant consommé
  const fuelConsumed = (distance * vehicle.fuelConsumption) / 100;
  const consumptionCost = fuelConsumed * (await getCurrentFuelPrice(vehicle.fuelType, apiKey)).price;
  
  return totalCost + consumptionCost;
}
```

### API Endpoint - /api/fuel-prices/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentFuelPrice, getAllFuelPrices, FuelType } from '@/lib/services/fuel-price';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fuelType = searchParams.get('type') as FuelType;
    const apiKey = searchParams.get('apiKey');

    if (fuelType) {
      // Prix pour un type spécifique
      const price = await getCurrentFuelPrice(fuelType, apiKey);
      return NextResponse.json({
        success: true,
        data: price
      });
    } else {
      // Tous les prix
      const prices = await getAllFuelPrices(apiKey);
      return NextResponse.json({
        success: true,
        data: prices
      });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Support pour POST avec configuration avancée
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fuelTypes, coordinates, apiKey } = body;

    const results = await Promise.all(
      fuelTypes.map(async (type: FuelType) => {
        return await getCurrentFuelPrice(type, apiKey);
      })
    );

    return NextResponse.json({
      success: true,
      data: results,
      metadata: {
        coordinates,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

### Types TypeScript - fuel-management.ts

```typescript
export enum FuelType {
  GASOLINE = 'gasoline',
  DIESEL = 'diesel',
  PREMIUM = 'premium',
  LPG = 'lpg'
}

export interface FuelPrice {
  fuelType: FuelType;
  price: number;
  lastUpdated: Date;
  source: 'CollectAPI' | 'Fallback' | 'Manual';
  currency: string;
  region?: string;
}

export interface CollectAPIResponse {
  success: boolean;
  result: {
    gasoline?: number;
    diesel?: number;
    lpg?: number;
    premium?: number;
  };
  message?: string;
}

export interface FuelCalculationResult {
  baseFuelCost: number;
  fuelStopsCost: number;
  totalFuelCost: number;
  fuelStopsNeeded: number;
  autonomyKm: number;
  estimatedFuelStops: FuelStopLocation[];
}

export interface FuelStopLocation {
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  distanceFromRoute: number;
  estimatedPrice: number;
}

export interface VehicleFuelConfiguration {
  fuelType: FuelType;
  tankCapacity: number;
  currentFuelLevel: number;
  fuelConsumption: number;
  fuelEfficiencyCity: number;
  fuelEfficiencyHighway: number;
}
```

### Gestion d'Erreurs et Retry Logic

```typescript
export class FuelPriceError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'FuelPriceError';
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
}

function isRetryableError(error: Error): boolean {
  return error.message.includes('timeout') ||
         error.message.includes('network') ||
         error.message.includes('503') ||
         error.message.includes('502');
}
```

### Configuration et Optimisations

```typescript
// Configuration du cache avancée
export const FUEL_PRICE_CONFIG = {
  CACHE_TTL: 6 * 60 * 60, // 6 heures
  MAX_CACHE_SIZE: 100,
  RETRY_ATTEMPTS: 3,
  TIMEOUT_MS: 10000,
  FALLBACK_PRICES: {
    gasoline: 1.65,
    diesel: 1.55,
    premium: 1.75,
    lpg: 0.85
  },
  CURRENCY_CONVERSION: {
    TRY_TO_EUR: 0.03,
    USD_TO_EUR: 0.85
  }
};

// Optimisation des performances
export function optimizeFuelPriceRequests(requests: FuelPriceRequest[]): FuelPriceRequest[] {
  // Déduplication des requêtes
  const uniqueRequests = requests.filter((request, index, self) =>
    index === self.findIndex(r => r.fuelType === request.fuelType)
  );
  
  // Priorisation par fréquence d'utilisation
  return uniqueRequests.sort((a, b) => {
    const priority = { gasoline: 1, diesel: 2, premium: 3, lpg: 4 };
    return priority[a.fuelType] - priority[b.fuelType];
  });
}
```
