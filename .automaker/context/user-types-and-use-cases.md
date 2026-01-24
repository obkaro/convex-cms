# Convex CMS: User Types, Use Cases & Flows

This document outlines the target users, their goals, use cases, and interaction flows for the Convex CMS component.

## User Type Taxonomy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONVEX CMS ECOSYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BUILDERS (Install & Configure)          OPERATORS (Use Daily)              │
│  ├── Solo Developer                      ├── Content Editor                 │
│  ├── Agency Developer                    ├── Content Manager                │
│  ├── Startup Engineer                    ├── Marketing Team Member          │
│  ├── Enterprise Architect                └── Site Administrator             │
│  └── AI/Agent Developer                                                     │
│                                                                              │
│  CONSUMERS (Access Content)              SYSTEMS (Programmatic Access)      │
│  ├── Website Visitor                     ├── AI Agents (@convex-dev/agent)  │
│  ├── Mobile App User                     ├── Search Indexers (Algolia, etc) │
│  ├── API Consumer                        ├── CDN/Cache Systems              │
│  └── Internal Dashboard User             └── External Webhooks              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. BUILDERS: Developer Personas

### 1A. Solo Developer / Indie Hacker

**Profile**: Building a SaaS, blog, or side project. Wants to move fast without managing infrastructure.

**Goals**:
- Get a CMS running in minutes, not days
- Avoid vendor lock-in (wants to own their data)
- Keep costs low (Convex free tier friendly)
- Type-safe APIs that catch errors at compile time

**Primary Use Cases**:

| Use Case | Flow |
|----------|------|
| **Personal Blog** | Install → Define `blog_post` type → Write in admin → Deploy Next.js frontend |
| **SaaS Landing Page** | Install → Define `feature`, `testimonial`, `pricing` types → Marketing can update without deploys |
| **Documentation Site** | Install → Define `doc_page` with hierarchy → Integrate with Docusaurus/Nextra |
| **Portfolio** | Install → Define `project`, `skill` types → Showcase work dynamically |

**Key Flow - Blog Setup**:
```
Day 1:
  npm install convex-cms
  → Add to convex.config.ts
  → npx convex dev
  → npx convex-cms admin
  → Create "Blog Post" content type (title, slug, content, featured_image, tags)
  → Write first post in admin

Day 2:
  → Build Next.js frontend
  → Query published posts: cms.contentEntries.list({ status: "published" })
  → Deploy to Vercel
  → Done! Full blog with admin in 2 days
```

---

### 1B. Agency Developer

**Profile**: Building sites for clients. Needs to hand off content management to non-technical users.

**Goals**:
- Rapid project scaffolding (reuse across clients)
- Client-friendly admin interface
- White-label or customizable branding
- Role-based access (client can edit, not delete)

**Primary Use Cases**:

| Use Case | Flow |
|----------|------|
| **Client Marketing Site** | Template → Customize content types → Train client on admin → Hand off |
| **Multi-client Platform** | Single Convex deployment with content type per client, or separate deployments |
| **E-commerce Catalog** | Product, Category, Collection types → Connect to Shopify/Stripe |
| **Event Website** | Speaker, Session, Sponsor types → Client updates schedule |

**Key Flow - Client Handoff**:
```
Week 1 (Agency):
  → Set up Convex project for client
  → Install CMS, define content types (Page, BlogPost, TeamMember, Service)
  → Build custom frontend matching client brand
  → Configure RBAC: client = "editor" role (can create/edit, not delete types)

Week 2 (Handoff):
  → npx convex-cms admin --demo  (show client the admin)
  → Create client user account in their auth system
  → Map client user → "editor" role
  → Client starts managing content independently

Ongoing:
  → Agency on retainer for new features
  → Client self-service for content updates
```

---

### 1C. Startup Engineering Team

**Profile**: Building a product with content needs. Wants to focus on core product, not CMS infrastructure.

**Goals**:
- Integrate CMS into existing Convex app seamlessly
- Real-time content updates (Convex reactivity)
- Support multiple environments (dev/staging/prod)
- Team collaboration with proper access control

**Primary Use Cases**:

