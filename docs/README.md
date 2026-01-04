# Sixième Étoile VTC - Documentation

**Version:** 2.0.0 (Epic 22)  
**Last Updated:** 2026-01-04

---

## Welcome

Welcome to the Sixième Étoile VTC ERP documentation. This comprehensive guide covers all features, APIs, and best practices for using the system effectively.

---

## 📚 Documentation Structure

### User Guides

Step-by-step instructions for operators and dispatchers:

**French:**

- [Type de Trajet STAY (Séjours Multi-Jours)](user-guides/fr/stay-trip-type.md)
- [Système de Sous-Traitance](user-guides/fr/subcontracting.md)
- [Tarification Aller-Retour Corrigée](user-guides/fr/round-trip-pricing.md)
- [Modification des Notes de Devis](user-guides/fr/quote-notes-editing.md)
- [Affichage des Coûts de Staffing](user-guides/fr/staffing-costs.md)

**English:**

- [STAY Trip Type (Multi-Day Packages)](user-guides/en/stay-trip-type.md)
- [Subcontracting System](user-guides/en/subcontracting.md)

### API Documentation

Technical documentation for developers:

- [STAY Endpoints](api/stay-endpoints.md) - Multi-day package API
- [Subcontracting Endpoints](api/subcontracting-endpoints.md) - Subcontractor management API
- [Pricing Endpoints](api/pricing-endpoints.md) - Enhanced pricing calculations

### Training Materials

Learning resources and support:

- [FAQ - Frequently Asked Questions](training/faq.md)
- [Troubleshooting Guide](training/troubleshooting.md)
- [Video Tutorials](training/videos/) (Coming soon)

### Best Practices

Guides for optimal system usage:

- [STAY Usage Guide](best-practices/stay-usage-guide.md) - Maximize value from multi-day packages
- [Subcontracting Optimization](best-practices/subcontracting-optimization.md)
- [Staffing Management](best-practices/staffing-management.md)

### Release Notes

Version history and changes:

- [Epic 22 Release Notes](release-notes/epic-22-release.md) - Latest major release

---

## 🎯 Quick Start

### For Operators

**Creating Your First STAY Package:**

1. Read: [STAY User Guide (FR)](user-guides/fr/stay-trip-type.md)
2. Watch: Video tutorial (coming soon)
3. Practice: Create a test quote
4. Review: [Best Practices](best-practices/stay-usage-guide.md)

**Setting Up Subcontracting:**

1. Read: [Subcontracting Guide (FR)](user-guides/fr/subcontracting.md)
2. Configure: Add subcontractor profiles
3. Test: Assign a test mission
4. Optimize: [Subcontracting Best Practices](best-practices/subcontracting-optimization.md)

### For Developers

**Integrating with STAY API:**

1. Read: [STAY API Documentation](api/stay-endpoints.md)
2. Authenticate: Get session token
3. Test: Create sample quote via API
4. Deploy: Implement in your application

**API Quick Example:**

```bash
curl -X POST https://api.sixieme-etoile.fr/api/vtc/quotes/stay \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=your-token" \
  -d '{
    "organizationId": "sixieme-etoile-vtc",
    "contactId": "contact-uuid",
    "vehicleCategoryId": "category-uuid",
    "stayDays": [...]
  }'
```

---

## 🆕 What's New in Epic 22

### Major Features

1. **STAY Trip Type** - Create multi-day travel packages
2. **Subcontracting System** - Manage external fleet resources
3. **Enhanced Staffing Costs** - Transparent cost breakdown
4. **Quote Notes Editing** - Update notes after sending
5. **Round Trip Fix** - Accurate segment-based pricing

[Read Full Release Notes →](release-notes/epic-22-release.md)

---

## 📖 Feature Documentation

### STAY Trip Type

**What is it?**  
Multi-day package system for complex travel itineraries.

**Key Benefits:**

- Single quote for multiple days
- Automatic staffing cost calculation
- Detailed invoice breakdown
- Timeline view in dispatch

