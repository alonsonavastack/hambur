# 🍔 Hamburguesas ALO

App web **PWA** para gestión de pedidos de hamburguesas, hot-dogs y tacos.  
Construida con **Angular 21 + Firebase 11 + Tailwind CSS v4 + Signals**.  

🌐 **Producción:** [hamburguesasalo.netlify.app](https://hamburguesasalo.netlify.app)

---

## ✨ Funcionalidades

### 👤 Cliente (público)
- Hero con logo, título y horarios del negocio
- Sección **"Los más pedidos"** con populares de Firestore
- Armar pedido por categoría dinámica: 🌭 Hot-Dog · 🍔 Hamburguesa · 🌮 Taco
- Configurador colapsado hasta que el cliente ingresa su nombre
- Selección de tamaño/precio, tipo de carne e ingredientes
- Envío directo por **WhatsApp** con mensaje formateado
- Registro automático del pedido en Firebase
- Código QR para abrir el menú desde otro dispositivo
- **Modo offline**: guarda en IndexedDB, sincroniza al reconectar (anti-duplicados)

### 🛠️ Admin Panel (`/admin`)
| Módulo | Descripción |
|--------|-------------|
| 📊 Dashboard | KPIs del día: pedidos, ingresos, catálogo, QR descargable |
| 🯧 POS | Punto de venta para pedidos en mostrador (offline-aware) |
| 📋 Pedidos | Gestión con cambio de status + pedidos offline con badge 📴 LOCAL |
| 💰 Finanzas | Gastos, ingresos, utilidad neta y reportes por período |
| 👥 Clientes (CRM) | Historial agrupado por teléfono, ticket promedio, favoritos |
| 📈 Análiticas | Visitas por hora/día con Chart.js |
| 🥗 Ingredientes | CRUD con imagen, emoji y categorías |
| 🥩 Carnes | CRUD tipos de carne por categoría |
| 🏷️ Precios | CRUD precios por categoría y tamaño |
| ⭐ Populares | Combos destacados con imagen y categoría |
| 📂 Categorías | CRUD de categorías dinámicas (slug, emoji, orden) |
| ⚙️ Configuraciones | Branding: dirección, teléfono, horario, toggle tacos |
| 🖨️ Menú imprimible | Genera menú listo para imprimir |
| 👤 Empleados | Gestión de roles admin/empleado |

---

## 🚀 Setup inicial

### 1. Instalar dependencias
```bash
npm install
```

### 2. Popular Firestore con datos iniciales
```bash
npm run seed
```
> ⚠️ Solo ejecutar **una vez**. Requiere usuario admin creado primero (ver paso 3).

### 3. Crear usuario Admin en Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/project/menu-5d081) → **Authentication** → Agregar usuario
2. Copia el **UID** generado
3. En **Firestore → `usuarios/{UID}`** crea el documento manualmente:
   ```json
   { "nombre": "Alonso Nava", "email": "alonso.nava086@gmail.com", "role": "admin" }
   ```
4. Publica las **Reglas de Firestore** desde Firebase Console (ver `firestore.rules`)

### 4. Desarrollo local
```bash
ng serve
# → http://localhost:4200
```

---

## 📦 Build y Deploy (Netlify Drop)

```bash
ng build
# Carpeta a subir: dist/hamnurguesas-alo/browser
# Arrastra al drop en: app.netlify.com/drop
```

`netlify.toml` ya configurado con redirección SPA y headers CSP para Cloudinary + Firebase. ✅

---

## 🔧 Variables de entorno

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyDavRcB4DHxIB2f5zsW2jXZXbf7g37teQw",
    authDomain: "menu-5d081.firebaseapp.com",
    projectId: "menu-5d081",
    storageBucket: "menu-5d081.firebasestorage.app",
    messagingSenderId: "60185344139",
    appId: "1:60185344139:web:7a23d47b28cc332c07bc8e"
  },
  whatsappNumber: "527181043376"
};
```

---

## 🗂️ Estructura del proyecto

```
src/
├── environments/          # Firebase config + WhatsApp number
├── styles.css             # Paleta neón, glassmorphism, utilidades
├── index.html             # Open Graph / WhatsApp sharing meta tags
└── app/
    ├── core/
    │   ├── models/            # Interfaces TypeScript (Pedido, ItemPedido, Categoria…)
    │   ├── guards/            # authGuard
    │   └── services/
    │       ├── firebase-core    # Init Firebase SDK modular
    │       ├── firebase         # Signals + CRUD Firestore (onSnapshot)
    │       ├── auth             # Login/logout/roles RBAC
    │       ├── order            # Carrito con Signals
    │       ├── offline-sync     # IndexedDB + anti-duplicados atómicos
    │       ├── whatsapp         # Mensaje formateado + wa.me
    │       └── storage          # Upload imágenes a Firebase Storage
    └── features/
        ├── order/order-page/   # Página cliente con flujo completo
        └── admin/              # Todos los módulos del panel
```

---

## 🎨 Paleta de colores

| Variable | Color | Uso |
|----------|-------|-----|
| `--neon-blue` | `#00d4ff` | Primario, títulos, botones |
| `--neon-green` | `#39ff14` | Éxito, carnes, ingredientes |
| `--neon-pink` | `#ff2d9b` | Acento terciario |
| `--neon-orange` | `#ff8c00` | Precios, totales, CTAs |
| `--bg-base` | `#050508` | Fondo principal |

Tipografía: **Bebas Neue** (títulos) + **Nunito** (cuerpo).

---

## 📲 WhatsApp

Número configurado en `environment.ts`:
```ts
whatsappNumber: "527181043376"  // Formato: 52 + número sin guiones
```

---

## 🛡️ Roles

