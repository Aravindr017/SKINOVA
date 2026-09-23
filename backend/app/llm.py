# # ==========================================
# # SKINOVA - LLM Generation System
# # Qwen2.5-7B-Instruct + RAG
# # ==========================================

# import torch
# from transformers import AutoTokenizer, AutoModelForCausalLM

# from app.rag import search_knowledge_base


# # ------------------------------------------
# # Qwen model configuration
# # ------------------------------------------

# LLM_MODEL_ID = "Qwen/Qwen2.5-7B-Instruct"


# print("Loading SKINOVA LLM...")


# # ------------------------------------------
# # Load tokenizer
# # ------------------------------------------

# tokenizer = AutoTokenizer.from_pretrained(
#     LLM_MODEL_ID
# )


# # ------------------------------------------
# # Load Qwen model
# # ------------------------------------------

# model = AutoModelForCausalLM.from_pretrained(
#     LLM_MODEL_ID,
#     dtype=torch.float16,
#     device_map="auto",
# )

# model.eval()


# print("SKINOVA LLM loaded successfully.")


# # ------------------------------------------
# # Generate grounded response
# # ------------------------------------------

# def generate_response(
#     query: str,
#     predicted_class: str | None = None,
#     confidence: float | None = None,
#     top_k: int = 5,
# ) -> dict:

#     # --------------------------------------
#     # Retrieve relevant RAG knowledge
#     # --------------------------------------

#     rag_results = search_knowledge_base(
#         query=query,
#         top_k=top_k,
#     )


#     # --------------------------------------
#     # Build context from retrieved chunks
#     # --------------------------------------

#     context_parts = []

#     for result in rag_results:

#         chunk = result["chunk"]

#         if isinstance(chunk, dict):
#             text = chunk.get(
#                 "text",
#                 str(chunk)
#             )
#         else:
#             text = str(chunk)

#         context_parts.append(text)


#     context = "\n\n".join(context_parts)


#     # --------------------------------------
#     # Prediction information
#     # --------------------------------------

#     prediction_info = ""

#     if predicted_class is not None:

#         prediction_info = (
#             f"\nCNN predicted class: {predicted_class}"
#         )

#         if confidence is not None:

#             prediction_info += (
#                 f"\nCNN confidence: "
#                 f"{confidence:.2%}"
#             )


#     # --------------------------------------
#     # Safety-focused prompt
#     # --------------------------------------

#     prompt = f"""
# You are SKINOVA, an AI skin-health information assistant.

# Use ONLY the provided knowledge context when
# answering medical questions.

# Do not invent medical facts.

# The CNN prediction is NOT a medical diagnosis.

# Clearly explain that an image-based AI prediction
# can be incorrect and that a qualified healthcare
# professional should be consulted for diagnosis
# or treatment.

# If the retrieved context does not contain enough
# information to answer the question, say that the
# available knowledge base does not provide enough
# information.

# Knowledge context:
# {context}

# {prediction_info}

# User question:
# {query}

# Provide a clear, concise, easy-to-understand answer.
# """


#     # --------------------------------------
#     # Qwen chat format
#     # --------------------------------------

#     messages = [
#         {
#             "role": "system",
#             "content": (
#                 "You are a careful medical information "
#                 "assistant. Do not diagnose patients."
#             ),
#         },
#         {
#             "role": "user",
#             "content": prompt,
#         },
#     ]


#     text = tokenizer.apply_chat_template(
#         messages,
#         tokenize=False,
#         add_generation_prompt=True,
#     )


#     # --------------------------------------
#     # Tokenize
#     # --------------------------------------

#     inputs = tokenizer(
#         [text],
#         return_tensors="pt",
#     )


#     # --------------------------------------
#     # Move input to model device
#     # --------------------------------------

#     model_device = next(
#         parameter
#         for parameter in model.parameters()
#         if parameter.device.type != "meta"
#     ).device