| Use Case | Flow |
|----------|------|
| **SaaS Help Center** | Article, Category, FAQ types → In-app help widget |
| **Marketplace Listings** | Listing content type → Sellers manage their content |
| **Learning Platform** | Course, Lesson, Quiz types → Students consume |
| **Internal Tools** | Announcement, Policy types → Company-wide communication |

**Key Flow - Help Center Integration**:
```
Setup:
  → CMS component in existing Convex app
  → Define Article type (title, body, category, searchKeywords)
  → Integrate with @convex-dev/rag for semantic search

Usage:
  → Support team writes articles in admin
  → Articles automatically indexed for RAG
  → Users ask questions in-app
  → AI agent retrieves relevant articles
  → Real-time: new articles appear instantly
```

---

### 1D. Enterprise Architect

**Profile**: Evaluating CMS for large organization. Compliance, scale, and integration matter.

**Goals**:
- Audit trail for compliance (who changed what, when)
- SSO integration (Okta, Azure AD)
- Multi-region / data residency
- API-first for integration with existing systems

**Primary Use Cases**:

| Use Case | Flow |
|----------|------|
| **Global Marketing Hub** | Localized content → 20+ locales → Regional teams |
| **Product Information Management** | Complex product data → Multiple channels |
| **Compliance Documentation** | Versioned policies → Audit trail required |
| **Multi-brand Portfolio** | Shared component → Brand-specific content types |

**Key Flow - Compliance Documentation**:
```
Requirements:
  → Every change must be auditable
  → Documents require approval workflow
  → Version history retained for 7 years

Implementation:
  → Enable versioning feature
  → Audit log captures all mutations (who, what, when, before/after)
  → Custom role: "compliance_reviewer" can publish, others can only draft
  → Webhook on publish → Notify compliance team
  → Export function for regulatory requests
```

---

### 1E. AI/Agent Developer

**Profile**: Building AI-powered applications. Content is fuel for agents.

**Goals**:
- Structured content for RAG pipelines
- Tool-compatible APIs for agents
- Real-time content updates reflected in AI responses
- Content as training/context data

**Primary Use Cases**:

| Use Case | Flow |
|----------|------|
| **AI Customer Support** | Knowledge base → RAG indexing → Agent answers |
| **Content Generation** | Agent creates drafts → Human reviews in admin → Publish |
| **Personalized Content** | Agent queries content → Customizes for user context |
| **Data Extraction** | Agent reads external sources → Creates structured content |

**Key Flow - AI-Powered Support Bot**:
```
Setup:
  → CMS + @convex-dev/agent + @convex-dev/rag
  → Define KnowledgeArticle type
  → RAG indexer watches for published articles

Content Team Workflow:
  → Write support articles in admin
  → Publish → Automatically chunked and indexed

User Interaction:
  → User: "How do I reset my password?"
  → Agent uses CMS tools to search content
  → RAG retrieves relevant chunks
  → Agent synthesizes answer with source links

Agent Content Creation:
  → Agent monitors support tickets
  → Identifies common questions without articles
  → Creates draft article: cms.contentEntries.create({ status: "draft" })
  → Notifies content team for review
```

**Agent Tool Integration**:
```typescript
import { createCmsTools } from "convex-cms";

const agent = new Agent({
  tools: [
    ...createCmsTools(components.convexCms, {
      // Which operations the agent can perform
      allowedOperations: [
        "searchContent",
        "getEntry",
        "listEntries",
        "createEntry",  // Agent can create drafts
        // "publishEntry" - NOT allowed, humans must publish
      ],
    }),
  ],
});
```

---

## 2. OPERATORS: Content Team Personas

### 2A. Content Editor

**Profile**: Writes and manages content daily. Not technical.

**Goals**:
- Intuitive writing experience
- See changes in real-time
- Easy media management
- Don't break anything

**Daily Flow**:
```
Morning:
  → Open admin panel (npx convex-cms admin or hosted URL)
  → Check "My Drafts" for work in progress
  → See notifications: "3 entries pending review"

Writing:
  → Click "New Blog Post"
  → Write in rich text editor
  → Drag-drop images → Auto-uploaded to Convex storage
  → Add tags, set featured image
  → Preview (see how it looks on frontend)
  → Save as draft

Review:
  → Open entry scheduled for today
  → Make final edits
  → Click "Publish" → Live immediately (Convex reactivity!)
```

