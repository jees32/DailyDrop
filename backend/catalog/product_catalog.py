"""Shared product templates with category-specific images.

Each product has its own image URL (no category-level duplication).
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

ALL_CATEGORIES: tuple[str, ...] = (
    "Grocery",
    "Vegetables",
    "Fruits",
    "Fish",
    "Meat",
    "Other Household Items",
    "Pharmacy & Wellness",
)

MIN_PRODUCTS_PER_CATEGORY = 2

IMG = "https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w=400&h=400"


def img(photo_id: str) -> str:
    return IMG.format(id=photo_id)


# Category tile / fallback images (verified URLs).
CATEGORY_IMAGES: dict[str, str] = {
    "Grocery": img("1586201375761-83865001e31c"),
    "Vegetables": img("1540420773420-3366772f4999"),
    "Fruits": img("1490474418585-ba9bad8fd0ea"),
    "Fish": img("1577193459085-2da60ca7fd77"),
    "Meat": img("1603048297172-c92544798d5a"),
    "Other Household Items": img("1583947215259-38e31be8751f"),
    "Pharmacy & Wellness": img("1696861308115-54a5e5a134b0"),
}


@dataclass(frozen=True)
class ProductTemplate:
    name: str
    description: str
    category: str
    price: Decimal
    stock: int
    image_url: str


CATALOG: dict[str, list[ProductTemplate]] = {
    "Grocery": [
        ProductTemplate("Matta Rice 5kg", "Kerala red rice", "Grocery", Decimal("420.00"), 35, img("1586201375761-83865001e31c")),
        ProductTemplate("Basmati Rice 5kg", "Premium aged basmati", "Grocery", Decimal("620.00"), 40, img("1586201375761-83865001e31c")),
        ProductTemplate("Coconut Oil 1L", "Cold-pressed cooking oil", "Grocery", Decimal("280.00"), 48, img("1474979266404-7eaacbcd87c5")),
        ProductTemplate("Brahmins Tea Powder 500g", "Strong Kerala chaya", "Grocery", Decimal("245.00"), 40, img("1542838132-92c53300491e")),
        ProductTemplate("Toor Dal 1kg", "Unpolished lentils", "Grocery", Decimal("145.00"), 45, img("1586201375761-83865001e31c")),
        ProductTemplate("Whole Wheat Atta 2kg", "Stone-ground flour", "Grocery", Decimal("110.00"), 60, img("1586201375761-83865001e31c")),
        ProductTemplate("Sunflower Oil 1L", "Refined cooking oil", "Grocery", Decimal("165.00"), 55, img("1552592074-ea7a91b851b3")),
        ProductTemplate("Malabar Tamarind 250g", "Kudampuli for fish curry", "Grocery", Decimal("65.00"), 60, img("1542838132-92c53300491e")),
        ProductTemplate("Organic Honey 500g", "Raw forest honey", "Grocery", Decimal("350.00"), 15, img("1552592074-ea7a91b851b3")),
    ],
    "Vegetables": [
        ProductTemplate("Fresh Tomatoes 1kg", "Locally sourced vine tomatoes", "Vegetables", Decimal("38.00"), 30, img("1546094096-0df4bcaaa337")),
        ProductTemplate("Green Beans 500g", "Crisp farm-fresh beans", "Vegetables", Decimal("45.00"), 22, img("1542838132-92c53300491e")),
        ProductTemplate("Snake Gourd 1kg", "Padavalanga", "Vegetables", Decimal("42.00"), 25, img("1542838132-92c53300491e")),
        ProductTemplate("Drumstick 500g", "Moringa pods", "Vegetables", Decimal("55.00"), 30, img("1542838132-92c53300491e")),
        ProductTemplate("Carrots 500g", "Sweet orange carrots", "Vegetables", Decimal("32.00"), 25, img("1445282768818-728615cc910a")),
        ProductTemplate("Spinach Bunch", "Pesticide-free greens", "Vegetables", Decimal("28.00"), 18, img("1576045057995-568f588f82fb")),
        ProductTemplate("Yam (Chenai) 1kg", "Local tuber", "Vegetables", Decimal("48.00"), 20, img("1542838132-92c53300491e")),
        ProductTemplate("Curry Leaves Bunch", "Fresh from high-range farms", "Vegetables", Decimal("15.00"), 50, img("1542838132-92c53300491e")),
    ],
    "Fruits": [
        ProductTemplate("Nendran Banana 1kg", "Ethapazham", "Fruits", Decimal("68.00"), 40, img("1571771894821-ce9b6c11b08e")),
        ProductTemplate("Pineapple 1pc", "Vazhakulam variety", "Fruits", Decimal("45.00"), 22, img("1490474418585-ba9bad8fd0ea")),
        ProductTemplate("Apples 1kg", "Crisp imported apples", "Fruits", Decimal("220.00"), 20, img("1560806887-1e4cd0b6cbd6")),
        ProductTemplate("Papaya 1pc", "Ripe and ready to eat", "Fruits", Decimal("65.00"), 14, img("1490474418585-ba9bad8fd0ea")),
        ProductTemplate("Passion Fruit 500g", "Local orchard pick", "Fruits", Decimal("95.00"), 18, img("1490474418585-ba9bad8fd0ea")),
        ProductTemplate("Bananas 1 dozen", "Sweet Kerala bananas", "Fruits", Decimal("55.00"), 35, img("1571771894821-ce9b6c11b08e")),
    ],
    "Fish": [
        ProductTemplate("Fresh Pomfret 500g", "Cleaned and ready to cook", "Fish", Decimal("320.00"), 12, img("1577193459085-2da60ca7fd77")),
        ProductTemplate("Ayila Fish 500g", "Mackerel — daily catch", "Fish", Decimal("240.00"), 15, img("1577193459085-2da60ca7fd77")),
        ProductTemplate("Karimeen 500g", "Pearl spot — cleaned", "Fish", Decimal("480.00"), 10, img("1577193459085-2da60ca7fd77")),
        ProductTemplate("Prawns 500g", "Fresh water prawns", "Fish", Decimal("350.00"), 12, img("1565680018434-b513d5e5fd47")),
        ProductTemplate("Mackerel 1kg", "Fresh daily catch", "Fish", Decimal("280.00"), 10, img("1577193459085-2da60ca7fd77")),
    ],
    "Meat": [
        ProductTemplate("Chicken Breast 500g", "Skinless boneless cuts", "Meat", Decimal("185.00"), 18, img("1604503468506-a8da13d82791")),
        ProductTemplate("Beef Curry Cut 500g", "Fresh halal cut", "Meat", Decimal("320.00"), 20, img("1529692236671-f1f6cf9683ba")),
        ProductTemplate("Mutton Curry Cut 500g", "Fresh halal cuts", "Meat", Decimal("450.00"), 8, img("1603048297172-c92544798d5a")),
        ProductTemplate("Country Chicken 1kg", "Nattu kozhi", "Meat", Decimal("380.00"), 14, img("1604503468506-a8da13d82791")),
    ],
    "Other Household Items": [
        ProductTemplate("Dishwash Liquid 750ml", "Lemon fresh formula", "Other Household Items", Decimal("125.00"), 28, img("1583947215259-38e31be8751f")),
        ProductTemplate("Surf Excel Matic 1kg", "Front-load detergent", "Other Household Items", Decimal("265.00"), 30, img("1628177142898-93e36e4e3a50")),
        ProductTemplate("Toilet Cleaner 500ml", "Deep clean formula", "Other Household Items", Decimal("95.00"), 32, img("1581578731548-c64695cc6952")),
        ProductTemplate("Harpic Toilet Cleaner 500ml", "Original formula", "Other Household Items", Decimal("98.00"), 35, img("1581578731548-c64695cc6952")),
        ProductTemplate("Vim Dishwash Bar 3-pack", "Lemon variant", "Other Household Items", Decimal("45.00"), 55, img("1583947215259-38e31be8751f")),
        ProductTemplate("Floor Cleaner 1L", "Pine fragrance", "Other Household Items", Decimal("135.00"), 20, img("1628177142898-93e36e4e3a50")),
    ],
    "Pharmacy & Wellness": [
        ProductTemplate("Paracetamol 500mg 15 tabs", "OTC fever relief", "Pharmacy & Wellness", Decimal("18.00"), 80, img("1584308666744-24d5c474f2ae")),
        ProductTemplate("Dolo 650 15 tablets", "Pain and fever", "Pharmacy & Wellness", Decimal("32.00"), 60, img("1584308666744-24d5c474f2ae")),
        ProductTemplate("ORS Sachets 5-pack", "Electrolyte replenishment", "Pharmacy & Wellness", Decimal("55.00"), 45, img("1696861308115-54a5e5a134b0")),
        ProductTemplate("Band-Aid Washproof 10s", "First-aid strips", "Pharmacy & Wellness", Decimal("75.00"), 40, img("1584308666744-24d5c474f2ae")),
        ProductTemplate("Vicks Vaporub 25ml", "Cold relief balm", "Pharmacy & Wellness", Decimal("110.00"), 35, img("1696861308115-54a5e5a134b0")),
        ProductTemplate("Savlon Antiseptic 100ml", "Wound care liquid", "Pharmacy & Wellness", Decimal("85.00"), 28, img("1696861308115-54a5e5a134b0")),
        ProductTemplate("Crocin Advance 15 tabs", "Paracetamol 650mg", "Pharmacy & Wellness", Decimal("35.00"), 50, img("1584308666744-24d5c474f2ae")),
        ProductTemplate("Dettol Antiseptic 60ml", "First-aid disinfectant", "Pharmacy & Wellness", Decimal("45.00"), 40, img("1696861308115-54a5e5a134b0")),
        ProductTemplate("Moov Pain Relief Cream 50g", "Topical analgesic", "Pharmacy & Wellness", Decimal("145.00"), 18, img("1584308666744-24d5c474f2ae")),
        ProductTemplate("Volini Spray 60g", "Muscle pain relief spray", "Pharmacy & Wellness", Decimal("185.00"), 25, img("1696861308115-54a5e5a134b0")),
        ProductTemplate("Zincovit Tablets 15s", "Multivitamin supplement", "Pharmacy & Wellness", Decimal("95.00"), 30, img("1584308666744-24d5c474f2ae")),
        ProductTemplate("Becosules Capsules 20s", "B-complex vitamins", "Pharmacy & Wellness", Decimal("120.00"), 20, img("1696861308115-54a5e5a134b0")),
    ],
}


def image_for_product_name(name: str) -> str | None:
    for templates in CATALOG.values():
        for template in templates:
            if template.name == name:
                return template.image_url
    return None


def pick_templates_for_store(store_index: int) -> list[ProductTemplate]:
    """At least MIN_PRODUCTS_PER_CATEGORY items per category, rotated per store."""
    selected: list[ProductTemplate] = []
    for category in ALL_CATEGORIES:
        templates = CATALOG[category]
        count = len(templates)
        for slot in range(MIN_PRODUCTS_PER_CATEGORY):
            selected.append(templates[(store_index + slot) % count])
    return selected