#     inputs = {
#         key: value.to(model_device)
#         for key, value in inputs.items()
#     }


#     # --------------------------------------
#     # Generate answer
#     # --------------------------------------

#     with torch.no_grad():

#         output = model.generate(
#             **inputs,
#             max_new_tokens=120
#             do_sample=False,
#         )


#     # --------------------------------------
#     # Remove prompt from generated output
#     # --------------------------------------

#     generated_tokens = output[
#         0
#     ][
#         inputs["input_ids"].shape[1]:
#     ]


#     answer = tokenizer.decode(
#         generated_tokens,
#         skip_special_tokens=True,
#     )


#     # --------------------------------------
#     # Return result
#     # --------------------------------------

#     return {
#         "answer": answer.strip(),
#         "sources": rag_results,
#         "predicted_class": predicted_class,
#         "confidence": confidence,
#     }


# ==========================================
# SKINOVA - Advanced Clinical AI Consultant
# Multi-LLM (Gemini / OpenAI / Ollama) + Clinical RAG Synthesis
# ==========================================

import os
import re
import json
import requests
from pathlib import Path
from app.rag import search_knowledge_base

# Load .env file so Gemini / OpenAI keys are available
try:
    from dotenv import load_dotenv
    _backend_env = Path(__file__).resolve().parents[1] / ".env"
    _root_env = Path(__file__).resolve().parents[2] / ".env"
    if _backend_env.exists():
        load_dotenv(dotenv_path=_backend_env, override=True)
    if _root_env.exists():
        load_dotenv(dotenv_path=_root_env, override=False)
except ImportError:
    pass

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/chat")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:0.5b")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

CLASS_NAMES = {
    "MEL": "Melanoma (Malignant Melanocytic Skin Cancer)",
    "NV": "Melanocytic Nevus (Normal or Atypical Mole)",
    "BCC": "Basal Cell Carcinoma (Non-Melanoma Keratinocyte Cancer)",
    "AKIEC": "Actinic Keratosis / Intraepithelial Carcinoma (Precancerous Lesion)",
    "BKL": "Benign Keratosis (Seborrheic Keratosis / Solar Lentigo)",
    "DF": "Dermatofibroma (Benign Fibrous Histiocytoma)",
    "VASC": "Vascular Lesion (Hemangioma / Angioma / Pyogenic Granuloma)",
}


