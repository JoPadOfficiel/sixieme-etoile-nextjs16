# Guide Utilisateur : Tarification Bidirectionnelle

## Concept

La **Tarification Bidirectionnelle** est un outil puissant pour les opérateurs travaillant avec des apporteurs d'affaires (hôtels, agences, concierges). Elle permet de calculer et d'afficher simultanément deux prix distincts pour une même course :

1.  **Prix Grille (Partenaire) :** Le prix négocié que l'agence paiera (basé sur un contrat, ex: Forfait CDG = 80€).
2.  **Prix Direct (Public) :** Le prix standard calculé dynamiquement par le système (basé sur la distance/temps, ex: 105€).

Cela vous permet de visualiser instantanément votre marge théorique ou le "manque à gagner" par rapport au prix public, et de décider quel prix afficher sur le devis final.

---

## L'Indicateur Visuel dans le Cockpit

Dans le **Cockpit de Création de Devis**, lorsque vous sélectionnez un partenaire disposant d'une grille tarifaire, le panneau de prix affiche désormais un "toggle" (bascule) :

### Mode 1 : Prix Grille Activé (Par défaut pour les partenaires)
Le système applique le tarif contractuel (Engagement Rule).
*   L'affichage montre le prix grille (ex: 80€).
*   Un indicateur compare ce prix au prix public théorique.
    *   📉 **Prix inférieur au public :** Vous faites une "fleur" au partenaire (ou le contrat est ancien).
    *   📈 **Prix supérieur au public :** Le contrat est très avantageux pour vous.

### Mode 2 : Prix Direct Activé
Vous pouvez forcer l'utilisation du prix public calculé (Méthode 2).
*   Utile si le trajet sort du cadre du forfait habituel (ex: bagages excessifs, horaires de nuit non couverts).
*   Utile pour démontrer à un partenaire la valeur réelle de la prestation hors contrat.

---

## Comment Basculer entre les Prix ?

1.  Créez un devis pour un Partenaire.
2.  Si une grille s'applique, le badge **"Fixed Price"** ou **"Grid"** apparaît.
3.  Dans le panneau de droite "Pricing", repérez le commutateur **"Partner Grid" / "Direct Pricing"**.
4.  Cliquez pour changer de mode.
    *   Le **Prix Final** se met à jour instantanément.
    *   La **Marge (Profitability)** est recalculée en conséquence.
    *   L'indicateur de rentabilité (Vert/Orange/Rouge) s'ajuste.

![Toggle Bidirectionnel](placeholder-screenshot-bidirectional-toggle)

---

## Cas d'Usage Fréquents

*   **Négociation :** L'agence trouve le forfait trop cher ? Basculez sur le "Prix Direct" pour voir si le tarif au kilomètre serait plus avantageux (ou pire) pour eux.
*   **Audit de Rentabilité :** Si vous voyez systématiquement une flèche rouge 📉 importante sur les trajets d'un partenaire, il est peut-être temps de renégocier ses grilles tarifaires car elles sont trop déconnectées du coût réel (carburant, temps).

---

## FAQ

**Q : Est-ce que le partenaire voit les deux prix ?**
R : Non. Le PDF du devis n'affiche que le "Prix Final" sélectionné (celui qui était actif au moment de l'enregistrement).

**Q : Pourquoi le toggle est-il désactivé ?**
R : Si le toggle est grisé, c'est qu'il n'y a pas de grille tarifaire applicable pour ce trajet (le système est déjà en mode "Direct Dynamic" par défaut).