**Learn More:**

- [User Guide (FR)](user-guides/fr/stay-trip-type.md)
- [API Documentation](api/stay-endpoints.md)
- [Best Practices](best-practices/stay-usage-guide.md)

---

### Subcontracting System

**What is it?**  
Complete workflow for outsourcing missions to partner companies.

**Key Benefits:**

- Automatic profitability suggestions
- Cost comparison tools
- Performance tracking
- Seamless client experience

**Learn More:**

- [User Guide (FR)](user-guides/fr/subcontracting.md)
- [API Documentation](api/subcontracting-endpoints.md)
- [Best Practices](best-practices/subcontracting-optimization.md)

---

### Staffing Costs

**What is it?**  
Transparent display of operational staffing expenses.

**Key Benefits:**

- Automatic calculation (hotels, meals, second driver)
- Visual indicators in dispatch
- Detailed client invoicing
- Accurate profitability analysis

**Learn More:**

- [User Guide (FR)](user-guides/fr/staffing-costs.md)

---

### Round Trip Pricing

**What is it?**  
Corrected calculation method for accurate round trip pricing.

**Key Benefits:**

- Segment-based calculation (no double-counting)
- Multi-base optimization
- Transparent breakdown
- More accurate costs

**Learn More:**

- [User Guide (FR)](user-guides/fr/round-trip-pricing.md)

---

### Quote Notes Editing

**What is it?**  
Ability to modify operational notes after sending quotes.

**Key Benefits:**

- Update driver instructions anytime
- Maintain commercial integrity
- Full modification history
- Real-time sync with dispatch

**Learn More:**

- [User Guide (FR)](user-guides/fr/quote-notes-editing.md)

---

## 🔍 Finding Information

### By Role

**Commercial Operators:**

- [STAY User Guide](user-guides/fr/stay-trip-type.md)
- [Quote Notes Editing](user-guides/fr/quote-notes-editing.md)
- [Staffing Costs](user-guides/fr/staffing-costs.md)

**Dispatchers:**

- [Subcontracting Guide](user-guides/fr/subcontracting.md)
- [Staffing Costs Display](user-guides/fr/staffing-costs.md)
- [Quote Notes in Dispatch](user-guides/fr/quote-notes-editing.md)

**Fleet Managers:**

- [Subcontracting System](user-guides/fr/subcontracting.md)
- [Best Practices](best-practices/)

**Developers:**

- [API Documentation](api/)
- [STAY Endpoints](api/stay-endpoints.md)
- [Subcontracting Endpoints](api/subcontracting-endpoints.md)

### By Task

**Creating Multi-Day Packages:**

1. [STAY User Guide](user-guides/fr/stay-trip-type.md)
2. [STAY Best Practices](best-practices/stay-usage-guide.md)
3. [STAY API](api/stay-endpoints.md)

**Managing Subcontractors:**

1. [Subcontracting Guide](user-guides/fr/subcontracting.md)
2. [Subcontracting API](api/subcontracting-endpoints.md)
3. [Optimization Guide](best-practices/subcontracting-optimization.md)

**Understanding Costs:**

1. [Staffing Costs Guide](user-guides/fr/staffing-costs.md)
2. [Round Trip Pricing](user-guides/fr/round-trip-pricing.md)
3. [Best Practices](best-practices/)

---

## ❓ Getting Help

### Self-Service Resources

1. **Search Documentation** - Use Ctrl+F to search this page
2. **Check FAQ** - [Common questions answered](training/faq.md)
3. **Troubleshooting** - [Step-by-step problem solving](training/troubleshooting.md)
4. **Video Tutorials** - Visual walkthroughs (coming soon)

### Contact Support

**Email:** support@sixieme-etoile.fr  
**Phone:** +33 1 23 45 67 89  
**Hours:** Monday-Friday, 9:00-18:00 CET

**Emergency (24/7):** +33 1 23 45 67 89

