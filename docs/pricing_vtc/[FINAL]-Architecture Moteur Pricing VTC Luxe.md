# **NEURAL-FLEET : ARCHITECTURE D'UN MOTEUR DE PRICING ALGORITHMIQUE & DISPATCH AGENT-NATIVE (V4)**

## **INTRODUCTION : LA RUPTURE ONTOLOGIQUE DU PRICING DANS LA MOBILITÉ DE LUXE**

L'industrie du transport de personnes à haute valeur ajoutée, spécifiquement le segment de la Grande Remise et du VTC de luxe ("Livery"), traverse une crise de modélisation mathématique sans précédent. Le paradigme historique, hérité de l'ère du taximètre analogique et cristallisé dans une équation linéaire simpliste $P(x) \= D \\times R\_d \+ T \\times R\_t$ (où le prix est une fonction directe de la distance et du temps), est désormais mathématiquement obsolète pour opérer dans une métropole dense comme Paris. Notre analyse approfondie des dynamiques de marché actuelles révèle que la volatilité des temps de trajet, la complexité topologique des zones urbaines et les impératifs de rentabilité d'une flotte distribuée exigent une refonte complète de l'architecture de pricing.  
Le projet Neural-Fleet V4 ne se contente pas d'une mise à jour logicielle ; il propose une transition vers un "Système d'Exploitation Cognitif". En ma qualité de Lead Mathematician et Pricing Strategist, je soumets ici l'architecture détaillée du moteur de pricing. Ce système abandonne le déterminisme rigide des ERP hérités (tels que Limo Anywhere) pour embrasser une approche probabiliste et agentique, fondée sur la Théorie des Graphes, l'optimisation combinatoire et le Yield Management dynamique.  
L'enjeu n'est plus seulement de calculer un prix, mais de résoudre un problème d'optimisation multi-objectifs en temps réel : comment maximiser la marge nette tout en garantissant la compétitivité face aux algorithmes agressifs des plateformes de "Ride-Hailing" (Uber/Blacklane), tout en respectant une "Cage de Fer" réglementaire stricte (Loi LOM, RSE). Ce rapport déconstruit les mécanismes de cette architecture selon quatre vecteurs orthogonaux : la topologie zonale, la logique de garage distribuée, l'intelligence routière par graphes et la matrice de pricing dynamique contextuelle.

## ---

**PARTIE 1 : LE SYSTÈME DE ZONES GÉOGRAPHIQUES (POLYGONS & TOPOLOGIE TEMPORELLE)**

La première axiomatique de notre moteur est la négation de l'homogénéité de l'espace. Dans le contexte parisien, un kilomètre parcouru sur le Périphérique à 8h00 n'a pas la même valeur économique, énergétique ni temporelle qu'un kilomètre parcouru sur l'A13 à 23h00. Le moteur Neural-Fleet substitue à la métrique euclidienne une métrique topologique fondée sur des polygones de tarification.

### **1.1. Architecture Topologique : De la Distance à la Zone**

L'infrastructure géospatiale repose sur une partition de l'espace de service $\\mathcal{S}$ en un ensemble fini de polygones $\\mathcal{Z} \= \\{Z\_0, Z\_1,..., Z\_n\\}$. Contrairement aux approches par rayon (radius) qui échouent à capturer les frontières naturelles et administratives (comme la barrière physique du Périphérique), l'approche polygonale permet une granularité chirurgicale.

#### **1.1.1. L'Éditeur de Zones Visuel et le Stockage GeoJSON**

L'administrateur définit les zones via une interface cartographique vectorielle. Chaque zone est stockée sous forme d'objet GeoJSON dans une base de données spatiale (PostGIS), permettant des requêtes d'appartenance (Point-in-Polygon) ultra-rapides.  
Nous identifions trois typologies de zones critiques pour le modèle économique :

