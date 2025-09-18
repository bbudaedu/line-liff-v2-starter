# Technology Stack

## Core Technologies
- **LIFF SDK**: @line/liff (v2.16.0 - v2.24.0) - LINE Front-end Framework for mini-app development
- **LINE Bot SDK**: @line/bot-sdk (v10.2.0) - Server-side LINE messaging integration
- **Node.js**: Runtime environment with npm/yarn package management

## Framework Implementations

### Vanilla JavaScript
- **Build Tool**: Webpack 5 with Babel transpilation
- **Styling**: CSS with hot reloading support
- **Environment**: dotenv-webpack for configuration

### Next.js
- **Framework**: Next.js 15.0.1 with React 18.3.1
- **Linting**: ESLint with Next.js configuration
- **Port**: Development server runs on port 9000

### Nuxt.js
- **Framework**: Nuxt 3.8.2 with TypeScript support
- **Dev Tools**: @nuxt/devtools for development experience

### Bot Server
- **Runtime**: Node.js with CommonJS modules
- **Framework**: Express.js 5.1.0
- **HTTP Client**: Axios 1.11.0
- **CORS**: Enabled for cross-origin requests

## Build & Development Commands

### Root Level
```bash
npm ci              # Install dependencies
npm start           # Start development server
```

### Vanilla Implementation
```bash
npm run dev         # Development with hot reload
npm run build       # Production build
```

### Next.js Implementation
```bash
npm run dev         # Development server (port 9000)
npm run build       # Production build
npm run start       # Start production server
npm run lint        # Run ESLint
```

### Nuxt.js Implementation
```bash
npm run dev         # Development server
npm run build       # Production build
npm run generate    # Static site generation
npm run preview     # Preview built site
```

## Deployment
- **Platform**: Netlify with automated deployments
- **Build Command**: `cd src/vanilla && yarn install && yarn build`
- **Publish Directory**: `src/vanilla/dist`
- **Environment Variables**: LIFF_ID required for all deployments