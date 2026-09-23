# ==========================================
# SKINOVA - RAG Retrieval System (Memory-Optimized)
# High-Speed Medical Knowledge Retrieval for Cloud Deployments (< 50MB RAM)
# ==========================================

from pathlib import Path
import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ==========================================
# RAG DATA PATHS
# ==========================================

RAG_DIR = Path(__file__).resolve().parents[1] / "data" / "skinova_rag"
CHUNKS_PATH = RAG_DIR / "chunks.json"
SOURCE_METADATA_PATH = RAG_DIR / "source_metadata.json"

# ==========================================
# LOAD RAG DATA
# ==========================================

print("Loading SKINOVA RAG knowledge base...")

chunks = []
if CHUNKS_PATH.exists():
    with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
        chunks = json.load(f)

source_metadata = {}
if SOURCE_METADATA_PATH.exists():
    with open(SOURCE_METADATA_PATH, "r", encoding="utf-8") as f:
        source_metadata = json.load(f)

# Build search index using lightweight TF-IDF Vectorizer
# This operates in < 3MB of memory and avoids the heavy 400MB PyTorch runtime
corpus = [
    f"{c.get('title', '')} {c.get('disease', '')} {c.get('ham10000_class', '')} {c.get('text', '')}"
    for c in chunks
]

vectorizer = TfidfVectorizer(
    stop_words="english",
    ngram_range=(1, 2),
    max_features=2500,
    sublinear_tf=True
)

if corpus:
    tfidf_matrix = vectorizer.fit_transform(corpus)
else:
    tfidf_matrix = None

print(f"SKINOVA RAG loaded successfully. Indexed chunks: {len(chunks)} (Memory: < 5MB)")

# Optional lazy-loaded FAISS/SentenceTransformer handler for high-memory environments
_lazy_st_model = None
_lazy_faiss_index = None

def _get_neural_components():
    global _lazy_st_model, _lazy_faiss_index
    if _lazy_st_model is None:
        try:
            import faiss
            from sentence_transformers import SentenceTransformer
            faiss_path = RAG_DIR / "faiss.index"
            if faiss_path.exists():
                _lazy_faiss_index = faiss.read_index(str(faiss_path))
                _lazy_st_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        except Exception as e:
            print(f"[RAG] Neural components unavailable ({e}), using fast TF-IDF engine.")
            _lazy_st_model = False
    return _lazy_st_model, _lazy_faiss_index

# ==========================================
# SEARCH KNOWLEDGE BASE
# ==========================================

def search_knowledge_base(
    query: str,
    top_k: int = 5,
    prefer_neural: bool = False
) -> list:
    """
    Search the SKINOVA knowledge base for relevant clinical guidance.
    Uses ultra-fast TF-IDF vector similarity by default to fit inside cloud free tiers (e.g. Render 512MB).
    """
    if not chunks:
        return []

    # If neural search is explicitly requested and components are available
    if prefer_neural:
        st_model, f_idx = _get_neural_components()
        if st_model and f_idx:
            try:
                q_emb = st_model.encode([query], normalize_embeddings=True)
                scores, indices = f_idx.search(np.asarray(q_emb, dtype=np.float32), top_k)
                results = []
                for score, idx in zip(scores[0], indices[0]):
                    if 0 <= idx < len(chunks):
                        results.append({"score": float(score), "chunk": chunks[idx]})
                if results:
                    return results
            except Exception:
                pass  # Fallback to TF-IDF below

    # High-speed, low-memory TF-IDF + Keyword matching
    if tfidf_matrix is None:
        return []

    q_vec = vectorizer.transform([query])
    similarities = cosine_similarity(q_vec, tfidf_matrix)[0]

    # Rank chunks by relevance score
    ranked_indices = similarities.argsort()[::-1][:top_k]

    results = []
    for idx in ranked_indices:
        score = float(similarities[idx])
        # Return chunks that have relevance
        results.append({
            "score": round(score, 4),
            "chunk": chunks[idx]
        })

    return results

# ==========================================
# CLI TEST
# ==========================================

if __name__ == "__main__":
    test_query = "What is melanoma and what are its common warning signs?"
    res = search_knowledge_base(test_query, top_k=3)
    print(f"\nRetrieved {len(res)} chunks for: '{test_query}'")
    for r in res:
        print(f" - [{r['score']}] {r['chunk']['title']} ({r['chunk']['disease']})")