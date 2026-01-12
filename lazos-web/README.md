# LAZOS Web - Frontend

Frontend de LAZOS, plataforma colaborativa para reportar avistamientos de mascotas en vía pública.

## 🚀 Stack Tecnológico

- **React 18.2** - UI library
- **Vite 5** - Build tool y dev server
- **React Router 6** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Componentes UI accesibles
- **Leaflet** - Mapas interactivos
- **Lucide React** - Iconos
- **NSFW.js + TensorFlow.js** - Validación de contenido con IA

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env

# Editar .env con tu configuración
# VITE_API_URL=http://localhost:8000
```

## 🏃 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia dev server en http://localhost:5173

# Build
npm run build            # Build de producción en /dist
npm run preview          # Preview del build de producción

# Linting
npm run lint             # Ejecuta ESLint
```

## 📁 Estructura del Proyecto

```
lazos-web/
├── public/              # Assets estáticos
│   ├── manifest.json    # PWA manifest
│   └── icons/           # Iconos de la app
├── src/
│   ├── components/      # Componentes React
│   │   ├── layout/      # Layout components (Header, Footer, etc.)
│   │   ├── posts/       # Componentes de posts
│   │   ├── ui/          # shadcn/ui components (Button, Card, etc.)
│   │   └── *.jsx        # Otros componentes (HelpModal, PWAInstallPrompt)
│   ├── hooks/           # Custom React hooks
│   │   └── useContentValidation.js  # Hook de validación con IA
│   ├── pages/           # Páginas/rutas
│   │   ├── Home.jsx
│   │   ├── Map.jsx
│   │   ├── NewPost.jsx
│   │   ├── NewAlert.jsx
│   │   ├── Search.jsx
│   │   └── Admin.jsx
│   ├── services/        # Servicios y API clients
│   ├── utils/           # Utilidades
│   │   └── validateText.js  # Validación de texto (spam, etc.)
│   ├── lib/             # Configuración de librerías
│   │   └── utils.js     # cn() helper para Tailwind
│   ├── App.jsx          # Componente raíz con Router
│   ├── main.jsx         # Entry point
│   └── index.css        # Estilos globales + Tailwind
├── .env.example         # Variables de entorno de ejemplo
├── vite.config.js       # Configuración de Vite
├── tailwind.config.js   # Configuración de Tailwind
├── postcss.config.js    # Configuración de PostCSS
└── package.json
```

## ⚙️ Variables de Entorno

Crear archivo `.env` en la raíz de `lazos-web/`:

```bash
# URL del backend API
VITE_API_URL=http://localhost:8000

# Supabase (opcional, si usás Supabase Storage)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Entorno
VITE_ENV=development
```

**Importante**: Todas las variables de entorno deben empezar con `VITE_` para ser expuestas al código.

## 🎨 Tema y Estilos

### Tailwind CSS

El proyecto usa Tailwind con variables CSS custom para soporte de tema claro/oscuro:

```css
/* Variables semánticas */
--background
--foreground
--card
--card-foreground
--primary
--primary-foreground
--muted
--muted-foreground
--border
```

### Modo Oscuro

El modo oscuro se activa automáticamente según la preferencia del sistema:

```jsx
// En components
<div className="bg-background text-foreground">
  <p className="text-muted-foreground">Texto secundario</p>
</div>
```

### shadcn/ui

Los componentes UI están en `src/components/ui/`. Para agregar nuevos componentes:

1. Crear archivo en `src/components/ui/nombre.jsx`
2. Importar y usar con el alias `@/components/ui/nombre`

## 🛠️ Características Clave

### 1. Validación de Contenido con IA

```jsx
import { useContentValidation } from '@/hooks/useContentValidation'

const { validateImages, loading } = useContentValidation()

// Validar imágenes antes de enviar
const result = await validateImages(images)
if (!result.safe) {
  // Rechazar contenido inapropiado
}
```

### 2. Validación de Texto

```jsx
import { validateText, sanitizeText } from '@/utils/validateText'

const validation = validateText(description)
if (!validation.valid) {
  console.error(validation.errors)
}

const clean = sanitizeText(userInput) // Limpia HTML, scripts, etc.
```

### 3. PWA Install Prompt

Prompt no invasivo para instalar la app (se muestra una vez en móviles):

```jsx
// En Layout.jsx
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

<PWAInstallPrompt />
```

### 4. Mapa Interactivo

```jsx
import { MapContainer, TileLayer, Marker } from 'react-leaflet'

<MapContainer center={[-34.6037, -58.3816]} zoom={13}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  {posts.map(post => <Marker key={post.id} position={[post.lat, post.lon]} />)}
</MapContainer>
```

## 📱 PWA

La app es instalable como PWA. Configuración en:

- `public/manifest.json` - Manifest de la app
- `public/icons/` - Iconos para diferentes tamaños
- `src/components/PWAInstallPrompt.jsx` - Prompt de instalación

## 🌐 Deployment

### Vercel (Recomendado)

```bash
# Build settings
Build Command: npm run build
Output Directory: dist
Install Command: npm install

# Environment Variables
VITE_API_URL=https://your-api-domain.com
```

### Otras plataformas

El proyecto es compatible con cualquier hosting de sitios estáticos:

- Netlify
- Cloudflare Pages
- GitHub Pages
- Firebase Hosting

## 🐛 Troubleshooting

### Error: Cannot find module '@/...'

Verificá que `vite.config.js` tenga el alias configurado:

```js
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

### Imágenes no cargan desde API

Verificá que `VITE_API_URL` esté correctamente configurado en `.env`.

### Bundle size demasiado grande

TensorFlow.js y NSFW.js agregan ~18MB al bundle. Para optimizar:

```js
// Cargar solo cuando se necesita (lazy load)
const model = await import('nsfwjs')
```

## 📚 Recursos

- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Leaflet](https://leafletjs.com/)

## 🤝 Contribuir

Ver [CONTRIBUTING.md](../CONTRIBUTING.md) en la raíz del proyecto.

---

**Parte de [LAZOS](../README.md)**
