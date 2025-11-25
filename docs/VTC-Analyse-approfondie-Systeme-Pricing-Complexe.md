# VTC - Analyse approfondie, Système Pricing - Complexité

status: Planning
Date: November 24, 2025
Periority: High
Type: Performance Optimization

## **Partie 1 : Transcription Améliorée des Discussions**

Voici la transcription complète des trois fichiers audio, nettoyée, corrigée et structurée pour une meilleure lisibilité. Les intervenants sont identifiés comme "Interlocuteur 1" et "Interlocuteur 2".

### **Début de la Transcription (Fichiers 1, 2 et 3 combinés)**

**Interlocuteur 1 :** Voilà, ça, ce sont les mises à disposition pour Paris. Tu vois, à part ce que Boris a précisé, il n'y a pas de notion de kilomètre ; c'est juste une notion de temps. Tant que tu restes dans Paris ou en proche banlieue... Tu vois, si tu me dis que tu dois aller déposer un truc à Aubervilliers, pour nous, c'est considéré comme Paris, c'est une porte de la ville, on ne va pas faire de distinction.

Par contre, il y a une distinction qui se fait avec Versailles. Ce n'est pas que ce soit particulièrement loin, mais à Versailles, il y a une particularité : tu as des frais de parking quasi-obligatoires qui sont super chers. Du coup, une mise à disposition à Versailles coûte 60 € de plus par rapport à Paris. L'écart de 60 € correspond en gros à 40 € de parking et 20 € parce que c'est un tout petit peu plus loin, que tu rentres, tu ressors de Paris, et c'est un peu plus galère. C'est pour ça qu'il y a une petite différence de prix. Chantilly, c'est plus loin, mais les parkings ne sont pas aussi chers. La différence de prix pour Versailles est vraiment liée aux frais de parking.

**Interlocuteur 2 :** Donc si on compare 5h à Versailles par rapport à 5h à Paris, il y a 70 € d'écart.

**Interlocuteur 1 :** Normalement, l'écart aurait dû rester le même, je ne sais pas pourquoi ce n'est pas le cas, mais bon, il y a une grille de prix qui est comme ça et on la garde.

Après, il y a des grands classiques que tu retrouves dans cette grille. Ce sont des choses que les clients étrangers demandent souvent quand ils viennent en France, comme aller voir Reims pour visiter les caves de Champagne. Ce n'est pas trop loin de Paris, en voiture ça va assez vite. Tu vas me dire, "oui mais il y a la Côte d'Azur, les Américains aiment bien aller à Cannes, etc.". Je te dirais oui, mais aller à Cannes en voiture, ce n'est pas une bonne idée. Quand ils veulent y aller, ils reprennent en général un avion ou un train. C'est pour ça qu'il n'y a pas Cannes dans nos grilles tarifaires.

Ce qu'on voit là, j'appelle ça des "classiques" que les étrangers (Américains, Brésiliens, etc.) demandent souvent, et qui sont également accessibles en voiture mais difficilement en train. Ce n'est pas compliqué d'aller à Reims en TGV, c'est même super simple. Mais une fois que tu es là-bas, tu es en galère parce que les caves sont dans les campagnes autour de Reims, et tu ne peux pas y aller à pied. C'est presque obligé de partir d'ici en voiture. C'est une distance qui est bonne pour nous parce qu'elle est accessible, un peu loin, et pour le client, c'est une galère d'y aller en train. Donc pour nous, c'est rentable. Il y a de la distance, du temps, et donc la note pour le client augmente.

La Vallée de la Loire, c'est exactement pareil. Ce sont les châteaux de la Loire (Cheverny, etc.), tous les beaux châteaux le long du fleuve. Les hôtels nous appellent et disent : "On voudrait une dispo 12 heures pour la Vallée de la Loire, pour trois personnes".

Trois personnes, c'est un peu le chiffre bâtard. Si on nous dit trois, l'agence va souvent préciser "faites-le en berline" parce qu'ils ont un peu moins d'argent. Dans ce cas, il y aura un passager à côté du chauffeur. Mais dans le transport de personnes, ça ne se fait pas trop d'être à côté du chauffeur. Pour les gens riches, c'est comme une dégradation de leur statut social d'être devant. Tu mélanges le chauffeur et "l'invité". C'est comme manger avec un serveur au restaurant. Du coup, quand ils sont trois, souvent ils précisent "faites-le en van", même si une berline suffirait, simplement pour qu'ils soient tous tranquilles derrière.

Et là, tu as les "classiques" : 12 heures pour les plages de Normandie, pour aller voir les plages du débarquement. Ça, on l'a beaucoup parce qu'il y a les cimetières américains, et les Américains sont très fiers de leurs descendants morts pour libérer l'Europe. Dès qu'un Américain vient à Paris, automatiquement, il veut voir la Normandie.

Après, tu as le Mont-Saint-Michel. Lui, c'est 14 heures, contrairement aux autres. Tu mets quasiment 4h30-5h pour y aller. C'est pour ça qu'on compte 14 heures. Souvent, ils partent à 6h du matin, finissent leur nuit dans le véhicule, et arrivent à 10h30 au Mont-Saint-Michel. Ils visitent 2-3 heures, mangent une crêpe, et reviennent. Au total, la prestation dure de 8h à 22h. Pour nous, c'est bien, car en partant si tôt, on évite les bouchons parisiens à l'aller comme au retour.

**Interlocuteur 2 :** Il y a des dispositions que vous appelez "soirée" ou "nuit".

**Interlocuteur 1 :** Nuit et soirée, c'est la même chose, une erreur sur le tableau. Mais par exemple, on va te dire : "Merci de vous présenter à 19h à l'hôtel pour aller manger au restaurant. Vous nous attendez et on ressortira à minuit". Ça fait 5 heures, de 19h à minuit. J'aurais tendance à prendre "mise à disposition 5h nuit", sauf qu'entre 19h et 21h, tu es plutôt en tarif de jour.

**Interlocuteur 2 :** Oui, car les heures de nuit commencent à 21h.

**Interlocuteur 1 :** Exactement. Donc sur 5h de travail, tu as 2h de jour et 3h de nuit. C'est un cas un peu bâtard, entre les deux. La mise à disposition 5h jour est à 340 €, et 5h nuit à 420 €. L'agence elle-même sait qu'on n'est pas tout à fait dans la grille. On va dire 390 €. On a une part d'improvisation.

**Interlocuteur 2 :** On ne peut pas calculer 3 heures de jour plus 2 heures de nuit ?

**Interlocuteur 1 :** Logiquement si, mais il n'y a pas de mise à disposition de 3 heures dans la grille. Le minimum est de 4 heures. Dans le milieu du tourisme, ça parle en tranches de 4h, 5h, 6h, 8h, etc. Le chiffre 7h n'existe pas vraiment. Si un client veut 7h, on va faire une moyenne entre 6h et 8h. La grille est limitée pour être lisible par l'agence. Mais quand on nous demande des prestations "hors grille", on est bien obligé d'inventer des règles.

Et il faut savoir que cette grille, c'est pour nos partenaires, nos agences régulières. On a une manière de chiffrer complètement différente avec un particulier qui nous demande une seule course dans l'année.

**Interlocuteur 2 :** Pourquoi ?

**Interlocuteur 1 :** Déjà, les agences ont des prix remisés parce qu'elles nous envoient du volume toute l'année. Ceci dit, c'est une très bonne base de calcul. Quand un particulier nous demande une course et que ça nous arrange dans le planning, on va lui donner ce prix-là.

La seule différence, c'est que cette grille, pour les agences partenaires, vaut engagement. On sera toujours obligé d'appliquer ces prix, même si ça ne nous arrange pas. Le transfert à 80 € dans Paris, on est obligé de le faire même si on perd de l'argent et que ça nous saoule.

Alors que si un particulier, Madame Gabriella, nous demande un transfert Paris 16e vers Paris 17e à 19h, on va regarder la grille (80 €) et notre planning. Si on a un chauffeur pas loin qui peut le faire, on accepte. Mais hors de question qu'on fasse partir un chauffeur d'ici (banlieue) juste pour ça, car on va perdre de l'argent. On ne va pas perdre d'argent pour quelqu'un qu'on ne connaît pas. Dans ce cas, on va poliment dire : "Désolé Madame, nous n'avons pas de disponibilité". On ne va pas lui sortir un tarif incohérent de 250 €, c'est n'importe quoi.

Avec des agences comme Travel Live, c'est encore pire. Eux, ils ne nous demandent même pas notre disponibilité. Ils nous envoient un mail : "Réservation confirmée pour telle date. Merci de mettre au planning". C'est imposé. On n'a pas le choix.

Et avec ces agences, il faut comprendre une autre différence. Travel Live, par exemple, a souvent des vols très tôt. Des clients retraités américains qui prennent un vol Paris-Rome à 6h du matin. Il faut donc les déposer à l'aéroport à 4h du matin, ce qui veut dire qu'on doit envoyer un chauffeur à leur hôtel à 3h du matin. L'agence nous impose ce transfert, et avec eux, il n'y a pas de distinction d'horaire. Que ce soit 3h du matin ou 15h, le transfert aéroport en van sera à 120 €.

D'un autre côté, ça roule plus vite la nuit. Mais la galère, c'est que quand tu réveilles un chauffeur à 1h30 du matin pour faire ça, sa journée du lendemain est morte. Il est complètement décalé.

Donc, si un particulier nous demande ce même transfert à 3h du matin, lui-même sait que c'est une galère et que ça va être plus cher. Là, il y a une notion d'improvisation. On se concerte et on se dit : "Normalement c'est 150 € en van. C'est une galère, vas-y, propose 200 €". S'il accepte, on prend. Sinon, tant pis, ce n'est pas si grave, au moins notre chauffeur se repose.

### **La complexité des scénarios "hors grille"**

**Interlocuteur 2 :** Vu le nombre de critères, il faudrait presque une intelligence artificielle pour analyser tout ça, car les algorithmes seuls ne suffiront pas.

**Interlocuteur 1 :** C'est faisable avec des "agents IA". Une équipe virtuelle qui réfléchit à notre place. C'est l'humain qui crée le scénario. Nous, on raisonne comme des gens normaux, on cherche le moins cher. Mais nos clients, VAP par exemple, c'est une agence pour des gens qui ont de l'argent. Ils s'en foutent de payer 80 € d'heure supplémentaire. Mais quand tu t'adresses aux palaces parisiens, tu es dans un autre monde. Ils font des dingueries.

Un jour, une cliente, fille d'un président africain, une cliente très difficile, partait en Normandie. Elle voulait voir un film qui n'était disponible que sur Paramount+, un service qu'on n'avait pas. Boris (le chauffeur) a tout essayé : Netflix, Apple TV, YouTube... rien. La cliente lui a arraché les télécommandes des mains, l'a traité de nul, avant de jeter les télécommandes, dégoûtée. Cette cliente, elle est tellement désagréable qu'on sait que quand elle demande un prix, on va forcément le monter. Si le calcul sort 1300 €, pour elle, ça va être 2200 €. Les 1000 € de plus, elle s'en fout, ce n'est pas elle qui paie. Mais nous, on se protège car il faut un chauffeur qui ait la patience de la gérer, et ça a un coût.

### **La saisonnalité et les événements spéciaux**

**Interlocuteur 1 :** Il y a aussi la saisonnalité. Quand on a moins de travail, on baisse les prix pour essayer de choper le client.

**Interlocuteur 2 :** Et les événements ?

**Interlocuteur 1 :** Il n'y en a pas tant que ça. Pour les jours fériés comme le 8 mai, ça ne compte pas pour nous. Par contre, les 24, 25, 31 décembre et 1er janvier sont les quatre seuls jours où on applique une tarification sur-mesure. On prévient VAP de nous contacter, et on monte un peu les prix car on galère à trouver un chauffeur.

Il y a un autre "jour spécial" qu'on ne peut pas annoncer : le jour de l'Aïd. Énormément de chauffeurs sont musulmans, et ce jour-là, c'est comme Noël pour eux. On a une vraie galère de chauffeurs, mais on ne peut pas l'annoncer aux agences.