def clean_chunk_text(text: str) -> str:
    """Removes web scraping artifacts, page breaks, and editorial headers."""
    text = re.sub(r"--- PAGE \d+ ---", "", text)
    text = re.sub(r"Te Whatu Ora", "", text)
    text = re.sub(r"Authors?:.*?(?=\n|$)", "", text)
    text = re.sub(r"Edited by.*?(?=\n|$)", "", text)
    text = re.sub(r"Reviewing dermatologist:.*?(?=\n|$)", "", text)
    text = re.sub(r"Previous contributors:.*?(?=\n|$)", "", text)
    text = re.sub(r"See also:.*?(?=\n|$)", "", text)
    text = re.sub(r"See more images.*?(?=\n|$)", "", text)
    text = re.sub(r"& f oe.*?(?=\n|$)", "", text)
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def query_gemini_api(prompt: str, context: str, api_key: str) -> str | None:
    """Queries Google Gemini API using urllib (stdlib) — avoids Python requests TLS latency.
    Primary model: gemini-3.5-flash-lite with fallback chain."""
    import urllib.request as _ureq
    import urllib.error as _uerr

    GEMINI_MODELS = [
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest",
    ]
    clinical_prompt = (
        "You are SKINOVA, an empathetic and authoritative AI clinical dermatology consultant trained on WHO ICD-11 guidelines "
        "and DermNet NZ clinical standards.\n\n"
        "Formatting instructions:\n"
        "- Do NOT use markdown symbols like '###' or '##' in your text.\n"
        "- Do NOT use horizontal divider lines like '---'.\n"
        "- Do NOT start with robotic disclaimers like 'SKINOVA AI Consultant' or 'Trained on WHO...'. Start directly and warmly.\n"
        "- Use clean bullet points (•) and concise, structured paragraphs.\n\n"
        "Please provide a structured clinical consultation that covers:\n"
        "1. A clear explanation of the condition in patient-friendly terms\n"
        "2. Key diagnostic signs and symptoms to observe\n"
        "3. Practical immediate steps and self-care recommendations\n"
        "4. Consultation urgency and any red-flag warning signs\n"
        "5. A reminder that AI screening is not a final biopsy diagnosis.\n\n"
        f"Medical Context from Clinical Knowledge Base:\n{context}\n\n"
        f"Patient Question:\n{prompt}"
    )
    payload_bytes = json.dumps({
        "contents": [{"parts": [{"text": clinical_prompt}]}],
        "generationConfig": {"temperature": 0.35, "maxOutputTokens": 700}
    }).encode("utf-8")

    for model in GEMINI_MODELS:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            req = _ureq.Request(
                url,
                data=payload_bytes,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with _ureq.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    for p in parts:
                        text = p.get("text", "").strip()
                        if text:
                            # Clean any leftover markdown headers, dividers, or boilerplate
                            text = re.sub(r"^\s*---+\s*$", "", text, flags=re.MULTILINE)
                            text = re.sub(r"^\s*#{1,6}\s*", "", text, flags=re.MULTILINE)
                            text = re.sub(r"\*\*SKINOVA.*?\*\*\s*", "", text, flags=re.IGNORECASE)
                            text = re.sub(r"\*Trained on WHO.*?\*\s*", "", text, flags=re.IGNORECASE)
                            text = re.sub(r"\n{3,}", "\n\n", text).strip()
                            print(f"[Gemini] ✓ Response from {model}")
                            return text
        except _uerr.HTTPError as e:
            body = ""
            try:
                body = e.read().decode("utf-8", errors="ignore")[:100]
            except Exception:
                pass
            if e.code in (503, 429):
                print(f"[Gemini] {model} busy ({e.code}), trying next...")
            elif e.code in (404, 400):
                print(f"[Gemini] {model} unavailable ({e.code}), trying next...")
            else:
                print(f"[Gemini] {model} HTTP {e.code}: {body}")
            continue
        except Exception as e:
            print(f"[Gemini] {model} error: {type(e).__name__}: {str(e)[:80]}")
            continue
    return None


def query_openai_api(prompt: str, context: str, api_key: str) -> str | None:
    """Queries OpenAI GPT-4o-mini if key is configured."""
    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You are SKINOVA, an expert AI dermatological consultant. Provide thorough, empathetic, and clinical advice grounded in WHO and DermNet standards."},
                {"role": "user", "content": f"Context:\n{context}\n\nUser Question:\n{prompt}"}
            ],
            "temperature": 0.2,
            "max_tokens": 600,
        }
        res = requests.post(url, headers=headers, json=payload, timeout=6)
        if res.status_code == 200:
            data = res.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    except Exception:
        pass
    return None


