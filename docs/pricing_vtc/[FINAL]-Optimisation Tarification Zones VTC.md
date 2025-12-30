# **Architecture de Tarification VTC Cognitive : De la Matrice Statique à l'Intelligence Géospatiale Agent-Native**

## **1\. Introduction : La Nécessité d'une Rupture Ontologique dans le Pricing de la Mobilité**

L'industrie du transport de personnes à la demande, englobant le VTC (Voiture de Transport avec Chauffeur), la Grande Remise et la logistique premium du dernier kilomètre, traverse une phase de mutation structurelle sans précédent. Historiquement, la tarification de ces services reposait sur une dichotomie simple : le taximètre déterministe pour les taxis (basé sur une corrélation directe distance/temps) et le forfait fixe pour la Grande Remise. Cependant, l'émergence des plateformes de mise en relation algorithmiques et la volatilité croissante des conditions opérationnelles urbaines ont rendu ces modèles obsolètes. Les systèmes de gestion historiques, tels que **Limo Anywhere**, **Way-Plan** ou **Moovs**, bien que pionniers en leur temps, atteignent aujourd'hui leurs limites architecturales face à l'exigence de flexibilité, de précision et de rentabilité des opérateurs modernes.  
Ce rapport technique présente une architecture de référence pour un **Moteur de Pricing VTC Multi-Zones Complexe** et un **Système de Gestion de Forfaits Agences**. Cette conception ne vise pas une simple itération incrémentale des outils existants, mais une refonte complète des paradigmes de calcul. Nous proposons de passer d'une logique de "base de données tarifaire" (passive) à une architecture **"Agent-Native"** (active), où des entités logicielles autonomes collaborent pour optimiser le rendement (Yield Management) en temps réel. Cette approche s'inspire des meilleures pratiques observées chez les leaders du marché tout en comblant leurs lacunes par l'intégration de technologies géospatiales avancées (segmentation de polylignes, intersection de polygones) et de modèles probabilistes.  
L'analyse approfondie des besoins, croisée avec les limitations des systèmes hérités, met en lumière trois impératifs majeurs pour l'horizon 2026 :

1. **La Granularité Géospatiale :** La capacité de tarifer non plus par "code postal" ou "ville", mais par segmentation précise de l'itinéraire traversant des zones économiques hétérogènes (ZFE, zones de congestion, zones touristiques à forte valeur ajoutée).  
2. **L'Hybridation des Modèles :** La coexistence fluide entre des grilles tarifaires rigides, exigées par les contrats cadres B2B (Agences, Hôtels), et une tarification dynamique algorithmique pour le marché spot, capable de protéger la marge opérationnelle.  
3. **L'Optimisation du TCO (Total Cost of Ownership) :** L'intégration des coûts réels (kilomètres d'approche ou "Deadhead", temps d'attente, consommation énergétique spécifique) directement dans la formule de prix, transformant le devis en un outil de pilotage de la rentabilité.

Ce document détaille les spécifications techniques, les algorithmes mathématiques et les structures de données nécessaires pour bâtir ce système d'exploitation cognitif de la tarification.

## ---

**2\. Déconstruction des Modèles Existants : Analyse Critique et Dette Technique**

Pour concevoir l'architecture cible, il est indispensable de disséquer les mécanismes internes des solutions dominantes. L'audit technique de **Limo Anywhere**, **Way-Plan** et **Moovs** révèle des philosophies de conception distinctes, chacune portant des dettes techniques qui entravent l'évolutivité.

### **2.1. Limo Anywhere : L'Obsolescence de la Matrice Point-à-Point**

L'architecture de pricing de **Limo Anywhere** (LA) est l'archétype du système hérité ("Legacy System"). Elle repose sur le **"System Rate Manager"**, un moteur matriciel conçu pour digitaliser les grilles papier des années 90\.1

