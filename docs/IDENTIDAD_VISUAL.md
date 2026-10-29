# Smart Learning — Identidad visual

**Versión:** 2.1 · **Fecha:** 2026-10-29
**Reemplaza** la sección de tokens de `DESIGN_HANDOFF.md` (v1.0, paleta azul Tailwind/Inter).

---

## 1. Por qué un rediseño

La primera versión del sistema usaba el "look por defecto" de las interfaces generadas con IA:
Inter, azul Tailwind (`#3b82f6`), grises `slate`, tarjetas blancas muy redondeadas con sombra,
sidebar oscuro con gradiente e indicadores con cuadraditos pastel. Esa combinación es indistinguible
de decenas de sistemas presentados en el mismo contexto.

La identidad 2.x se apoya en tres decisiones que no aparecen en ese look genérico:

1. **Serif para los títulos** (Fraunces), sans humanista para la interfaz (Manrope).
2. **La paleta institucional de IICANA** (iicana.org): azul marino, rojo y naranja, con verde y
   mostaza como secundarios, sobre neutros fríos. No el azul genérico de Tailwind.
3. **Sidebar claro y agrupado**, tarjetas con borde fino y casi sin sombra, radios contenidos.

---

## 2. Tipografía

| Rol | Fuente | Token | Dónde |
|---|---|---|---|
| Interfaz | Manrope (variable) | `font-sans` | Todo el texto, tablas, formularios, botones |
| Display | Fraunces (variable, ejes `opsz` y `SOFT`, con itálica) | `font-display` | `h1`, `h2`, cifras de `StatTile`, wordmark, frase del login |

Reglas:

- `h1` y `h2` salen en serif automáticamente desde `globals.css` (`@layer base`). No agregar `font-display` a los títulos de página; sí a cifras o frases destacadas que no sean encabezados.
- `h3` y menores quedan en sans: son títulos de tarjeta, no de página.
- Las tablas usan `tabular-nums` (también desde `globals.css`), así las columnas numéricas alinean.
- Etiquetas de formulario y rótulos de sección: `text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500`.
- Pesos: Manrope `font-medium` para texto corriente destacado, `font-semibold` para botones y nombres; Fraunces `font-semibold` para títulos, `font-medium` para frases.

Ambas fuentes se cargan con `next/font/google` en `src/app/layout.tsx` (self-hosted, sin layout shift).

---

## 3. Color

Todos los tokens están en `@theme` de `src/app/globals.css`. Las escalas estándar de Tailwind
**están sobreescritas**: el código sigue escribiendo `slate-500` o `emerald-700`, pero el valor es el
de esta paleta. Eso permitió aplicar la identidad a 100+ archivos sin tocarlos.

Los valores base se tomaron de los estilos computados de iicana.org (octubre 2026):

| Color del sitio | Hex | Dónde aparece en iicana.org | Escala en Smart Learning |
|---|---|---|---|
| Azul marino | `#2d5383` | Logo, títulos, menú | `brand-700` |
| Celeste | `#0284d6` | Links | `info-500`, `COLORS.sky` |
| Rojo | `#bb4141` | Bandas de sección | `red-500` |
| Naranja | `#e27c00` | Resaltado del hero ("90 años") | `accent-500`, `orange-500` |
| Verde | `#3aa348` | Tarjeta "Cursos acelerados" | `emerald-500` |
| Mostaza | `#c4960d` | Tarjeta "Cursos intensivos" | `amber-500` |

### 3.1 Azul institucional (`brand-*`)

Color de acción: botones primarios, links, encabezados de tabla, ítem activo del sidebar, cuadrado
del logo, panel del login.

| Token | Hex | Uso |
|---|---|---|
| `brand-50` | `#eef3f9` | Fondos tenues, hover de filas |
| `brand-100` | `#d9e4f1` | Bordes de bandas informativas, `::selection` |
| `brand-300` | `#86a6cc` | Series secundarias en gráficos |
| `brand-500` | `#4a7bb0` | Focus ring |
| `brand-700` | `#2d5383` | **Primario** (el azul del logo de IICANA) |
| `brand-800` | `#244470` | Hover del primario, panel del login |

