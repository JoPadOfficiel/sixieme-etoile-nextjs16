# **Architecture Cognitive Neural-Fleet V4 : Le Moteur de Rentabilité Véhicule & Pricing Géospatiale Globalisé**

## **1\. Synthèse Exécutive : La Rupture Ontologique de l'Économie de la Mobilité**

L'industrie du transport de personnes à la demande, englobant le VTC (Voiture de Transport avec Chauffeur), la Grande Remise et la logistique fine du dernier kilomètre, se trouve aujourd'hui confrontée à une impasse structurelle majeure. Historiquement, ce secteur a opéré sur la base de modèles déterministes et statiques, cristallisés dans des systèmes de gestion hérités ("Legacy Systems") tels que Limo Anywhere ou Way-Plan.1 Ces plateformes, bien qu'ayant digitalisé les processus papier des années 2000, reposent sur une architecture de base de données relationnelle passive (CRUD \- Create, Read, Update, Delete) qui échoue fondamentalement à capturer la complexité stochastique, la volatilité temporelle et la granularité géographique des opérations urbaines modernes.2  
Le paradigme actuel force les opérateurs humains à agir comme des "routeurs biologiques", comblant manuellement le fossé entre une intention stratégique (par exemple, "maximiser la rentabilité de la flotte") et une réalité opérationnelle fragmentée. De plus, les modèles de tarification linéaires, basés sur une équation simpliste $Prix \= Distance \\times Taux \+ Temps$, sont devenus obsolètes face à l'hétérogénéité des territoires urbains et à la fluctuation violente des coûts opérationnels réels (TCO).3  
Ce rapport de recherche présente l'architecture de référence pour **Neural-Fleet V4**, un "Système d'Exploitation Cognitif" conçu pour l'horizon 2026\. Cette architecture ne propose pas une simple itération incrémentale des outils existants, mais une refonte complète des fondations mathématiques et logicielles de la gestion de flotte. Au cœur de cette proposition se trouve le concept de **"Moteur de Rentabilité & Pricing Géospatiale"**, une entité algorithmique autonome capable de résoudre en temps réel un problème d'optimisation multi-objectifs : équilibrer la compétitivité commerciale, la couverture des coûts fixes et variables (TCO dynamique), et l'optimisation logistique distribuée via des "Garages Virtuels Libres".  
L'architecture proposée repose sur trois piliers fondamentaux qui répondent aux exigences spécifiques de la demande :

1. **Une Topologie Géospatiale Vectorielle :** Le remplacement des codes postaux statiques par un système de zones polygonales concentriques et de graphes pondérés, permettant une segmentation fine de l'espace économique (ZFE, zones de friction comme Versailles, corridors autoroutiers).1  
2. **Une Intelligence Économique Dynamique (TCO) :** L'intégration d'un calcul de coût de revient en temps réel, alimenté par les données télémétriques et comptables (fichiers Algo cout vehicule.csv), permettant de transformer chaque véhicule en un centre de profit autonome conscient de son amortissement, de son usure et de sa consommation énergétique.4  
3. **La Logique de "Garages Virtuels Libres" :** Une réinvention de la logistique de flotte qui utilise la théorie des graphes pour transformer les domiciles dispersés des chauffeurs en un réseau de micro-dépôts dynamiques, minimisant les kilomètres d'approche (Deadhead) et maximisant le taux d'engagement des actifs.3

Orchestré par une "Squad" d'Agents IA spécialisés via le protocole MCP (Model Context Protocol), ce système vise à automatiser la charge cognitive du dispatch et du pricing, faisant passer l'opérateur d'un rôle de saisie à un rôle de supervision stratégique.

## ---

**2\. Architecture du Moteur Géospatiale et Théorie des Graphes**

La première exigence critique de l'architecture Neural-Fleet V4 est de s'affranchir de la rigidité des matrices tarifaires point-à-point qui caractérisent les systèmes hérités. L'analyse des documents techniques révèle que la définition manuelle de milliers de paires de zones (Zone A vers Zone B) conduit à une explosion combinatoire ingérable et à une incapacité à réagir aux changements topologiques urbains.1 La solution réside dans l'adoption d'une modélisation spatiale vectorielle couplée à la théorie des graphes.

