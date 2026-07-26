export interface CatalogCategory {
  name: string;
  slug: string;
  description: string;
  image: string;
  children?: Array<{ name: string; slug: string }>;
}

export const catalogCategories: CatalogCategory[] = [
  {
    name: "Tecnología",
    slug: "tecnologia",
    description: "Smartphones, accesorios y gadgets con foco en rendimiento, diseño y valor.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23003f8f' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3ETecnología%3C/text%3E%3C/svg%3E",
    children: [
      { name: "Smartphones", slug: "smartphones" },
      { name: "Audio", slug: "audio" },
      { name: "Accesorios", slug: "accesorios-tecnologia" },
    ],
  },
  {
    name: "Hogar",
    slug: "hogar",
    description: "Soluciones prácticas para el día a día con estética y funcionalidad.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%238b6f47' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3EHogar%3C/text%3E%3C/svg%3E",
    children: [
      { name: "Organización", slug: "organizacion" },
      { name: "Iluminación", slug: "iluminacion" },
      { name: "Decoración", slug: "decoracion" },
    ],
  },
  {
    name: "Accesorios",
    slug: "accesorios",
    description: "Pequeños detalles que suman comodidad, estilo y utilidad real.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%236b4ea3' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3EAccesorios%3C/text%3E%3C/svg%3E",
    children: [
      { name: "Bolsas", slug: "bolsas" },
      { name: "Cuidado personal", slug: "cuidado-personal" },
      { name: "Viaje", slug: "viaje" },
    ],
  },
  {
    name: "Lifestyle",
    slug: "lifestyle",
    description: "Productos que acompañan el estilo de vida moderno y conectan con la marca.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%2320a39f' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3ELifestyle%3C/text%3E%3C/svg%3E",
    children: [
      { name: "Bienestar", slug: "bienestar" },
      { name: "Estilo", slug: "estilo" },
      { name: "Oficina", slug: "oficina" },
    ],
  },
];
