import React from "react";
import Link from "next/link";

export interface Category {
  _id?: string;
  name: string;
  slug: string;
  image?: string;
  children?: {
    name: string;
    slug: string;
  }[];
}

interface MegaMenuProps {
  categories: Category[];
  open?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClose?: () => void;
}

const MegaMenu = React.forwardRef<HTMLDivElement, MegaMenuProps>(
  (
    {
      categories,
      open = false,
      onMouseEnter,
      onMouseLeave,
    },
    ref
  ) => {

    if (!open) return null;

    return (
      <div
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="absolute top-full left-0 mt-4 w-[min(92vw,900px)] max-w-[900px] rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl z-[999]"
      >

        {categories.length === 0 ? (
          <div className="text-sm text-neutral-500">
            No hay categorías disponibles
          </div>
        ) : (

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((cat) => (
              <div key={cat._id ?? cat.slug} className="border-r last:border-r-0 pr-4">
                <Link href={`/category/${cat.slug}`} className="font-semibold text-neutral-900 hover:text-[#ff007f] transition">{cat.name}</Link>
                {cat.children && cat.children.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {cat.children.map((child) => (
                      <Link key={child.slug} href={`/category/${child.slug}`} className="text-sm text-neutral-600 hover:text-[#ff007f]">{child.name}</Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

        )}

      </div>
    );
  }
);


MegaMenu.displayName="MegaMenu";

export default MegaMenu;