* **$Z\_0$ (Le Noyau Dense) :** Paris Intra-muros et la "Proche Banlieue" immédiate (ex: Aubervilliers, Levallois). L'analyse des discussions tarifaires 1 démontre que pour le client et l'opérateur, ces zones constituent une entité tarifaire unique. La notion de kilomètre y est abolie au profit d'une logique de forfait ou de temps.  
* **$Z\_{sat}$ (Les Satellites Stratégiques) :** Des zones comme l'Aéroport Charles de Gaulle (CDG), Orly, ou Le Bourget. Ce ne sont pas de simples lieux géographiques mais des nœuds économiques à haute valeur.  
* **$Z\_{friction}$ (Les Zones à Friction) :** Des zones géographiquement proches mais opérationnellement coûteuses, comme Versailles.

#### **1.1.2. Algorithmique de Résolution Zonale**

Lorsqu'une requête de pricing $Q(A, B)$ est émise, le moteur projette les coordonnées $C\_A$ et $C\_B$ sur l'ensemble $\\mathcal{Z}$.

$$Zone(C) \= \\text{argmin}\_{Z \\in \\mathcal{Z}} (\\text{dist}(C, \\text{centroid}(Z))) \\text{ subject to } C \\in Z$$

Cette résolution est fondamentale. Elle permet, par exemple, de traiter une prise en charge à "Aubervilliers" exactement comme une prise en charge dans le "Paris 18ème", évitant les incohérences tarifaires qui frustrent les clients corporatifs.1

### **1.2. La Matrice de Pricing Inter-Zones : Le Déterminisme Contractuel**

Pour les clients B2B et les partenaires agences (comme Travel Live ou VAP), la fluidité du marché cède le pas à la rigidité contractuelle. Le système implémente une **Matrice de Coûts Fixes** $\\mathcal{M}$ qui prévaut sur le calcul dynamique.

#### **1.2.1. Structure de la Matrice**

La matrice définit un coût $P\_{fixe}$ pour chaque paire de zones $(Z\_i, Z\_j)$.

$$P(Z\_{Paris}, Z\_{CDG}) \= 90€$$

$$P(Z\_{Paris}, Z\_{Paris}) \= 80€$$

L'analyse des contraintes opérationnelles 1 révèle que ces valeurs agissent comme des "Hard Constraints". Même si le calcul de rentabilité temps réel (TCO) indique qu'un transfert Paris-Paris à 80€ est déficitaire à cause de l'approche du chauffeur, le système doit honorer ce prix pour les partenaires sous contrat. L'architecture doit donc supporter un flag is\_contractual qui court-circuite la logique de Yield Management pour ces clients spécifiques, transformant le pricing en un exercice de conformité plutôt que d'optimisation.

#### **1.2.2. L'Anomalie de Versailles : Modélisation de la Friction**

Versailles représente un cas d'école pour notre modélisation topologique. Bien que située à une distance euclidienne faible de Paris, elle impose une "friction opérationnelle" massive. Le modèle intègre un coefficient de friction spécifique $C\_f$ pour cette zone.

$$P(Z\_{Versailles}) \= P(Z\_{Paris}) \+ C\_{f}$$

Nos recherches 1 quantifient ce coût de friction à 60€. Ce montant n'est pas arbitraire ; il est la somme de deux vecteurs de coûts distincts :

1. **Coût Stationnaire ($C\_{park} \\approx 40€$) :** Les frais de parking quasi-obligatoires et élevés à Versailles.  
2. Coût Cinétique ($C\_{access} \\approx 20€$) : La complexité d'entrée/sortie de la zone urbaine dense.  
   Le moteur applique automatiquement ce delta dès qu'un point de la course intersecte le polygone $Z\_{Versailles}$, assurant que la marge n'est pas érodée par ces coûts cachés.

### **1.3. Le "Time-Factor" : Bascule Dimensionnelle (Km vers Minute)**

Dans le noyau dense ($Z\_0$), la vitesse moyenne commerciale chute drastiquement, rendant la facturation au kilomètre suicidaire pour la marge. L'algorithme bascule automatiquement en mode "Mise à Disposition" (MAD) basé sur le temps $T$.

#### **1.3.1. Quantification Temporelle et Interpolation**

Le système ne facture pas à la minute réelle, mais selon des "Buckets" temporels discrets, standards dans l'industrie du luxe 1 :

$$T\_{buckets} \\in \\{4h, 5h, 6h, 8h, 10h, 12h, 14h\\}$$

