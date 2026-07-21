## Design Tokens – IA Training Center Frontend

Este documento define los **design tokens base** para el frontend del sistema de entrenamiento (IA / training center).  
Están pensados para luego mapearse a Tailwind, CSS variables o un tema de UI en cualquier framework.

---

### 1. Colores

#### 1.1. Paleta de marca (tokens base)

- **`color.brand.primary`**: `#e11d48` – color de marca principal (botones primarios, acentos importantes).
- **`color.brand.primary-muted`**: `#fff1f2` – fondo suave para badges y chips relacionados a la marca.
- **`color.brand.primary-dark`**: `#be123c` – estados hover/active del primario.
- **`color.brand.accent`**: `#d97706` – acento secundario (dificultad, etiquetas “Hard”, detalles cálidos).
- **`color.brand.accent-muted`**: `#fef3c7` – fondo suave para acentos secundarios.

#### 1.2. Neutros (tokens base)

- **`color.neutral.background`**: `#fafafa` – fondo general de la app.
- **`color.neutral.surface`**: `#ffffff` – superficies elevadas (cards, paneles).
- **`color.neutral.border`**: `#e2e8f0` – bordes sutiles que separan bloques.
- **`color.neutral.text-primary`**: `#0f172a` – texto principal sobre fondos claros.
- **`color.neutral.text-muted`**: `#64748b` – texto secundario, ayudas, descripciones.
- **`color.neutral.text-inverse`**: `#f9fafb` – texto sobre fondos oscuros.

#### 1.3. Estados / dominio de juez

- **`color.status.success`**: `#059669` – aceptado / correcto (AC).
- **`color.status.error`**: `#b91c1c` – respuesta incorrecta (WA).
- **`color.status.warning`**: `#d97706` – límite de tiempo / advertencias (TLE).

> Estos tres tokens se alinean con el dominio del juez online, pero se nombran en términos de **estado** para ser reutilizables.

#### 1.4. Chrome / Layout

"Chrome" son las superficies grandes que enmarcan el contenido (sidebar, navbar) — distinto rol que un acento de marca (botones, links), por eso viven en su propia familia de tokens en vez de reusar `color.brand.primary` directamente.

- **`color.chrome.sidebar.bg`**: `#C13E3E` – fondo del sidebar (rojo de marca, desaturado para cubrir una superficie grande sin saturar la vista).
- **`color.chrome.navbar.bg`**: `#FFF5F5` – fondo de la barra superior (lavado muy suave del mismo rojo).

> Estos tokens NO reemplazan a `color.brand.primary`: el rojo de marca sigue siendo el de botones y acentos puntuales. El chrome resuelve un problema distinto — cubrir superficie sin cansar la vista.

#### 1.5. Tokens semánticos

Los tokens semánticos se apoyan en los anteriores, pero hablan de **rol en la UI**:

- **Fondos**
  - **`color.bg.page`** = `color.neutral.background`
  - **`color.bg.surface`** = `color.neutral.surface`
  - **`color.bg.surface-elevated`** = `color.neutral.surface`

- **Texto**
  - **`color.text.primary`** = `color.neutral.text-primary`
  - **`color.text.muted`** = `color.neutral.text-muted`
  - **`color.text.inverse`** = `color.neutral.text-inverse`

- **Bordes**
  - **`color.border.subtle`** = `color.neutral.border`

- **Botones**
  - **`color.button.primary.bg`** = `color.brand.primary`
  - **`color.button.primary.bg-hover`** = `color.brand.primary-dark`
  - **`color.button.primary.text`** = `color.neutral.surface`

- **Badges / etiquetas**
  - **`color.badge.tag.bg`** = `color.brand.primary-muted`
  - **`color.badge.tag.text`** = `color.brand.primary`
  - **`color.badge.difficulty.hard.bg`** = `color.brand.accent-muted`
  - **`color.badge.difficulty.hard.text`** = `color.brand.accent`

---

### 2. Tipografía

#### 2.1. Familias

- **`font.family.sans`**: `"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **`font.family.mono`**: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`

#### 2.2. Tamaños (rem)

