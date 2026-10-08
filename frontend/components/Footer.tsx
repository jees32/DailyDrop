import Link from "next/link";

const QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#categories", label: "Categories" },
  { href: "/#stores", label: "Stores near you" },
  { href: "/account", label: "My account" },
  { href: "/orders", label: "Your orders" },
];

const SUPPORT_LINKS = [
  { href: "#", label: "Help centre" },
  { href: "#", label: "Delivery areas" },
  { href: "#", label: "Partner with us" },
  { href: "#", label: "Privacy policy" },
  { href: "#", label: "Terms of use" },
];

const SOCIAL_LINKS = [
  { href: "#", label: "Instagram", icon: "📷" },
  { href: "#", label: "Facebook", icon: "📘" },
  { href: "#", label: "X (Twitter)", icon: "𝕏" },
  { href: "#", label: "LinkedIn", icon: "💼" },
];

const SERVICE_TOWNS = [
  "Paingottoor",
  "Kothamangalam",
  "Muvattupuzha",
  "Thodupuzha",
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="font-display text-xl font-extrabold text-gray-900">
              Daily<span className="text-emerald-600">Drop</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
              Hyperlocal grocery delivery from trusted supermarkets across Kerala
              towns. Order online, get essentials at your doorstep in 30–60
              minutes.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  title={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-base transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <span aria-hidden>{social.icon}</span>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Quick links
            </h3>
            <ul className="mt-3 space-y-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 transition hover:text-emerald-700"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Support
            </h3>
            <ul className="mt-3 space-y-2">
              {SUPPORT_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-600 transition hover:text-emerald-700"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              We deliver to
            </h3>
            <ul className="mt-3 space-y-2">
              {SERVICE_TOWNS.map((town) => (
                <li key={town} className="text-sm text-gray-600">
                  {town}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-400">
              More towns coming soon across Ernakulam &amp; Idukki districts.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-gray-100 pt-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} DailyDrop. All rights reserved.</p>
          <p className="text-gray-400">
            Mock payments · Demo purposes only
          </p>
        </div>
      </div>
    </footer>
  );
}
