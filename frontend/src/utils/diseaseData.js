// ==========================================
// SKINOVA - Medical Disease Data Dictionary
// ==========================================

export const DISEASE_DATA = {
  AKIEC: {
    code: "AKIEC",
    name: "Actinic Keratosis / Intraepithelial Carcinoma",
    shortName: "Actinic Keratosis",
    category: "Precancerous / In-Situ Carcinoma",
    riskLevel: "High Risk",
    riskColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    urgency: "Consult within 1-2 weeks",
    description: "Dry, scaly patches on sun-exposed areas caused by cumulative ultraviolet radiation. Can progress to invasive squamous cell carcinoma if untreated.",
    commonAreas: ["Face", "Scalp", "Ears", "Forearms", "Back of hands"],
    typicalSigns: [
      "Rough, sandpaper-like texture",
      "Pink, red, or brownish patches",
      "May sting or itch when touched",
      "Thickened, scaly or warty surface"
    ],
    recommendedActions: [
      "Schedule a clinical evaluation with a dermatologist for cryotherapy or topical 5-FU therapy.",
      "Apply broad-spectrum SPF 50+ sunscreen daily and wear protective clothing.",
      "Perform monthly whole-body skin self-examinations."
    ]
  },
  BCC: {
    code: "BCC",
    name: "Basal Cell Carcinoma",
    shortName: "Basal Cell Carcinoma",
    category: "Malignant Skin Cancer",
    riskLevel: "High Risk",
    riskColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    urgency: "Specialist consultation within 1-2 weeks",
    description: "The most common form of skin cancer globally. Slow-growing malignant neoplasm originating from basal cells of the epidermis. Highly curable when excised early.",
    commonAreas: ["Nose", "Cheeks", "Forehead", "Neck", "Shoulders"],
    typicalSigns: [
      "Pearly, shiny or translucent bump with visible micro-vessels (telangiectasia)",
      "Non-healing sore that bleeds, oozes, or crusts over repeatedly",
      "Pink growth with slightly elevated, rolled borders",
      "Scar-like white or yellowish area with poorly defined margins"
    ],
    recommendedActions: [
      "Prompt surgical excision, Mohs micrographic surgery, or electrodessication by a dermato-surgeon.",
      "Avoid picking or scratching the lesion.",
      "Annual full-body dermoscopy screening."
    ]
  },
  BKL: {
    code: "BKL",
    name: "Benign Keratosis-like Lesions",
    shortName: "Benign Keratosis / Seborrheic Keratosis",
    category: "Benign Skin Lesion",
    riskLevel: "Low Risk",
    riskColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    urgency: "Routine check if changing or irritated",
    description: "Extremely common harmless non-cancerous skin growths that develop with age, including seborrheic keratoses, solar lentigines, and lichenoid keratoses.",
    commonAreas: ["Chest", "Back", "Shoulders", "Face", "Neck"],
    typicalSigns: [
      "'Stuck-on' warty or candle-wax appearance",
      "Color ranges from tan, light brown to dark brown",
      "Round to oval with well-defined borders",
      "Slightly raised with greasy or rough surface"
    ],
    recommendedActions: [
      "Generally requires no medical treatment unless irritated by clothing or cosmetically concerning.",
      "Can be comfortably removed via cryosurgery or curettage if inflamed.",
      "Continue monitoring for any sudden color changes."
    ]
  },
  DF: {
    code: "DF",
    name: "Dermatofibroma",
    shortName: "Dermatofibroma",
    category: "Benign Fibrous Nodule",
    riskLevel: "Low Risk",
    riskColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    urgency: "Routine check if symptomatic",
    description: "Common benign firm cutaneous nodule consisting of fibroblasts and histiocytes, often arising secondary to minor trauma or insect bites.",
    commonAreas: ["Lower legs", "Arms", "Upper torso"],
    typicalSigns: [
      "Firm, hard button-like nodule under the skin",
      "Classic 'dimple sign' (pinching causes it to tether inward)",
      "Brownish-pink or hyperpigmented color",
      "Usually painless, stable in size (< 1 cm)"
    ],
    recommendedActions: [
      "Harmless condition requiring no invasive intervention.",
      "Consult a doctor if it grows rapidly, bleeds, or becomes painful.",
      "Biopsy can be performed if atypical features appear."
    ]
  },
  MEL: {
    code: "MEL",
    name: "Melanoma",
    shortName: "Melanoma (Cutaneous)",
    category: "Malignant Skin Cancer",
    riskLevel: "Critical / Urgent",
    riskColor: "text-red-400 bg-red-600/20 border-red-500/40 animate-pulse",
    urgency: "Immediate Dermatologist / Oncologist Evaluation",
    description: "Aggressive malignant tumor arising from pigment-producing melanocytes. Highly dangerous due to potential for rapid lymphatic and hematogenous metastasis if not excised early.",
    commonAreas: ["Back (men)", "Legs (women)", "Arms", "Any skin surface"],
    typicalSigns: [
      "A - Asymmetry (one half does not match the other)",
      "B - Border irregularity (scalloped, ragged or notched edges)",
      "C - Color variation (multiple shades of brown, black, blue, red, or white)",
      "D - Diameter larger than 6mm (pencil eraser size)",
      "E - Evolving (changing size, shape, color, itching or bleeding)"
    ],
    recommendedActions: [
      "URGENT: Book an immediate specialist consultation for dermoscopy and diagnostic excisional biopsy.",
      "Do NOT attempt home treatments or self-removal.",
      "Protect from further UV radiation exposure."
    ]
  },
  NV: {
    code: "NV",
    name: "Melanocytic Nevus",
    shortName: "Common Mole / Nevus",
    category: "Benign Melanocytic Lesion",
    riskLevel: "Low Risk",
    riskColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    urgency: "Routine self-monitoring (ABCDE)",
    description: "Benign proliferation of melanocytes representing standard moles. The vast majority remain completely harmless throughout a lifetime.",
    commonAreas: ["Anywhere on the body exposed to sun or genetics"],
    typicalSigns: [
      "Uniform color (evenly tan, brown, or pink)",
      "Symmetric round or oval shape",
      "Smooth, distinct borders",
      "Usually under 6mm and stable over time"
    ],
    recommendedActions: [
      "Practice routine monthly self-examinations using the ABCDE rule.",
      "Use daily broad-spectrum sun protection.",
      "Consult a doctor if any existing mole starts changing rapidly."
    ]
  },
  VASC: {
    code: "VASC",
    name: "Vascular Lesion",
    shortName: "Vascular Proliferation (Angioma / Granuloma)",
    category: "Benign Vascular Growth",
    riskLevel: "Low Risk",
    riskColor: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    urgency: "Routine check if prone to bleeding",
    description: "Benign blood vessel malformations and proliferations, including cherry angiomas, venous lakes, and pyogenic granulomas.",
    commonAreas: ["Trunk", "Face", "Lips", "Limbs"],
    typicalSigns: [
      "Bright cherry-red to purple dome-shaped papules",
      "Blanches (turns pale) momentarily when pressed",
      "May bleed readily if snagged or traumatized",
      "Soft and compressible"
    ],
    recommendedActions: [
      "Benign and generally requires no treatment unless bleeding persistently.",
      "Can be easily treated via pulsed dye laser, electrocautery, or shave excision.",
      "Have bleeding lesions checked to rule out amelanotic melanoma."
    ]
  }
};
