# ALO — sistema único de pedidos

Una sola app Angular 22 (`apps/alo`) y **un solo proyecto de Firebase** (`hamburguesas-8aba2`) para todo el
negocio. Hamburguesas, hot-dogs, tacos, sincronizadas y **fresas con crema** son *categorías* del mismo menú:
el cliente las ve como pestañas en el mismo sitio, y se administran desde el mismo panel.

```
apps/alo          app única: pedido público (/) y panel admin (/admin)
libs/alo-core     @alo/core: tipos, reglas de pedido y servicios compartidos
```

## Uso diario

```bash
npm install          # desde la raíz (workspaces)
npm start            # http://localhost:4200
npm run build        # → apps/alo/dist/alo/browser
npm test             # reglas de categoría + servicios
```

Si `npm install` falla con `EACCES` en `~/.npm`, la caché tiene archivos de root:
`sudo chown -R 501:20 ~/.npm`, o usa `npm install --cache /ruta/temporal`.

## Cómo se manejan los productos (panel → Catálogo)

Todo se define por **categoría**. Para agregar fresas, toppings nuevos, otro tamaño o un producto nuevo:

| Qué quieres | Dónde |
|---|---|
| Una línea nueva de productos (ej. "Fresas con crema", "Frappés") | **Categorías** → *Nueva categoría* y sus *Reglas de pedido* |
| Tamaños y precios de una categoría | **Precios** (filtra por categoría con las pastillas de arriba) |
| Cubiertas / bases (carnes en hamburguesas) | **Carnes y cubiertas** |
| Toppings / ingredientes | **Ingredientes y toppings** |
| Productos destacados con foto | **Populares** (eligen categoría y precio) |

Las pantallas de catálogo tienen un filtro por categoría: al filtrar por "Fresas con crema" todo lo que
crees queda en esa categoría.

### Reglas de pedido por categoría

Cada categoría decide su flujo sin tocar código (`libs/alo-core/src/models/categoria-reglas.ts`):

- **Pide base** (carne en hamburguesas, cubierta en fresas) o no (hot-dog).
- **Ingredientes**: vienen todos marcados y se quitan, o se parte de cero y se eligen (fresas).
- **Máximo** de ingredientes a elegir y opción **combinado** con un máximo mayor.
- **Etiquetas propias** (ej. "Cubierta", "Toppings").

Una categoría sin reglas se comporta como antes. Los hot-dogs antiguos se reconocen por su slug.

## Marca y tema

| Qué | Dónde |
|---|---|
| Nombre, emoji, etiquetas, enlace, horarios fijos del pie | `apps/alo/src/environments/environment.ts` (`.prod.ts` para producción) |
| Firebase y número de WhatsApp | mismos archivos |
| Colores y tipografía | `apps/alo/src/themes/alo.css` |
| Logo, favicon, manifest | `apps/alo/public/` |
| Título, fuentes y metadatos | `apps/alo/src/index.html` |

## Formularios

Todos los formularios usan **Signal Forms** (`@angular/forms/signals`: `form()` + `[formField]`).

## Firebase y datos

- Reglas: `apps/alo/firestore.rules` (se pegan en Firebase Console → Firestore → Reglas). El
  administrador se define por correo en `isOwnerEmail()` y debe ser un correo que **ya exista** en
  Authentication (si no, cualquiera podría registrarse con él desde la app).
- `scripts/copiar-hamburguesas.mjs`: copió el catálogo del proyecto anterior (`menu-5d081`) al actual.
- `scripts/agregar-fresas.mjs`: lleva el catálogo de Fresas (proyecto `logueo-8511e`, solo lectura) como la
  categoría "Fresas con crema".

Ambos scripts son aditivos e idempotentes (mismo id + merge), hacen **dry-run por defecto** y leen las
credenciales de variables de entorno:

```bash
cd apps/alo
node scripts/agregar-fresas.mjs                                  # dry-run
DESTINO_ADMIN_EMAIL=... DESTINO_ADMIN_PASSWORD=... \
  node scripts/agregar-fresas.mjs --apply
```

## Acceso al panel

El panel (`/admin`) exige **login con correo y contraseña** (Firebase Authentication). No hay credenciales
escritas en el código y la sesión se recuerda en cada dispositivo.

- **Dueño:** `environment.adminEmail` entra como administrador aunque aún no tenga documento en `/usuarios`.
  Las reglas (`isOwnerEmail()` en `firestore.rules`) deben listar el mismo correo, y debe existir ya en Authentication.
- **Empleados:** el administrador los crea desde el panel (*Empleados*). Quien tenga cuenta pero no un rol
  `admin` o `empleado` en `/usuarios` queda sin acceso (`inactivo`).
- **Nadie puede asignarse un rol a sí mismo:** `/usuarios` solo lo escribe un administrador (ver las reglas).
- Si no se puede leer el rol, el acceso se niega; nunca se asume administrador.

## Despliegue (Netlify)

Un solo sitio con `netlify.toml` (Node 22). Dominio autorizado en Firebase Authentication:
`hamburguesasalo.netlify.app`.

## Pendiente conocido

- Las rutas del panel no distinguen entre administrador y empleado en la interfaz; los permisos reales
  los aplican las reglas de Firestore.