Les grands événements comme le Ballon d'Or sont gérés par une seule grosse société. Roland-Garros est étalé, ça ne crée pas une demande de dingue. Les JO, on avait prévu un truc spécial, mais finalement on n'a pas été si sollicités. La Coupe du Monde de Rugby, un peu de travail, mais sans plus. Le seul événement qui a un vrai impact, c'est le Bourget Air Show, tous les deux ans. C'est une semaine de folie. Tous les professionnels de l'aviation du monde entier sont là, et ils ne prennent pas le métro. Cette semaine-là, il est impossible de trouver un chauffeur privé. Ils sont tous bloqués au Bourget, en mise à disposition toute la journée. Ils attendent, mais sont payés.

### **Calcul des coûts opérationnels (carburant, frais chauffeur)**

**Interlocuteur 2 :** Et pour le prix du carburant, comment c'est calculé ?

**Interlocuteur 1 :** Le prix affiché au client inclut toujours tout : repas du chauffeur, péages, parking, et bien sûr, le carburant. Le client ne paie jamais à la pompe.
Pour nos véhicules, on a des cartes carburant (type Total) rattachées au véhicule. Le chauffeur paie avec, et ça nous débite directement. Donc le chauffeur ne se préoccupe pas du coût. La seule consigne est de toujours refaire le plein à la fin d'une mission pour que le véhicule soit prêt pour la suivante.

Le calcul du coût du carburant, on le fait avec des outils comme Mappy ou en se basant sur la consommation du véhicule et le kilométrage. Pour une mise à disposition dans Paris, où le véhicule roule peu mais le moteur tourne (clim, chauffage), Boris estime ça à la journée, par exemple "30 € d'essence pour une MAD de 5h". Mais on n'a pas vraiment besoin de le savoir pour les prestations de la grille, car les prix sont fixes.

On calcule vraiment l'essence et les péages quand on est sur des demandes "hors grille", comme le transport de bagages jusqu'à Rome. Là, on se pose, on regarde le trajet sur Mappy, on calcule les péages, l'essence pour l'aller et le retour.

Pour les frais de chauffeur sur plusieurs jours, comme un séjour de 5 jours en Normandie, on estime les coûts. Je vais compter 100 € par nuit pour l'hôtel, et 60 € par jour pour ses trois repas. Par contre, pour les mêmes 5 jours en Suisse, c'est différent. Un hôtel à 100 € la nuit, c'est impossible à trouver dans certains coins. On peut vite être à 250 € la nuit. Et pour les repas, 20 € c'est très juste en Suisse, donc on va plutôt compter 100 € par jour. Tu vois, un séjour en Normandie nous coûte 160 €/jour en frais de chauffeur, alors qu'en Suisse on est à 350 €. Et je ne te parle pas du Festival de Cannes où un hôtel basique peut coûter 400 € la nuit.

En plus de ça, il y a la prime de "découcher". C'est une prime de 40 à 50 € par nuit qu'on paie au chauffeur pour l'inconfort de ne pas dormir chez lui.

Donc, pour un devis de 10 jours au Festival de Cannes, on additionne tout :

1. Les 10 jours de mise à disposition (ex: 10 x 620 €).
2. Le trajet aller à vide (Paris-Cannes, environ 1000 €).
3. Le trajet retour à vide (Cannes-Paris, environ 1000 €).
4. Les nuits d'hôtel (ex: 11 nuits x 350 €).
5. Les repas (ex: 11 jours x 60 €).
6. La prime de découcher (ex: 11 nuits x 50 €).

Le total monte très vite, mais c'est le coût réel.

### **Réglementation des véhicules lourds et impact sur la tarification**

**Interlocuteur 1 :** La demande du client crée un scénario qui se divise en deux : léger ou lourd. Et ça change tout.

Le calcul que je viens de te faire pour le club de foot qui part à Lyon, il est complètement différent si c'est en berline/van (léger) ou en autocar (lourd).

En **véhicule léger**, le chauffeur n'a pas de contrainte de temps de pause réglementaire. Il roule à 130 km/h. On se base sur Google Maps : 4h15 de trajet.

En **véhicule lourd** (plus de 9 personnes ou plus de 3,5 tonnes, comme notre Van VIP), tout change :

1. **Vitesse limitée :** 100 km/h sur autoroute. On calcule le temps de trajet en divisant la distance par une moyenne de 85 km/h. Pour 445 km, ça donne 5h15 de conduite, pas 4h15.
2. **Pause obligatoire :** Au bout de 4h30 de conduite, le chauffeur DOIT faire une pause de 45 minutes. Comme le trajet fait 5h15, on doit ajouter ces 45 minutes. Le temps de trajet total passe donc à 6 heures.
3. **Amplitude maximale :** Un chauffeur seul a une amplitude de travail de 14 heures maximum par jour. L'amplitude démarre quand il met sa carte dans le véhicule au dépôt, pas quand il récupère le client. S'il part à 4h du matin du bureau, sa journée DOIT se terminer à 18h (4h + 14h), quoi qu'il arrive.
4. **Temps de conduite maximal :** Un chauffeur seul ne peut pas conduire plus de 10 heures par jour. C'est une règle avec zéro tolérance. S'il fait 10h03, l'amende est énorme.
5. **Repos obligatoire :** Entre la fin d'une journée et le début de la suivante, il doit y avoir une coupure minimum de 9 heures. S'il finit à 22h15, il ne peut pas reprendre avant 7h15 le lendemain.

Ces règles sont tracées par une carte (chronotachygraphe) et sont non négociables. Ça complique énormément le calcul.

Reprenons l'exemple du club de foot : ils veulent faire un aller-retour Bretigny-Lyon dans la journée.

- Temps de conduite aller : 5h15
- Temps de conduite retour : 5h15
- **Total conduite : 10h30**

Là, une alerte sonne dans notre tête. On dépasse les 10h de conduite max pour un seul chauffeur. On a donc plusieurs solutions, et c'est là qu'on optimise pour être compétitif :

- **Solution 1 (Chère) :** Envoyer un **double équipage** (deux chauffeurs). L'amplitude passe à 18h max et le temps de conduite est partagé. Mais ça coûte deux salaires de chauffeur (ex: 300 € x 2 = 600 €).
- **Solution 2 (Optimale) :** Envoyer un **chauffeur-relais**. Le premier chauffeur fait 9h50 de conduite et s'arrête à Melun au retour. Un deuxième chauffeur (le relais) part de Paris en voiture, le rejoint à Melun, prend le volant de l'autocar pour la dernière demi-heure. Le premier chauffeur rentre avec la voiture. Le relais ne coûte que 80-100 € au lieu d'une journée complète. Le coût total chauffeur passe de 600 € à 380 €. On gagne 220 €, ce qui nous permet de baisser notre devis et de remporter le marché.

Toutes ces règles (amplitude, conduite, pauses, repos) ne s'appliquent qu'aux véhicules lourds (Minicar, Van VIP, Autocar).

---

## **Partie 2 (Version Finale Détaillée) : Vision Stratégique et Modèles de Tarification**

Cette partie établit les fondations conceptuelles du système de prix. Elle définit la philosophie globale qui guide chaque calcul : une dualité stratégique permettant de répondre avec précision aux différentes facettes du marché du transport de personnes.

### **2.1. Le Principe Fondamental : La Double Logique de Tarification**

Le système de tarification n'est pas monolithique. Il est conçu comme un moteur intelligent capable de basculer entre **deux modèles de calcul distincts et complémentaires**. Cette dualité est la clé pour servir efficacement deux types de clientèles aux attentes opposées : les partenaires B2B qui exigent des prix fixes et prévisibles, et les clients B2C ou "hors-normes" qui nécessitent une tarification sur-mesure.

Le logiciel doit être capable, pour chaque nouvelle demande, d'identifier le contexte et d'appliquer automatiquement la bonne méthode de calcul, en suivant un ordre de priorité strict.

| Méthode de Tarification | Principe Clé | Cible Principale | Objectif Commercial |
| --- | --- | --- | --- |
| **Méthode 1 : Forfaitaire** | **Prix Fixe & Garanti.** Le tarif est connu à l'avance et ne dépend pas des conditions réelles du trajet (trafic, durée exacte). | Agences de voyages, partenaires B2B, clients réguliers, trajets "classiques". | Fidélisation, simplicité, engagement contractuel, volume d'affaires. |
| **Méthode 2 : Dynamique** | **Prix Sur-Mesure & Rentable.** Le tarif est calculé en fonction des coûts réels et estimés de la prestation. | Particuliers, clients occasionnels, demandes complexes et "hors grille". | Rentabilité, flexibilité, gestion des cas uniques. |

---

### **2.2. Méthode 1 : La Tarification Forfaitaire et Contractuelle**

### **Description Détaillée**

Cette méthode est le pilier de vos relations commerciales à long terme. Elle transforme une grille de prix en un contrat de service. Lorsqu'un trajet est couvert par cette méthode, son prix est **immuable**. C'est une promesse de stabilité tarifaire faite à vos partenaires, qui leur permet d'intégrer vos services dans leurs propres packages sans risque de fluctuation.

### **Mécanismes d'Implémentation**

La "grille tarifaire" est mise en œuvre dans le logiciel via deux mécanismes concrets et configurables :

1. **Le Système de Zones Géographiques (détaillé en Partie 6) :**
    - **Logique :** Le territoire est découpé en zones (Paris Centre, Couronnes, Aéroports...). Des "routes" virtuelles connectent ces zones. Chaque route se voit attribuer un prix fixe par type de véhicule.
    - **Exemple concret :** Un partenaire (VAP) réserve un Van pour un transfert entre un hôtel dans la zone "Paris Centre" et un terminal de la zone "Aéroport CDG".
        - Le système identifie la route `Paris Centre -> CDG`.
        - Il récupère le tarif prédéfini pour un Van sur cette route : **150 €**.
        - Ce prix de 150 € sera facturé, que le trajet dure 45 minutes un dimanche matin ou 1h45 un vendredi soir de bouchons. Le risque lié au trafic est absorbé par votre entreprise dans le cadre du partenariat.
2. **Les Forfaits Excursion et Mises à Disposition Standardisées :**
    - **Logique :** Pour les prestations touristiques récurrentes, la grille définit des forfaits qui incluent le temps et une enveloppe kilométrique.
    - **Exemple concret :** L'agence VAP réserve une "Journée Plages de Normandie" en Minicar.
        - Le système identifie ce service comme un forfait de **12 heures**.
        - Il applique le prix fixe de la grille pour ce forfait et ce véhicule (ex: 1190 €).
        - Ce prix est "tout compris" (dans la limite des kilomètres définis pour le forfait).

### **La Règle d'Or : L'Engagement Prime sur la Rentabilité Immédiate**

C'est le principe le plus important à coder dans la hiérarchie de calcul. Pour les clients identifiés comme "Partenaires B2B", le système doit **toujours** appliquer les tarifs de la grille, même si son propre calculateur de rentabilité interne signale que la course sera à perte.

- **Extrait de la discussion :**
    
    > "Cette grille, pour les agences partenaires, elle vaut engagement. Ça veut dire qu'on sera toujours obligé d'appliquer ces prix-là, même si ça ne nous arrange pas."
    > 
- **Implication pour le système :** Le module de tarification doit d'abord vérifier si le client appartient à un groupe "Partenaire" et si la demande correspond à une offre de la grille. Si c'est le cas, le calcul s'arrête là. La notion de rentabilité ne sert alors qu'à informer l'opérateur de la perte éventuelle, mais ne modifie pas le prix.

---

### **2.3. Méthode 2 : La Tarification Dynamique et Sur-Mesure**

### **Description Détaillée**

Cette méthode est le moteur "intelligent" et flexible du système, activé par défaut lorsque la Méthode 1 ne s'applique pas. Elle ne se base pas sur des forfaits, mais sur une **évaluation en temps réel des coûts et de la valeur** de la prestation. Elle permet de créer des devis justes et rentables pour des demandes uniques.

### **Cible**

- **Particuliers et Clients Occasionnels (B2C) :** La majorité des demandes entrantes qui ne proviennent pas d'agences.
- **Demandes "Hors Grille" :** Tout trajet qui ne correspond à aucune route de zone ou forfait défini (ex: un trajet sur mesure Paris -> Orléans).
- **Trajets Complexes :** Missions sur plusieurs jours, programmes avec de multiples arrêts, ou toute demande impliquant des contraintes logistiques ou réglementaires importantes.

### **Logique de Fonctionnement : Une Architecture Multi-Couches**

