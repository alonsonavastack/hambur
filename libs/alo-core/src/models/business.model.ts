export interface BusinessLabels {
  /** Unidad de pedido: "Vaso", "Hamburguesa"… */
  item: string;
  itemPlural: string;
  /** Opción única base: "Cubierta" (fresas) o "Carne" (hamburguesas). */
  base: string;
  basePlural: string;
  /** Opciones múltiples: "Toppings" o "Ingredientes". */
  ingrediente: string;
  ingredientePlural: string;
}

export interface BusinessConfig {
  id: string;
  nombre: string;
  /** Texto corto del encabezado y del mensaje de compartir. */
  slogan: string;
  emoji: string;
  /** Color de la barra del navegador / PWA. */
  themeColor: string;
  /** Dominio público, usado al compartir productos. */
  shareUrl: string;
  cloudinaryPreset: string;
  /** Líneas fijas de horario para el pie de la página de pedido (si el negocio las necesita). */
  horariosExtra?: string[];
  labels: BusinessLabels;
}