def synthesize_rag_response(
    query: str,
    rag_results: list,
    predicted_class: str | None = None,
    confidence: float | None = None,
) -> str:
    """
    Synthesizes a rich, fluent, and highly satisfying medical consultation
    answering the user's question directly with clinical rigor.
    """
    q_lower = query.lower()

    # Identify primary topic and matched clinical sources
    titles = [r["chunk"].get("title") for r in rag_results if r.get("chunk") and r["chunk"].get("title")]
    diseases = [r["chunk"].get("disease") for r in rag_results if r.get("chunk") and r["chunk"].get("disease")]

    primary_disease = diseases[0] if diseases else "Dermatological Health"
    primary_title = titles[0] if titles else "Clinical Knowledge Base"

    # Clean and curate extracted knowledge paragraphs
    curated_facts = []
    for r in rag_results:
        raw_text = r["chunk"].get("text", "") if isinstance(r.get("chunk"), dict) else str(r.get("chunk", ""))
        clean = clean_chunk_text(raw_text)
        for p in clean.split("\n\n"):
            p_strip = p.strip()
            # Keep meaningful explanatory paragraphs while skipping table fragments
            if len(p_strip) > 50 and not p_strip.startswith("===") and not p_strip.startswith("PHC management"):
                # Clean bullet markers
                cleaned_p = re.sub(r"^[•\-]\s*", "", p_strip)
                curated_facts.append(cleaned_p)

    # Classify query intent
    is_signs = any(w in q_lower for w in ["sign", "symptom", "look like", "spot", "feature", "identify", "appearance", "abcde", "mole vs", "lesion", "melanoma"])
    is_prevention = any(w in q_lower for w in ["prevent", "protect", "sunscreen", "uv", "avoid", "reduce risk", "precautions", "sun", "sunburn"])
    is_treatment = any(w in q_lower for w in ["treat", "cure", "medicine", "therapy", "surgery", "cream", "remove", "manage", "procedure", "healing", "ointment"])
    is_referral = any(w in q_lower for w in ["when should i see", "doctor", "dermatologist", "urgent", "emergency", "consult", "danger", "warning", "refer", "serious"])
    is_diff = any(w in q_lower for w in ["difference", "mole vs", "distinguish", "compare", "is it a mole", "lesion vs"])
    is_eczema = any(w in q_lower for w in ["eczema", "dermatitis", "itch", "rash", "dry skin", "atopic"])
    is_cancer = any(w in q_lower for w in ["melanoma", "carcinoma", "bcc", "scc", "cancer", "malignant", "tumor"])

    sections = []

    # ----------------------------------------------------
    # 1. Header & Direct Empathetic Assessment
    # ----------------------------------------------------
    if predicted_class and predicted_class in CLASS_NAMES:
        condition_name = CLASS_NAMES[predicted_class]
        conf_badge = f" (Screened with {confidence:.1%} AI confidence)" if confidence else ""
        sections.append(f"🩺 Clinical Consultation: **{condition_name}**{conf_badge}\n")
    else:
        sections.append(f"🩺 Clinical Guidance: **{primary_disease}**\n")

    # Direct conversational opening answering the specific topic
    if is_diff:
        sections.append(
            "A **mole (melanocytic nevus)** is a specific, usually benign growth composed of clustered pigment-producing cells (melanocytes). "
            "In contrast, a **lesion** is a broad medical term denoting any abnormal change, mark, or damage on the skin—including moles, freckles, cysts, rashes, and skin cancers. "
            "While most common moles are harmless, any lesion exhibiting asymmetrical growth, irregular borders, or color shifts warrants immediate dermatological evaluation."
        )
    elif is_signs:
        sections.append(
            f"When evaluating **{primary_disease}**, early clinical detection and regular skin surveillance are critical. "
            "Skin abnormalities often present with distinct structural, color, or sensory changes that distinguish them from surrounding healthy tissue."
        )
    elif is_prevention:
        sections.append(
            "Preventing skin malignancies and chronic inflammatory dermatoses centers on mitigating ultraviolet (UV) radiation damage, "
            "preserving the skin's lipid barrier, and practicing rigorous self-surveillance."
        )
    elif is_eczema:
        sections.append(
            "**Eczema (Atopic Dermatitis)** is a chronic inflammatory skin condition characterized by an impaired epidermal barrier and immune over-reactivity. "
            "The hallmark symptoms include intense pruritus (itching), erythema (redness), scaling, and in acute phases, tiny fluid-filled vesicles that weep and crust."
        )
    else:
        sections.append(
            f"Based on clinical references from the WHO and DermNet Clinical Database, **{primary_disease}** requires careful differentiation "
            "between benign variations and conditions that necessitate professional in-clinic medical management."
        )

    # ----------------------------------------------------
    # 2. Key Clinical Insights from Medical Corpus
    # ----------------------------------------------------
    if curated_facts:
        relevant_fact = curated_facts[0]
        # Clean formatting
        if len(relevant_fact) > 280:
            relevant_fact = relevant_fact[:280].rsplit('.', 1)[0] + '.'
        sections.append(f"**Medical Context:**\n{relevant_fact}")

    # ----------------------------------------------------
    # 3. Structured Clinical Features & Warning Signs
    # ----------------------------------------------------
    if is_signs or is_cancer or predicted_class in ["MEL", "BCC", "AKIEC"]:
        sections.append(
            "**🔍 Key Diagnostic Indicators (The ABCDE Rule for Pigmented Lesions):**\n"
            "- **A (Asymmetry):** If you draw a line through the middle, the two halves do not match.\n"
            "- **B (Border):** The edges are irregular, notched, scalloped, or poorly demarcated.\n"
            "- **C (Colour):** Color is uneven—displaying shades of tan, dark brown, jet black, pink, or bluish-white.\n"
            "- **D (Diameter):** Lesion exceeds 6 mm across (approximately the size of a pencil eraser).\n"
            "- **E (Evolving):** Any change in size, shape, thickness, elevation, or new symptoms such as spontaneous bleeding, oozing, or itching.\n\n"
            "*For nodular lesions, also watch for the **EFG Rule:** Elevated, Firm to the touch, and Growing steadily over more than one month.*"
        )
    elif is_eczema:
        sections.append(
            "**🔍 Typical Clinical Presentation:**\n"
            "- **Pruritus (Itching):** Often severe, typically worsening at night, triggering the itch-scratch cycle.\n"
            "- **Characteristic Distribution:** Commonly affects flexural creases (elbow bends, behind knees, neck, wrists) and facial areas.\n"
            "- **Lichenification:** Leathery, thickened skin markings resulting from chronic rubbing or scratching.\n"
            "- **Xerosis:** Marked dry skin prone to micro-cracking and secondary bacterial infection (Staphylococcus aureus)."
        )

    # ----------------------------------------------------
    # 4. Actionable Management & Care Pathways
    # ----------------------------------------------------
    if is_treatment or is_eczema:
        sections.append(
            "**💊 Recommended Treatment & Clinical Pathways:**\n"
            "- **First-Line Barrier Therapy:** Apply thick, fragrance-free ceramide-based emollients within 3 minutes of bathing to seal moisture.\n"
            "- **Topical Anti-Inflammatories:** Mild to moderate topical corticosteroids or calcineurin inhibitors (tacrolimus/pimecrolimus) prescribed by a physician during flare-ups.\n"
            "- **In-Clinic Procedures:** For localized premalignant or malignant lesions, treatment modalities include liquid nitrogen cryotherapy, topical 5-Fluorouracil (5-FU), or precise surgical excision with clear pathological margins.\n"
            "- **Surveillance:** Scheduled dermoscopic reviews every 6 to 12 months for high-risk patients."
        )
    elif is_prevention or is_cancer:
        sections.append(
            "**🛡️ Sun Safety & Skin Protection Protocol:**\n"
            "- **Broad-Spectrum Sunscreen:** Apply SPF 50+ water-resistant sunscreen 20 minutes before sun exposure; reapply every 2 hours and immediately after swimming.\n"
            "- **Photoprotective Apparel:** Wear UPF 50+ rated clothing, wide-brimmed hats (≥3 inches), and UV400-rated sunglasses.\n"
            "- **Solar Avoidance:** Minimize direct outdoor sun exposure between 10:00 AM and 4:00 PM when ultraviolet radiation is strongest.\n"
            "- **Monthly Self-Exams:** Examine all areas of your skin monthly in a well-lit room using a full-length and hand mirror."
        )

    # ----------------------------------------------------
    # 5. Red Flags & Urgent Specialist Referral
    # ----------------------------------------------------
    sections.append(
        "**⚠️ When to Consult a Dermatologist Immediately:**\n"
        "- A spot or mole that changes rapidly in size, outline, or pigmentation within weeks.\n"
        "- Any non-healing sore, nodule, or ulcer that persists for longer than 3 to 4 weeks.\n"
        "- The **'Ugly Duckling' Sign:** A lesion that looks strikingly different in pattern or hue from all other spots on your body.\n"
        "- Any lesion associated with continuous pain, numbness, spontaneous bleeding, or crusting."
    )

    # ----------------------------------------------------
    # 6. AI Screening Context & Verification Disclaimer
    # ----------------------------------------------------
    if predicted_class:
        sections.append(
            "> ℹ️ **Important Note on AI Screening:**\n"
            f"> The SKINOVA AI screening model flagged visual patterns matching **{CLASS_NAMES.get(predicted_class, predicted_class)}**. "
            "Machine learning predictions are intended for triage guidance only. A definitive medical diagnosis always requires a clinical dermoscopy examination and histological biopsy by a certified dermatologist."
        )

    return "\n\n".join(sections)