Le calcul dynamique n'est pas une simple formule, mais un processus multi-couches qui agrège plusieurs niveaux d'information.

1. **Couche 1 : Le Calcul de Base (Coût Physique du Trajet)**
    - Le système estime la distance et la durée du trajet via une API (Google Maps).
    - Il applique les tarifs de vente de l'entreprise (configurables) : `Tarif/km` et `Tarif/heure`.
    - Le prix de base est le **maximum des deux calculs** (`MAX(distance * tarif_km, durée * tarif_heure)`), afin de garantir que les trajets courts dans les bouchons (faible distance, longue durée) soient correctement tarifés.
2. **Couche 2 : L'Analyse des Coûts Opérationnels (`Trip Transparency`)**
    - Le prix de base est enrichi par les coûts directs estimés du trajet :
        - Coût estimé des **péages**.
        - Coût estimé du **carburant**.
        - Tout autre coût programmable (ex: frais de parking à destination).
3. **Couche 3 : L'Application des Multiplicateurs et Surcharges**
    - Le prix calculé est ensuite ajusté par des coefficients contextuels :
        - **Multiplicateurs de Zone :** Pour les trajets "circulaires" en banlieue, un coefficient (ex: x1.2) vient majorer le prix pour refléter la densité du trafic.
        - **Surcharges Événementielles/Saisonnières :** Un multiplicateur global peut être appliqué pour des périodes de forte demande (Fashion Week, haute saison, jours fériés...).
4. **Couche 4 : L'Ajustement Humain (Le "Feeling" de l'Opérateur)**
    - Le système présente le prix calculé à l'opérateur. Celui-ci a **toujours le pouvoir de l'ajuster manuellement** pour intégrer des facteurs subjectifs que l'algorithme ne peut pas quantifier.
    - **Majoration pour Pénibilité :** Un transfert à 3h du matin sera manuellement majoré (ex: +25%) pour compenser la contrainte imposée au chauffeur.
    - **Majoration pour "Client Difficile" :** Un client connu pour être exigeant se verra appliquer une "taxe de risque/stress" manuelle.
    - **Minoration pour Opportunité Commerciale :** Si la course permet de remplir un "trou" dans le planning, l'opérateur peut baisser le prix pour s'assurer de remporter l'affaire.

### **2.4. Architecture Globale et Scalabilité (Devises & Timezones)**

Pour garantir que le système fonctionne sans faille entre un bureau à New York, un client à Londres et une prestation à Paris, des règles strictes de gestion du temps et de l'argent doivent être implémentées.

**A. Gestion Temporelle (Timezones)**

- **Stockage (Backend) :** Toutes les dates et heures sont stockées exclusivement en format **UTC** dans la base de données.
- **Affichage (Frontend Opérateur) :** L'interface doit impérativement afficher deux heures distinctes pour éviter les erreurs de planification :
    - **"Local Service Time" :** L'heure locale du lieu de prise en charge (celle qui compte pour le chauffeur et le client).
    - **"Operator Time" :** L'heure locale du bureau qui gère le dossier (pour la coordination interne).

**B. Gestion Monétaire (Multi-Currency & Taux de Change)**

- **Le Risque de Change B2B :** Pour les contrats agences (Méthode 1), les prix sont souvent négociés dans la devise locale de la prestation (EUR) mais payés par l'agence dans sa devise (USD).
- **Règle de Fixation :** Le système doit permettre de définir un **"Taux de Change Contractuel"** fixe par partenaire, ou de figer le taux de change au moment de la **validation de la commande** (et non de la facturation 60 jours plus tard), pour protéger la marge de l'entreprise contre les fluctuations monétaires.

### **Objectif : La Rentabilité Avant Tout**

Pour la Méthode 2, l'objectif principal est de s'assurer que chaque course génère une marge positive. Le **Calculateur de Rentabilité Interne (détaillé en Partie 5)** joue ici un rôle crucial en informant l'opérateur du coût réel de la mission (incluant les trajets à vide). Si le prix de vente dynamique calculé ne dégage pas une marge suffisante, l'opérateur est encouragé à l'augmenter ou à refuser la course.

---

## **Partie 3 (Version Finale Détaillée) : Le Cœur du Système - Moteur de Rentabilité et de Dispatching Multi-Bases**

Cette partie décrit l'architecture fonctionnelle du moteur de tarification. C'est ici que réside l'innovation principale de votre projet : le système ne se contente pas de calculer un prix de vente, il analyse d'abord la **rentabilité opérationnelle** d'une course pour fournir à l'opérateur un outil puissant d'aide à la décision. Cette approche est fondamentale pour survivre et prospérer face à la concurrence des plateformes VTC sur les trajets courts.

### **3.1. Le Modèle Opérationnel Multi-Bases : Ancrer le Calcul dans la Réalité Géographique**

Le postulat de base du système est que les véhicules ne sont pas des entités abstraites disponibles n'importe où. Ils partent de **lieux physiques (bases ou garages)**, et le trajet pour se rendre jusqu'au client ("trajet à vide" ou "deadhead") a un coût qui doit être pris en compte.

### **Modélisation Technique Détaillée**

L'architecture de la base de données doit permettre une configuration flexible et précise de l'infrastructure opérationnelle de l'entreprise.

1. **Le Garage Principal (`MainBase`) :**
    - **Définition :** Chaque entité `Organization` dans votre base de données doit avoir une relation obligatoire vers un `Garage` qui est marqué comme `isMain: true`.
    - **Rôle :** C'est le point de référence de l'entreprise, souvent situé en périphérie pour des raisons de coût. Il sert de base par défaut pour les véhicules qui n'ont pas d'assignation spécifique et de point de départ/retour pour les calculs de longue distance.
2. **Les Sous-Garages (`SubBase`) :**
    - **Définition :** Une `Organization` peut être liée à une liste de `0` à `N` autres `Garage` où `isMain: false`.
    - **Rôle :** Ce sont des points de stationnement stratégiques qui agissent comme des "avant-postes" pour optimiser les opérations.
        - **Exemple 1 :** Un partenariat avec un parking dans le centre de Paris pour y baser 2 berlines dédiées aux courses intra-muros.
        - **Exemple 2 :** L'adresse du domicile d'un chauffeur fiable qui gare un van chez lui, transformant son domicile en une base de départ pour le secteur sud de Paris.
3. **Assignation des Véhicules aux Bases :**
    - Le modèle `Vehicle` doit avoir un champ `baseId` qui le relie à un `Garage`.
    - **Rôle :** Cette assignation est cruciale. Elle informe le système de la position de départ **par défaut** d'un véhicule lorsqu'il est inactif. C'est cette information qui permet au moteur de calculer le coût d'approche.

---

### **3.2. L'Algorithme Central de Décision : Le Processus Détaillé en 5 Étapes**

Pour chaque nouvelle demande de devis, le système exécute en arrière-plan un algorithme sophistiqué qui mime la réflexion d'un dispatcheur expérimenté. Ce processus transforme une simple demande de prix en une analyse de rentabilité complète.

### **Étape 1 : Qualification et Validation de la Demande**

Le système analyse les données brutes de la demande pour les structurer, les valider et anticiper les besoins réels.

- **Inputs Bruts :** Adresse de départ, adresse d'arrivée, date/heure, nombre de passagers, nombre de bagages, commentaires du client.
- **Processus de Qualification :**
    1. **Analyse des Bagages :** Le système ne se contente pas de compter. Il doit permettre de spécifier une taille (`S`, `M`, `L`, `XL/Hors Format`). Chaque `VehicleCategory` a des capacités définies (ex: une Berline peut contenir `2 L` ou `4 M`).
    2. **Validation et Suggestion de Véhicule (Scénarios 2.1, 2.2, 13) :** C'est la première étape d'intelligence.
        - **Scénario Détaillé :**
            - *Demande Client :* 3 passagers, 2 valises `L`, 2 valises `M`. Véhicule souhaité : "Berline".
            - *Analyse du Système :*
                - Capacité passagers Berline : OK (3 passagers).
                - Capacité bagages Berline : KO (2 `L` + 2 `M` dépasse la capacité).
            - *Action du Système :* Le système remonte dans les catégories de véhicules jusqu'à trouver celui qui satisfait toutes les contraintes. Il identifie le "Van" comme étant le véhicule minimum requis.
            - *Output pour l'Opérateur :* "Suggestion : Véhicule requis modifié de 'Berline' à 'Van' en raison du volume des bagages."
    - Cette étape garantit que le reste du calcul se fera sur une base réaliste, évitant les échecs opérationnels le jour J.

### **Étape 2 : Détermination de la Base de Départ Optimale (Le Cœur de la Rentabilité)**

C'est ici que votre système prend un avantage stratégique décisif.

