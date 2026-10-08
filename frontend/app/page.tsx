import { Suspense } from "react";

import HomeCategorySection from "@/components/HomeCategorySection";
import HomeHero from "@/components/HomeHero";
import StoreList from "@/components/StoreList";
import StoreListSkeleton from "@/components/StoreListSkeleton";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 sm:px-6 sm:py-5">
        <HomeHero />

        <div id="categories" className="scroll-mt-52 sm:scroll-mt-44">
          <HomeCategorySection />
        </div>

        <section id="stores" className="scroll-mt-52 sm:scroll-mt-44">
          <h2 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">
            Stores near you
          </h2>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">
            Prefer a specific supermarket? Browse stores sorted by distance from
            you.
          </p>

          <div className="mt-6">
            <Suspense fallback={<StoreListSkeleton />}>
              <StoreList />
            </Suspense>
          </div>
        </section>
    </main>
  );
}