Le seuil minimal d'activation est $T\_{min} \= 4h$. Toute demande inférieure est arrondie à ce plancher.  
Pour les durées non-standard (ex: 7h), le système n'utilise pas une fonction linéaire continue, mais une interpolation arithmétique entre les bornes adjacentes pour respecter la psychologie des prix du marché :

$$P(7h) \= \\frac{P(6h) \+ P(8h)}{2}$$

Cette logique, extraite de l'analyse des pratiques manuelles des opérateurs 1, est codifiée dans le moteur pour garantir une cohérence totale entre les devis humains et algorithmiques.

#### **1.3.2. Vecteurs de Destination Fixes ("Les Classiques")**

Certaines destinations échappent à la logique purement géographique pour devenir des "Vecteurs Temporels Fixes".

* **Normandie / Reims / Loire :** Ces routes sont encodées comme des vecteurs de **12 heures** ($T\_{fixe} \= 12h$). Le système suppose que l'aller-retour et le temps d'attente sur site consomment la totalité de l'amplitude chauffeur.1  
* Mont-Saint-Michel : Encodé comme un vecteur de 14 heures ($T\_{fixe} \= 14h$) en raison de la distance extrême (4h30 de trajet aller).1  
  Cette abstraction permet de sécuriser la journée de travail du chauffeur dans le devis, indépendamment du temps réel passé sur place par le client.

## ---