- **Processus Détaillé :**
    1. **Identification des Ressources :** Le système sait maintenant qu'il a besoin d'un "Van" pour la date/heure demandée.
    2. **Scan de la Flotte :** Il interroge le planning pour trouver tous les "Vans" qui sont **disponibles** (non assignés à une autre mission) à ce moment-là.
    3. **Calcul Comparatif du Coût d'Approche ("Deadhead") :** Pour chaque van disponible, le système simule le trajet à vide :
        - **Van A (basé au Garage Principal) :** Il calcule le coût du trajet `Garage Principal -> Point de Prise en Charge`.
        - **Van B (basé au Sous-Garage Paris) :** Il calcule le coût du trajet `Sous-Garage Paris -> Point de Prise en Charge`.
    4. **Critère de Sélection (Configurable) :** Le système compare les coûts d'approche.
        - **Par Défaut ("Temps avec Trafic") :** Il utilise une API (Google Maps) pour obtenir le temps de trajet estimé en conditions réelles et choisit le plus rapide. C'est la méthode la plus fiable.
        - **Alternative ("Distance") :** Il choisit le trajet le plus court en kilomètres.
    5. **Sélection Finale :** Le système désigne le **véhicule et sa base de départ** comme étant la **solution optimale** pour exécuter la mission. Toutes les informations (distance, temps, coût de ce trajet d'approche optimal) sont mémorisées pour l'étape suivante.
    
    **Optimisation Technique "Pre-Filtering" (Réduction des Coûts API) :**
    
    Pour éviter d'appeler l'API Google Maps (payante) pour 50 véhicules à chaque devis, le système applique un filtre en entonnoir :
    
    1. **Filtre Mathématique (Gratuit) :** Le système calcule la distance "à vol d'oiseau" (formule Haversine) entre toutes les bases disponibles et le client. Il élimine immédiatement les bases aberrantes (ex: > 100km).
    2. **Cache Intelligent :** Le système vérifie s'il a déjà calculé un trajet similaire (ex: Dépôt Bussy -> Paris 8ème) dans les dernières 24h. Si oui, il utilise la donnée en cache.
    3. **Appel API Ciblé :** Il n'interroge Google Maps Matrix API que pour les **3 à 5 meilleurs candidats** restants pour obtenir le temps de trafic réel précis.

### **Étape 3 : Calcul de la Rentabilité Interne Prévisionnelle**

Le système calcule le coût total de l'opération pour votre entreprise, du début à la fin.

- **Processus Détaillé :**
    1. **Simulation de la "Boucle Complète" :** Le système simule l'intégralité du cycle de vie de la mission :
        - **Segment A (Approche) :** Trajet à vide depuis la **base optimale** (déterminée à l'étape 2) jusqu'au client.
        - **Segment B (Course) :** Trajet avec le client, de son point de départ à sa destination.
        - **Segment C (Retour) :** Trajet à vide depuis la destination du client jusqu'à la **base d'origine** du véhicule assigné.
    2. **Chiffrage des Coûts Internes :** Le moteur `Trip Transparency` est utilisé ici, mais avec des **tarifs de coût** internes que vous configurez :
        - `costPerKm` : Coût de l'usure, de l'entretien et de l'assurance ramené au kilomètre.
        - `fuelCostPerLiter` : Coût actuel du carburant.
        - `driverHourlyCost` : Coût horaire complet d'un chauffeur (salaire brut + charges patronales).
    3. **Formule :** `Coût Total Interne = Coût(Segment A) + Coût(Segment B) + Coût(Segment C)`.
- **Output pour l'Opérateur :** L'information est restituée de manière claire et actionnable.
    - **Indicateur de Rentabilité :** Un code couleur (🔴/🟠/🟢) visible immédiatement.
    - **Détail sur Demande :** L'opérateur peut cliquer pour voir le détail complet : `Prix de Vente Suggéré: 150€`, `Coût Interne Total: 95€`, `Marge Brute: 55€ (36.7%)`.

### **Étape 4 : Application de la Hiérarchie de Tarification (Calcul du Prix de Vente)**

Ce processus s'exécute en parallèle de l'étape 3 pour déterminer le prix qui sera présenté au client.

- **Processus Séquentiel Strict :**
    1. **Test 1 (Priorité #1) - Tarification par Zones (détaillée en Partie 6) :**
        - Le système vérifie si le **trajet du client (Segment B)** correspond à une route forfaitaire entre deux zones définies (ex: `Paris Centre -> CDG`).
        - **Si OUI :** Le prix de vente est le tarif fixe de cette route. **Le processus s'arrête ici.**
    2. **Test 2 (Priorité #2) - Tarification "Classiques" :**
        - Si le test 1 échoue, le système vérifie si le trajet correspond à une excursion forfaitaire de la grille (ex: "Journée Mont-Saint-Michel").
        - **Si OUI :** Le prix de vente est le tarif du forfait. **Le processus s'arrête ici.**
    3. **Test 3 (Fallback) - Tarification Dynamique :**
        - Si tous les autres tests échouent, le système calcule le prix de vente en se basant sur la distance et la durée du **trajet client (Segment B) uniquement**, en utilisant les **tarifs de vente** au km/heure et en appliquant les éventuels multiplicateurs de zone.

### **Étape 5 : Synthèse et Aide à la Décision Stratégique de l'Opérateur**

C'est l'étape finale où le système présente ses conclusions à l'opérateur, qui conserve le contrôle total.

- **L'Interface de Devis Idéale doit afficher :**
    1. **Prix de Vente Suggéré :** `150 €` (calculé à l'étape 4).
    2. **Indicateur de Rentabilité :** 🟢 (calculé à l'étape 3).
    3. **Détails Opérationnels :** "Mission rentable. Assignation optimale : Véhicule `VAN-02` depuis la base `Paris Centre`. Coût d'approche estimé : 5 €."
    4. **Options d'Override :**
        - Un champ pour **modifier manuellement le prix final**.
        - Un menu pour **forcer l'assignation d'un autre véhicule ou d'une autre base de départ** (le système recalculerait alors instantanément la rentabilité).
    5. **Actions Stratégiques :** Des boutons contextuels comme "Proposer de sous-traiter" si la rentabilité est négative.

Ce processus garantit que chaque devis est non seulement calculé selon les bonnes règles, mais aussi validé d'un point de vue stratégique et économique.

---

## **Partie 4 (Version Finale Détaillée) : Gestion des Scénarios Complexes - Contraintes Humaines, Réglementaires et Logistiques**

Cette section détaille comment le système doit modéliser et intégrer les scénarios complexes qui ne relèvent pas du simple calcul géographique ou kilométrique. Ces scénarios sont souvent ceux où l'expertise humaine est primordiale. Le logiciel doit donc agir comme un **assistant intelligent** qui quantifie les contraintes, prévient les erreurs, propose des optimisations et garantit la conformité légale.

### **4.1. Le Scénario de la Réglementation "Poids Lourd" : Le Mur Infranchissable**

C'est le scénario le plus contraignant et le plus critique à modéliser. Il s'active dès qu'un véhicule est identifié comme **"Lourd"** (selon les critères de poids ou de nombre de passagers). À cet instant, le système doit basculer d'un "calculateur de prix" à un "planificateur logistique et réglementaire" avant toute chose.

### **Module Clé : Le Validateur de Conformité Automatique**

Avant même de pouvoir générer un prix pour une mission impliquant un véhicule lourd, le programme de la journée du chauffeur doit passer à travers un **"validateur de conformité"**. Ce module est une série de vérifications logiques qui s'assurent que la mission est **légalement réalisable**.

**Processus de Validation Détaillé (appliqué à la "boucle complète" du chauffeur) :**

1. **Calcul de l'Amplitude Totale de Service :**
    - **Définition :** L'amplitude est le temps total écoulé entre le moment où le chauffeur insère sa carte dans le chronotachygraphe (généralement au départ du dépôt) et le moment où il la retire à la fin de sa journée (à son retour au dépôt).
    - **Vérification :** Le système calcule cette durée totale et vérifie qu'elle est :
        - `<= 14 heures` pour un chauffeur seul.
        - `<= 18 heures` pour un double équipage.
    - **Action en cas de dépassement :** Le système lève une **alerte bloquante** de type `INFRACTION_AMPLITUDE`.
2. **Calcul du Temps de Conduite Cumulé :**
    - **Définition :** C'est le temps de conduite effectif, lorsque les roues tournent.
    - **Vérification :** Le système calcule le temps de conduite pur pour toute la mission (Segment A + B + C) en utilisant la moyenne de 85 km/h. Il vérifie que le total est `<= 10 heures`.
    - **Action en cas de dépassement :** Le système lève une **alerte bloquante** de type `INFRACTION_TEMPS_CONDUITE`. C'est l'alerte la plus critique, car elle n'a quasiment aucune tolérance.
3. **Planification des Pauses Réglementaires :**
    - **Définition :** Une pause de 45 minutes est obligatoire après 4h30 de conduite.
    - **Vérification :** Le système analyse le plan de route. Si un segment de conduite ininterrompue dépasse 4h30, il doit automatiquement insérer une pause de 45 minutes dans le calcul du temps de trajet total.
    - **Exemple :** Un trajet de 5h15 de conduite sera automatiquement transformé en un trajet de 6h00 au total (`5h15 + 0h45`).
4. **Vérification du Repos Journalier Obligatoire :**
    - **Définition :** Un repos minimum de 9 heures consécutives est obligatoire entre deux services.
    - **Vérification :** Lors de l'assignation d'un chauffeur, le système doit interroger son planning et vérifier l'heure de fin de sa mission précédente. Il s'assure que `Heure_Début_Mission_Actuelle >= Heure_Fin_Mission_Précédente + 9 heures`.
    - **Action en cas de non-respect :** Le chauffeur est marqué comme "non disponible" pour cette mission, avec le motif "Repos insuffisant".

### **Le Module d'Aide à la Décision : Le Générateur de Solutions**

Si le validateur lève une alerte bloquante, le système ne doit pas simplement afficher une erreur. Il doit se comporter comme un opérateur expert et **proposer des solutions chiffrées**.

- **Scénario Détaillé (Aller-retour Bretigny-Lyon - 10h30 de conduite) :**
    - **Alerte Système :** "INFRACTION DE TEMPS DE CONDUITE. Le programme requiert 10h30 de conduite, dépassant le maximum légal de 10h00 pour un chauffeur seul."
    - L'interface présente alors à l'opérateur les options suivantes :

| Option Proposée | Description Détaillée | Impact sur le Coût du Devis |
| --- | --- | --- |
| **1. Double Équipage** | "Assigner deux chauffeurs (Chauffeur A + Chauffeur B) pour l'intégralité de la mission. L'amplitude sera étendue à 18h et le temps de conduite sera partagé." | `+ [Coût d'une journée complète de chauffeur]` (ex: +300 €) |
| **2. Relais Chauffeur (Optimisation)** | "Le chauffeur principal effectuera 9h50 de conduite. Un relais est nécessaire pour les 40 dernières minutes du trajet retour. Le système suggère un point de relais sur l'A6 près de Melun." | `+ [Coût d'une intervention relais]` (ex: +100 €) |
| **3. Transformer en Mission de 2 Jours** | "Le programme est irréalisable en une journée. Proposer une nuit sur place. Le chauffeur déposera les clients, passera la nuit à Lyon, et effectuera le retour le lendemain." | `+ [Coût Nuit d'Hôtel + Repas J1/J2 + Prime Découcher]` (ex: +210 €) |

L'opérateur peut alors analyser ces options, discuter avec le client si nécessaire (pour l'option 3), et choisir la solution la plus adaptée. Le devis est ensuite automatiquement recalculé avec les surcoûts correspondants.

### **4.2. Le Scénario Innovant de la "Multi-Licences" : L'Optimisation Humaine**

Cette fonctionnalité est un avantage compétitif majeur qui doit être pleinement exploité par le système de planification et de tarification.

### **Logique de Suivi des Heures par Type de Licence**

Le système doit être capable de suivre les temps de service d'un chauffeur sur **plusieurs "compteurs" réglementaires distincts** au cours de la même journée civile.

- **Modélisation Technique :**
    - Le profil d'un `Driver` contient la liste de ses permis (`DriverLicense[]`).
    - Le planning journalier d'un chauffeur n'est plus une simple liste de missions, mais une liste où chaque mission est associée à un type de véhicule et donc à un **type de réglementation appliquée**.
    - **Exemple de Fiche de Service Journalière pour "Adam" (Permis B et D) :**
        - **Compteur "Lourd" (Permis D) :**
            - 08:00 - 17:00 : Mission Autocar.
            - *Amplitude utilisée :* 9h00 (sur 14h00 max).
            - *Conduite utilisée :* 5h00 (sur 10h00 max).
            - *Statut :* Limites journalières "Lourd" non atteintes, mais plus de mission "Lourd" possible si cela dépasse l'amplitude.
        - **Compteur "Léger" (Permis B) :**
            - 18:00 - 22:00 : Mission Van (véhicule léger).
            - *Heures de travail léger :* 4h00.
            - *Statut :* Conforme au droit du travail standard.
    
    ### **Le Moteur d'Optimisation Multi-Licences**
    
    Lors de la recherche d'un chauffeur, le système doit intégrer cette capacité d'optimisation.
    
    - **Scénario "Extension de Journée par Auto-Relais" (15.1) :**
        - **Demande :** Un client a besoin d'un autocar (lourd) de 9h à 17h, puis d'un van (léger) de 19h à 22h.
        - **Analyse du Système :**
            1. Le système identifie que deux types de véhicules/réglementations sont requis.
            2. **Recherche Standard :** Il chercherait un chauffeur pour le car ET un autre pour le van.
            3. **Recherche Optimisée :** Il doit **prioritairement** rechercher un **chauffeur unique possédant les deux permis** (B et D) et dont les plannings "Lourd" et "Léger" sont libres sur les créneaux respectifs.
            4. **Comparatif de Coût :** Le système présente à l'opérateur un comparatif clair :
                - *Option 1 (Standard) :* Coût Chauffeur A (journée) + Coût Chauffeur B (soirée) = 450 €.
                - *Option 2 (Optimisée Multi-Licence) :* Coût Chauffeur Adam (journée + prime) = 400 €. **Économie : 50 €.**
    - **Scénario "Assignation par Score de Flexibilité" (15.2) :**
        - **Logique :** L'algorithme d'assignation doit aller au-delà de la simple disponibilité. Il doit calculer un "score de flexibilité" pour chaque chauffeur (basé sur le nombre de ses permis).
        - **Processus :**
            1. Une demande arrive pour un client tagué comme "VIP / Imprévisible".
            2. Le système identifie plusieurs chauffeurs disponibles.
            3. Au lieu de proposer uniquement le plus proche, il présente une liste triée par un score combinant proximité et flexibilité.
            4. **Affichage pour l'Opérateur :**
                - **Suggestion #1 :** Chauffeur B (Permis B+D). *Flexibilité : Élevée. Recommandé pour ce client.*
                - **Suggestion #2 :** Chauffeur A (Permis B). *Flexibilité : Standard.*
        - Cette aide à la décision permet de réduire les risques opérationnels en assignant la bonne ressource humaine, pas seulement la moins chère.

---

## **Partie 5 (Version Finale Détaillée) : Analyse Stratégique - Le Défi de la Rentabilité sur les Trajets Courts face aux Plateformes VTC**

Cette section aborde de manière exhaustive le défi commercial et opérationnel le plus critique pour une entreprise de transport planifié : la concurrence frontale avec les plateformes de VTC à la demande (comme Uber, Bolt, etc.), en particulier sur le segment des trajets courts et intra-urbains.

Le système de tarification ne peut pas ignorer cette réalité. Il doit être conçu non seulement comme un outil de calcul, mais comme un **bouclier stratégique** pour protéger la rentabilité et comme une **arme commerciale** pour savoir quand et comment accepter une course.

### **5.1. Le Conflit Fondamental des Modèles Opérationnels : Une Analyse Détaillée**

Pour comprendre la source du problème, il est impératif de disséquer les deux modèles économiques qui s'affrontent.

### **Votre Modèle : Le Transport Planifié à Valeur Ajoutée**

- **Structure Centralisée :** Vos véhicules et chauffeurs partent d'un ou plusieurs points fixes connus : le **dépôt principal** (ex: en banlieue) et potentiellement des **bases secondaires**. C'est un modèle "hub-and-spoke".
- **Le Coût Incompressible du "Deadhead" :** Chaque mission commence par un **trajet d'approche à vide**, du dépôt au point de prise en charge du client. Ce trajet a un coût direct (carburant, usure du véhicule) et un coût indirect très élevé (le temps du chauffeur, qui est rémunéré mais non facturé au client). De même, après avoir déposé le client, il y a un trajet de retour à vide. Ce "deadhead" est une charge structurelle.
- **Spécialisation :** Ce modèle est naturellement optimisé pour les courses où le coût du "deadhead" peut être amorti, c'est-à-dire les **trajets à forte valeur ajoutée** :
    - **Longues distances :** Le prix élevé du trajet client rend le coût d'approche proportionnellement faible.
    - **Mises à disposition :** Le chauffeur est facturé à l'heure, ce qui couvre l'intégralité de son temps d'immobilisation.
    - **Transferts aéroports :** Ce sont des forfaits dont le prix est calculé pour inclure le coût moyen d'approche.
- **Structure de Coûts :** Votre entreprise supporte des coûts fixes importants (loyer du dépôt, salaires des chauffeurs, assurance de la flotte, maintenance), que les véhicules roulent ou non. La rentabilité dépend de la maximisation du temps facturable de chaque ressource.

### **Le Modèle des Plateformes VTC : La Flotte Nomade et Décentralisée**

- **Structure Décentralisée :** Il n'y a pas de dépôt. La "flotte" est un réseau de chauffeurs indépendants qui se positionnent stratégiquement et de manière autonome dans les zones de forte demande (gares, aéroports, centres-villes).
- **Le "Deadhead" Quasi Inexistant :** Le concept de trajet d'approche est totalement différent. Le chauffeur n'est pas payé pour attendre. Son temps de travail commence réellement lorsque la course est acceptée. Le trajet pour rejoindre le client est de quelques minutes seulement et fait partie intégrante du modèle. Il n'y a pas de long trajet "dépôt -> client".
- **Spécialisation :** Ce modèle est optimisé pour le **volume et la rotation rapide sur des trajets courts**. La rentabilité d'un chauffeur dépend de sa capacité à enchaîner un maximum de petites courses avec un minimum de temps d'attente entre elles.
- **Structure de Coûts :** La plateforme a des coûts technologiques et marketing, mais les coûts opérationnels (véhicule, assurance, carburant, entretien) sont entièrement **reportés sur le chauffeur indépendant**. Le modèle économique de la plateforme est basé sur une commission prélevée sur chaque transaction, ce qui le rend extrêmement scalable.

**Conclusion Nette de l'Analyse :**
Vous ne vous battez pas à armes égales sur les trajets courts. Votre structure de coûts, et en particulier le "deadhead", vous rend structurellement non compétitif sur ce segment si vous appliquez une logique de calcul simpliste. Tenter de concurrencer Uber sur le prix d'un transfert de 15 minutes dans Paris est une voie directe vers la perte financière.

### **5.2. L'Impact Dévastateur du Coût d'Approche : La Dissection d'un Trajet à 80 €**

Illustrons de manière détaillée pourquoi une course facturée 80 €, qui semble rentable en surface, est en réalité une perte financière.

- **La Demande :** Une agence partenaire vous impose un transfert simple dans Paris intra-muros, facturé **80 €** (tarif de la grille). Le trajet client dure 20 minutes.
- **Le Scénario Opérationnel :** Votre seul véhicule adapté disponible, une berline, doit partir de votre dépôt principal en banlieue.

**Analyse Détaillée de la Rentabilité Réelle (Calcul que le système doit effectuer en interne) :**

1. **Segment A - Trajet d'Approche à Vide :**
    - Itinéraire : Dépôt (Bussy-Saint-Martin) -> Point de prise en charge (Paris 8ème).
    - Distance : ~30 km.
    - Temps estimé (avec trafic moyen) : 50 minutes.
    - **Coût du Segment A :**
        - Coût Carburant/Usure : `30 km * 0.25 €/km (coût interne) = 7,50 €`.
        - Coût Temps Chauffeur : `(50 / 60) * 25 €/h (coût horaire chauffeur) = 20,83 €`.
        - **Total Coût Approche = 28,33 €**.
2. **Segment B - Trajet avec le Client :**
    - Itinéraire : Paris 8ème -> Paris 16ème.
    - Distance : ~5 km.
    - Temps : 20 minutes.
    - *(Le prix de vente est déjà fixé à 80€, mais le coût interne est calculé)*.
    - **Coût du Segment B :**
        - Coût Carburant/Usure : `5 km * 0.25 €/km = 1,25 €`.
        - Coût Temps Chauffeur : `(20 / 60) * 25 €/h = 8,33 €`.
        - **Total Coût Course = 9,58 €**.
3. **Segment C - Trajet de Retour à Vide :**
    - Itinéraire : Paris 16ème -> Dépôt (Bussy-Saint-Martin).
    - Distance : ~35 km.
    - Temps estimé : 60 minutes.
    - **Coût du Segment C :**
        - Coût Carburant/Usure : `35 km * 0.25 €/km = 8,75 €`.
        - Coût Temps Chauffeur : `(60 / 60) * 25 €/h = 25,00 €`.
        - **Total Coût Retour = 33,75 €**.
4. **Bilan Financier de l'Opération :**
    - **Temps total d'immobilisation de la ressource (chauffeur + véhicule) :** `50 min + 20 min + 60 min = 130 minutes`.
    - **Coût Opérationnel Total pour l'Entreprise :** `28,33 € (Approche) + 9,58 € (Course) + 33,75 € (Retour) = **71,66 €**`.
    - **Marge Brute :** `80 € (Prix de Vente) - 71,66 € (Coût Opérationnel) = **8,34 €**`.

**Conclusion :** La marge brute de 8,34 € est si faible qu'elle ne couvre même pas les coûts de structure de l'entreprise (salaires administratifs, loyer, marketing, etc.) attribuables à cette course. C'est une **opération à perte nette**. Le système doit être capable de faire ce calcul et de le communiquer clairement à l'opérateur.

### **5.3. Comment le Logiciel Doit Résoudre ce Défi Stratégique : Les Modules Essentiels**

Le système de tarification doit être enrichi de modules d'aide à la décision pour transformer ces contraintes en opportunités.

### **Module 1 : Le Calculateur de Rentabilité Réelle (Évolution du Scénario 17)**

Ce module est le "cerveau" analytique du système. Il doit être au cœur de chaque décision de devis.

- **Logique Détaillée :**
    1. Pour chaque nouvelle demande, le système doit **simuler la "boucle complète"** (Approche + Course + Retour) comme détaillé ci-dessus.
    2. Il doit le faire pour **chaque base disponible** (garage principal et sous-garages) afin d'identifier la **base de départ optimale** qui minimise le coût d'approche.
    3. Il calcule la **marge prévisionnelle** : `Marge = Prix_de_Vente_Potentiel - Coût_Opérationnel_Total_Simulé`.
    4. L'interface de l'opérateur doit présenter cette information de manière intuitive :
        - **Indicateur de Rentabilité :** Un code couleur (🔴/🟠/🟢).
        - **Détail au survol (pour l'opérateur expert) :** Afficher la décomposition : `Prix Vente: 80€ | Coût Op.: 72€ | Marge: 8€ (10%)`.

### **Module 2 : L'Optimisation par "Chaînage de Courses" (Évolution du Scénario 6)**

C'est la stratégie la plus efficace pour rendre les trajets courts rentables : **éradiquer le trajet à vide**.

- **Logique Détaillée :**
    1. Lorsqu'une nouvelle demande arrive (ex: Prise en charge à 15h au Ritz), l'algorithme d'assignation ne se contente pas de chercher un chauffeur "libre".
    2. Il doit **prioritairement scanner le planning** pour trouver un chauffeur qui **termine une mission précédente à une heure et un lieu compatibles**.
    3. **Critères de compatibilité :**
        - **Géographique :** Le point de dépose de la mission N-1 est à moins de X minutes/km du point de prise en charge de la mission N.
        - **Temporel :** L'heure de fin de la mission N-1 est antérieure à l'heure de début de la mission N, avec une marge suffisante.
    4. Si un tel "chaînage" est possible, le système le propose en **priorité absolue** à l'opérateur, en affichant un indicateur de rentabilité très élevé (🟢🟢🟢), car le coût d'approche est quasi nul.

### **Module 3 : Le Module de Sous-Traitance Intelligente (Évolution du Scénario 10)**

La sous-traitance est une soupape de sécurité stratégique.

- **Logique Détaillée :**
    1. Le système doit permettre de créer une base de données de **partenaires sous-traitants**, en y associant leurs zones de prédilection et, idéalement, leurs grilles tarifaires.
    2. Lorsqu'une course imposée par une agence est identifiée comme "à perte" (🔴), le système doit automatiquement :
        - Vérifier si un partenaire est disponible dans la zone.
        - Calculer la **marge de sous-traitance** : `Marge = Prix_Vente_Agence - Coût_Achat_Partenaire`.
    3. L'opérateur reçoit une proposition claire : "Cette course est à perte (-18€) avec nos propres ressources. Alternative : Sous-traiter à 'Partenaire VTC Paris' pour une marge de +10€. Confirmer ?".

Ce processus transforme la sous-traitance d'une solution de dernier recours en une stratégie de gestion de la rentabilité et de la satisfaction client.

### **Module 4 : Le "Yield Management Inversé" (Gestion des Retours à Vide / Empty Legs)**

Ce module transforme une perte sèche (le retour à vide d'un autocar ou d'un van) en opportunité de marge pure.

- **Logique Détaillée :**
    1. Le système identifie les "trajets à vide confirmés" dans le planning (ex: un Autocar rentre vide de Lyon à Paris le 10 mai de 14h à 20h).
    2. Si une nouvelle demande arrive pour un trajet correspondant à ce **couloir géographique et temporel** (ex: un groupe cherche Beaune -> Paris ce jour-là), le système le détecte.
    3. **Action "Opportunité" :** Au lieu de calculer le prix standard (qui inclurait l'approche et le retour), le système suggère à l'opérateur d'appliquer un **"Tarif Empty Leg"** (ex: -30% à -50% du prix marché).
    4. **Rentabilité :** Comme le coût du retour est déjà amorti par le client initial, ce prix réduit représente **100% de marge bénéficiaire** pour l'entreprise.

---

---

## **Partie 6 (Version Finale Détaillée) : Système de Tarification par Zones Géographiques Complexes**

Cette section constitue le plan directeur pour le développement de votre système de tarification forfaitaire (Méthode 1). Elle détaille l'architecture, la logique et les algorithmes nécessaires pour traduire vos schémas et votre expertise métier en un outil logiciel fonctionnel, robuste et scalable.

### **6.1. Le Problème Stratégique : Pourquoi un Calcul par Zones est Indispensable**

Dans une ville comme Paris, le temps est un facteur plus coûteux que la distance. Un trajet de 5 km peut prendre 15 minutes ou 1h15 selon le trafic. Les modèles de plateformes (Uber, Bolt) compensent cela par des majorations dynamiques en temps réel. Pour un service de transport planifié, cette approche n'est pas possible au moment du devis.

Le système de zones résout ce problème en créant des **forfaits géographiques**. Il reconnaît que le coût d'opération dans le centre de Paris est intrinsèquement élevé, justifiant un prix fixe qui couvre le risque "temps", indépendamment de la distance exacte parcourue.

### **6.2. Architecture du Système : Zones, Routes et Tarifs**

Le système s'articule autour de trois concepts de configuration, inspirés de l'ergonomie de Moovs mais adaptés à votre logique métier.

**A. Configuration des Zones : Flexibilité Géographique**

L'opérateur doit pouvoir définir des zones via une interface cartographique de plusieurs manières :

1. **Par Rayon (Pin Drop + Radius) :** Pour définir des points d'intérêt précis (aéroports, parcs d'attractions, quartiers d'affaires). L'opérateur place un marqueur et définit un rayon. C'est la méthode la plus précise.
2. **Par Codes Postaux (ZIP Codes) :** Pour couvrir des zones administratives larges (ex: "Paris Intra-Muros" en sélectionnant tous les codes de 75001 à 75020).
3. **Par Polygone (Dessin Libre) :** Pour créer des zones aux formes complexes qui ne sont ni circulaires ni administratives (ex: suivre le cours d'un fleuve, un quartier spécifique).

**B. Modèle Conceptuel des Zones pour Paris (Basé sur vos schémas)**

Votre logique s'appuie sur un modèle hiérarchique de zones concentriques :

- **Zone 0 (Le Centre) :** Paris Intra-Muros.
- **Zone 1 (Couronne Proche) :** Première ceinture de banlieue.
- **Zone 2 (Couronne Éloignée) :** Deuxième ceinture.
- **Zones "Satellites" :** Points d'intérêt spécifiques comme CDG, Orly, Versailles, Disneyland, qui ont leurs propres règles et ne font pas partie des couronnes.

**C. Définition des Tarifs par Route**

Une fois les zones définies, le système génère des "routes" (connexions entre zones) pour lesquelles l'opérateur fixe les prix :

- **Prix Fixe pour les Routes Définies :** Pour une route `Zone A -> Zone B`, l'opérateur définit un prix de base par type de véhicule.
- **Multiplicateur de Zone :** Pour chaque zone de type "couronne" (Zone 1, 2, etc.), l'opérateur définit un **multiplicateur de prix** (ex: 1.2 pour la Zone 1). Ce multiplicateur sera crucial pour les trajets "circulaires" (voir Scénario 21).

### **6.3. L'Algorithme de Calcul Hiérarchique**

Pour chaque demande de transfert, le système doit suivre un processus de décision strict pour déterminer quel modèle de tarification appliquer.

1. **Étape 1 : Analyse Géographique**
    - Le système géolocalise les adresses de départ (A) et d'arrivée (B) et détermine à quelles zones `Zone_A` et `Zone_B` elles appartiennent.
2. **Étape 2 : Détection du Scénario de Zone**
    - **Cas 1 : Trajet Intra-Zone Centrale (`Zone_A == Zone_B == Zone 0`)**
        - Le système applique le **prix forfaitaire** défini pour la route "Zone 0 -> Zone 0". **FIN DU CALCUL.**
    - **Cas 2 : Trajet Radial ou vers Satellite (`Zone_A = Zone 0`, `Zone_B != Zone 0`)**
        - Le système recherche le **prix fixe** défini pour la route `Zone 0 -> Zone_B`. **FIN DU CALCUL.**
    - **Cas 3 : Trajet Circulaire (`Zone_A == Zone_B != Zone 0`)**
        - Le système **n'applique PAS de prix fixe**. Il active le **moteur de calcul dynamique (Méthode 2)** et lui applique le **multiplicateur** de la zone. Le prix sera proportionnel à la distance, mais majoré. **FIN DU CALCUL.**
    - **Cas 4 : Trajet Transversal (traversant plusieurs zones)**
        - Le système décompose l'itinéraire en segments. Le prix est la **somme des prix de chaque segment**, ou un forfait dédié si la route est fréquente (ex: Versailles -> Disney).
    - **Cas 5 : Trajet Hors-Zone**
        - Si l'un des points (ou les deux) n'est dans aucune zone définie, le système ignore la logique de zone et passe à l'étape 3.
3. **Étape 3 : Logique de Repli (Fallback)**
    - Si aucun scénario de zone ne s'applique, le système vérifie si le trajet est un "classique" longue distance (Mont-Saint-Michel, etc.).
    - Si ce n'est toujours pas le cas, il utilise le **moteur de calcul dynamique pur (Méthode 2)**.

### **6.4. Scénarios Réalistes pour Tester la Logique**

- **Scénario 19 (Trajet Intra-Paris) :**
    - **Demande :** Berline de la Gare de Lyon (Zone 0) à l'Arc de Triomphe (Zone 0).
    - **Calcul :** Le système détecte `Zone 0 -> Zone 0`. Il applique le tarif fixe de la grille : **80 €**.
- **Scénario 20 (Trajet Paris -> Banlieue) :**
    - **Demande :** Van de Paris (Zone 0) à Noisy-le-Grand (Zone 3, selon le schéma).
    - **Calcul :** Le système détecte `Zone 0 -> Zone 3`. Il applique le tarif fixe correspondant : **120 €**.
- **Scénario 21 (Trajet Circulaire - Le plus complexe) :**
    - **Demande :** Van de La Défense (Zone 1) à Saint-Denis (Zone 1).
    - **Calcul :** Le système détecte `Zone 1 -> Zone 1`. Il n'applique pas de prix fixe. Il calcule la distance et la durée du trajet via Google Maps (ex: 15 km, 30 min) et applique le calcul dynamique avec le multiplicateur de la Zone 1 (disons x1.1).
        - `Prix = (15km * 2€/km * 1.1) + (0.5h * 60€/h * 1.1) = 33€ + 33€ = 66€`. Le prix est proportionnel tout en étant plus cher qu'en rase campagne.
- **Scénario 22 (Trajet Transversal) :**
    - **Demande :** Van de Versailles (Zone Satellite) à l'aéroport CDG (Zone Satellite).
    - **Calcul :** Le système décompose le trajet en `Versailles -> Paris` et `Paris -> CDG`.
        - Il additionne les deux prix forfaitaires : `110 € (de la grille) + 150 € (de la grille) = 260 €`.
        - Il pourrait appliquer une légère réduction "combo" pour arriver à un prix de marché de `240 €`.

### **6.5. Différenciation et Avantages par rapport à la Solution Moovs**

| Fonctionnalité | Système Moovs (Analyse) | **Votre Système Proposé (Avantages)** |
| --- | --- | --- |
| **Modèle de Zone** | Générique (polygones, codes postaux). | **Hiérarchique et Concentrique.** Modélise la réalité de l'expansion urbaine et la dégressivité des coûts en s'éloignant du centre. |
| **Trajets Intra-Zone** | Un prix fixe pour `Zone A -> Zone A`. Potentiellement injuste si la zone est grande. | **Logique Hybride.** Prix fixe pour la zone centrale (où le trafic rend la distance non pertinente), mais **calcul dynamique avec multiplicateur** pour les couronnes (où la distance redevient un facteur). C'est beaucoup plus juste et précis. |
| **Gestion des Trajets Complexes** | Non détaillé, semble se limiter à des routes A->B. | **Décomposition de Trajet.** Capable de décomposer un trajet transversal en segments et d'additionner leurs coûts respectifs, permettant de tarifer n'importe quel itinéraire complexe de manière logique. |
| **Intégration** | Le calcul par zone est une alternative binaire au calcul kilométrique. | **Système de Hiérarchie Complète.** La tarification par zone est la **première étape d'un processus de décision à plusieurs niveaux** (Zones -> Classiques -> Dynamique), créant un moteur de prix unifié et sans faille. |
| **Scalabilité** | Bonne. | **Excellente.** Le modèle de couronnes et de multiplicateurs peut être appliqué à n'importe quelle métropole (Londres avec ses zones 1-6, New York, etc.), tout en permettant la création de zones "satellites" spécifiques à chaque ville. |

**En résumé, votre système est supérieur car il est plus "intelligent".** Il ne se contente pas d'appliquer un prix fixe à une zone, il comprend la *nature* de la zone (centre, couronne) et la *nature* du trajet (radial, circulaire) pour appliquer la méthode de calcul la plus appropriée, combinant la rigidité des forfaits et la flexibilité du calcul dynamique.

---

## **Partie 7 (Nouvelle Section) : Catalogue Exhaustif des Scénarios de Tarification**

Cette section sert de guide de référence complet, illustrant comment le moteur de tarification intelligent doit réagir face à une multitude de demandes, des plus basiques aux plus complexes. Elle rassemble et met en application tous les concepts définis dans les parties précédentes.

### **Catégorie A : Les Transferts Simples (Point A vers Point B)**

Ces scénarios couvrent les demandes les plus courantes : un trajet unique sans attente prolongée.

### **Scénario 7.1 : Le Trajet Forfaitaire Intra-Zone (Le "Classique Parisien")**

- **Contexte :** C'est le scénario le plus basique géré par la **Méthode 1 (Forfaitaire)**. Il s'applique à un trajet dont le départ et l'arrivée sont contenus dans la même zone à tarif fixe.
- **Déclencheur :** Le système détecte que `Zone_Depart.id == Zone_Arrivee.id` ET que cette zone est configurée avec un prix fixe (ex: la `isCentralZone`).
- **Exemple Concret et Détaillé :**
    - **Demande :** Une agence partenaire réserve une **Berline** pour aller de "Place de l'Opéra, 75009 Paris" à "Musée du Louvre, 75001 Paris".
    - **Processus du Système :**
        1. **Géolocalisation :** Le système identifie les coordonnées GPS des deux adresses.
        2. **Identification des Zones :** Il détermine que les deux points sont situés à l'intérieur de la zone "Paris Centre" (`PricingZone` où `isCentralZone = true`).
        3. **Activation de la Règle :** Le scénario "Trajet Intra-Zone Centrale" est déclenché.
        4. **Recherche du Tarif :** Le système recherche la route `Paris Centre -> Paris Centre` et trouve le `RouteRate` correspondant à la catégorie "Berline".
        5. **Affichage du Prix :** Le système affiche le prix forfaitaire de **80 €**.
- **Logique de Calcul :**
    - `Prix = RouteRate.basePrice`
- **Information pour l'Opérateur :** L'interface doit indiquer clairement que le prix est forfaitaire.
    - `Prix Suggéré : 80,00 €`
    - `Méthode de Calcul : Forfait Zone (Paris Centre)`
    - `Rentabilité :` 🔴 (Le calcul de rentabilité interne tourne toujours en arrière-plan et peut indiquer une perte, mais le prix de vente reste inchangé car il est contractuel).

### **Scénario 7.2 : Le Trajet Forfaitaire Inter-Zones (Le "Classique Aéroport")**

- **Contexte :** Un trajet reliant deux zones distinctes pour lesquelles un tarif forfaitaire a été explicitement défini.
- **Déclencheur :** Le système détecte que le trajet correspond à une `ZoneRoute` (`fromZoneId`, `toZoneId`) qui possède des `RouteRate` définis.
- **Exemple Concret et Détaillé :**
    - **Demande :** Un particulier demande un **Van** pour aller de "15 Rue de la Paix, 75002 Paris" à "Aéroport Charles de Gaulle, Terminal 2E".
    - **Processus du Système :**
        1. **Géolocalisation :** Le système identifie les coordonnées des deux adresses.
        2. **Identification des Zones :** Il détermine `Zone_Depart` = "Paris Centre" et `Zone_Arrivee` = "Aéroport CDG".
        3. **Activation de la Règle :** Le scénario "Route Forfaitaire Définie" est déclenché.
        4. **Recherche du Tarif :** Le système recherche la route `Paris Centre -> Aéroport CDG` et trouve le `RouteRate` correspondant à la catégorie "Van".
        5. **Affichage du Prix :** Le système affiche le prix forfaitaire de **150 €**.
- **Logique de Calcul :**
    - `Prix = RouteRate.basePrice`
- **Information pour l'Opérateur :**
    - `Prix Suggéré : 150,00 €`
    - `Méthode de Calcul : Forfait Route (Paris Centre -> CDG)`
    - `Rentabilité :` 🟢 (Ce type de trajet est généralement calculé pour être rentable).

### **Scénario 7.3 : Le Trajet Dynamique "Circulaire" (Le "Cas Bâtard" de la Banlieue)**

- **Contexte :** Un trajet dont le départ et l'arrivée se situent dans la même couronne de banlieue. Un prix fixe serait injuste car la distance peut varier énormément.
- **Déclencheur :** Le système détecte que `Zone_Depart.id == Zone_Arrivee.id` ET que cette zone **n'est pas** la zone centrale (`isCentralZone = false`).
- **Exemple Concret et Détaillé :**
    - **Demande :** Un particulier demande une **Berline** pour aller de "La Défense" (située en "Couronne 1") à "Saint-Denis" (également en "Couronne 1").
    - **Processus du Système :**
        1. **Géolocalisation & Identification :** Le système identifie les deux points comme appartenant à la "Couronne 1". La condition du scénario est remplie.
        2. **Activation de la Méthode 2 :** Le système bascule en mode de calcul dynamique.
        3. **Calcul de Base :** Il interroge Google Maps et obtient : `Distance = 15 km`, `Durée Estimée = 30 minutes`.
        4. **Récupération des Paramètres :**
            - Tarif/km Berline : 2,50 €
            - Tarif/heure Berline : 70 €
            - Multiplicateur de la "Couronne 1" : **1.1**
        5. **Calcul du Prix Dynamique Pondéré :**
            - Calcul basé sur la distance : `15 km * 2,50 €/km = 37,50 €`.
            - Calcul basé sur la durée : `0,5 h * 70 €/h = 35,00 €`.
            - Le système retient le maximum : `MAX(37,50, 35,00) = 37,50 €`.
            - Application du multiplicateur de zone : `37,50 € * 1.1 = 41,25 €`.
        6. **Affichage du Prix :** Le système affiche le prix final, potentiellement arrondi, de **41 € ou 42 €**.
- **Logique de Calcul :**
    - `Prix = MAX(distance * tarif_km, durée * tarif_heure) * Zone.priceMultiplier`
- **Information pour l'Opérateur :**
    - `Prix Suggéré : 41,25 €`
    - `Méthode de Calcul : Dynamique Pondéré (Zone: Couronne 1, Coeff: x1.1)`
    - `Détails : 15 km, 30 min.`

### **Scénario 7.4 : Le Trajet "Hors-Piste" (Le Calcul Dynamique Pur)**

- **Contexte :** Un trajet qui ne correspond à aucune règle de zone ou forfait. C'est le cas de repli général.
- **Déclencheur :** Le système a échoué à trouver une correspondance dans tous les scénarios forfaitaires précédents.
- **Exemple Concret et Détaillé :**
    - **Demande :** Un particulier demande un **Van** pour aller de "Aéroport d'Orly" à "Étampes".
    - **Processus du Système :**
        1. **Géolocalisation & Identification :** Le système identifie `Zone_Depart` = "Aéroport Orly" et `Zone_Arrivee` = `null` (Étampes n'est dans aucune zone).
        2. **Échec de la Tarification par Zone :** La condition "départ ET arrivée en zone" n'est pas remplie.
        3. **Échec de la Grille "Classiques" :** Le trajet "Orly -> Étampes" n'est pas un forfait prédéfini.
        4. **Activation de la Méthode 2 Pure :** Le système active le calcul dynamique.
        5. **Calcul de Base :** Il interroge Google Maps : `Distance = 35 km`, `Durée Estimée = 40 minutes`.
        6. **Récupération des Paramètres :**
            - Tarif/km Van : 3,00 €
            - Tarif/heure Van : 80 €
        7. **Calcul du Prix Dynamique :**
            - Calcul distance : `35 km * 3,00 €/km = 105,00 €`.
            - Calcul durée : `(40 / 60) h * 80 €/h = 53,33 €`.
            - Le système retient le maximum : `105,00 €`.
        8. **Ajout des Coûts `Trip Transparency` :** Le système ajoute les coûts estimés des péages (`+ 5,50 €`).
        9. **Affichage du Prix :** Le prix final suggéré est de `105,00 € + 5,50 € = **110,50 €**`.
- **Logique de Calcul :**
    - `Prix = MAX(distance * tarif_km, durée * tarif_heure) + coût_péages + coût_autres_frais`
- **Information pour l'Opérateur :**
    - `Prix Suggéré : 110,50 €`
    - `Méthode de Calcul : Dynamique (Hors-Zone)`
    - `Détails : 35 km, 40 min, Péages: 5,50 €`

### **Catégorie C : Les Scénarios Complexes et "Hybrides" (Zone + Logistique)**

Ces scénarios sont ceux où le système doit faire preuve d'intelligence pour combiner plusieurs logiques (prix fixe, calcul dynamique, rentabilité) afin de fournir une réponse cohérente.

### **Scénario 7.8 : Le Trajet "Transversal" (Périphérie -> Centre -> Périphérie)**

- **Contexte :** Un trajet qui traverse la zone centrale (Paris) pour relier deux zones satellites. Le simple calcul kilométrique serait injuste (trop bas), et il n'existe pas de prix fixe direct pour ce trajet spécifique dans la grille.
- **Déclencheur :** Le système détecte que l'itinéraire optimal traverse la Zone 0 mais que les points de départ et d'arrivée sont dans des zones satellites distinctes.
- **Exemple Concret et Détaillé :**
    - **Demande :** Un **Van** pour un trajet de **Versailles (Zone Satellite Ouest)** à **Disneyland Paris (Zone Satellite Est)**.
    - **Processus du Système :**
        1. **Analyse d'Itinéraire :** Le système identifie que le trajet naturel passe par Paris ou le périphérique.
        2. **Décomposition par Zones :** Il ne trouve pas de tarif fixe direct `Versailles -> Disney`.
        3. **Application de la Logique de Segments (voir Partie 6.3) :** Le système décompose le trajet en deux segments logiques basés sur la structure radiale du réseau :
            - Segment 1 : Versailles -> Paris Centre (Tarif Grille : 110 €).
            - Segment 2 : Paris Centre -> Disney (Tarif Grille : 150 €).
        4. **Calcul du Prix Brut :** `110 € + 150 € = 260 €`.
        5. **Ajustement Commercial Automatique (Optionnel) :** Le système peut être configuré pour appliquer une réduction "trajet direct" de 10% ou un montant fixe pour rester compétitif.
            - `Prix Final = 260 € - 20 € = 240 €`.
- **Logique de Calcul :**
    - `Prix = Tarif(Zone_Depart -> Zone_0) + Tarif(Zone_0 -> Zone_Arrivee) - Reduction_Combo`
- **Information pour l'Opérateur :**
    - `Prix Suggéré : 240,00 €`
    - `Méthode de Calcul : Combinaison de Forfaits (Versailles->Paris + Paris->Disney)`
    - `Détail : 110 € + 150 € - 20 € (Réduction Combo)`

### **Scénario 7.9 : Le Trajet "L" (Périphérie -> Périphérie sans passer par le Centre)**

- **Contexte :** Un trajet entre deux zones périphériques où l'itinéraire logique contourne la zone centrale (ex: via l'A86). La logique de traversée du centre (Scénario 7.8) ne s'applique pas.
- **Déclencheur :** L'itinéraire ne traverse pas la Zone 0. Il n'y a pas de prix fixe direct.
- **Exemple Concret et Détaillé :**
    - **Demande :** Un **Van** de **Aéroport d'Orly** à **Aéroport CDG**.
    - **Processus du Système :**
        1. **Recherche de Route Directe (Priorité 1) :** Le système cherche une route `Orly -> CDG`. Si l'opérateur a bien configuré son système, cette route **doit** exister car c'est un classique. Prix : **130 €**.
        2. **Calcul de Repli (si pas de route directe) :** Le système bascule en **calcul dynamique pondéré (Scénario 7.3)**.
            - Il calcule la distance/durée réelle (40 km, 50 min).
            - Il applique le **multiplicateur de zone le plus élevé** rencontré sur le trajet (ex: Couronne 2, x1.2).
            - `Prix = Calcul_Dynamique(40km, 50min) * 1.2 = ~115 €`.
- **Logique de Calcul (Recommandée) :**
    - Ce cas souligne l'importance de pré-configurer les liaisons inter-aéroports comme des `ZoneRoute` avec `RouteRate` fixe.
- **Information pour l'Opérateur :**
    - Si route directe : `Prix : 130 € (Forfait Route)`.
    - Si dynamique : `Prix : 115 € (Dynamique Pondéré)`.

### **Scénario 7.10 : Le Trajet "À Perte" Optimisé par Chaînage (Le "Prix d'Optimisation")**

- **Contexte :** Une demande de trajet court en banlieue qui serait normalement refusée car non rentable à cause du trajet d'approche, mais qui devient une opportunité en or grâce à la position d'un véhicule.
- **Déclencheur :** Le système détecte qu'un véhicule sera disponible à proximité immédiate du point de départ à l'heure demandée.
- **Exemple Concret et Détaillé :**
    - **Situation :** Un chauffeur a une course `Paris -> Versailles` qui se termine à 10h00. Il a une autre course au départ de Versailles à 14h30. Il est "échoué" sur place.
    - **Demande Entrante :** Un hôtel de Versailles appelle pour un transfert `Versailles -> Paris` à 11h00.
    - **Analyse Standard (Sans contexte) :**
        - Coût approche (depuis base) : 45 min. Coût course : 45 min.
        - Rentabilité : Très faible ou négative.
        - Prix normal : 110 €.
    - **Analyse Intelligente (Avec contexte) :**
        - Le système détecte le chauffeur sur place. **Coût d'approche = 0 €.**
        - Le chauffeur est payé à attendre. Cette course est du pur bonus.
        - Rentabilité : **Excellente**.
    - **Action du Système :** Il signale l'opportunité à l'opérateur et suggère un **"Prix d'Optimisation"** agressif pour remporter le marché face à la concurrence (Uber).
    - **Proposition :** `80 €` au lieu de 110 €.
- **Information pour l'Opérateur :**
    - `Prix Standard : 110,00 €`
    - `OPPORTUNITÉ DÉTECTÉE : Chauffeur [Nom] disponible sur place.`
    - `Coût d'approche réel : 0 €.`
    - `Prix Optimisé Suggéré : 80,00 € (pour garantir la vente)`
    - `Rentabilité à 80 € :` 🟢🟢 (Très élevée).

---

### **Catégorie D : Les Scénarios Réglementaires Critiques (Véhicules Lourds)**

Ces scénarios sont ceux où le système agit comme un garde-fou légal. Ils sont déclenchés par la nature du véhicule ("Lourd").

### **Scénario 7.11 : Le Trajet "Impossible" en Solo (Amplitude Doli)**

- **Contexte :** Une demande qui semble simple sur le papier (un aller-retour dans la journée) mais qui viole les règles d'amplitude horaire du chauffeur.
- **Déclencheur :** `Heure_Fin_Mission - Heure_Début_Mission > 14 heures`.
- **Exemple Concret et Détaillé :**
    - **Demande :** Un club de foot. Départ de Bretigny à 04h00 du matin. Retour prévu à Bretigny à 22h00 le soir même. Véhicule : Autocar.
    - **Analyse du Système :**
        - Amplitude demandée : 18 heures.
        - Limite légale chauffeur seul : 14 heures.
        - **Verdict :** `INFRACTION_AMPLITUDE`.
    - **Solutions Générées :**
        1. **Double Équipage :** 2 chauffeurs. Amplitude max passe à 18h. C'est faisable.
            - `Prix = Calcul_Standard + Coût_Chauffeur_Sup (300 €)`.
        2. **Relais Train :** Le chauffeur 1 fait l'aller. Un chauffeur 2 vient en train pour le retour. (Logistiquement complexe pour ce trajet précis, mais calculable).
- **Information pour l'Opérateur :**
    - `ALERTE : Amplitude de 18h dépasse la limite légale (14h).`
    - `Solution Recommandée : Double Équipage.`
    - `Surcoût appliqué : + 300 €.`

### **Scénario 7.12 : Le Dépassement de Temps de Conduite (Relais Obligatoire)**

- **Contexte :** Le temps de conduite cumulé dépasse les 10 heures autorisées, même si l'amplitude est respectée.
- **Déclencheur :** `Temps_Conduite_Total > 10 heures`.
- **Exemple Concret et Détaillé :**
    - **Demande :** Aller-retour Bretigny-Lyon journée.
    - **Analyse du Système (Moteur Poids Lourd) :**
        - Distance : 890 km.
        - Temps de conduite estimé (85 km/h) : 10h30.
        - Limite légale : 10h00.
        - **Verdict :** `INFRACTION_TEMPS_CONDUITE`.
    - **Solutions Générées :**
        1. **Relais Chauffeur (Optimisation) :** Le système calcule que le chauffeur principal peut conduire jusqu'à Melun au retour. Il propose d'envoyer un chauffeur relais en voiture légère à Melun pour finir les 40 dernières minutes.
            - `Prix = Calcul_Standard + Coût_Relais (100 €)`.
        2. **Double Équipage :** Possible mais plus cher (300 €).
- **Information pour l'Opérateur :**
    - `ALERTE : Temps de conduite (10h30) dépasse la limite (10h).`
    - `Solution Recommandée : Relais Chauffeur à Melun.`
    - `Surcoût appliqué : + 100 €.`

## **Partie 8 (Nouvelle Section) : Modules de Personnalisation Avancée, Transparence et Ajustements Finaux**

Cette section traite de la couche de **"finition"** du prix. Une fois que le moteur a déterminé une base tarifaire (via les zones ou le calcul dynamique) et vérifié la rentabilité, ces modules permettent d'affiner le montant final pour répondre aux stratégies commerciales, aux besoins spécifiques des clients et aux réalités du terrain.

C'est ici que le système devient véritablement modulaire et "sur-mesure".

### **8.1. Trip Transparency : La Maîtrise et la Justification du Coût**

Le module `Trip Transparency` n'est pas un simple affichage. C'est un outil de gestion qui décompose le prix en ses composants atomiques, offrant à l'opérateur un contrôle total sur chaque ligne de coût avant la facturation.

### **Architecture du Module**

Pour chaque devis ou facture, le système génère un bloc "Transparence" comprenant trois éléments distincts, chacun étant **calculé automatiquement mais modifiable manuellement**.

1. **Fuel Cost (Coût du Carburant)**
    - **Calcul Automatique :** Le système utilise la distance totale de la mission (Approche + Course + Retour) multipliée par la consommation moyenne du véhicule et le prix moyen du carburant (mis à jour via API ou paramètre global).
    - **Scénario d'Ajustement :** L'opérateur sait que le véhicule va rouler en montagne ou avec une lourde charge (nombreux bagages), augmentant la consommation. Il peut manuellement surcharger le coût estimé (ex: passer de 15€ à 25€) pour refléter la réalité sans changer le prix de base.
2. **Tolls (Péages)**
    - **Calcul Automatique :** Basé sur l'itinéraire optimal fourni par l'API de routage (Google Maps/Waze).
    - **Scénario d'Ajustement :** Le client demande spécifiquement de passer par un tunnel payant (ex: Duplex A86) pour gagner du temps, ou inversement, le chauffeur décide de prendre une route nationale. L'opérateur peut ajuster ce montant à l'euro près pour qu'il corresponde à la réalité des frais engagés.
3. **Base Price (Prix de Base de la Course)**
    - **Calcul Automatique :** C'est le résultat brut issu de la Méthode 1 (Zone/Forfait) ou de la Méthode 2 (Dynamique).
    - **Le Pouvoir de l'Override :** C'est la fonctionnalité la plus puissante. L'opérateur peut cliquer sur ce champ et entrer un montant arbitraire. Cela permet de s'aligner instantanément sur un concurrent ou de faire un prix "à la tête du client" (comme vu dans le scénario de la cliente difficile).

**Objectif Stratégique :** Ces ajustements mettent à jour en temps réel l'**Indicateur de Rentabilité**. Si l'opérateur baisse le `Base Price` mais que les `Tolls` et `Fuel Cost` restent élevés, la marge diminue visiblement, l'alertant sur la viabilité de la remise.

---

### **8.2. Additional Charges : La Gestion des Frais Annexes et Promotions**

Ce module permet d'ajouter ("Upsell") ou de retirer ("Discount") de la valeur au devis final.

### **A. Optional Fees (Frais Optionnels)**

Ce sont des services additionnels configurables. Ils peuvent être appliqués automatiquement (si détectés dans la demande) ou ajoutés manuellement par l'opérateur.

- **Structure de Données :**
    - `Name` : Nom du service (ex: "Baby Seat").
    - `Amount` : Valeur.
    - `Type` : `Fixed` (Montant fixe) ou `Percentage` (Pourcentage du prix de base).
    - `Taxable` : Oui/Non.
- **Exemples de Configuration (basés sur vos données) :**
    - **Airport Waiting (Attente Aéroport) :**
        - *Type :* Fixed
        - *Montant :* 1.74 € (par tranche, par exemple).
        - *Usage :* Activé si le vol a du retard au-delà de la franchise gratuite.
    - **Baby Seat (Siège Bébé) :**
        - *Type :* Fixed
        - *Montant :* 13.03 € par siège.
        - *Règle métier :* Comme vu dans la transcription, l'opérateur peut décider de l'offrir (le mettre à 0€) pour un bon client, mais la ligne doit apparaître sur la facture pour montrer la valeur offerte.
    - **Night Surcharge (Majoration Nuit - Manuelle) :**
        - *Type :* Percentage
        - *Montant :* 20%
        - *Usage :* Peut être utilisé comme un "frais optionnel" si l'on ne souhaite pas utiliser le moteur de règles automatiques (Rate Modifiers).
    - **Premium Cleaning (Nettoyage) :**
        - *Type :* Fixed
        - *Montant :* 21.72 €
        - *Usage :* Facturé si le client a des animaux ou des bagages très sales.

### **Focus : Automatisation des Frais d'Attente (Live Tracking)**

Pour les gares et aéroports, la facturation manuelle de l'attente est source d'erreurs et de litiges. Le système doit l'automatiser :

1. **Connexion API Vols/Trains :** Lors de la saisie du devis, le numéro de vol/train est obligatoire. Le système suit l'heure d'arrivée réelle.
2. **Ajustement Planning :** Si le vol a 2h de retard, le système décale automatiquement l'heure de prise en charge dans le planning chauffeur (évitant une attente physique inutile).
3. **Chronomètre Intelligent :**
    - T0 = Heure d'atterrissage réelle + Temps de débarquement estimé.
    - T0 à T+60min : **Franchise Gratuite** (incluse dans le forfait).
    - Au-delà de T+60min : Le système déclenche automatiquement la facturation de l'attente par **blocs indivisibles** (ex: tranche de 15 min à X €), ajoutés à la facture finale via le module Additional Charges

### **B. Promotions & Promo Codes**

Ce module gère les réductions commerciales pour stimuler la demande ou fidéliser.

- **Structure de Données :**
    - `Code` : Le code à saisir (ex: `LOYALTY10`).
    - `Discount` : Valeur de la réduction (Fixe ou %).
    - `Audience` : Restriction d'usage.
    - `Usage Limit` : Nombre de fois que le code peut être utilisé (globalement ou par client).
- **Scénarios d'Application :**
    - **LOYALTY10 :** -10% réservé aux clients ayant le tag `returning_customers`. Le système vérifie l'historique du client avant d'appliquer la réduction.
    - **WELCOME20 :** -20% pour les `new_customers`. Utilisable une seule fois par compte client.
    - **STUDENT15 :** -15% pour l'audience `students`.

---

### **8.3. Rate Modifiers : L'Ajustement Dynamique Automatisé**

C'est le moteur "invisible" qui ajuste le prix en fonction du contexte temporel ou géographique, sans intervention humaine. C'est essentiel pour le Yield Management (gestion du rendement).

### **A. Advanced Pricing Rules (Règles de Tarification Avancées)**

Ces règles conditionnelles modifient le prix de base selon des critères précis.

- **Paramètres de Configuration :**
    - **Trigger (Déclencheur) :**
        - `Time` (Heure) : ex: 22:00 - 06:00.
        - `Day` (Jour) : ex: Samedi, Dimanche.
        - `Distance` : ex: > 100km.
    - **Adjustment (Ajustement) :** Pourcentage (`+15%`) ou Fixe (`+20€`).
    - **Calculation Method (Méthode de Calcul) :**
        - `Proportional` : S'applique à l'ensemble du trajet si la condition est rencontrée (même partiellement).
        - `Hybrid` : S'applique uniquement sur la portion du trajet concernée (ex: si 1h de trajet est de jour et 1h de nuit, seule la 2ème heure est majorée).
        - `Departure Only` : S'applique uniquement si l'heure de *départ* tombe dans le créneau.
- **Exemples Concrets :**
    1. **Night Surcharge (Nuit) :** `Time: 22:00-06:00`, `Adj: +15%`. Augmente automatiquement le devis pour les courses de nuit.
    2. **Weekend Surcharge :** `Day: Sat, Sun`, `Adj: +10%`.
    3. **Long Distance Premium :** `Distance: >100km`, `Adj: +5%`. Pour compenser l'usure accrue sur les très longs trajets.

### **B. Seasonal Multipliers (Multiplicateurs Saisonniers)**

Ce module gère les variations de demande sur l'année (Haute/Basse saison).

- **Paramètres de Configuration :**
    - **Name :** ex: "Winter Surcharge".
    - **Period :** Date de début et Date de fin (ex: 01 Déc - 28 Fév).
    - **Multiplier :** Pourcentage appliqué au prix de base (ex: 110% pour une hausse, 95% pour une baisse).
    - **Calculation Method :**
        - `Start Date Only` : Si la course commence le 25 décembre, tout le prix est majoré. C'est le plus simple pour les transferts.
        - `Proportional` : Pour les missions de plusieurs jours. Si une mission chevauche deux saisons, le prix est pondéré.
- **Scénarios d'Application :**
    1. **Holiday Premium (Noël) :** Du 20 déc. au 5 janv. Multiplicateur : **125%**. Tout devis créé pour cette période sera 25% plus cher automatiquement.
    2. **Autumn Discount (Creux de saison) :** Du 1er sept. au 30 nov. Multiplicateur : **95%**. Le système baisse les prix de 5% pour attirer plus de clients.

---

### **8.4. Vehicle Categories : Le Multiplicateur de Gamme**

Le prix est fondamentalement lié au "standing" du véhicule. Ce module permet de définir des écarts de prix relatifs entre les catégories, simplifiant la gestion de la grille.

- **Logique :** On définit un prix de référence pour la catégorie "Standard" (Coefficient 1.0). Les autres catégories sont définies par rapport à cette base.
- **Configuration (Exemple) :**
    - **Standard (Berline confort) :** `Price Multiplier: 1.0x` (Base).
    - **Economy (Petite berline) :** `Price Multiplier: 0.8x` (-20%).
    - **Premium (Berline Luxe) :** `Price Multiplier: 1.5x` (+50%).
    - **Luxury (Limousine/Van VIP) :** `Price Multiplier: 2.0x` (+100%).
- **Application :** Si le calcul de base (Zone ou Dynamique) donne 100 € pour une course Standard :
    - Le devis en Economy sortira automatiquement à **80 €**.
    - Le devis en Luxury sortira automatiquement à **200 €**.
    Cela évite de devoir saisir manuellement 4 grilles de tarifs différentes pour chaque route.

---

### * Synthèse Finale : L'Orchestration du Calcul de Prix**

Pour conclure ce document, voici l'ordre exact et définitif dans lequel le système exécute tous ces modules pour produire un prix. C'est l'algorithme final.

1. **Détermination du Prix Brut de Base :**
    - Le système choisit la méthode (Zone, Forfait Classique ou Dynamique).
    - Il obtient un montant brut (ex: 100 €).
2. **Application du Multiplicateur Véhicule (Partie 8.4) :**
    - Si le véhicule est "Premium" (x1.5), le prix devient 150 €.
3. **Application des Modificateurs Automatiques (Partie 8.3) :**
    - *Saisonnalité :* Si "Winter Surcharge" (110%) est actif -> 150 * 1.1 = 165 €.
    - *Règles Avancées :* Si "Night Surcharge" (+15%) est actif -> 165 + (150 * 0.15) = 187.5 €. (L'ordre de cumul est configurable).
4. **Vérification de Rentabilité (Partie 3) :**
    - Le système calcule le coût interne (incluant l'approche depuis le garage optimal). Si le coût est de 180€, la marge est trop faible.
5. **Ajustement Manuel / Trip Transparency (Partie 8.1) :**
    - L'opérateur voit le prix calculé (187.5 €). Il décide de l'arrondir ou de l'ajuster manuellement via le champ `Base Price` pour atteindre 200 €.
6. **Ajout des Frais Optionnels et Promotions (Partie 8.2) :**
    - Ajout d'un `Baby Seat` (+13.03 €). Nouveau total : 213.03 €.
    - Application d'un code promo `LOYALTY10` (-10% sur le total).
    - **Prix Final Client : 191.73 €**.