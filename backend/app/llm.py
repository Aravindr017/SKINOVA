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
# SKINOVA - LLM Generation System
# Ollama + Qwen2.5 7B + RAG
# ==========================================

import requests

from app.rag import search_knowledge_base


# ------------------------------------------
# Ollama configuration
# ------------------------------------------

OLLAMA_URL = "http://localhost:11434/api/chat"

LLM_MODEL = "qwen2.5:7b-instruct"


# ------------------------------------------
# Generate grounded response
# ------------------------------------------

def generate_response(
    query: str,
    predicted_class: str | None = None,
    confidence: float | None = None,
    top_k: int = 3,
) -> dict:

    # --------------------------------------
    # Retrieve relevant RAG knowledge
    # --------------------------------------

    rag_results = search_knowledge_base(
        query=query,
        top_k=top_k,
    )

    # --------------------------------------
    # Build knowledge context
    # --------------------------------------

    context_parts = []

    for result in rag_results:

        chunk = result["chunk"]

        if isinstance(chunk, dict):
            text = chunk.get(
                "text",
                str(chunk)
            )
        else:
            text = str(chunk)

        context_parts.append(text)

    context = "\n\n".join(context_parts)

    # --------------------------------------
    # CNN prediction information
    # --------------------------------------

    prediction_info = ""

    if predicted_class is not None:

        prediction_info = (
            f"\nCNN predicted class: "
            f"{predicted_class}"
        )

        if confidence is not None:

            prediction_info += (
                f"\nCNN confidence: "
                f"{confidence:.2%}"
            )

    # --------------------------------------
    # SKINOVA system prompt
    # --------------------------------------

    system_prompt = """
You are SKINOVA, an AI skin-health information
assistant.

Your job is to answer questions related to:

- Skin diseases
- Skin lesions
- Skin symptoms
- Skin-health information
- The SKINOVA CNN prediction
- Warning signs
- General precautions
- Information contained in the SKINOVA
  medical knowledge base

Use the provided knowledge context as the
primary source of information.

Do not invent medical facts.

The CNN prediction is NOT a medical diagnosis.

The CNN confidence score is a model confidence
score, NOT a medical probability and NOT the
probability that the user has the disease.

Never interpret the confidence score as a
medical likelihood.

Never say that a high CNN confidence means the
user probably has the predicted disease.

Never claim that the user definitely has a
particular disease based only on the AI
prediction.

When discussing a prediction such as MEL, explain
that it is only an AI-generated classification
and that confirmation requires evaluation by a
qualified healthcare professional.

If the available knowledge context does not
contain enough information, clearly say so.

Give logical, concise and easy-to-understand
answers.

Always recommend consultation with a qualified
healthcare professional when the question
concerns diagnosis, treatment, or concerning
skin changes.
"""

    # --------------------------------------
    # User prompt
    # --------------------------------------

    user_prompt = f"""
Knowledge retrieved from the SKINOVA knowledge base:

{context}

{prediction_info}

User question:

{query}

Answer the user's question using the
retrieved knowledge and the SKINOVA context.
"""

    # --------------------------------------
    # Ollama request
    # --------------------------------------

    payload = {
        "model": LLM_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 250,
        },
    }

    # --------------------------------------
    # Send request to Ollama
    # --------------------------------------

    try:

        response = requests.post(
            OLLAMA_URL,
            json=payload,
            timeout=300,
        )

        response.raise_for_status()

        data = response.json()

    except requests.exceptions.ConnectionError as error:

        raise RuntimeError(
            "Ollama is not running. "
            "Please start Ollama and try again."
        ) from error

    except requests.exceptions.Timeout as error:

        raise RuntimeError(
            "Ollama response timed out. "
            "Please try again."
        ) from error

    except requests.exceptions.RequestException as error:

        raise RuntimeError(
            f"Ollama request failed: {str(error)}"
        ) from error

    # --------------------------------------
    # Extract generated answer
    # --------------------------------------

    answer = data.get(
        "message",
        {}
    ).get(
        "content",
        ""
    )

    if not answer.strip():

        raise RuntimeError(
            "Ollama returned an empty response."
        )

    # --------------------------------------
    # Return result
    # --------------------------------------

    return {
        "answer": answer.strip(),
        "sources": rag_results,
        "predicted_class": predicted_class,
        "confidence": confidence,
    }