**When contacting support, include:**

- Detailed description of issue
- Screenshots or screen recording
- Steps to reproduce
- User ID and organization
- Quote/mission ID if applicable

---

## 🎓 Training Resources

### Getting Started

1. **New User Onboarding** (Coming soon)

   - System overview
   - Basic workflows
   - Key features

2. **Feature-Specific Training**

   - STAY packages
   - Subcontracting
   - Advanced pricing

3. **Best Practices Workshops**
   - Optimization strategies
   - Common pitfalls
   - Success stories

### Video Tutorials (Coming Soon)

- Creating STAY packages
- Subcontracting workflow
- Staffing cost management
- Quote notes editing
- Round trip pricing explained

---

## 🔧 Technical Information

### System Requirements

**Supported Browsers:**

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Recommended:**

- Chrome latest version
- Stable internet connection (5+ Mbps)
- Screen resolution 1366x768 or higher

### API Information

**Base URL:** `https://api.sixieme-etoile.fr/api/vtc`

**Authentication:** Session-based (better-auth)

**Rate Limits:** 100 requests/minute

**Documentation:** [API Docs](api/)

### Data & Privacy

- GDPR compliant
- Data encrypted in transit and at rest
- Regular security audits
- Audit logs for all actions

---

## 📊 Version History

| Version | Date       | Epic    | Highlights                                       |
| ------- | ---------- | ------- | ------------------------------------------------ |
| 2.0.0   | 2026-01-04 | Epic 22 | STAY packages, Subcontracting, Enhanced staffing |
| 1.9.0   | 2026-01-03 | Epic 21 | Pricing transparency refactor                    |
| 1.8.0   | 2025-12-30 | Epic 20 | Google Routes API, Toll integration              |
| 1.7.0   | 2025-12-28 | Epic 19 | Critical fixes, Testing protocol                 |

[View All Release Notes →](release-notes/)

---

## 🤝 Contributing

### Reporting Issues

Found a bug or have a suggestion?

1. Check [Known Issues](training/troubleshooting.md#known-issues)
2. Search [FAQ](training/faq.md)
3. Email support@sixieme-etoile.fr with details

### Documentation Feedback

Help us improve this documentation:

- Report errors or unclear sections
- Suggest additional examples
- Request new topics
- Share use cases

Email: docs@sixieme-etoile.fr

---

## 📱 Mobile Access

### Current Support

- **Web Interface:** Fully responsive
- **Driver App:** View missions and notes
- **Mobile Browser:** Full functionality

### Coming Soon

- Native iOS app
- Native Android app
- Offline mode
- Push notifications

---

## 🌍 Languages

**Available Languages:**

- 🇫🇷 French (Primary)
- 🇬🇧 English (Secondary)

**Documentation:**

- User Guides: FR + EN
- API Docs: EN
- Training: FR + EN

---

## 📞 Quick Links

### Most Popular

- [STAY User Guide (FR)](user-guides/fr/stay-trip-type.md)
- [FAQ](training/faq.md)
- [Troubleshooting](training/troubleshooting.md)
- [Release Notes](release-notes/epic-22-release.md)

### For Developers

- [STAY API](api/stay-endpoints.md)
- [Subcontracting API](api/subcontracting-endpoints.md)
- [API Overview](api/README.md)

### Best Practices

- [STAY Usage](best-practices/stay-usage-guide.md)
- [Subcontracting](best-practices/subcontracting-optimization.md)
- [Staffing Management](best-practices/staffing-management.md)

---

## 📧 Stay Updated

**Newsletter:** Subscribe at newsletter@sixieme-etoile.fr  
**Release Notes:** Automatic email notifications  
**Training:** Monthly webinars (register at training@sixieme-etoile.fr)

---

**© 2026 Sixième Étoile VTC. All rights reserved.**

**Documentation Version:** 2.0.0  
**Last Updated:** 2026-01-04  
**Epic:** Epic 22 - VTC ERP Complete System Enhancement
