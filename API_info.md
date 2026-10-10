# CitySync — APIs and Libraries

A complete catalog of all external APIs, runtime dependencies, styling frameworks, and developer tools used across the CitySync application, with links to their official documentation.

---

## 1. External APIs & Web Services

| API / Service | Purpose in CitySync | Official Documentation Link |
| :--- | :--- | :--- |
| **OpenStreetMap Standard Tile API** | Powers the interactive Chennai municipal map view with base map tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`). | [OpenStreetMap Tile API Docs](https://wiki.openstreetmap.org/wiki/Tile_servers) |
| **Google Fonts API** | Delivers the modern typography (`Inter` variable font weights 300 to 800) loaded in `index.html`. | [Google Fonts - Inter](https://fonts.google.com/specimen/Inter) |
| **Unsplash Asset API / CDN** | Source for high-resolution civic infrastructure and dusk cityscape imagery used in hero backgrounds. | [Unsplash API](https://unsplash.com/developers) |
| **Web Browser Web Storage API** (`localStorage`) | Client-side persistent data storage for seed projects, state mutation, audit ledger logs, authentication sessions, and language/theme preferences. | [MDN Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) |
| **Web Browser Blob & URL API** (`URL.createObjectURL`) | Client-side CSV generation and instant browser export/download of project reports. | [MDN URL.createObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static) |

---

## 2. Frontend Libraries (Production Runtime Dependencies)

| Library | Version | Purpose in CitySync | Official Documentation Link |
| :--- | :--- | :--- | :--- |
| **React** | `^18.3.1` | Core UI library for declarative component state and lifecycle rendering. | [react.dev](https://react.dev/) |
| **React DOM** | `^18.3.1` | DOM renderer for the React web application. | [react.dev/reference/react-dom](https://react.dev/reference/react-dom) |
| **React Router DOM** | `^6.27.0` | Client-side routing, protected routes (`RequireGovAuth`), URL query parameters, and navigation. | [reactrouter.com](https://reactrouter.com/) |
| **Leaflet** | `^1.9.4` | Mobile-friendly interactive mapping library handling coordinate projection and layers. | [leafletjs.com](https://leafletjs.com/) |
| **React-Leaflet** | `^4.2.1` | React components for Leaflet maps (`<MapContainer>`, `<TileLayer>`, `<Marker>`, `<Popup>`). | [react-leaflet.js.org](https://react-leaflet.js.org/) |
| **Recharts** | `^2.13.3` | SVG chart components used for status breakdown, department workloads, and analytics. | [recharts.org](https://recharts.org/) |
| **Lucide React** | `^0.454.0` | Modern SVG icons used throughout navigation, badges, cards, and modal dialogs. | [lucide.dev](https://lucide.dev/) |
| **date-fns** | `^4.1.0` | Functional JavaScript date utility library used for duration calculations and date comparisons. | [date-fns.org](https://date-fns.org/) |
| **clsx** | `^2.1.1` | Utility for conditionally constructing `className` strings efficiently. | [github.com/lukeed/clsx](https://github.com/lukeed/clsx) |

---

## 3. Styling & Build Frameworks (Developer Dependencies)

| Library / Tool | Version | Purpose in CitySync | Official Documentation Link |
| :--- | :--- | :--- | :--- |
| **Tailwind CSS** | `^3.4.14` | Utility-first CSS framework powering the Deep Purple design system, responsive grids, and tokens. | [tailwindcss.com](https://tailwindcss.com/) |
| **PostCSS** | `^8.4.47` | CSS transformation pipeline for Tailwind CSS. | [postcss.org](https://postcss.org/) |
| **Autoprefixer** | `^10.4.20` | PostCSS plugin to parse CSS and apply vendor prefixes automatically. | [github.com/postcss/autoprefixer](https://github.com/postcss/autoprefixer) |
| **Vite** | `^5.4.10` | Next-generation frontend build tool and local development server. | [vite.dev](https://vite.dev/) |
| **TypeScript** | `^5.6.3` | Strongly-typed programming language layered on JavaScript. | [typescriptlang.org](https://www.typescriptlang.org/) |
| **tsx** | `^4.23.15` | TypeScript execute engine used to run the deterministic test suite directly in Node.js. | [tsx.is](https://tsx.is/) |
| **ESLint** | `^9.13.0` | Static code analysis tool for code quality and bug prevention. | [eslint.org](https://eslint.org/) |