### **2.1. Topologie Vectorielle et Zones Concentriques ($\\mathcal{Z}$)**

Le système partitionne l'espace de service $\\mathcal{S}$ non pas en une grille arbitraire, mais en un ensemble fini de polygones sémantiques $\\mathcal{Z} \= \\{Z\_0, Z\_1,..., Z\_n\\}$, stockés sous forme d'objets GeoJSON dans une base de données spatiale (PostgreSQL avec l'extension PostGIS). Cette approche permet une définition précise des territoires économiques, respectant les frontières administratives, physiques et réglementaires.1

#### **2.1.1. Typologie des Objets Géospatiaux et Logique Concentrique**

L'architecture distingue trois classes d'objets géométriques, hiérarchisés selon une logique de zones concentriques ("Modèle en Oignon") pour gérer la densité urbaine :

* **Polygones de Zone ($P\_{zone}$) :** Ils définissent les aires géographiques principales. Le modèle concentrique est crucial ici :  
  * **$Z\_0$ (Cœur Dense / Hyper-Centre) :** Paris Intra-muros. Dans cette zone, la notion de distance kilométrique est souvent abolie au profit d'une tarification au temps (Mise à Disposition \- MAD) ou forfaitaire, car la vitesse commerciale y est trop faible et imprévisible. Les transcriptions confirment que des zones limitrophes comme Aubervilliers sont topologiquement assimilées à ce cœur ("Portes de Paris").4  
  * **$Z\_{1..n}$ (Couronnes Périphériques) :** Les zones concentriques s'étendent vers la banlieue (Petite Couronne, Grande Couronne). Le système gère l'imbrication via un attribut priority\_level. Si un point GPS appartient à la fois à "Île-de-France" (Niveau 1\) et "La Défense" (Niveau 5), c'est la règle tarifaire du niveau le plus élevé qui prime.1  
* **Rayons d'Intérêt ($R\_{poi}$) :** Des zones circulaires définies par un centroïde et un rayon (ex: Aéroports CDG, Orly). Ces zones agissent comme des "attracteurs" dans le graphe, imposant souvent des tarifs forfaitaires contractuels (ex: Forfait Agence 120€ pour CDG) qui écrasent la logique kilométrique standard.4  
* **Corridors Vectoriels ($C\_{buffer}$) :** Une innovation majeure par rapport aux systèmes existants. Il s'agit de zones tampons générées autour de linéaments spécifiques (autoroutes A1, A13). Cela permet au moteur de tarification de distinguer un trajet rapide sur autoroute (soumis à péage mais économe en temps et en usure freinage) d'un trajet parallèle sur route secondaire. Le corridor est défini par une opération ST\_Buffer autour de la polyligne de l'axe routier.1

### **2.2. Modélisation par Graphes Pondérés**

Au-dessus de cette couche topologique, la connectivité du réseau est modélisée par un graphe dirigé pondéré $G \= (V, E)$.

* **Nœuds ($V$) :** Représentent les centroïdes des zones $Z$, les Points d'Intérêt (POI), et, de manière critique pour notre modèle de "Garages Virtuels", les domiciles des chauffeurs ($G\_v$).  
* **Arêtes ($E$) :** Représentent les routes viables connectant ces nœuds.  
* **Poids ($W$) :** Contrairement à un GPS classique qui minimise le temps ($t$), le poids de chaque arête dans Neural-Fleet est une fonction de coût composite $f(t, d, c, f)$ intégrant le temps, la distance, le coût direct (péages), et le **coefficient de friction** ($f$).

La base de données matérialise ce graphe via une table relationnelle ZoneRoute agissant comme une matrice d'adjacence dynamique :

SQL

CREATE TABLE ZoneRoute (  
    origin\_zone\_id UUID REFERENCES PricingZone(id),  
    destination\_zone\_id UUID REFERENCES PricingZone(id),  
    base\_price DECIMAL, \-- Forfait contractuel (Hard Constraint)  
    friction\_factor DECIMAL DEFAULT 1.0, \-- Coefficient de difficulté  
    is\_active BOOLEAN DEFAULT TRUE  
);

Ce graphe permet de gérer les exceptions tarifaires contractuelles. Si une arête existe explicitement entre "Paris" et "CDG" avec un prix fixe, l'algorithme de graphe la sélectionne prioritairement (Priorité 1), court-circuitant le calcul kilométrique.1

### **2.3. Algorithme de Segmentation de Route (Route Segmentation)**

La précision du pricing repose sur la capacité à déconstruire un itinéraire traversant des zones hétérogènes. Un trajet de Versailles ($Z\_{friction}$) à Disneyland ($Z\_{loisir}$) via Paris ($Z\_{dense}$) ne peut être tarifé par un taux unique. L'algorithme de segmentation procède comme suit 1 :

1. **Récupération de la Polyligne :** Interrogation de l'API Google Routes (v2) pour obtenir la géométrie exacte du trajet (overview\_polyline).  
2. Projection Spatiale et Intersection : Utilisation de la fonction ST\_Intersection de PostGIS pour "découper" la polyligne du trajet à chaque franchissement de frontière d'un polygone $\\mathcal{Z}$.

   $$Itinéraire\_{total} \= \\bigcup\_{i=1}^{n} S\_i$$

   Où chaque segment $S\_i$ est géométriquement contenu dans une zone unique $Z\_k$.  
3. Calcul Pondéré Agrégé : Le prix total est la somme des coûts locaux de chaque segment, appliqués aux règles de la zone traversée :

   $$Prix\_{Total} \= \\sum\_{i=1}^{n} (d(S\_i) \\times TauxKM\_{Z\_k}) \+ (t(S\_i) \\times TauxMin\_{Z\_k})$$

   Cette méthode assure que les kilomètres parcourus dans les bouchons parisiens sont facturés au tarif "Dense" (temps dominant), tandis que les kilomètres sur l'A4 sont facturés au tarif "Autoroute" (distance dominante).

### **2.4. La Gestion des "Zones de Friction" : L'Anomalie de Versailles**

L'analyse des transcriptions met en évidence la nécessité d'intégrer des "Coûts de Friction" qui ne sont pas linéaires à la distance. Versailles est l'exemple paradigmatique : bien que proche géographiquement, elle impose une surcharge opérationnelle massive due au stationnement obligatoire et à la difficulté d'accès.4  
Dans notre modèle de graphe, le nœud "Versailles" se voit attribuer un attribut de **Pénalité de Nœud**. Tout trajet ayant pour origine ou destination ce nœud subit une majoration fixe ($C\_{friction} \\approx 60€$), décomposée en :

* Coût Stationnaire ($C\_{park} \\approx 40€$) : Frais de parking incompressibles.  
* Coût Cinétique ($C\_{access} \\approx 20€$) : Complexité d'entrée/sortie de la zone urbaine.3

Cette logique permet de découpler la tarification de la distance pure, reflétant la réalité économique du terrain telle que décrite par les opérateurs experts.4

## ---

**3\. Le Moteur Économique : TCO Dynamique et Jumeau Numérique**

Contrairement aux plateformes grand public qui fixent les prix uniquement selon l'offre et la demande (Surge Pricing), l'architecture Neural-Fleet V4 ancre la tarification dans la réalité comptable de l'actif véhicule. Le système garantit que chaque devis émis couvre le **Coût Total de Possession (TCO)** spécifique du véhicule assigné, plus une marge cible.

### **3.1. Le Concept de Jumeau Numérique (Digital Twin)**

Chaque véhicule physique de la flotte possède un double numérique vivant dans le système. Ce **Digital Twin** n'est pas une simple fiche statique, mais un objet dynamique agrégeant des données de trois sources temporelles 2 :

1. **Passé (Historique & Acquisition) :** Données d'achat, financement, historique de maintenance.  
2. **Présent (Télémétrie) :** Position GPS, kilométrage ODO, niveau de carburant/SoC, codes défauts (DTC) via API Motive ou Samsara.  
3. **Futur (Prédictif) :** Courbes de dépréciation, maintenance prévisionnelle.

Le schéma de données du Jumeau Numérique intègre les spécificités techniques critiques pour le calcul de rentabilité, telles que la motorisation (Thermique vs Électrique) et la catégorie fiscale.2

### **3.2. Algorithme de Calcul du PRK Dynamique**

Le système calcule en permanence le **Prix de Revient Kilométrique (PRK)** instantané pour chaque véhicule. Ce calcul est fondamental pour déterminer le seuil de rentabilité ("Break-even point") de chaque course. L'analyse des données du fichier Algo cout vehicule.csv et des vidéos de référence permet de structurer l'algorithme de coût comme suit 4 :

$$PRK\_{dyn} \= \\frac{C\_{fixe\\\_annuel}}{KM\_{annuel\\\_est}} \+ C\_{variable\\\_km}$$

#### **3.2.1. Modélisation des Coûts Fixes ($C\_{fixe}$)**

Ces coûts sont incompressibles et doivent être amortis sur le volume kilométrique.

* **Financement (Achat/Leasing) :** Le système distingue le mode d'acquisition.  
  * *Leasing :* Le loyer mensuel est une charge directe.  
  * *Achat :* L'amortissement financier est calculé. Pour un véhicule de luxe (ex: Mercedes Classe S à 120k€), la **dépréciation** est "violente", perdant jusqu'à 50% de valeur après 100 000 km.5 Le système utilise une courbe de dépréciation non-linéaire : $Valeur(t) \= P\_{achat} \\times e^{-\\lambda t}$.  
* **Assurance & Administratif :** Coûts fixes annuels (environ 0.03€ à 0.04€/km selon le CSV 4).

#### **3.2.2. Modélisation des Coûts Variables ($C\_{variable}$)**

Ces coûts sont directement corrélés à l'activité. L'analyse du fichier Algo cout vehicule.csv fournit des métriques précises par type de véhicule 4 :

* **Maintenance & Entretien ($C\_{maint}$) :** Ce poste varie considérablement selon la catégorie.  
  * *Berline Standard :* \~0.137 €/km.  
  * *Van (Mercedes Classe V) :* \~0.171 €/km.	  
  * *VIP (Limousine) :* \~0.342 €/km. Ce doublement du coût s'explique par la complexité technique (suspensions pneumatiques, pièces onéreuses) mentionnée dans les analyses.4  
* **Énergie ($C\_{energy}$) :** Le moteur distingue les vecteurs énergétiques.  
  * *Diesel (Thermique) :* Consommation réelle (l/100km) $\\times$ Prix moyen pompe. Pour un Van, cela représente un budget de 9 000€ à 10 000€ pour 50 000 km/an.5  
  * *Électrique (BEV) :* Consommation (kWh/100km) $\\times$ Coût kWh. Pour une Mercedes EQE, ce coût chute drastiquement à \~800€/an, modifiant radicalement le PRK et la compétitivité sur les trajets longs.5  
* **Pneumatiques :** Inclus dans le calcul variable, avec une usure accélérée pour les véhicules électriques lourds.

### **3.3. Calcul de Rentabilité en Temps Réel**

Avant de valider une course, l'**Agent Pricing Analyst** exécute une simulation de marge nette. Cette simulation est critique pour les clients privés où la tarification est flexible.4

$$Marge \= Prix\_{Vente} \- (Dist\_{Total} \\times PRK) \- (Temps\_{Total} \\times C\_{Horaire\\\_Chauffeur}) \- Péages$$

* Distance Totale ($Dist\_{Total}$) : L'innovation majeure ici est l'intégration systématique de la Boucle Logistique Complète. Comme souligné par les experts du secteur, le calcul ne doit pas se limiter à la course client, mais inclure : Approche (Domicile $\\to$ Client) \+ Course \+ Retour (Client $\\to$ Domicile/Base).7  
  Pour une course de 100 km, le système calcule automatiquement un coût sur 200 km réels.4  
* **Seuil de Viabilité :** Si la marge projetée est inférieure à 20%, l'agent déclenche une alerte ou propose un prix "Opportuniste" majoré pour compenser le risque.3

## ---

**4\. Logique des "Garages Virtuels Libres" : Optimisation Distribuée**

Le modèle traditionnel "Hub and Spoke" (un dépôt central unique) est économiquement inefficace pour une flotte dispersée, car il génère des kilomètres d'approche massifs et non facturés ("Deadhead"). Neural-Fleet V4 introduit le concept de **"Garages Virtuels Libres"**, utilisant la théorie des graphes pour décentraliser la logistique.

### **4.1. Le Graphe de Disponibilité Distribuée**

Dans le graphe opérationnel $G$, chaque domicile de chauffeur est modélisé comme un nœud actif, un **Garage Virtuel ($G\_v$)**. Au lieu de considérer le véhicule comme "hors service" lorsqu'il est au domicile du chauffeur, le système le considère comme "stationné dans un dépôt satellite".3  
L'algorithme de **Home Base Optimization (HBO)** scanne les réservations (demande $D\_i$) et cherche à minimiser la distance de l'arête $(G\_{v\\\_k}, D\_{pickup\\\_i})$.

* **Stratégie "Wake-Up Dispatch" :** L'algorithme attribue préférentiellement la première course de la journée à un chauffeur dont le Garage Virtuel est proche du point de prise en charge. Cela transforme le trajet "Domicile-Travail" (coût pur) en un trajet d'approche court et productif.3  
* **Exemple Opérationnel :** Si un chauffeur habite près d'Orly ($G\_{v\\\_Orly}$) et qu'une course part de l'aéroport à 6h00, l'assignation est automatique, évitant d'envoyer un véhicule depuis le centre de Paris ou un dépôt lointain.

### **4.2. Shadow Pricing et Coûts d'Approche**

Le système calcule deux réalités économiques parallèles pour gérer ces approches 3 :

1. **Coût d'Approche Réel ($C\_{app\\\_real}$) :** Le TCO véritable du trajet $G\_v \\to Client$. C'est une donnée interne de gestion.  
2. **Coût d'Approche Commercial ($C\_{app\\\_comm}$) :** Le montant facturé au client.

Dans une logique de "Garages Virtuels Libres", si le $G\_v$ est proche du client, le système peut forcer $C\_{app\\\_comm} \\to 0$, rendant l'offre ultra-compétitive face à Uber, tout en maintenant une marge réelle élevée grâce à la proximité physique du chauffeur. À l'inverse, si aucun $G\_v$ n'est à portée pour un transfert à faible valeur (ex: transfert Paris intra-muros à 80€), le système détecte que le coût d'approche depuis la banlieue détruirait la marge et l'**Agent Pricing Analyst** recommande le refus de la course pour les clients non-contractuels.4

### **4.3. Gestion de la Flotte Hybride ("Shadow Fleet")**

Le concept de Garage Virtuel s'étend aux partenaires externes (sous-traitants). Ces ressources sont intégrées dans le graphe comme des nœuds temporaires ("Ghost Icons" sur la carte) via des protocoles d'ingestion comme GTFS-Realtime ou GNET.6 L'algorithme de dispatch traite ces partenaires comme une extension élastique de la flotte interne, permettant d'absorber les pics de demande (comme le Salon du Bourget) sans dégrader la qualité de service.6

## ---

**5\. L'Écosystème Agent-Natif : Orchestration IA et MCP**

La complexité combinatoire des règles de pricing, des contraintes géospatiales et des calculs de TCO dépasse les capacités de gestion manuelle en temps réel. L'architecture Neural-Fleet V4 délègue cette complexité à une "Squad" d'Agents IA autonomes, orchestrés par le framework **LangGraph** et connectés au monde réel via le **Model Context Protocol (MCP)**.2

### **5.1. Rôles et Responsabilités de la Squad**

* **Agent Dispatcher (Le "Matchmaker") :** Il résout le Problème de Tournée de Véhicule (VRP) en temps réel. Il utilise des heuristiques prédictives pour identifier des "fenêtres d'opportunité". Par exemple, si un véhicule est en "Mise à Disposition" (Disposal) au Stade de France pour 4 heures, l'agent peut proposer d'insérer une course courte à proximité pour augmenter le rendement du véhicule, exploitant le temps d'attente comme une ressource active.6  
* **Agent Pricing Architect :** Il pilote la matrice de tarification dynamique. Il applique les règles de Yield Management, telles que les majorations de nuit (x1.25 entre 21h et 06h) ou la "Taxe de Patience" pour les clients difficiles ($Score\_{difficulté} \> 5 \\Rightarrow Prix \\times 1.5$).3 Il gère aussi l'interpolation des prix pour les durées non-standard (ex: moyenne entre le forfait 6h et 8h pour une demande de 7h).4  
* **Agent Fleet Manager (Le Gardien) :** Connecté aux API de télémétrie (Motive/Samsara) via MCP, il surveille la santé des actifs. Il détecte les anomalies de consommation (écart entre consommation théorique et réelle) et planifie la maintenance prédictive pour minimiser l'impact sur le TCO.2  
* **Agent Compliance (L'Auditeur) :** Il agit comme une "Cage de Fer" réglementaire. Il vérifie *a priori* la conformité de chaque mission avec la Loi LOM et la RSE (Réglementation Sociale Européenne). Pour les véhicules lourds (autocars, vans \> 9 places), il surveille les temps de conduite (max 4h30 en continu) et impose l'insertion de nœuds de "Pause" ou de "Nuit" dans l'itinéraire si nécessaire, recalculant le prix en conséquence (frais de découcher chauffeur).6

### **5.2. Intégration Technique via MCP**

Le protocole MCP agit comme l'interface standardisée ("USB-C de l'IA") permettant aux agents de dialoguer avec les systèmes externes sans code spécifique complexe.8

* **Serveur MCP Flotte :** Expose les outils get\_vehicle\_telemetry et locate\_vehicle pour l'Agent Fleet Manager.  
* **Serveur MCP Finance :** Expose les outils calculate\_tco et create\_invoice pour l'Agent Accountant, permettant l'ingestion automatique des factures garages par OCR.  
* **Serveur MCP SIV :** Permet à l'Agent Configurator de récupérer instantanément les données techniques d'un véhicule (Crit'Air, motorisation) à partir de sa plaque d'immatriculation, alimentant le Digital Twin sans saisie manuelle.2

## ---

**6\. Mise en Œuvre Opérationnelle et Expérience Utilisateur**

L'interface utilisateur de Neural-Fleet V4 abandonne les tableaux de bord statiques pour une **Expérience Tri-Hybride** (Generative UI) qui s'adapte au contexte de l'opérateur.9

1. **Widgets Génératifs (Tactique) :** Pour une action rapide (ex: "Où est Karim?"), l'IA génère un widget éphémère dans le chat avec la carte en temps réel et des boutons d'action.  
2. **Layout Adaptatif (Supervision) :** L'écran se reconfigure dynamiquement (Split Screen). Pour une analyse de rentabilité, la zone principale affiche des graphiques financiers interactifs générés à la volée.  
3. **Canvas Persistant (Stratégique) :** Pour la planification complexe (Roadshows), l'IA et l'humain collaborent sur un document partagé ("Stateful"), où les modifications manuelles de l'humain sont immédiatement comprises et intégrées par l'IA pour recalculer les coûts.9

### **6.1. Scénarios Critiques de Tarification**

L'architecture gère nativement les cas limites identifiés dans les opérations de VTC de luxe :

* **Forfaits "Classiques" :** Les trajets touristiques (Normandie, Châteaux de la Loire) sont encodés comme des vecteurs temporels fixes de 12h. Le Mont-Saint-Michel est un vecteur de 14h en raison de la distance extrême. Ces forfaits incluent les frais de repas chauffeur (60€) et garantissent la marge sur des journées longues.4  
* **Facturation Hybride Jour/Nuit :** Pour une course chevauchant les horaires (ex: 19h-00h), l'Agent Pricing calcule une moyenne pondérée entre le taux jour et le taux nuit, automatisant une improvisation qui était auparavant manuelle.4  
* **Gestion des Groupes (Van vs Berline) :** Le système intègre des règles de "Statut Social". Si 3 passagers VIP sont détectés, l'Agent propose automatiquement un Van (plus cher) plutôt qu'une Berline, car la clientèle de luxe refuse souvent de s'asseoir à l'avant à côté du chauffeur ("dégradation sociale").4

## ---

**7\. Conclusion et Perspectives**

L'architecture Neural-Fleet V4, par sa conception "Agent-Native" et son intégration profonde de la géospatiale et du TCO dynamique, propose une réponse définitive aux limitations des systèmes hérités. En remplaçant l'intuition humaine par des algorithmes de graphes pondérés et en automatisant la conformité réglementaire, elle transforme la gestion de flotte d'un centre de coûts administratifs en un instrument de haute précision financière.  
La capacité du système à modéliser des "Garages Virtuels Libres" permet de débloquer des marges cachées en monétisant les trajets d'approche, tandis que le calcul précis du PRK protège l'entreprise contre la vente à perte, un fléau endémique du secteur. À l'ère de l'IA, Neural-Fleet ne se contente pas de gérer des véhicules ; il optimise des actifs financiers mobiles dans un espace-temps complexe.

### **Annexes : Données de Référence**

#### **Tableau 1 : Coûts de Maintenance et TCO par Type de Véhicule**

4

| Catégorie Véhicule | Maintenance (€/km) | Carburant (Est. 50k km/an) | Risque Dépréciation |
| :---- | :---- | :---- | :---- |
| **Berline (Class E)** | 0.137 € | Moyen (\~5-6k€) | Standard |
| **Van (Class V)** | 0.171 € | Élevé (\~9-10k€) | Faible (Valeur revente élevée) |
| **VIP (Class S)** | **0.342 €** | Élevé | **Extrême** (-50% valeur \>100k km) |
| **Autocar** | 0.240 € \- 0.257 € | Très Élevé | Moyen |

#### **Tableau 2 : Règles de Surcharge Géographique et Temporelle**

3

| Règle / Contexte | Valeur Surcharge | Justification |
| :---- | :---- | :---- |
| **Zone Versailles** | \+60 € (Fixe) | Parking obligatoire (40€) \+ Friction accès (20€) |
| **Nuit (21h-06h)** | x 1.25 (Approx) | Contrainte horaire chauffeur |
| **Client Difficile** | Jusqu'à x 1.5 | Taxe de patience / Risque opérationnel |
| **Mont-Saint-Michel** | Forfait 14h | Distance extrême (4h30 aller) |

$$\\text{Fin du Rapport}$$

#### **Sources des citations**

1. Optimisation Tarification Zones VTC  
2. Architecture VTC : IA MODULE DE GESTION DE FLOTTE AGENT-NATIVE  
3. Architecture Moteur Pricing VTC Luxe  
4. VTC Software: Global Comparison and Strategic Selection  
5. 7 Voitures VTC Luxe (40k–120k€) Laquelle Rapporte le Plus ?, consulté le décembre 29, 2025, [https://www.youtube.com/watch?v=gz0qHGP4fiM](https://www.youtube.com/watch?v=gz0qHGP4fiM)  
6. Conception Système Dispatch IA Révolutionnaire  
7. VTC : 515€ de CA sans Uber ni Bolt (Ma méthode 100% Privée), consulté le décembre 29, 2025, [https://www.youtube.com/watch?v=gw0iU2JtvPk](https://www.youtube.com/watch?v=gw0iU2JtvPk)  
8. Architecture VTC Agent-Native : La Révolution GenUI (V3)  
9. Manifeste UX 2026 : Architecture Tri-Hybrid