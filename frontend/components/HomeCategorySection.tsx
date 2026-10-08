import Image from "next/image";
import Link from "next/link";

import { categoryToSlug, SHOPPABLE_CATEGORIES } from "@/lib/categories";

export default function HomeCategorySection() {
  return (
    <section className="mb-6 sm:mb-8">
      <div className="mb-2 sm:mb-3">
        <h2 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">
          Shop by category
        </h2>
        <p className="mt-1 text-sm text-gray-500 sm:text-base">
          Pick what you need, then choose a nearby store that has it in stock.
        </p>
      </div>

      {/* Mobile: compact horizontal scroller (saves vertical space) */}
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SHOPPABLE_CATEGORIES.map((category) => (
          <Link
            key={category.id}
            href={`/shop/${categoryToSlug(category.id)}`}
            className="flex w-[5.75rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition active:scale-[0.98]"
          >
            <div className="relative aspect-square w-full bg-gray-50">
              <Image
                src={category.image}
                alt={category.name}
                fill
                sizes="92px"
                className="object-cover"
              />
            </div>
            <p className="px-2 py-2 text-center text-[11px] font-semibold leading-tight text-gray-900">
              {category.name}
            </p>
          </Link>
        ))}
      </div>

      {/* Tablet+: full category grid */}
      <div className="hidden grid-cols-4 gap-4 sm:grid lg:grid-cols-7">
        {SHOPPABLE_CATEGORIES.map((category) => (
          <article
            key={category.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:border-emerald-200 hover:shadow-md"
          >
            <div className="relative aspect-[4/3] w-full bg-gray-50 lg:aspect-square">
              <Image
                src={category.image}
                alt={category.name}
                fill
                sizes="(max-width: 1024px) 25vw, 14vw"
                className="object-cover"
              />
            </div>

            <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-4 lg:gap-2 lg:p-3">
              <h3 className="font-display text-sm font-bold text-gray-900 sm:text-base lg:text-sm">
                {category.name}
              </h3>
              <Link
                href={`/shop/${categoryToSlug(category.id)}`}
                className="mt-auto block rounded-xl bg-emerald-600 px-3 py-2.5 text-center text-xs font-semibold text-white transition hover:bg-emerald-700 sm:text-sm lg:px-2 lg:py-2 lg:text-xs"
              >
                Shop now
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