---

### 2B. Content Manager / Editor-in-Chief

**Profile**: Oversees content strategy. Manages team of editors.

**Goals**:
- Editorial calendar view
- Approve/reject workflow
- Content performance insights
- Manage team permissions

**Weekly Flow**:
```
Monday Planning:
  → Review scheduled content for the week
  → Assign articles to editors
  → Set publish dates

Daily Review:
  → Check "Pending Review" queue
  → Read submissions from editors
  → Approve (→ scheduled/published) or request changes (→ add comment)

Monthly:
  → Review content performance (views, engagement)
  → Identify content gaps
  → Plan next month's content calendar
```

---

### 2C. Site Administrator

**Profile**: Manages the CMS itself. Technical enough to configure, not necessarily a developer.

**Goals**:
- Manage users and roles
- Configure content types
- Monitor system health
- Handle edge cases (unlock stuck content, restore deleted items)

**Administrative Flow**:
```
User Management:
  → New team member joins
  → Create user in auth system (Clerk/Auth0)
  → Assign CMS role: "author" (can create own content)
  → Later promoted to "editor" (can edit all content)

Content Type Changes:
  → Marketing wants new "Case Study" content type
  → Admin creates type: title, client, challenge, solution, results, testimonial
  → Editors can now create case studies

Troubleshooting:
  → Editor locked out of an article (lock expired)
  → Admin force-releases lock
  → Check audit log to see what happened
  → Restore accidentally deleted content from trash
```

---

## 3. CONSUMERS: End User Perspectives

### 3A. Website Visitor

**Experience**: Seamless, fast, real-time

```
User visits marketing site:
  → Next.js fetches content via CMS component
  → Page renders with latest content
  → If editor publishes update while user is on page:
    → Convex subscription triggers
    → Content updates in real-time (no refresh needed!)
```

### 3B. Mobile App User

**Experience**: Native app consuming CMS content

```
App Architecture:
  → React Native app with Convex client
  → CMS content for: onboarding screens, help articles, announcements
  → Real-time updates pushed to app
  → Offline support via Convex caching
```

### 3C. API Consumer (Third Party)

**Experience**: Headless API access

```
Integration:
  → External system needs product data
  → Convex HTTP endpoint exposes CMS content
  → Webhook notifies on changes
  → Third party stays in sync
```

---

## 4. SYSTEMS: Programmatic Integration Flows

### 4A. AI Agent Content Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Sources   │────▶│  AI Agent   │────▶│   CMS       │
│ (web, docs) │     │ (extraction)│     │ (storage)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Human     │
                    │  (review)   │
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   Publish   │────▶│    RAG      │
                    │             │     │  (indexed)  │
                    └─────────────┘     └─────────────┘
```

### 4B. Multi-Channel Publishing

```
                              ┌─────────────┐
                         ┌───▶│   Website   │
                         │    └─────────────┘
┌─────────────┐         │    ┌─────────────┐
│     CMS     │─────────┼───▶│  Mobile App │
│  (publish)  │         │    └─────────────┘
└─────────────┘         │    ┌─────────────┐
       │                ├───▶│   Email     │
       │                │    └─────────────┘
       ▼                │    ┌─────────────┐
  [Webhook]─────────────┴───▶│   Social    │
                              └─────────────┘
```

### 4C. Search & Discovery Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│     CMS     │────▶│  RAG Index  │────▶│  Semantic   │
│  (content)  │     │ (@convex/rag│     │   Search    │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       │            ┌─────────────┐     ┌─────────────┐
       └───────────▶│   Algolia   │────▶│  Full-text  │
         [webhook]  │   (sync)    │     │   Search    │
                    └─────────────┘     └─────────────┘
```

---

## 5. USE CASE MATRIX