**PARTIE 2 : LA "GARAGE LOGIC" (OPTIMISATION DISTRIBUÉE DE L'APPROCHE)**

La rentabilité d'une flotte VTC ne se joue pas sur la course, mais sur l'approche (le trajet à vide). Dans un modèle classique centralisé, le coût d'approche depuis le QG détruit la marge. Neural-Fleet V4 introduit une rupture majeure : la décentralisation logistique via les "Garages Virtuels".

### **2.1. Théorie du Garage Distribué et Graphe de Disponibilité**

Nous modélisons la flotte non plus comme un ensemble de véhicules garés au QG, mais comme un nuage de points dynamiques. Le domicile de chaque chauffeur est géocodé et transformé en nœud logistique actif, le **Garage Virtuel** ($G\_v$).

#### **2.1.1. Optimisation "Home Base" (HBO)**

L'algorithme de dispatch utilise ces nœuds pour optimiser le "First Mile".2 Au lieu de considérer le trajet domicile-travail comme une perte sèche ou un coût social, le moteur cherche à le monétiser.  
L'Agent Dispatcher scanne les réservations $R\_i$ pour le lendemain et cherche une correspondance telle que :

$$\\text{dist}(G\_v, R\_{start}) \< \\text{dist}(QG, R\_{start})$$

Si un chauffeur habite dans le 14ème arrondissement ($G\_{v14}$) et qu'une course part de Montparnasse, l'assignation est prioritaire. Le coût d'approche théorique chute de plusieurs dizaines d'euros (coût du trajet QG banlieue \-\> Paris) à quelques euros, transformant une course potentiellement déficitaire en opération rentable.

### **2.2. Algorithme de Calcul du Coût d'Approche ($C\_{app}$)**

Le calcul du prix client dépend d'une stratégie de "Shadow Pricing" qui masque la complexité logistique pour rester compétitif.

#### **2.2.1. Le Différentiel Approche Réelle vs Approche Facturée**

Le système calcule deux valeurs distinctes :

1. **Coût d'Approche Réel ($C\_{app\\\_real}$) :** Coût TCO (Carburant \+ Usure \+ Temps Chauffeur) du trajet réel du véhicule jusqu'au point de prise en charge.  
2. **Coût d'Approche Commercial ($C\_{app\\\_comm}$) :** Le montant répercuté au client.

L'algorithme de pricing applique la logique suivante 1 :

* **Cas 1 : Départ "Loin" (Zone Non-Dense) :** Si la prise en charge est isolée (ex: campagne), $C\_{app\\\_comm} \\approx C\_{app\\\_real}$. Le client paie pour l'éloignement.  
* **Cas 2 : Départ "Proche" (Zone Dense / $G\_v$) :** Si la prise en charge est dans $Z\_0$ ou proche d'un $G\_v$, le système force $C\_{app\\\_comm} \\to 0$ ou à un forfait minimal.

Cette stratégie permet de simuler une omniprésence (comme Uber) même avec une flotte réduite. Cependant, l'Agent Pricing Analyst effectue un contrôle de viabilité critique :

$$\\text{Marge} \= \\frac{P\_{client} \- (C\_{course} \+ C\_{app\\\_real})}{P\_{client}}$$

Si $\\text{Marge} \< \\text{Seuil}\_{min}$ (ex: 15%), et que le client n'est pas un partenaire contractuel (obligatoire), la course est rejetée ou le prix est ajusté.1 Cette protection est vitale pour éviter l'érosion silencieuse de la trésorerie par les kilomètres à vide.

#### **2.2.2. Gestion des Départs "Impossibles"**

L'analyse des transcriptions 1 montre que pour les particuliers, le système refuse catégoriquement les départs incohérents (ex: petit transfert dans Paris intra-muros commandé à la dernière minute alors que tous les véhicules sont au QG en banlieue). L'algorithme détecte que $C\_{app\\\_real} \> P\_{course}$ et, au lieu de proposer un prix exorbitant (qui nuirait à l'image), il retourne une indisponibilité technique ("No Availability").

## ---

**PARTIE 3 : L'IA ET LES GRAPHES (OPTIMISATION DE ROUTE & DISPATCH)**

Le cœur computationnel de Neural-Fleet est un moteur de graphes avancé. Il ne se contente pas de trouver le chemin le plus court, mais résout des problèmes complexes de tournées de véhicules (VRP) et d'itinéraires multi-contraintes.

### **3.1. Modélisation du Réseau Routier et Simulation**

Le réseau routier est modélisé comme un graphe dirigé pondéré $G=(V, E)$. Chaque arête $e \\in E$ porte un vecteur de poids dynamique $\\vec{w}(e, t)$ qui inclut le temps, la distance, le coût énergétique et le péage.

#### **3.1.1. Simulation de Scénarios (L'Approche Tri-Vectorielle)**

Pour chaque requête de dispatch, l'Agent Pricing instancie trois simulations parallèles utilisant l'API Google Routes v2 et des solveurs internes 3 :

1. **Scénario $\\min(T)$ (Le plus rapide) :** Utilise Dijkstra sur la composante temporelle, intégrant les vecteurs de trafic prédictifs (traffic\_model=pessimistic). C'est le mode par défaut pour les VIP en retard.  
2. **Scénario $\\min(D)$ (Le plus court) :** Minimise la distance kilométrique pure. Souvent théorique en ville, mais utile pour les calculs de coûts planchers.  
3. Scénario $\\min(TCO)$ (L'Éco-Optimisé) : C'est l'innovation majeure. L'algorithme calcule le Coût Total de Possession de la route.

   $$TCO\_{route} \= (T \\times C\_{horaire}) \+ (D \\times C\_{km}) \+ C\_{péage} \+ C\_{énergie}$$

   L'agent arbitre rationnellement : "Gagner 4 minutes justifie-t-il 12€ de péage A14?".3 Si le client est au forfait, le système choisira la route la plus économique pour maximiser la marge interne.

### **3.2. Gestion des "Road Trips" Multi-Jours (Temporal TSP)**

Pour les circuits touristiques (ex: Roadshow de 5 jours Paris-Nice-Monaco), la complexité explose. Le système modélise cela comme un **Problème du Voyageur de Commerce Temporel (Temporal TSP)** avec des contraintes de fenêtre de temps.

#### **3.2.1. Calcul des Frais de Vie (Bottom-Up Costing)**

Lorsque la durée de la course $T\_{total}$ excède une journée ou implique un éloignement \> $D\_{limite}$ du QG, l'algorithme active le module "Frais de Vie".1  
Le prix plancher est calculé par accumulation :

$$P\_{plancher} \= (D\_{RT} \\times C\_{km}) \+ \\sum\_{jours} (C\_{hôtel} \+ C\_{repas} \+ C\_{découcher})$$

Le système utilise des constantes contextuelles 1 :

* $C\_{hôtel}$ : Base 100€, mais passe dynamiquement à 250€ si la destination est "Suisse" ou "Cannes".  
* $C\_{repas}$ : Forfait 60€/jour.  
* $C\_{découcher}$ : Prime chauffeur 50€/jour.  
  Cette approche "Bottom-Up" garantit que le devis couvre non seulement l'exploitation du véhicule, mais aussi la logistique humaine, souvent oubliée dans les algo simplistes.

#### **3.2.2. Segmentation RSE (L'Insertion de Coupures Virtuelles)**

L'algorithme intègre les contraintes légales RSE (Règlement Social Européen) comme des "Hard Constraints" dans le graphe.3

* Si le temps de conduite prévu $\> 4h30$, le graphe insère automatiquement un nœud "Pause" de 45 minutes.  
* Si l'amplitude journalière $\> 10h$, le graphe insère un nœud "Nuit".  
  Le solveur utilise l'API Places pour localiser un hôtel ou une aire de repos à l'endroit exact de la coupure virtuelle, ajustant l'itinéraire et le prix en conséquence (ex: ajout d'une nuitée imprévue).

## ---

**PARTIE 4 : LA "DYNAMIC PRICING MATRIX" (RÈGLES CONTEXTUELLES & YIELD)**

Le prix de base calculé (Zone \+ Temps \+ Approche) est ensuite modulé par une couche de Yield Management contextuelle. Cette matrice dynamique est pilotée par l'Agent Pricing Architect.

### **4.1. Multiplicateurs Contextuels ($M\_c$)**

Le système applique des coefficients multiplicateurs en cascade pour ajuster le prix à la réalité opérationnelle.

#### **4.1.1. Surcharges Temporelles (Nuit & Hybride)**

* **Night Surcharge ($T \\in \[21h, 06h\]$) :** Un multiplicateur fixe est appliqué. L'analyse des données 1 suggère un ratio d'environ 1.25 (420€ vs 340€ pour 5h).  
* Logique Hybride : Pour les courses chevauchant les deux périodes (ex: 19h-00h), l'algorithme ne tranche pas brutalement. Il calcule une moyenne pondérée :

  $$P\_{hybride} \= \\frac{(T\_{jour} \\times P\_{jour}) \+ (T\_{nuit} \\times P\_{nuit})}{T\_{total}}$$

  Cela automatise l'improvisation manuelle observée chez les opérateurs humains (le "390€" bâtard).1

#### **4.1.2. La "Patience Tax" (Comportemental)**

Le système intègre une dimension psychologique inédite : le coût de la difficulté client.  
Un score de difficulté $S\_d$ (1-10) est associé à chaque profil client.

$$M\_{VIP} \= 1 \+ (\\max(0, S\_d \- 5\) \\times 0.1)$$

Si un client VIP "difficile" ($S\_d=10$) demande un devis, le système applique automatiquement un multiplicateur de $\\times 1.5$ (ex: 1300€ $\\to$ 2200€).1 Cette "taxe" finance la prime de risque pour le chauffeur et protège la marge contre les exigences chronophages.

### **4.2. Saisonnalité et Événementiel ($M\_s$)**

L'IA scanne le calendrier événementiel pour anticiper les chocs d'offre et de demande.

#### **4.2.1. La Singularité "Le Bourget"**

Pour des événements majeurs comme le Salon du Bourget, où l'offre est quasi-nulle, le système bascule en mode "Scarcity".1

* Le multiplicateur $M\_s$ augmente drastiquement.  
* Les durées minimales sont forcées à 12h ou 14h (interdiction des petites courses).  
* Les règles d'approche sont durcies (plus de gratuité).

#### **4.2.2. Stimulation en Basse Saison**

À l'inverse, lors des mois creux (Novembre), l'Agent Marketing active des réductions ciblées ($M\_s \< 1$, ex: 0.85) sur les transferts gares pour stimuler la demande corpo.1

### **4.3. L'Agent "Pricing Analyst" (Le Garde-Fou)**

Avant l'envoi de tout devis, l'Agent Pricing Analyst exécute un audit final. Il compare le $P\_{final}$ projeté avec le $C\_{total}$ (incluant l'approche réelle).  
Si la Marge Nette $\< 20\\%$ :

* Il alerte l'opérateur avec une justification précise : "Attention, l'approche depuis le 14ème pour ce transfert court tue la marge. Suggère \+15€.".1  
* Pour les clients contractuels, il logue la course comme "Perte Stratégique" pour les futures négos.

## ---

**CONCLUSION TECHNIQUE : L'ALGORITHME MAÎTRE**

L'architecture décrite aboutit à une équation de pricing unifiée, capable de gérer l'intégralité du spectre des cas d'usage, du transfert simple au roadshow complexe.  
L'algorithme final pour le calcul du prix $P\_{Final}$ est défini comme suit :

$$P\_{Final} \= \\left \\times \\prod M\_{Context}$$  
Où :

1. **$\\text{Base}(Z\_{org}, Z\_{dest})$ :** Le prix forfaitaire matriciel (si applicable, ex: Paris-CDG 90€). Si nul, on utilise le calcul dynamique.  
2. **$\\mathcal{F}(T, D, Z)$ :** La fonction de coût dynamique.  
   * Si $Z \\in Z\_{dense}$ : $T\_{bucket} \\times P\_{horaire}$ (Mise à Disposition).  
   * Si $Z \\notin Z\_{dense}$ : $(D \\times P\_{km}) \+ (T \\times P\_{min})$.  
   * Inclut l'interpolation pour les durées bâtardes (7h).  
3. **$C\_{App\\\_Comm}$ :** Le coût d'approche commercialement facturé (souvent 0€ si $G\_v$ proche, sinon $D\_{approche} \\times P\_{km}$).  
4. **$C\_{Friction}$ :** Les coûts topologiques fixes (ex: Versailles \+60€, Mont-Saint-Michel forfait 14h).  
5. **$\\prod M\_{Context}$ :** Le produit des multiplicateurs dynamiques :  
   * $M\_{Nuit}$ (1.25 si 21h-6h).  
   * $M\_{Saison}$ (Variable selon calendrier, ex: Bourget).  
   * $M\_{VIP}$ (Taxe de patience $1 \+ 0.1 \\Delta S\_d$).  
   * $M\_{Véhicule}$ (Van \= x1.5 vs Berline).

En implémentant cette architecture, Neural-Fleet transforme la contrainte géographique et temporelle en opportunité de marge. Le système ne subit plus la ville ; il la modélise, l'anticipe et la tarifie avec une précision chirurgicale, garantissant que chaque tour de roue contribue positivement à la rentabilité de l'entreprise.

### ---

**TABLEAU RÉCAPITULATIF DES DONNÉES CLÉS (Paramètres Algorithmiques)**

| Paramètre | Valeur Standard | Condition d'Application | Source |
| :---- | :---- | :---- | :---- |
| **Seuil MAD** | 4 Heures | Minimum absolu pour tarification horaire | 1 |
| **Surcharge Versailles** | \+60 € | 40€ Parking \+ 20€ Friction | 1 |
| **Vecteur Normandie** | 12 Heures | Forfait fixe pour plages du débarquement | 1 |
| **Vecteur Mt-St-Michel** | 14 Heures | Forfait fixe distance extrême | 1 |
| **Début Nuit** | 21h00 | Déclenchement $M\_{Nuit}$ | 1 |
| **Coût Repas Chauffeur** | 60 € / jour | Road Trip \> 1 jour | 1 |
| **Coût Hôtel Base** | 100 € / nuit | Road Trip (variable selon zone Suisse/Cannes) | 1 |
| **Prime Découcher** | 50 € / nuit | Compensation éloignement domicile | 1 |
| **Multiplicateur Van** | x 1.5 (approx) | Par rapport à Berline (selon grille) | 1 |
| **Marge Alerte** | \< 20% | Seuil de déclenchement Agent Pricing Analyst | 1 |

#### **Sources des citations**

1. VTC Software: Global Comparison and Strategic Selection  
2. Structure Fiche Driver VTC Révolutionnaire  
3. Conception Système Dispatch IA Révolutionnaire