# ==========================================
# SKINOVA - RAG Retrieval System
# - LLM + RAG API
# ==========================================

from pathlib import Path
import json

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer


# ==========================================
# RAG DATA PATH
# ==========================================

RAG_DIR = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "skinova_rag"
)


# ==========================================
# RAG FILES
# ==========================================

CHUNKS_PATH = RAG_DIR / "chunks.json"
EMBEDDINGS_PATH = RAG_DIR / "embeddings.npy"
FAISS_PATH = RAG_DIR / "faiss.index"
MODEL_INFO_PATH = RAG_DIR / "model_info.json"
SOURCE_METADATA_PATH = RAG_DIR / "source_metadata.json"


# ==========================================
# EMBEDDING MODEL
# ==========================================

EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


# ==========================================
# LOAD RAG DATA
# ==========================================

print("Loading SKINOVA RAG knowledge base...")

with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
    chunks = json.load(f)

embeddings = np.load(
    EMBEDDINGS_PATH
)

faiss_index = faiss.read_index(
    str(FAISS_PATH)
)

with open(SOURCE_METADATA_PATH, "r", encoding="utf-8") as f:
    source_metadata = json.load(f)


# ==========================================
# LOAD EMBEDDING MODEL
# ==========================================

embedding_model = SentenceTransformer(
    EMBEDDING_MODEL_NAME
)


print("SKINOVA RAG loaded successfully.")
print("Chunks:", len(chunks))
print("Embeddings:", embeddings.shape)
print("FAISS vectors:", faiss_index.ntotal)


# ==========================================
# SEARCH KNOWLEDGE BASE
# ==========================================

def search_knowledge_base(
    query: str,
    top_k: int = 5
) -> list:
    """
    Search the SKINOVA FAISS knowledge base.

    Parameters
    ----------
    query : str
        User's medical/skincare question.

    top_k : int
        Number of relevant chunks to retrieve.

    Returns
    -------
    list
        Retrieved knowledge chunks.
    """

    # Create query embedding
    query_embedding = embedding_model.encode(
        [query],
        normalize_embeddings=True
    )

    query_embedding = np.asarray(
        query_embedding,
        dtype=np.float32
    )

    # Search FAISS
    scores, indices = faiss_index.search(
        query_embedding,
        top_k
    )

    results = []

    for score, index in zip(
        scores[0],
        indices[0]
    ):

        if index < 0:
            continue

        chunk = chunks[index]

        results.append({
            "score": float(score),
            "chunk": chunk
        })

    return results


# ==========================================
# TEST FUNCTION
# ==========================================

if __name__ == "__main__":

    test_query = (
        "What is melanoma and what are its "
        "common warning signs?"
    )

    results = search_knowledge_base(
        test_query,
        top_k=5
    )

    print("\nRetrieved results:\n")

    for i, result in enumerate(
        results,
        start=1
    ):

        print(
            f"\n--- Result {i} ---"
        )

        print(
            "Score:",
            result["score"]
        )

        print(
            result["chunk"]
        )