| Use Case | Primary User | Content Types | Key Features Needed |
|----------|--------------|---------------|---------------------|
| **Marketing Site** | Agency Dev + Marketing | Page, BlogPost, Feature, Testimonial | Localization, Preview, SEO fields |
| **Documentation** | Solo Dev + Tech Writer | DocPage, APIReference, Changelog | Hierarchy, Versioning, Search |
| **E-commerce** | Startup + Merchandiser | Product, Category, Collection, Banner | Media variants, Inventory sync |
| **Knowledge Base** | AI Dev + Support | Article, FAQ, Troubleshooting | RAG indexing, Agent tools |
| **Learning Platform** | Startup + Instructors | Course, Lesson, Quiz, Certificate | Progress tracking, Permissions |
| **Multi-tenant SaaS** | Enterprise + Clients | Varies per tenant | Isolation, Custom roles |
| **Internal Comms** | Enterprise + HR/Comms | Announcement, Policy, Event | Approval workflow, Audit |
| **Mobile App** | Solo Dev | varies | Offline support, Push sync |
| **AI Content Gen** | AI Dev | varies | Agent tools, Draft workflow |

---

## 6. CRITICAL USER JOURNEYS

### Journey 1: First-Time Setup (Target: < 30 minutes)

```
Developer discovers Convex CMS
         │
         ▼
    npm install convex-cms
         │
         ▼
    Add to convex.config.ts
         │
         ▼
    npx convex dev (generates types)
         │
         ▼
    npx convex-cms admin (launches UI)
         │
         ▼
    Create first content type in admin
         │
         ▼
    Create first entry
         │
         ▼
    Query from frontend: useQuery(api.convexCms.contentEntries.list)
         │
         ▼
    Working CMS in under 30 minutes
```

### Journey 2: Team Onboarding

```
Admin invites new editor
         │
         ▼
    Editor signs up via auth provider (Clerk, etc.)
         │
         ▼
    getUserRole hook maps user → "author" role
         │
         ▼
    Editor logs into admin
         │
         ▼
    Sees only content types they can access
         │
         ▼
    Creates content → auto-saved as draft
         │
         ▼
    Submits for review → Manager notified
         │
         ▼
    Manager approves → Published
```

### Journey 3: AI-Assisted Content Creation

```
Support team identifies knowledge gap
         │
         ▼
    Asks AI agent: "Write an article about password reset"
         │
         ▼
    Agent uses searchContent tool → No existing article
         │
         ▼
    Agent uses createEntry tool → Creates draft
         │
         ▼
    Agent notifies content team
         │
         ▼
    Editor reviews, refines, publishes
         │
         ▼
    RAG indexer adds to knowledge base
         │
         ▼
    Future users get instant answers
```

### Journey 4: Content Localization

```
English article published
         │
         ▼
    Manager assigns Spanish translation
         │
         ▼
    Translator opens entry in admin
         │
         ▼
    Switches locale to "es-ES"
         │
         ▼
    Sees English as reference, types Spanish
         │
         ▼
    Publishes Spanish version
         │
         ▼
    Frontend detects user locale
         │
         ▼
    Queries with locale: cms.contentEntries.get({ locale: "es-ES" })
         │
         ▼
    Falls back to English for untranslated fields
```

### Journey 5: Agency Client Handoff

```
Agency completes website build
         │
         ▼
    Creates client auth account
         │
         ▼
    Maps client → "editor" role (no delete permissions)
         │
         ▼
    Schedules training session
         │
         ▼
    Walks client through admin panel:
    - Creating blog posts
    - Uploading images
    - Publishing content
         │
         ▼
    Client creates first post independently
         │
         ▼
    Agency provides documentation/support
         │
         ▼
    Client manages content ongoing
```

### Journey 6: Compliance Audit

```
Auditor requests content change history
         │
         ▼
    Admin opens Audit Logs in admin panel
         │
         ▼
    Filters: Resource type = "Policy", Date range = last year
         │
         ▼
    Exports audit log to CSV/JSON
         │
         ▼
    For specific changes, views full diff:
    - Previous state
    - New state
    - Who made change
    - When
    - IP address (if captured)
         │
         ▼
    Generates compliance report
```

---

## 7. FEATURE PRIORITIZATION BY USER TYPE