* **Structure Matricielle Rigide :** Le cœur du système est une matrice connectant un "Point A" à un "Point B". Ces points sont définis par des "Zones" manuelles, regroupant des codes aéroports (FAA) ou des ensembles de codes postaux (Zip Codes).2 Cette approche souffre d'une **explosion combinatoire**. Pour couvrir une métropole comme Paris et sa banlieue avec une granularité fine, l'opérateur doit définir manuellement des milliers de paires de zones. L'ajout d'une nouvelle zone nécessite la création explicite de tarifs vers toutes les autres zones existantes, créant une charge administrative insoutenable.1  
* **Logique Conditionnelle Limitée :** LA utilise des "Criteria Based Fees" qui suivent une logique booléenne rudimentaire (Si Heure \> 23h Alors Surcharge). Il n'existe pas de véritable moteur d'élasticité capable d'analyser l'offre et la demande en temps réel. Le système est déterministe et incapable de réagir à des événements stochastiques (ex: pic de demande imprévu) sans intervention humaine.1  
* **Calcul des Taxes et Gratuities :** Le modèle de calcul suit un "Ordre des Opérations" rigide (Base Rate \+ Gratuity \+ Tax). Cette rigidité pose des problèmes majeurs de conformité en Europe, où la distinction entre "Service" (taxable) et "Pourboire" (non taxable) est critique, et où la TVA peut s'appliquer sur la marge ou sur le total selon le statut du sous-traitant.1

### **2.2. Way-Plan : La Rigueur Réglementaire au Prix de la Complexité**

**Way-Plan** s'est imposé sur le marché français grâce à sa conformité native avec des réglementations complexes comme la Loi LOM et la fiscalité mixte.1

* **Gestion Fiscale Avancée :** Contrairement aux outils US, Way-Plan gère nativement la **TVA sur Marge**. L'algorithme calcule la base imposable pour chaque transaction de sous-traitance ($Base \= Prix\_{Vente} \- Prix\_{Achat}$), sécurisant l'opérateur face aux contrôles fiscaux.3  
* **Tarification Horokilométrique :** Le système excelle dans la gestion des Mises à Disposition (MAD). Il permet de définir des forfaits incluant un volume de kilomètres et d'heures, avec des seuils de déclenchement paramétrables pour la facturation supplémentaire. Cependant, cette logique reste souvent déconnectée de la réalité géographique du trajet (pas de distinction entre un kilomètre sur autoroute fluide et un kilomètre en hyper-centre congestionné).1  
* **Dette d'Expérience Utilisateur (UX) :** La richesse fonctionnelle se traduit par une complexité de configuration excessive. L'interface de création de tarifs est dense, nécessitant une expertise technique pour éviter les erreurs de facturation systémiques. De plus, l'architecture n'est pas "Offline-First", créant des risques opérationnels en zones blanches.1

### **2.3. Moovs : L'Agilité Visuelle et le Piège Fintech**

**Moovs** représente l'approche "SaaS Verticalisé" moderne, privilégiant l'expérience utilisateur et l'intégration financière.1