- **`font.size.xs`**: `0.75rem` (12px) – etiquetas pequeñas, metadatos.
- **`font.size.sm`**: `0.875rem` (14px) – texto secundario, descripciones.
- **`font.size.md`**: `1rem` (16px) – cuerpo de texto principal.
- **`font.size.lg`**: `1.125rem` (18px) – subtítulos y textos importantes.
- **`font.size.xl`**: `1.25rem` (20px) – títulos de secciones.
- **`font.size.2xl`**: `1.5rem` (24px) – títulos principales (H1/Hero).

#### 2.3. Peso

- **`font.weight.regular`**: `400`
- **`font.weight.medium`**: `500`
- **`font.weight.semibold`**: `600`
- **`font.weight.bold`**: `700`
- **`font.weight.extrabold`**: `800`

#### 2.4. Line height

- **`line-height.snug`**: `1.25` – títulos compactos.
- **`line-height.normal`**: `1.5` – lectura cómoda.
- **`line-height.relaxed`**: `1.7` – párrafos largos o texto denso.

#### 2.5. Estilos tipográficos semánticos

- **`type.heading.h1`**
  - `font.family.sans`, `font.size.2xl`, `font.weight.extrabold`, `line-height.snug`
  - Uso: títulos de problemas, secciones principales.

- **`type.body.base`**
  - `font.family.sans`, `font.size.md`, `font.weight.regular`, `line-height.normal`
  - Uso: enunciados, descripciones.

- **`type.label.tag`**
  - `font.family.sans`, `font.size.xs`, `font.weight.bold`, `letter-spacing: 0.08em` (uppercase)
  - Uso: tags de categoría, badges de dificultad.

- **`type.code.inline`**
  - `font.family.mono`, `font.size.sm`, `line-height.normal`
  - Uso: snippets de código e inputs/calls breves.

---

### 3. Spacing (escala de espaciado)

Basado en una cuadrícula de **4px**:

- **`spacing.0`**: `0px`
- **`spacing.1`**: `4px` (`0.25rem`)
- **`spacing.2`**: `8px` (`0.5rem`)
- **`spacing.3`**: `12px` (`0.75rem`)
- **`spacing.4`**: `16px` (`1rem`)
- **`spacing.6`**: `24px` (`1.5rem`)
- **`spacing.8`**: `32px` (`2rem`)
- **`spacing.12`**: `48px` (`3rem`)
- **`spacing.16`**: `64px` (`4rem`)

Usos recomendados:

- **`spacing.4`**: padding interno de inputs y botones.
- **`spacing.6`**: padding interno de cards principales.
- **`spacing.8` – `spacing.12`**: separación entre secciones de página.
- **`spacing.16`**: bloques macro (secciones grandes, como en la demo).

---

### 4. Radius (esquinas) y sombras

#### 4.1. Radius

- **`radius.sm`**: `6px` (`0.375rem`) – elementos pequeños (chips, badges).
- **`radius.md`**: `12px` (`0.75rem`) – tarjetas pequeñas, contenedores secundarios.
- **`radius.lg`**: `24px` (`1.5rem`) – cartas principales del sistema y paneles destacados.
- **`radius.pill`**: `9999px` – botones pill y etiquetas redondeadas.

#### 4.2. Sombras (elevación)

Nombres conceptuales, pueden mapearse a `box-shadow` concretos o a niveles de Tailwind:

- **`elevation.1`** – sombra muy sutil, para cards básicas.
- **`elevation.2`** – sombra media, para componentes que requieren foco.
- **`elevation.3`** – sombra más marcada, para overlays como el editor de código.

---

### 5. Ejemplo de mapeo a Tailwind (CDN)

En la demo HTML se utiliza Tailwind vía CDN con una configuración mínima que mapea algunos de estos tokens a clases utilitarias:

- `colors.brand.primary` → `bg-brand-primary`, `text-brand-primary`
- `colors.neutral.border` → `border-neutral-border`
- `font.family.sans` → fuente global del `body`
- `radius.lg` → clases personalizadas como `rounded-[24px]` (por ahora), con idea de migrar a `rounded-radius-lg`

El objetivo de este archivo es servir como **fuente de verdad** independiente de la herramienta.  
Las implementaciones (Tailwind, CSS variables, temas de componente) deben referenciar estos nombres de token, no valores fijos.