| Feature | Solo Dev | Agency | Startup | Enterprise | AI Dev |
|---------|:--------:|:------:|:-------:|:----------:|:------:|
| Quick Setup | ★★★ | ★★★ | ★★☆ | ★☆☆ | ★★★ |
| CLI Admin | ★★★ | ★★☆ | ★★☆ | ★☆☆ | ★★★ |
| Custom Roles | ★☆☆ | ★★★ | ★★☆ | ★★★ | ★☆☆ |
| Localization | ★☆☆ | ★★☆ | ★★☆ | ★★★ | ★☆☆ |
| Versioning | ★☆☆ | ★★☆ | ★★☆ | ★★★ | ★★☆ |
| Audit Logs | ★☆☆ | ★☆☆ | ★☆☆ | ★★★ | ★☆☆ |
| Agent Tools | ★☆☆ | ★☆☆ | ★★☆ | ★★☆ | ★★★ |
| RAG Integration | ★☆☆ | ★☆☆ | ★★☆ | ★★☆ | ★★★ |
| Webhooks | ★☆☆ | ★★☆ | ★★★ | ★★★ | ★★☆ |
| Media Variants | ★★☆ | ★★★ | ★★☆ | ★★☆ | ★☆☆ |
| Scheduled Publish | ★★☆ | ★★★ | ★★☆ | ★★★ | ★☆☆ |
| Content Lock | ★☆☆ | ★☆☆ | ★★☆ | ★★★ | ★☆☆ |
| Bulk Operations | ★☆☆ | ★★☆ | ★★☆ | ★★★ | ★★☆ |
| Export/Import | ★☆☆ | ★★★ | ★★☆ | ★★★ | ★☆☆ |

**Legend**: ★★★ = Critical, ★★☆ = Important, ★☆☆ = Nice to have

---

## 8. COMPETITIVE POSITIONING

```
                    Simple ◀─────────────────────▶ Powerful
                         │
              Strapi     │                    Contentful
                ●        │                        ●
                         │
           Convex CMS ●──┼──────────────────────────
                         │           Sanity
                         │              ●
                         │
             Notion      │
                ●        │
                         │
              ▲          │
              │          │
         Self-hosted     │
              │          │
              ▼          │
           Hosted        │
```

**Convex CMS Unique Differentiators**:

1. **Simpler than Strapi**: No server to manage, component architecture
2. **More flexible than Contentful**: Self-hosted data, no vendor lock-in, lower cost
3. **More structured than Notion**: Real content types, proper CMS features, API-first
4. **AI-native**: Built-in agent tools, RAG integration, designed for AI workflows
5. **Real-time by default**: Convex reactivity throughout, instant updates
6. **Developer-first**: Type-safe APIs, TypeScript throughout, great DX
7. **Component architecture**: Isolated, composable, can use multiple instances

---

## 9. ADMIN PANEL DISTRIBUTION MODEL

### Primary Distribution: CLI-based

```bash
# Install component
npm install convex-cms

# Launch admin panel
npx convex-cms admin
```

The CLI:
1. Auto-detects Convex deployment URL from project
2. Serves pre-built admin UI on localhost
3. Opens browser automatically
4. Connects to user's Convex deployment

### Configuration Options

```bash
# With explicit URL
npx convex-cms admin --url https://your-deployment.convex.cloud

# Custom port
npx convex-cms admin --port 3333

# Demo mode (mock admin user)
npx convex-cms admin --demo

# Don't open browser
npx convex-cms admin --no-open
```

### Authentication Modes

| Mode | Use Case | Command |
|------|----------|---------|
| Demo | Development/testing | `--demo` (default) |
| Token | CI/CD, scripts | `--token <jwt>` |
| Provider | Production | Configure in app auth |

---

## 10. SUCCESS METRICS

### For Solo Developers
- Time to first content entry: < 30 minutes
- Time to integrate with frontend: < 1 hour
- Zero configuration for basic use

### For Agencies
- Client training time: < 1 hour
- Client support tickets: minimal
- Reusable across projects: yes

### For Startups
- Integration with existing Convex app: seamless
- Real-time updates: working out of box
- Team onboarding: self-service

### For Enterprise
- Audit compliance: complete trail
- Permission granularity: sufficient
- Scale: handles large content volumes

### For AI Developers
- Agent integration: working in < 1 hour
- RAG pipeline: automatic indexing
- Content quality: human-in-the-loop maintained
