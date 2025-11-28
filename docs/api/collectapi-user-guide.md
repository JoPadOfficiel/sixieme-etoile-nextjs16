# Guide Utilisateur - Gestion des Prix de Carburant

## 🎯 Introduction

Le système de gestion des prix de carburant intégré à votre plateforme VTC vous permet de calculer automatiquement les coûts de carburant en temps réel pour vos devis. Cette fonctionnalité utilise l'API CollectAPI pour obtenir les prix actuels du marché.

## 🚀 Fonctionnalités Principales

### ✅ Prix en Temps Réel
- Mise à jour automatique des prix de carburant
- Support de 4 types de carburant : Essence, Diesel, Premium, GPL
- Conversion automatique des devises
- Cache intelligent pour optimiser les performances

### ✅ Calcul Automatique des Coûts
- Intégration transparente dans le système de devis
- Calcul basé sur la consommation réelle du véhicule
- Prise en compte de la distance du trajet
- Gestion des arrêts carburant nécessaires

### ✅ Gestion Avancée de Flotte
- Configuration individuelle par véhicule
- Suivi du niveau de carburant
- Calcul d'autonomie en temps réel
- Alertes de ravitaillement

## 🔧 Configuration Initiale

### 1. Configuration de l'API CollectAPI

**Étape 1 : Obtenir une clé API**
- Rendez-vous sur [CollectAPI.com](https://collectapi.com)
- Créez un compte gratuit
- Obtenez votre clé API dans le tableau de bord

**Étape 2 : Configuration dans l'application**
1. Accédez à **Paramètres** → **Organisation** → **Clés API**
2. Ajoutez votre clé CollectAPI dans le champ "Clé API Prix Carburant"
3. Testez la connexion avec le bouton "Tester la connexion"

### 2. Configuration des Véhicules

**Informations Requises par Véhicule :**
- **Type de carburant** : Essence, Diesel, Premium, ou GPL
- **Consommation** : Litres aux 100 km (ex: 8.5 L/100km)
- **Capacité du réservoir** : En litres (ex: 60L)
- **Niveau actuel** : Pourcentage ou litres restants

**Configuration :**
1. Allez dans **Flotte** → **Véhicules**
2. Sélectionnez un véhicule ou créez-en un nouveau
3. Remplissez la section "Configuration Carburant"
4. Sauvegardez les modifications

## 📊 Utilisation dans les Devis

### Calcul Automatique

Lorsque vous créez un devis, le système calcule automatiquement :

1. **Coût de base** : Distance × Tarif au kilomètre
2. **Coût carburant** : Distance × Consommation × Prix actuel
3. **Coût péages** : Via Google Maps (si configuré)
4. **Frais optionnels** : Selon votre configuration

### Détail du Calcul Carburant

```
Exemple de calcul :
- Distance : 150 km
- Véhicule : Peugeot 208 (Essence, 6.5L/100km)
- Prix essence actuel : 1.65€/L

Calcul :
Carburant nécessaire = (150 km × 6.5L) ÷ 100 = 9.75L
Coût carburant = 9.75L × 1.65€ = 16.09€
```

### Gestion des Longs Trajets

Pour les trajets dépassant l'autonomie du véhicule :

1. **Calcul d'autonomie** : Niveau actuel ÷ Consommation × 100
2. **Arrêts nécessaires** : Nombre d'arrêts carburant calculé automatiquement
3. **Coût total** : Inclut le carburant consommé + ravitaillements

## 🎛️ Interface Utilisateur

### Dashboard Prix Carburant

**Accès :** Tableau de bord → Widget "Prix Carburant"

**Informations Affichées :**
- Prix actuels par type de carburant
- Dernière mise à jour
- Tendance des prix (hausse/baisse)
- Statut de l'API (connectée/déconnectée)

### Page Gestion Carburant

**Accès :** Flotte → Gestion Carburant

**Fonctionnalités :**
- Vue d'ensemble de tous les véhicules
- Niveaux de carburant actuels
- Autonomie restante par véhicule
- Alertes de ravitaillement
- Historique des prix

### Intégration Devis

**Dans le formulaire de devis :**
1. Sélectionnez le véhicule
2. Saisissez l'origine et la destination
3. Le coût carburant s'affiche automatiquement
4. Détail disponible en cliquant sur "Voir le détail"

## 📈 Monitoring et Alertes

### Alertes Automatiques

**Niveau Carburant Bas :**
- Seuil configurable (par défaut 20%)
- Notification par email et dans l'application
- Suggestion de stations-service proches

**Prix Carburant Élevé :**
- Alerte si augmentation > 10% en 24h
- Recommandation de révision des tarifs
- Historique des variations

### Rapports Disponibles

**Rapport Mensuel :**
- Consommation totale par véhicule
- Coût carburant par trajet
- Évolution des prix
- Recommandations d'optimisation

**Analyse de Performance :**
- Comparaison consommation théorique/réelle
- Identification des véhicules les plus économiques
- Suggestions d'amélioration

## 🔧 Dépannage

### Problèmes Courants

**"Prix carburant indisponible"**
- Vérifiez votre connexion internet
- Contrôlez la validité de votre clé API
- Le système utilise automatiquement des prix de fallback

**"Calcul incorrect"**
- Vérifiez la configuration du véhicule
- Assurez-vous que la consommation est correcte
- Contrôlez le niveau de carburant actuel

**"API déconnectée"**
- Vérifiez votre quota API (1000 requêtes/jour gratuit)
- Renouvelez votre clé API si nécessaire
- Contactez le support CollectAPI

### Codes d'Erreur

| Code | Description | Solution |
|------|-------------|----------|
| 401 | Clé API invalide | Vérifiez votre clé dans les paramètres |
| 429 | Quota dépassé | Attendez ou passez à un plan payant |
| 503 | Service indisponible | Réessayez plus tard |
| CACHE | Prix depuis le cache | Normal, prix mis en cache |
| FALLBACK | Prix de secours | API temporairement indisponible |

## 💡 Conseils d'Optimisation

### Réduction des Coûts

1. **Mise à jour régulière** des niveaux de carburant
2. **Optimisation des trajets** pour réduire la consommation
3. **Maintenance préventive** pour maintenir l'efficacité
4. **Formation des chauffeurs** à l'éco-conduite

### Amélioration de la Précision

1. **Calibrage régulier** de la consommation réelle
2. **Mise à jour** des capacités de réservoir
3. **Suivi** des conditions de conduite (ville/autoroute)
4. **Ajustement saisonnier** des consommations

### Gestion Proactive

1. **Planification** des ravitaillements
2. **Négociation** avec les stations-service partenaires
3. **Suivi** des tendances de prix
4. **Optimisation** des itinéraires

## 📞 Support

### Ressources Disponibles

- **Documentation technique** : `/docs/api/collectapi-technical-guide.md`
- **FAQ** : Section aide de l'application
- **Support email** : support@votre-plateforme.com
- **Chat en ligne** : Disponible 9h-18h

### Informations de Contact

**Support CollectAPI :**
- Site web : [collectapi.com/support](https://collectapi.com/support)
- Documentation : [docs.collectapi.com](https://docs.collectapi.com)

**Support Plateforme :**
- Email technique : tech@votre-plateforme.com
- Téléphone : +33 1 XX XX XX XX
- Horaires : Lundi-Vendredi 9h-18h

## 🔄 Mises à Jour

### Changelog

**Version 2.1.0 (Actuelle) :**
- ✅ Support GPS pour prix localisés
- ✅ Calcul d'autonomie avancé
- ✅ Alertes intelligentes
- ✅ Interface utilisateur améliorée

**Version 2.0.0 :**
- ✅ Intégration CollectAPI
- ✅ Cache intelligent
- ✅ Prix de fallback
- ✅ Support multi-carburants

### Prochaines Fonctionnalités

- 🔄 Intégration stations-service partenaires
- 🔄 Prédiction des prix
- 🔄 Optimisation automatique des trajets
- 🔄 Application mobile dédiée
