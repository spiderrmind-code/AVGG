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
    image: "/image/tecnologia.jpg",
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
    image: "/image/hogar.jpg",
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
    image: "/image/accesorios.jpg",
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
    image: "/image/lifestyle.jpg",
    children: [
      { name: "Bienestar", slug: "bienestar" },
      { name: "Estilo", slug: "estilo" },
      { name: "Oficina", slug: "oficina" },
    ],
  },
];
