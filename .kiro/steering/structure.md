# Project Structure

## Repository Organization

This is a monorepo containing multiple LIFF implementation examples, each demonstrating different approaches to integrating the LINE Front-end Framework.

```
├── src/
│   ├── vanilla/          # Vanilla JavaScript implementation
│   ├── nextjs/           # Next.js React implementation  
│   ├── nuxtjs/           # Nuxt.js Vue implementation
│   └── bot-server/       # LINE Bot server integration
├── .github/              # GitHub workflows and templates
├── .kiro/                # Kiro AI assistant configuration
└── .vscode/              # VS Code workspace settings
```

## Implementation Directories

### `/src/vanilla/` - Vanilla JavaScript
- **Entry Point**: `index.html`, `index.js`
- **Styling**: `index.css`
- **Build Config**: `webpack.config.js`, `.babelrc`
- **Output**: `dist/` directory (gitignored)

### `/src/nextjs/` - Next.js React
- **Pages**: `pages/` directory with Next.js routing
- **Static Assets**: `public/` directory
- **Styling**: `styles/` directory
- **Config**: `next.config.js`, `.eslintrc`

### `/src/nuxtjs/` - Nuxt.js Vue
- **Pages**: `pages/` directory with Nuxt routing
- **Static Assets**: `public/` directory  
- **Config**: `nuxt.config.ts`, `tsconfig.json`
- **TypeScript**: Full TypeScript support enabled

### `/src/bot-server/` - LINE Bot Server
- **Entry Point**: `index.js`
- **Utilities**: `send-reminders.js`
- **Environment**: `.env.example` template

## Configuration Files

### Environment Configuration
- Each implementation has its own `.env.local.example` or `.env.example`
- LIFF_ID is the primary environment variable required
- Bot server requires LINE Bot SDK credentials

### Build Configuration
- **Vanilla**: Webpack with Babel for ES6+ transpilation
- **Next.js**: Built-in Next.js configuration
- **Nuxt.js**: Nuxt 3 with TypeScript support
- **Netlify**: `netlify.toml` configures deployment (defaults to vanilla build)

## Development Workflow

### Working with Multiple Implementations
1. Each implementation is self-contained with its own `package.json`
2. Navigate to specific implementation directory before running commands
3. Use implementation-specific scripts for development and building
4. Environment variables must be configured per implementation

### Adding New Features
- Implement across all relevant frameworks for consistency
- Maintain similar file structure patterns within each implementation
- Update corresponding README files in each implementation directory