Contraste de blanco sobre `brand-700`: 8.1:1.

### 3.2 Naranja (`accent-*`)

Acento cálido y escaso, como el resaltado del hero del sitio: itálica del login, regla superior
de tarjetas en tono `brand`, barra de progreso de las autoevaluaciones. No se usa para acciones.

| Token | Hex |
|---|---|
| `accent-300` | `#efa24d` |
| `accent-500` | `#e27c00` |
| `accent-600` | `#bd6700` |

### 3.3 Rojo institucional (`red-*`)

Es a la vez el rojo de las bandas del sitio y el color de error/vencido/ausente. Para que no se
confunda, en la interfaz sólo aparece con significado (estados, botón `danger`, badge de
notificaciones) y como detalle del logo (el señalador del libro).

### 3.4 Neutros fríos (`slate-*`, sobreescrito)

| Token | Hex | Uso |
|---|---|---|
| `slate-50` | `#f6f7f9` | Fondo de página, sidebar y topbar |
| `slate-100` | `#eef0f3` | Hover sutil, filas alternadas |
| `slate-200` | `#e1e5ea` | Bordes de tarjetas, inputs y separadores |
| `slate-300` | `#c9d0d8` | Bordes en hover, íconos apagados |
| `slate-400` | `#94a0ad` | Placeholder, texto terciario |
| `slate-500` | `#6b7786` | Texto secundario, rótulos |
| `slate-600` | `#515c6a` | Texto de navegación inactiva |
| `slate-900` | `#161b22` | Texto principal |

### 3.5 Semánticos (sobreescritos)

| Escala | Origen | 500 | 700 | Uso |
|---|---|---|---|---|
| `emerald-*` | Verde del sitio | `#3aa348` | `#276c31` | Éxito, pagos al día, presente, promovido |
| `amber-*` | Mostaza del sitio | `#c4960d` | `#826209` | Advertencia, pendiente, tarde |
| `red-*` | Rojo del sitio | `#bb4141` | `#7f2b2b` | Error, vencido, ausente, suspendido |
| `orange-*` | Naranja del sitio | `#e27c00` | `#975200` | Reclamos abiertos, mora intermedia |
| `violet-*` | Propia | `#74578f` | `#4d3960` | Series de gráficos |

Los alias `success-*`, `warning-*`, `danger-*` e `info-500` apuntan a estas escalas.

### 3.6 Gráficos

`src/components/charts/palette.ts` expone `COLORS` y `SERIES_COLORS` con los mismos valores
(`brand` azul, `green`, `amber` mostaza, `violet`, `sky` celeste, `red`). Nunca escribir hex sueltos
en un gráfico.

---

## 4. Forma

| Propiedad | Valor | Comentario |
|---|---|---|
| Radio de tarjetas | `rounded-xl` = 10px (`--radius-xl`) | Antes 12px; `rounded-2xl` bajó de 16px a 12px |
| Radio de botones e inputs | `rounded-lg` = 8px | Sin cambio |
| Badges | `rounded-md` | Dejaron de ser píldoras |
| Borde de tarjeta | `border border-slate-200` | Hairline, siempre presente |
| Sombra de tarjeta | `shadow-sm` (5% de opacidad) | Casi imperceptible; `shadow-md` sólo en hover de tarjetas clickeables |
| Fondo de página | `bg-slate-50` | Las tarjetas blancas se recortan sobre el gris sin sombra |

---

## 5. Componentes clave

### Logo (`@/components/shared/Logo`)

- `LogoMark`: libro abierto (páginas blancas) con señalador rojo sobre un cuadrado azul marino,
  un guiño a las banderas que usa IICANA. Idéntico a `app/icon.svg`.
- `Wordmark`: "Smart *Learning*" en Fraunces, con "Learning" en itálica.
- `Logo`: los dos juntos. Usarlo en sidebar, auth y páginas de error. No volver a dibujar el SVG inline.

