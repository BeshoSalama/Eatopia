import base64
import os
import re
import sys

import requests


PROMPT = """
You are an expert food recognition AI.

Identify the food dish in this image.
You are very familiar with Egyptian, Arabic, and international foods.

Return ONLY the food name.

Rules:
- Do NOT explain.
- Do NOT describe the image.
- Do NOT say "the image shows".
- Do NOT write sentences.
- Maximum 3 words.

Examples:
koshari
molokhia
mahshi
shawarma
pizza
burger
"""


def _is_enabled():
    value = os.getenv("EATOPIA_OLLAMA_ENABLED", "true").strip().lower()
    return value not in {"0", "false", "no", "off"}


def _clean_answer(answer):
    clean = str(answer or "").splitlines()[0].strip().lower()
    for phrase in (
        "the image shows",
        "this image shows",
        "this appears to be",
        "it appears to be",
        "it looks like",
        "looks like",
        "the dish is",
        "this dish is",
        "i think",
    ):
        clean = clean.replace(phrase, "")

    clean = re.sub(r"[.,:;]+", " ", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    if not clean or any(word in clean for word in ("unknown", "cannot identify", "not sure", "unable")):
        return ""

    return " ".join(clean.split()[:3])


def detect_food_with_ollama(image_path, timeout=None):
    if not _is_enabled():
        return ""

    endpoint = os.getenv("EATOPIA_OLLAMA_URL", "http://localhost:11434/api/generate")
    model = os.getenv("EATOPIA_OLLAMA_MODEL", "llava:latest")
    timeout = timeout or float(os.getenv("EATOPIA_OLLAMA_TIMEOUT", "8"))

    try:
        with open(image_path, "rb") as image_file:
            image_data = base64.b64encode(image_file.read()).decode("utf-8")

        response = requests.post(
            endpoint,
            json={
                "model": model,
                "prompt": PROMPT,
                "images": [image_data],
                "stream": False,
            },
            timeout=timeout,
        )
        response.raise_for_status()
        data = response.json()
        if data.get("error"):
            return ""

        return _clean_answer(data.get("response", ""))
    except Exception:
        return ""


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m engine.ollama_vision <image-path>")
        raise SystemExit(2)

    print(detect_food_with_ollama(sys.argv[1]))