* **Zone Pricing par Polygones (GeoJSON) :** Moovs a introduit la définition de zones par dessin vectoriel sur carte (Polygones), s'affranchissant des codes postaux.4 Cela permet une définition plus naturelle des territoires (ex: englober un quartier d'affaires sans se soucier des limites administratives). Cependant, le moteur de pricing reste basique : il détecte l'appartenance à une zone mais gère mal les intersections complexes ou les trajets traversants.1  
* **Modèle Économique Hybride :** Moovs monétise via l'abonnement et les frais de transaction (Fintech). Bien que cela simplifie l'accès, les frais élevés (jusqu'à 3.4%) pèsent lourdement sur le TCO des grandes flottes, créant un "Walled Garden" financier difficile à quitter.1  
* **Absence de Gestion Européenne :** Le système manque de granularité pour les règles de TVA intra-communautaires complexes et les spécificités du "Reverse Charge", limitant son adoption par des réseaux transfrontaliers.1

### **2.4. Synthèse des Exigences pour l'Architecture Cible**

L'analyse comparative permet de définir le cahier des charges de notre moteur :

| Dimension | Limo Anywhere / Way-Plan (Hérité) | Moovs (Actuel) | Neural-Pricing (Cible) |
| :---- | :---- | :---- | :---- |
| **Géographie** | Codes Postaux / Villes (Statique) | Polygones Simples (Visuel) | **Maillage Vectoriel & Segmentation de Route** |
| **Logique Prix** | Matrice Point-à-Point | Forfait Zone ou Km/Temps | **Algorithme Hiérarchique & Weighted Graph** |
| **Conformité** | Manuelle ou Rigide (Way-Plan) | Basique (US-Centric) | **Moteur de Règles (LOM/RSE) & TVA Contextuelle** |
| **Intelligence** | Aucune (Règles Si/Alors) | Faible (Demande Simple) | **Agents IA Prédictifs & Yield Management** |

## ---

**3\. Architecture Technique du Moteur de Pricing Géospatiale**

Le cœur du système repose sur une rupture technologique : le passage d'une logique relationnelle simple à une logique **géospatiale vectorielle**. Le prix n'est plus une valeur stockée dans une table, mais le résultat d'un calcul géométrique et topologique effectué en temps réel.

### **3.1. Modélisation des Données Géographiques (Le "Pricing Zone Engine")**

Au lieu de listes, nous utilisons des structures géométriques stockées dans une base de données spatiale (PostgreSQL avec l'extension **PostGIS**).

#### **3.1.1. Typologie des Zones Tarifaires**

Le système distingue trois types d'objets géographiques, chacun avec un comportement algorithmique propre 1 :

1. **Polygones (POLYGON) :** Utilisés pour définir des zones administratives complexes ou des quartiers spécifiques (ex: Paris Intra-muros, La Défense). Ils sont stockés sous forme de géométries GeoJSON.  
   * *Attributs :* definition (coordonnées), priceMultiplier (coefficient de majoration), isCentralZone (booléen pour identifier le cœur du réseau).  
2. **Rayons (RADIUS) :** Utilisés pour les Points d'Intérêt (POI) majeurs comme les aéroports ou les gares.  
   * *Définition :* Un point central (Lat/Long) et une distance en mètres. Cela permet de capturer toutes les entrées d'un aéroport sans dessiner un polygone complexe.  
3. **Corridors (BUFFER) :** Une innovation par rapport aux concurrents. Il s'agit d'une zone tampon autour d'un itinéraire spécifique (ex: Autoroute A1). Cela permet de tarifer différemment un trajet qui emprunte une voie rapide payante versus une route secondaire.

#### **3.1.2. Architecture de la Base de Données (Schéma Relationnel Spatial)**

Le schéma de base de données doit supporter ces entités et leurs relations tarifaires.

SQL

\-- Définition des Zones Géographiques avec PostGIS  
CREATE TABLE PricingZone (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    name VARCHAR(255) NOT NULL,  
    type VARCHAR(50) CHECK (type IN ('POLYGON', 'RADIUS', 'CORRIDOR')),  
    geometry GEOMETRY(Geometry, 4326), \-- Stockage spatial (SRID 4326 pour GPS)  
    price\_multiplier DECIMAL(5, 4\) DEFAULT 1.0, \-- Coefficient (ex: 1.20 pour \+20%)  
    priority\_level INTEGER DEFAULT 0, \-- Pour gérer les zones imbriquées (ex: Paris dans Ile-de-France)  
    is\_central BOOLEAN DEFAULT FALSE  
);

\-- Matrice de Connexion Tarifaire (Graphe)  
CREATE TABLE ZoneRoute (  
    id UUID PRIMARY KEY,  
    origin\_zone\_id UUID REFERENCES PricingZone(id),  
    destination\_zone\_id UUID REFERENCES PricingZone(id),  
    is\_active BOOLEAN DEFAULT TRUE,  
    UNIQUE(origin\_zone\_id, destination\_zone\_id)  
);

\-- Grille Tarifaire par Véhicule  
CREATE TABLE RouteRate (  
    id UUID PRIMARY KEY,  
    route\_id UUID REFERENCES ZoneRoute(id),  
    vehicle\_class\_id UUID REFERENCES VehicleClass(id),  
    base\_price DECIMAL(10, 2), \-- Prix Forfaitaire  
    per\_km\_rate DECIMAL(10, 2), \-- Taux kilométrique (si applicable)  
    per\_minute\_rate DECIMAL(10, 2), \-- Taux horaire  
    currency VARCHAR(3) DEFAULT 'EUR'  
);

### **3.2. Algorithme de Segmentation de Route (Route Segmentation)**

C'est ici que l'architecture dépasse Moovs ou Limo Anywhere. Pour un trajet traversant plusieurs zones (ex: Versailles \-\> Disneyland via Paris), un prix kilométrique unique est injuste. Le système doit "découper" le trajet.

#### **3.2.1. Processus de Calcul Algorithmique**

L'algorithme de segmentation utilise les capacités de **PostGIS** et de l'API **Google Routes**.1

1. **Récupération de la Polyligne :** Le système interroge l'API Google Routes pour obtenir la géométrie précise du trajet (overview\_polyline).1  
2. **Projection Spatiale :** La polyligne est projetée sur la couche des PricingZones.  
3. **Intersection et Découpage (ST\_Intersection) :** L'algorithme utilise la fonction ST\_Intersection de PostGIS pour découper la ligne de trajet à chaque frontière de zone.  
   * *Résultat :* Une collection de LineStrings, chacune associée à une zone spécifique.  
4. **Calcul Pondéré :** Pour chaque segment, le système calcule la distance et la durée (pondérée par le trafic historique).  
5. Agrégation du Prix :

   $$Prix\_{Total} \= \\sum\_{i=1}^{n} (d\_i \\times TauxKM\_{zone\_i}) \+ (t\_i \\times TauxMin\_{zone\_i})$$

   Où $d\_i$ est la distance du segment $i$ et $t\_i$ sa durée.

#### **3.2.2. Gestion des Cas Limites (Edge Cases)**

* **Le Problème du "Ping-Pong" :** Si une route longe une frontière, le GPS peut osciller entre deux zones. L'algorithme utilise une fonction de lissage (snapping) ou applique la règle de la "Zone Prioritaire" (la plus chère ou la plus centrale) pour éviter de facturer des micro-segments.6  
* **Trajets Transversaux (Scenario 22\) :** Pour un trajet Versailles (Zone A) \-\> Disney (Zone C) passant par Paris (Zone B).  
  * L'algorithme détecte l'entrée et la sortie de la Zone B.  
  * Il peut appliquer une logique de "Forfait Cumulé" : $Forfait(A \\to B) \+ Forfait(B \\to C) \- Reduction\_{Transit}$. Cette approche est souvent plus rentable et lisible pour le client qu'un pur calcul kilométrique.1

### **3.3. Logique d'Intersection et Hiérarchie des Règles**

Le moteur utilise un arbre de décision strict pour déterminer quelle méthode de calcul appliquer.1

1. **Priorité 1 (Forfait Absolu) :** Si une ZoneRoute explicite existe entre la zone de départ et d'arrivée (ex: CDG \-\> Paris Centre), ce prix écrase tout calcul. C'est la garantie de respecter les prix négociés.  
2. **Priorité 2 (Trajet Intra-Zone) :** Si Départ et Arrivée sont dans la même zone (et que ce n'est pas la zone centrale), appliquer le priceMultiplier de la zone au tarif kilométrique standard.  
   * *Exemple :* Intra-Versailles. Tarif de base x 1.2 (car zone à forte contrainte de trafic/parking).1  
3. **Priorité 3 (Intersection Complexe) :** Si le trajet traverse plusieurs zones sans règle explicite, utiliser l'algorithme de segmentation décrit en 3.2.

## ---

**4\. Le Moteur de Multiplicateurs Dynamiques et Yield Management**

La tarification statique ne suffit plus. Le système doit intégrer une couche dynamique capable d'ajuster les prix en fonction de la rareté de l'offre et de la complexité opérationnelle.

### **4.1. Architecture des Multiplicateurs (Le "Surge" B2B)**

Contrairement au "Surge Pricing" d'Uber (souvent perçu comme punitif), notre système utilise des **Multiplicateurs Contextuels** justifiables auprès d'une clientèle B2B.1

* **Multiplicateur Géographique ($M\_{geo}$) :** Défini dans PricingZone. Exemple : Zone Montagne \= 1.5 (usure véhicule, difficulté).  
* **Multiplicateur Temporel ($M\_{time}$) :** Basé sur des créneaux horaires.  
  * *Nuit :* 21h00 \- 06h00 \= 1.2.  
  * *Logique Hybride :* Pour un trajet chevauchant (19h-00h), l'algorithme calcule une moyenne pondérée ou applique une règle d'"Improvisation" paramétrée (ex: arrondi à la tranche supérieure).1  
* **Multiplicateur de Complexité Client ($M\_{client}$) :** Une innovation majeure issue de l'analyse des opérations réelles.  
  * Le CRM attribue un "Score de Difficulté" aux clients (basé sur l'historique : retards, exigences, annulations).  
  * *Formule :* $Prix\_{Final} \= Prix\_{Base} \\times (1 \+ Score\_{Difficulté})$. Un client "toxique" peut se voir appliquer automatiquement une majoration de 70% pour compenser le "coût psychologique" pour le chauffeur.1

### **4.2. Yield Management Événementiel**

Le système intègre un **Calendrier de Tension**.

* **Dates Fixes :** 24, 25, 31 Décembre. Le système bascule automatiquement sur une grille "Haute Saison".1  
* **Événements Dynamiques :** L'agent "Pricing Architect" (IA) scanne les API d'événements (concerts, salons comme Le Bourget). S'il détecte une saturation potentielle (Demande \> Offre prévue), il active des règles de restriction :  
  * *Règle :* Suppression des transferts courts.  
  * *Règle :* Minimum de facturation passant de 4h à 12h (Mise à disposition obligatoire).1

### **4.3. Intégration des Coûts Réels (TCO) dans l'Algorithme**

Le prix ne doit jamais être inférieur au coût de revient. Le moteur intègre une vérification de marge en temps réel.7

$$TCO\_{Trajet} \= (Dist \\times C\_{km}) \+ (Durée \\times C\_{heure}) \+ Péages \+ (Dist\_{Approche} \\times C\_{km})$$

* **Logic de Garage Virtuel :** Le système calcule la distance d'approche (Deadhead) depuis le Home\_Base\_Location du chauffeur le plus proche.3  
* **Arbitrage :** Si $Prix\_{Vente} \< TCO\_{Trajet} \+ Marge\_{Min}$, le système :  
  1. Refuse automatiquement la course (pour les particuliers).  
  2. Ou propose un prix majoré "Opportuniste".  
  3. Ou (pour les comptes Agence obligatoires) alerte le dispatcher de la perte ("Course à perte contractuelle").1

## ---

**5\. Système de Forfaits Agences et "Excursion Packs"**

Le modèle économique des VTC repose sur des partenariats B2B (Hôtels, Agences de voyage) qui exigent une prévisibilité tarifaire totale, en contradiction avec la logique horokilométrique.

### **5.1. Modélisation des Grilles "Engagement"**

Le système permet de créer des "Shadow Grids" (Grilles Parallèles) pour chaque partenaire.

* **Engagement Contractuel :** Ces grilles ont priorité absolue sur le moteur dynamique. Si le contrat stipule "Paris \-\> CDG \= 100€", ce prix est appliqué même si le trafic triple la durée du trajet.1  
* **Forfaits "Airport Fixed" :** Configuration de règles spécifiques : "Toute course Van vers CDG \= 120€, quelle que soit l'heure". Le système doit gérer cette exception même si le calcul de nuit donnerait 150€.1

### **5.2. Architecture des "Excursion Packs"**

Pour le tourisme (ex: Normadie, Châteaux de la Loire), le système ne vend pas des trajets, mais des **Produits Packagés** avec des contraintes temporelles strictes.1  
**Structure de Données d'un Pack :**

JSON

{  
  "pack\_id": "NORMANDY\_DDAY",  
  "name": "Plages du Débarquement",  
  "type": "FIXED\_DURATION\_MAD",  
  "duration\_hours": 12,  
  "min\_price": 1200.00,  
  "included\_km": 600,  
  "zones\_allowed": \["Paris", "Normandie"\],  
  "driver\_per\_diem": {  
    "meal": 60,  
    "hotel": 0 // Retour journée  
  },  
  "route\_constraints": {  
    "must\_start\_at": "07:00",  
    "must\_end\_before": "22:00"  
  }  
}

* **Logique de Rentabilité :** Ces packs sont conçus pour garantir la marge sur des trajets longs. L'algorithme vérifie que le prix couvre non seulement le trajet, mais aussi le retour à vide (si le client reste sur place) ou l'attente.1  
* **Gestion des Frais Annexes :** Pour les packs multi-jours (ex: Suisse), le système ajoute automatiquement les *Per Diems* (découcher chauffeur) calculés selon la zone (ex: 350€/jour en Suisse vs 160€ en Normandie).1

## ---

**6\. L'Architecture Agent-Native : L'Intelligence au Commandement**

Au-dessus de la base de données et des algorithmes, une couche d'intelligence artificielle ("La Squad") orchestre les décisions. C'est la rupture fondamentale avec les systèmes passifs comme Limo Anywhere.

### **6.1. Rôles des Agents dans le Pricing**

L'architecture déploie des agents spécialisés connectés via le protocole MCP (Model Context Protocol).1

* **Agent Pricing Architect :**  
  * *Mission :* Surveiller la rentabilité globale.  
  * *Action :* Il analyse les écarts entre les coûts réels (remontés via API Motive/Samsara) et les prix facturés. Si un véhicule consomme 20% de plus sur les trajets "Versailles", il propose automatiquement une mise à jour du RouteRate pour cette zone.7  
* **Agent Matchmaker (Dispatch) :**  
  * *Mission :* Optimiser l'allocation des ressources.  
  * *Action :* Il utilise des heuristiques prédictives pour identifier des "fenêtres d'opportunité". Si un véhicule est en "Mise à Disposition" au Stade de France pour 4 heures, l'agent peut proposer d'insérer une course courte à proximité pour augmenter le rendement, sans mettre en péril la réservation principale.8  
* **Agent Sales :**  
  * *Mission :* Transformer les demandes non structurées en devis structurés.  
  * *Action :* Il parse les emails complexes ("Besoin de 3 vans pour un mariage...") et interroge le moteur de forfaits pour construire une offre "à tiroirs" (Options Champagne, Heures supp).1

### **6.2. Le "Garage Virtuel" et l'Optimisation "Wake-Up"**

L'Agent Dispatcher gère une logique de **Dépôt Virtuel Dynamique**.

* *Concept :* Chaque domicile de chauffeur est un dépôt potentiel.  
* *Stratégie "Wake-Up Dispatch" :* L'algorithme cherche à attribuer la première course de la journée à un chauffeur dont le domicile est proche du point de départ et dont la destination rapproche le véhicule d'une zone à forte demande (ex: Aéroport). Cela transforme les kilomètres d'approche (perte pure) en kilomètres productifs.3

## ---

**7\. Spécifications Techniques et Implémentation**

Pour garantir la performance et la scalabilité, l'implémentation doit suivre des standards rigoureux.

### **7.1. Stack Technologique**

* **Base de Données Spatiale :** PostgreSQL 16+ avec PostGIS 3.4. Indispensable pour les fonctions ST\_Intersection, ST\_Area et ST\_CoveredBy nécessaires à la segmentation.  
* **Backend API :** Node.js (NestJS) ou Python (FastAPI). Python est recommandé pour les bibliothèques de calcul scientifique (GeoPandas, Shapely) utilisées dans l'optimisation de route.9  
* **Moteur de Routing :** Google Routes API v2 (pour la précision trafic) couplé à OSRM ou GraphHopper (pour les calculs matriciels de masse à moindre coût).1  
* **Frontend Cartographique :** React avec react-google-maps et **Deck.gl** pour la visualisation des vecteurs de trafic et l'édition des polygones de zones.8

### **7.2. Intégration et API**

Le système doit exposer une API REST/GraphQL robuste pour s'interfacer avec les écosystèmes existants.

* **Endpoint de Devis (Quote) :**  
  * POST /api/v1/quotes/calculate  
  * *Input :* { origin, destination, vehicle\_class, time, passenger\_count }  
  * *Logic :* Déclenche l'arbre de décision (Zones \-\> Segmentation \-\> Multiplicateurs).  
  * *Output :* { price, currency, breakdown: \[ { segment: "Versailles-\>Paris", cost: 110 },... \], applied\_rules: \["Nuit", "VIP"\] }.  
* **Webhooks :** Pour notifier les agents d'événements externes (ex: retard vol, fin de concert) pouvant déclencher un ajustement de prix ou une surcharge.

### **7.3. Gestion de la Charge et Latence**

Le calcul géospatiale est coûteux. Pour garantir une réponse \< 200ms :

* **Caching Géospatiale :** Utilisation de Redis pour stocker les résultats des requêtes isPointInPolygon fréquentes (ex: les grands hôtels parisiens sont mappés à leur zone en cache).  
* **Pré-calcul des Matrices :** Les temps de trajet entre les centroïdes des zones principales sont pré-calculés et mis à jour toutes les 15 minutes, évitant des appels API Google coûteux pour chaque devis estimatif.

## ---

**8\. Conclusion et Perspectives Stratégiques**

La conception de ce moteur de pricing ne se limite pas à l'écriture de code ; elle représente une **prise de pouvoir stratégique** sur la chaîne de valeur du transport. En remplaçant l'intuition humaine et les grilles statiques par des algorithmes géospatiaux et des agents cognitifs, l'opérateur VTC se dote d'une capacité d'adaptation sans précédent.  
Ce système permet de :

1. **Sécuriser la Marge :** En calculant le coût réel (TCO) de chaque kilomètre, y compris les approches et les temps d'attente, avant même d'accepter une course.  
2. **Fidéliser les Partenaires :** En offrant des forfaits sur-mesure et une transparence totale (Breakdown des coûts) impossible à obtenir avec des plateformes grand public.  
3. **Absorber la Complexité :** En automatisant la gestion des règles métier les plus tordues (TVA sur marge, règles RSE, surcharges Versailles), libérant les opérateurs humains pour la gestion de la relation client à haute valeur ajoutée.

À l'heure où l'IA générative et l'automatisation redéfinissent les services, ce moteur de pricing positionne l'entreprise non plus comme un simple prestataire logistique, mais comme un architecte de la mobilité premium, prêt pour les défis de la décennie 2026-2035.  
---

**Note sur les Sources :** Les informations techniques et stratégiques de ce rapport sont issues de l'analyse des documents internes Neural-Fleet, des audits concurrentiels (Limo Anywhere, Way-Plan, Moovs) et des recherches sur les algorithmes géospatiaux et l'optimisation de route.1

#### **Sources des citations**

1. VTC Software: Global Comparison and Strategic Selection  
2. How-to Setup Fixed Rates & Zones \- Limo Anywhere Knowledge Center, consulté le décembre 28, 2025, [https://kb.limoanywhere.com/docs/how-to-setup-fixed-rates-zones/](https://kb.limoanywhere.com/docs/how-to-setup-fixed-rates-zones/)  
3. Structure Fiche Driver VTC Révolutionnaire  
4. Zone Pricing Deep Dive | Moovs Help Center, consulté le décembre 28, 2025, [http://support.moovsapp.com/en/articles/6871879-zone-pricing-deep-dive](http://support.moovsapp.com/en/articles/6871879-zone-pricing-deep-dive)  
5. ST\_Split \- PostGIS, consulté le décembre 28, 2025, [https://postgis.net/docs/ST\_Split.html](https://postgis.net/docs/ST_Split.html)  
6. Splitting polygon by line using intersection returns original polygon in Shapely, consulté le décembre 28, 2025, [https://stackoverflow.com/questions/76066597/splitting-polygon-by-line-using-intersection-returns-original-polygon-in-shapely](https://stackoverflow.com/questions/76066597/splitting-polygon-by-line-using-intersection-returns-original-polygon-in-shapely)  
7. Architecture VTC Agent-Native V4 : Context Engine & Privacy Layer  
8. Conception Système Dispatch IA Révolutionnaire  
9. An Optimal Algorithm for Euclidean Shortest Paths in the Plane \- SIAM.org, consulté le décembre 28, 2025, [https://epubs.siam.org/doi/10.1137/S0097539795289604](https://epubs.siam.org/doi/10.1137/S0097539795289604)  
10. Architecture VTC : IA MODULE DE GESTION DE FLOTTE AGENT-NATIVE