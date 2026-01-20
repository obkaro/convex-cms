# Convex CMS Admin UI

The Admin UI for Convex CMS, built with TanStack Start and React.

## Getting Started

### Prerequisites

- Node.js 18+
- A Convex account and project

### Installation

```bash
cd admin
npm install
```

### Development

1. Start the Convex development server:

```bash
npx convex dev
```

This will generate the Convex API types and provide a `VITE_CONVEX_URL`.

2. Create a `.env` file with your Convex URL:

```bash
cp .env.example .env
# Edit .env with your VITE_CONVEX_URL from step 1
```

3. Start the development server:

```bash
npm run dev:vite
```

Or run both Convex and Vite together:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
admin/
├── convex/                 # Convex configuration
│   └── convex.config.ts    # CMS component integration
├── src/
│   ├── routes/             # TanStack Router routes
│   │   ├── __root.tsx      # Root layout with Convex provider
│   │   ├── index.tsx       # Dashboard page
│   │   ├── content.tsx     # Content entries list
│   │   ├── media.tsx       # Media library
│   │   ├── content-types.tsx # Content type management
│   │   └── settings.tsx    # CMS settings
│   ├── components/         # Reusable React components
│   ├── lib/                # Utilities and helpers
│   │   └── convex.ts       # Convex client utilities
│   ├── styles/             # CSS styles
│   │   └── app.css         # Main stylesheet
│   └── router.tsx          # Router configuration
├── public/                 # Static assets
├── vite.config.ts          # Vite + TanStack Start configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start Convex and Vite development servers
- `npm run dev:vite` - Start only the Vite development server
- `npm run dev:convex` - Start only the Convex development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking

## Features

- **Dashboard** - Overview of CMS status and quick navigation
- **Content Management** - Browse and manage content entries
- **Media Library** - Upload and organize media assets
- **Content Types** - Define content schemas with custom fields
- **Settings** - Configure CMS features and preferences

## Technology Stack

- [TanStack Start](https://tanstack.com/start) - Full-stack React framework
- [TanStack Router](https://tanstack.com/router) - Type-safe routing
- [Convex](https://convex.dev) - Real-time backend platform
- [React 19](https://react.dev) - UI library
- [Vite 7](https://vitejs.dev) - Build tool
