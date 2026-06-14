from dataclasses import dataclass


LOCAL_RULES_NOTE = "Check local municipal guidance for final disposal rules."


@dataclass(frozen=True)
class WasteSortingResult:
    classification: str
    disposal_guidance: str
    preparation_steps: list[str]
    confidence_level: str
    source: str = "manual_rule_engine"


RULES = [
    (
        "recyclable",
        {
            "plastic bottle",
            "glass bottle",
            "can",
            "paper",
            "cardboard",
            "newspaper",
            "milk carton",
        },
        "Rinse if needed, keep dry, flatten cardboard where possible, place in recycling stream if available.",
        [
            "Empty remaining contents.",
            "Rinse containers if needed.",
            "Keep paper and cardboard dry.",
            "Flatten cardboard where possible.",
        ],
    ),
    (
        "organic",
        {
            "food scraps",
            "vegetable peels",
            "fruit peels",
            "tea bags",
            "coffee grounds",
            "garden waste",
        },
        "Place in compost or organic waste stream if available. Avoid mixing with plastic.",
        [
            "Remove any plastic packaging.",
            "Keep organic material separate from general waste.",
            "Use compost or an organic waste stream if available.",
        ],
    ),
    (
        "e_waste",
        {
            "battery",
            "phone",
            "charger",
            "cable",
            "earphones",
            "laptop",
            "electronics",
            "light bulb",
        },
        "Do not place in general waste. Take to an e-waste or hazardous-waste collection point.",
        [
            "Keep the item separate from normal bins.",
            "Do not break or dismantle the item.",
            "Use an e-waste or hazardous-waste collection point.",
        ],
    ),
    (
        "hazardous",
        {
            "paint",
            "chemical",
            "pesticide",
            "medicine",
            "oil",
            "bleach",
            "cleaning chemical",
        },
        "Do not pour down drains or place in normal bins. Use a safe hazardous-waste disposal point.",
        [
            "Keep the item sealed in its original container where possible.",
            "Do not pour liquids down drains.",
            "Take it to a safe hazardous-waste disposal point.",
        ],
    ),
    (
        "reuse_or_donate",
        {
            "clothes",
            "shoes",
            "blanket",
            "furniture",
            "books",
            "toys",
        },
        "If usable, repair, reuse, donate, or sell before disposal.",
        [
            "Check whether the item is still usable.",
            "Clean it if appropriate.",
            "Repair, reuse, donate, or sell before disposal.",
        ],
    ),
]

CATEGORY_HINTS = {
    "Plastic": "recyclable",
    "Glass": "recyclable",
    "Paper/Cardboard": "recyclable",
    "Food/Organic": "organic",
    "Electronics": "e_waste",
    "Battery": "e_waste",
    "Clothing": "reuse_or_donate",
    "Chemical/Paint": "hazardous",
}


def sort_waste_item(
    item_name: str,
    item_description: str | None = None,
    selected_category: str | None = None,
) -> WasteSortingResult:
    haystack = " ".join(
        part.lower()
        for part in (item_name, item_description or "", selected_category or "")
        if part
    )

    for classification, keywords, guidance, steps in RULES:
        if any(keyword in haystack for keyword in keywords):
            return WasteSortingResult(
                classification=classification,
                disposal_guidance=with_local_note(guidance),
                preparation_steps=[*steps, LOCAL_RULES_NOTE],
                confidence_level="high",
            )

    if selected_category in CATEGORY_HINTS:
        return category_hint_result(CATEGORY_HINTS[selected_category])

    if item_name.strip() or (item_description and item_description.strip()):
        return WasteSortingResult(
            classification="general_waste",
            disposal_guidance=with_local_note(
                "No safer recycling, organic, hazardous, e-waste, or reuse match was found. Place in general waste only if it cannot be reused or handled through a special stream."
            ),
            preparation_steps=[
                "Remove any reusable or recyclable parts if clearly identifiable.",
                "Keep hazardous or electronic components out of normal bins.",
                LOCAL_RULES_NOTE,
            ],
            confidence_level="low",
        )

    return WasteSortingResult(
        classification="unknown",
        disposal_guidance=with_local_note(
            "The item could not be identified. Check packaging labels or local municipal guidance before disposal."
        ),
        preparation_steps=[
            "Check the item label or packaging.",
            "Avoid mixing unknown items with recycling.",
            LOCAL_RULES_NOTE,
        ],
        confidence_level="low",
    )


def category_hint_result(classification: str) -> WasteSortingResult:
    by_classification = {rule[0]: rule for rule in RULES}
    _, _, guidance, steps = by_classification[classification]
    return WasteSortingResult(
        classification=classification,
        disposal_guidance=with_local_note(guidance),
        preparation_steps=[*steps, LOCAL_RULES_NOTE],
        confidence_level="medium",
        source="resident_selected",
    )


def with_local_note(guidance: str) -> str:
    return f"{guidance} {LOCAL_RULES_NOTE}"