### Sidebar (`@/components/shared/Sidebar`)

- Fondo `slate-50`, borde derecho hairline, `sticky` a pantalla completa con scroll propio.
- Navegación **agrupada** con rótulos en versalitas (Académico, Administración, Dirección, Sistema para director; Clases / Cuenta para docente; Mi cursada / Instituto / Cuenta para alumno).
- Ítem activo: fondo blanco, `ring-1 ring-slate-200`, texto `font-semibold`, ícono azul y una barra vertical azul de 2px al borde izquierdo. Los ítems llevan `aria-current="page"`.
- Las etiquetas y rutas de los ítems **no cambiaron** respecto de la v1 (sólo se reordenaron en grupos).

### Topbar

`sticky`, fondo `slate-50` translúcido con `backdrop-blur`, borde inferior hairline. Avatar sin foto: círculo azul con iniciales.

### LogoutButton (`@/components/shared/LogoutButton`)

Botón de cerrar sesión con estado pendiente (`useFormStatus`): spinner, texto "Cerrando sesión..."
y deshabilitado mientras corre el action. Lo usan el sidebar y el menú del topbar.

### StatTile (`@/components/ui/StatTile`)

Tarjeta de indicador: rótulo en versalitas arriba, cifra grande en Fraunces, ícono gris a la derecha
que se tiñe de azul en hover. `tone="warning" | "danger" | "success" | "brand"` colorea la cifra y
agrega una regla fina de color en el borde superior; `tone="muted"` apaga la cifra (ej. "0 reclamos").
Reemplaza el patrón "ícono dentro de cuadradito pastel".

### AuthShell (`@/components/shared/AuthShell`)

Pantalla dividida: panel azul marino (`brand-800`) con wordmark, frase en serif con itálica naranja y
anillos concéntricos decorativos; formulario sobre `slate-50` a la derecha, sin tarjeta. En mobile el
panel desaparece y el logo queda centrado arriba. Lo usan login, recuperación, nueva contraseña e
invitación.

### Botones

- `primary`: azul institucional, texto blanco.
- `secondary`: blanco con borde `slate-300` y texto `slate-800`.
- `danger`: rojo institucional.
- Todos `font-semibold`. El cursor `pointer` en todos los botones se restaura en `globals.css`
  (Tailwind 4 lo quitó por defecto).

### Badges

`rounded-md`, `text-[11px] font-semibold uppercase tracking-wider`, con punto de color opcional.

---

## 6. Qué evitar (señales de "look IA")

- Gradientes azul → violeta en avatares, botones o barras de progreso.
- Íconos dentro de cuadrados pastel (`bg-blue-50` + `text-blue-600`).
- `rounded-2xl` + `shadow-lg` en tarjetas de contenido.
- Sidebar oscuro con gradiente.
- Clases `blue-*`: se reemplazaron por `brand-*` en todo `src/`.
- Títulos en sans `font-bold text-2xl`: el serif ya lo aporta `globals.css`; alcanza con `text-2xl`.
- Hex sueltos: todo color sale de `@theme` o de `COLORS`.

---

## 7. Accesibilidad

Pares verificados sobre blanco (WCAG AA, texto normal ≥ 4.5:1):

| Par | Contraste |
|---|---|
| `slate-900` sobre blanco | 16.9:1 |
| `slate-600` sobre blanco | 7.0:1 |
| `slate-500` sobre blanco | 4.9:1 |
| blanco sobre `brand-700` | 8.1:1 |
| `brand-700` sobre `slate-50` | 7.5:1 |
| `red-700` sobre `red-50` | 8.2:1 |
| `amber-800` sobre `amber-50` | 7.4:1 |
| `emerald-700` sobre `emerald-50` | 6.6:1 |
| blanco sobre `red-600` (botón danger) | 6.5:1 |

`slate-400` (placeholder, 3.1:1) se reserva para texto no esencial, igual que antes.
El ítem activo del sidebar y los links de navegación tienen foco visible por el ring de `brand-500`.