# ------------------------------------------
# Generate grounded response
# ------------------------------------------

def generate_response(
    query: str,
    predicted_class: str | None = None,
    confidence: float | None = None,
    top_k: int = 4,
) -> dict:
    """
    Generates an informed response using multi-tier AI:
    1. Gemini API / OpenAI API (if configured in environment)
    2. Local Ollama (if active and running)
    3. Built-in Comprehensive Clinical RAG Engine (instant, offline, and authoritative)
    """
    # --------------------------------------
    # 1. Retrieve relevant RAG knowledge
    # --------------------------------------
    search_query = query
    if predicted_class and predicted_class in CLASS_NAMES:
        full_name = CLASS_NAMES[predicted_class].split(" (")[0]
        search_query = f"{full_name}: {query}"

    rag_results = search_knowledge_base(
        query=search_query,
        top_k=top_k,
    )

    # Build context string
    context_parts = []
    for result in rag_results:
        chunk = result.get("chunk", {})
        text = chunk.get("text", str(chunk)) if isinstance(chunk, dict) else str(chunk)
        context_parts.append(clean_chunk_text(text))
    context = "\n\n".join(context_parts)

    prediction_info = ""
    if predicted_class is not None:
        prediction_info = f"\nCNN predicted class: {predicted_class}"
        if confidence is not None:
            prediction_info += f"\nCNN confidence: {confidence:.2%}"

    # --------------------------------------
    # 2. Try Gemini API if key is available
    active_gemini_key = os.environ.get("GEMINI_API_KEY", "") or GEMINI_API_KEY
    if active_gemini_key:
        gemini_ans = query_gemini_api(query, context, active_gemini_key)
        if gemini_ans:
            return {
                "answer": gemini_ans,
                "sources": rag_results,
                "predicted_class": predicted_class,
                "confidence": confidence,
                "model_used": "google-gemini-3.5-flash-lite",
            }

    # --------------------------------------
    # 3. Try OpenAI API if key is available
    # --------------------------------------
    if OPENAI_API_KEY:
        openai_ans = query_openai_api(query, context, OPENAI_API_KEY)
        if openai_ans:
            return {
                "answer": openai_ans,
                "sources": rag_results,
                "predicted_class": predicted_class,
                "confidence": confidence,
                "model_used": "openai-gpt-4o-mini",
            }

    # --------------------------------------
    # 4. Built-in Clinical Consultation Engine
    # --------------------------------------
    answer = synthesize_rag_response(
        query=query,
        rag_results=rag_results,
        predicted_class=predicted_class,
        confidence=confidence,
    )

    return {
        "answer": answer,
        "sources": rag_results,
        "predicted_class": predicted_class,
        "confidence": confidence,
        "model_used": "skinova-clinical-consultant-engine",
    }