| Rol | Acceso |
|-----|--------|
| `admin` | Todo el panel + finanzas + configuraciones + empleados |
| `empleado` | Dashboard + POS + pedidos + clientes + imprimir menú |
| `inactivo` | Sin acceso |

---

## 📴 Modo Offline

Los pedidos se guardan en **IndexedDB** (`hamburguesasAlo_offline`) cuando no hay conexión:

- **POS offline** → `status: 'pendiente'` (visible en Pedidos para saber qué preparar)
- **POS online** → `status: 'entregado'` (venta inmediata)
- Al reconectar: sincronización atómica con `marcarSincronizando()` + `localId` guardado en Firestore para evitar duplicados
- Badge 📴 LOCAL en pedidos pendientes de sincronizar

---

## 🕐 Horarios de Atención

- 🔥 **Al Carbón:** Jueves, Viernes y Sábado — 7pm a 10pm
- 🍖 **A la Parrilla:** Lunes y Martes — 1pm a 10pm

---

## 📝 Licencia

Proyecto privado — Hamburguesas ALO © 2026

---

## ✨ Funcionalidades

### 👤 Cliente (público)
- Armar pedido por categoría: 🌭 Hot-Dog · 🍔 Hamburguesa · 🌮 Taco
- Selección de tamaño/precio, tipo de carne e ingredientes
- Envío directo por **WhatsApp** con mensaje formateado
- Registro automático del pedido en Firebase
- **Modo offline**: si no hay internet, guarda en IndexedDB y sincroniza al reconectar

### 🛠️ Admin Panel (`/admin`)
| Módulo | Descripción |
|--------|-------------|
| 📊 Dashboard | KPIs del día: pedidos, ingresos, producto top |
| 🧾 POS | Punto de venta para pedidos en mostrador |
| 📋 Pedidos | Gestión con cambio de status en tiempo real |
| 💰 Finanzas | Gastos, ingresos, utilidad y reportes por periodo |
| 👥 Clientes (CRM) | Historial, ticket promedio, cliente VIP, contacto WA |
| 📈 Analíticas | Top productos, ingresos por día, visitas, conversión |
| 🥗 Ingredientes | CRUD completo con imagen y disponibilidad |
| 🥩 Carnes | CRUD tipos de carne por categoría |
| 🏷️ Precios | CRUD precios por categoría y tamaño |
| ⭐ Populares | Combos destacados con imagen |
| ⚙️ Configuraciones | Branding: logo, nombre, horario, tacos toggle |
| 🖨️ Menú imprimible | Genera menú listo para imprimir |
| 👤 Empleados | Gestión de roles admin/empleado en Firestore |

---

## 🚀 Setup inicial

### 1. Instalar dependencias
```bash
npm install
```

### 2. Popular Firestore con datos iniciales
```bash
node scripts/seed-firestore.mjs
```
> ⚠️ Solo ejecutar **una vez**. Crea ingredientes, carnes, precios y branding base.

### 3. Crear usuario Admin en Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com) → Tu proyecto → **Authentication**
2. Agrega un usuario con email y contraseña
3. Copia el **UID** del usuario creado
4. Inicia la app (`ng serve`) → ve a `/admin/login` → entra
5. Ve a `/admin/empleados` y registra el UID con rol `admin`

> 💡 La primera vez puedes agregar manualmente en Firestore:
> `usuarios/{UID}` → `{ id, nombre, email, role: "admin" }`

### 4. Publicar reglas de Firestore
```bash
# Con Firebase CLI instalado:
firebase deploy --only firestore:rules
```

### 5. Desarrollo local
```bash
ng serve
# → http://localhost:4200
```

---

## 📦 Build y Deploy

### Netlify
```bash
ng build
# La carpeta: dist/hamnurguesas-alo/browser
# netlify.toml ya configurado ✅
```

### Variables de entorno
Las credenciales Firebase están en `src/environments/environment.ts`.  
Para producción usa `environment.prod.ts` (mismo contenido, `production: true`).

---

## 🗂️ Estructura del proyecto
```
src/
├── environments/          # Firebase config + WhatsApp number
├── styles.css             # Paleta neón, glassmorphism, utilidades
└── app/
    ├── core/
    │   ├── models/        # Interfaces TypeScript
    │   ├── guards/        # authGuard, adminGuard
    │   └── services/
    │       ├── firebase-core   # Init Firebase
    │       ├── firebase        # Signals + CRUD Firestore
    │       ├── auth            # Login/logout/roles
    │       ├── order           # Carrito + builder WhatsApp
    │       ├── offline-sync    # IndexedDB offline
    │       ├── whatsapp        # Envío wa.me
    │       └── storage         # Upload imágenes
    └── features/
        ├── order/order-page/   # Página cliente
        └── admin/              # Todos los módulos admin
```

---

## 🎨 Paleta de colores
| Variable | Color | Uso |
|----------|-------|-----|
| `--neon-blue` | `#00d4ff` | Primario, títulos, botones |
| `--neon-green` | `#39ff14` | Éxito, carnes, WhatsApp |
| `--neon-pink` | `#ff2d9b` | Acento, ingredientes |
| `--neon-orange` | `#ff8c00` | Precios, totales |
| `--bg-base` | `#050508` | Fondo principal |

---

## 📲 WhatsApp
El número de WhatsApp se configura en `environment.ts`:
```ts
whatsappNumber: "527181043376"  // Formato: 52 + número sin guiones
```

---

## 🛡️ Roles
| Rol | Acceso |
|-----|--------|
| `admin` | Todo el panel + finanzas + configuraciones + empleados |
| `empleado` | Dashboard + POS + pedidos + clientes + print-menu |
| `inactivo` | Sin acceso |

---

## 📝 Licencia
Proyecto privado — Hamburguesas ALO © 2025
