export interface CatalogCategory {
  name: string;
  slug: string;
  description: string;
  image: string;
  children?: Array<{ name: string; slug: string }>;
}

export const catalogCategories: CatalogCategory[] = [
  {
    name: "Lady Dresses",
    slug: "lady-dresses",
    description: "Vestidos seleccionados para combinar estilo y comodidad.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23003f8f' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3ELady%20Dresses%3C/text%3E%3C/svg%3E",
  },
  {
    name: "Home Office Storage",
    slug: "home-office-storage",
    description: "Organización práctica para espacios de trabajo y hogar.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%238b6f47' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='34' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3EHome%20Office%3C/text%3E%3C/svg%3E",
  },
  {
    name: "Blazers",
    slug: "blazers",
    description: "Prendas versátiles para completar tu selección.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%236b4ea3' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3EBlazers%3C/text%3E%3C/svg%3E",
  },
  {
    name: "Facial Care",
    slug: "facial-care",
    description: "Cuidado personal seleccionado para el día a día.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%2320a39f' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='42' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3EFacial%20Care%3C/text%3E%3C/svg%3E",
  },
];
