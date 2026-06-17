#!/usr/bin/env python
# coding: utf-8

# In[28]:


import json
from pathlib import Path
import sys
import os
EGYPTIAN_FOODS = [

    "koshari",
    "molokhia",
    "mahshi",
    "fatta",
    "ful medames",
    "taameya",
    "hawawshi",
    "kofta",
    "kebab",
    "basbousa",
    "kunafa",
    "rice pudding",

    "mandi",
    "kabsa",
    "shawarma",
    "mansaf",
    "musakhan",
    "maqluba"

]
# يجيب path المشروع الأساسي
project_root = os.path.abspath(os.path.join(os.getcwd(), ".."))

# نضيفه للـ Python path
sys.path.append(project_root)

print("Project root added:", project_root)


# In[29]:

from engine.ollama_vision import detect_food_with_ollama
from transformers import AutoImageProcessor, AutoModelForImageClassification
from PIL import Image
import torch

# اختيار صورة من الجهاز (Windows)
from tkinter import Tk
from tkinter.filedialog import askopenfilename


# In[30]:


food_processor = AutoImageProcessor.from_pretrained("nateraw/vit-base-food101")
food_model = AutoModelForImageClassification.from_pretrained("nateraw/vit-base-food101")
food_model.eval()
print("✅ Feature1 (Food101) loaded")


# In[31]:


Tk().withdraw()
image_path = askopenfilename(
    title="اختاري صورة أكلة",
    filetypes=[("Images", "*.png;*.jpg;*.jpeg")]
)
print("📌 Selected:", image_path)

image = Image.open(image_path).convert("RGB")


# In[32]:


inputs = food_processor(images=image, return_tensors="pt")
with torch.no_grad():
    outputs = food_model(**inputs)
    logits = outputs.logits

pred_idx = logits.argmax(-1).item()

confidence = torch.softmax(logits, dim=-1)[0][pred_idx].item()

dish_label = food_model.config.id2label[pred_idx]

print("🍽️ Predicted dish:", dish_label)
# =====================================
# FOOD101 PREDICTION
# =====================================

inputs = food_processor(
    images=image,
    return_tensors="pt"
)

with torch.no_grad():

    outputs = food_model(**inputs)
    logits = outputs.logits


pred_idx = logits.argmax(-1).item()

confidence = torch.softmax(
    logits,
    dim=-1
)[0][pred_idx].item()

raw_label = food_model.config.id2label[
    pred_idx
]

print(
    "🍽️ Food101 prediction:",
    raw_label
)

print(
    "🎯 Confidence:",
    round(
        confidence * 100,
        2
    ),
    "%"
)


# =====================================
# OLLAMA FALLBACK
# =====================================

from engine.ollama_vision import (
    detect_food_with_ollama
)

# =====================================
# FINAL DECISION
# =====================================

# =====================================
# FINAL DECISION
# =====================================

def choose_best(raw_label, confidence, ollama_label):

    raw_clean = raw_label.lower().strip().replace("_", " ")
    ollama_clean = (ollama_label or "").lower().strip()

    # لو Food101 واثق جدا ومش أكلة مصرية
    if confidence >= 0.70 and raw_clean not in EGYPTIAN_FOODS:
        return raw_clean

    # لو Ollama رجع أي حاجة استخدمها
    if ollama_clean:
        return ollama_clean

    # fallback
    return raw_clean


# تشغيل Ollama
ollama_label = detect_food_with_ollama(image_path)

print("🧠 Ollama says:", ollama_label)

# النتيجة النهائية
dish_label = choose_best(
    raw_label,
    confidence,
    ollama_label
)

print("✅ Final Dish:", dish_label)

# ==========================
# inversecooking paths
# ==========================

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

INV_ROOT = ROOT / "inversecooking"
INV_SRC = INV_ROOT / "src"

print("ROOT:", ROOT)
print("INV_ROOT exists:", INV_ROOT.exists())
print("INV_SRC exists:", INV_SRC.exists())

sys.path.insert(0, str(INV_ROOT))
sys.path.insert(0, str(INV_SRC))

print("✅ inversecooking paths added")

# In[34]:

from args import get_parser
from model import get_model
from utils.output_utils import prepare_output

print("✅ inversecooking imports OK")


# In[35]:


import urllib.request

DATA_DIR = INV_ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

INGR_VOCAB_PATH  = DATA_DIR / "ingr_vocab.pkl"
INSTR_VOCAB_PATH = DATA_DIR / "instr_vocab.pkl"
CKPT_PATH        = DATA_DIR / "modelbest.ckpt"

urls = {
    "ingr_vocab.pkl":  "https://dl.fbaipublicfiles.com/inversecooking/ingr_vocab.pkl",
    "instr_vocab.pkl": "https://dl.fbaipublicfiles.com/inversecooking/instr_vocab.pkl",
    "modelbest.ckpt":  "https://dl.fbaipublicfiles.com/inversecooking/modelbest.ckpt",
}

def download_if_missing(url, out_path: Path):
    if out_path.exists() and out_path.stat().st_size > 0:
        print(f"✅ Exists: {out_path.name}")
        return
    print(f"⬇️ Downloading: {out_path.name} ...")
    urllib.request.urlretrieve(url, out_path)
    print(f"✅ Done: {out_path}")

download_if_missing(urls["ingr_vocab.pkl"], INGR_VOCAB_PATH)
download_if_missing(urls["instr_vocab.pkl"], INSTR_VOCAB_PATH)
download_if_missing(urls["modelbest.ckpt"], CKPT_PATH)

print("✅ Feature2 files ready in:", DATA_DIR)


# In[36]:


import torch, pickle
from torchvision import transforms
from PIL import Image

from args import get_parser
from model import get_model
from utils.output_utils import prepare_output

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MAP_LOC = None if torch.cuda.is_available() else "cpu"

# load vocabs
with open(INGR_VOCAB_PATH, "rb") as f:
    ingrs_vocab = pickle.load(f)

with open(INSTR_VOCAB_PATH, "rb") as f:
    instr_vocab = pickle.load(f)

# args
args = get_parser()            # بعد تعديل args.py هيبقى safe في النوتبوك
args.maxseqlen = 15
args.ingrs_only = False

# model
inv_model = get_model(args, len(ingrs_vocab), len(instr_vocab))

state = torch.load(CKPT_PATH, map_location=MAP_LOC)
inv_model.load_state_dict(state)
inv_model.to(DEVICE).eval()

# preprocessing (زي الديمو الرسمي)
inv_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize((0.485, 0.456, 0.406),
                         (0.229, 0.224, 0.225))
])

print("✅ Feature2 (inversecooking) loaded on:", DEVICE)


# In[37]:


def predict_recipe_from_image(pil_image: Image.Image, dish_label: str = None, greedy=True):
    """
    pil_image: PIL Image (RGB)
    dish_label: جاي من Feature1 (اختياري) كـ title hint
    """
    x = inv_transform(pil_image.convert("RGB")).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        outputs = inv_model.sample(
            x,
            greedy=greedy,
            temperature=1.0,
            beam=-1,
            true_ingrs=None
        )

    ids = (
        outputs["ingr_ids"].cpu().numpy(),    # ingredients ids
        outputs["recipe_ids"].cpu().numpy()   # recipe ids
    )

    outs, valid = prepare_output(
        ids[1][0], ids[0][0],
        ingrs_vocab, instr_vocab
    )

    if not valid.get("is_valid", True):
        return {
            "ok": False,
            "reason": valid.get("reason", "Invalid output"),
            "title": None,
            "ingredients": [],
            "instructions": []
        }

    # ✅ title hint من Feature1
    if dish_label and isinstance(dish_label, str) and len(dish_label.strip()) > 0:
        hinted_title = dish_label.replace("_", " ").strip()
        outs["title"] = hinted_title

    return {
        "ok": True,
        "title": outs.get("title", ""),
        "ingredients": outs.get("ingrs", []),
        "instructions": outs.get("recipe", [])
    }


# In[38]:


# لازم يكون دول موجودين من Feature1:
# image  -> PIL Image
# dish_label -> string

result = predict_recipe_from_image(
    image,
    dish_label=dish_label,
    greedy=True
)

if not result["ok"]:
    print("❌ Feature2 failed:", result["reason"])
else:
    print("🍽️ Title:", result["title"])
    print("\n🧾 Ingredients:")
    for i, ingr in enumerate(result["ingredients"], 1):
        print(f"{i}. {ingr}")

    print("\n👩‍🍳 Instructions:")
    for i, step in enumerate(result["instructions"], 1):
        print(f"{i}) {step}")


# In[39]:


import os, requests
from typing import Dict, Any, Optional, List


# In[40]:


import os
print(os.getenv("FDC_API_KEY"))


# In[41]:


def extract_nutrients_per_100g(foodNutrients: list) -> dict:
    """
    Extract common nutrients per 100g from USDA search result nutrients list.
    Returns calories/protein/carbs/fat + sugars + added_sugars + sodium.
    """

    def find_value(name_contains: str) -> float:
        for n in foodNutrients:
            nm = (n.get("nutrientName") or "").lower()
            if name_contains.lower() in nm:
                return float(n.get("value") or 0.0)
        return 0.0

    return {
        "calories": find_value("energy"),                 # kcal
        "protein": find_value("protein"),                # g
        "carbs": find_value("carbohydrate"),             # g
        "fat": find_value("total lipid"),                # g
        "sugars": find_value("sugars, total"),           # g
        "added_sugars": find_value("added sugar"),       # g (مش دايمًا موجود)
        "sodium_mg": find_value("sodium")                # mg
    }


# In[42]:


import os
import requests

def get_nutrition_per_100g(ingredient: str) -> dict:
    """
    Get nutrition values per 100g for a given ingredient from USDA FoodData Central.
    Returns: calories/protein/carbs/fat + sugars/added_sugars + sodium_mg
    """
    url = "https://api.nal.usda.gov/fdc/v1/foods/search"
    params = {
        "api_key": os.getenv("FDC_API_KEY"),
        "query": ingredient,
        "pageSize": 1
    }

    r = requests.get(url, params=params, timeout=30)
    if r.status_code != 200:
        raise Exception(f"USDA API error: {r.status_code} - {r.text[:200]}")

    data = r.json()
    if not data.get("foods"):
        raise ValueError(f"No data found for {ingredient}")

    food = data["foods"][0]
    nutrients = food.get("foodNutrients", [])

    def find_value(name_contains: str) -> float:
        """
        Find nutrient by substring in nutrientName.
        Returns numeric value or 0.0 if not found.
        """
        target = name_contains.lower()
        for n in nutrients:
            nutrient_name = (n.get("nutrientName") or "").lower()
            if target in nutrient_name:
                try:
                    return float(n.get("value") or 0.0)
                except Exception:
                    return 0.0
        return 0.0

    return {
        "calories": find_value("energy"),                 # kcal
        "protein": find_value("protein"),                # g
        "carbs": find_value("carbohydrate"),             # g
        "fat": find_value("total lipid"),                # g
        "sugars": find_value("sugars, total"),           # g
        "added_sugars": find_value("added sugar"),       # g (may be 0 if missing)
        "sodium_mg": find_value("sodium")                # mg
    }


# In[43]:


def calculate_nutrition(ingredient: str, grams: float) -> dict:
    try:
        base = get_nutrition_per_100g(ingredient)
    except ValueError:
        alt = input(f"❗ USDA مش لاقي '{ingredient}'. اكتبي اسم بديل: ").strip()
        base = get_nutrition_per_100g(alt)

    factor = grams / 100.0

    return {
        "ingredient": ingredient,
        "grams": grams,
        "calories": round(base["calories"] * factor, 2),
        "protein": round(base["protein"] * factor, 2),
        "carbs": round(base["carbs"] * factor, 2),
        "fat": round(base["fat"] * factor, 2),
        "sugars": round(base["sugars"] * factor, 2),
        "added_sugars": round(base["added_sugars"] * factor, 2),
        "sodium_mg": round(base["sodium_mg"] * factor, 2),
    }


# In[44]:


import re

# لازم Feature2 يكون عامل result
assert "result" in globals() and result is not None, "❌ لازم تشغّلي Feature 2 الأول علشان result يكون موجود"

def normalize_ingr(x: str) -> str:
    x = x.lower().strip()
    x = re.sub(r"[^a-zA-Z\s\-]", "", x)   # نشيل رموز
    x = re.sub(r"\s+", " ", x).strip()
    return x

# جرّبي أكتر من key حسب اللي عندك
candidates = None
for key in ["ingredients", "ingrs", "ingredient_list", "pred_ingredients"]:
    if isinstance(result, dict) and key in result and result[key]:
        candidates = result[key]
        break

# لو Feature2 مخزنها كنص كبير (lines)
if candidates is None and isinstance(result, dict):
    for key in ["ingredients_text", "ingrs_text"]:
        if key in result and isinstance(result[key], str) and result[key].strip():
            candidates = [line.strip("-• ").strip() for line in result[key].split("\n") if line.strip()]
            break

assert candidates is not None, "❌ مش لاقية مكونات Feature 2 داخل result. ابعتيلي شكل result keys"

# لو جايه list of dicts
if isinstance(candidates, list) and len(candidates) and isinstance(candidates[0], dict):
    # أشهر مفاتيح
    for k in ["text", "name", "ingredient"]:
        if k in candidates[0]:
            candidates = [c[k] for c in candidates]
            break

# تنظيف + حذف التكرار
ingredients = []
seen = set()
for ingr in candidates:
    if not isinstance(ingr, str):
        continue
    ingr_n = normalize_ingr(ingr)
    if ingr_n and ingr_n not in seen:
        ingredients.append(ingr_n)
        seen.add(ingr_n)

print("✅ Ingredients from Feature2:", ingredients)


# In[45]:


import re

INGR_ALIASES = {
    "tacoshell": ["taco shell", "taco shells", "hard taco shell"],
    "tortillachip": ["tortilla chips", "tortilla chip"],
    "hotdogbun": ["hot dog bun", "bun"],
    "mayonnaise": ["mayonnaise", "mayo"],
    "ketchup": ["ketchup", "tomato ketchup"],
}

def split_camel_or_joined(word: str) -> str:
    word = re.sub(r"([a-z])([A-Z])", r"\1 \2", word)
    word = re.sub(r"(taco)(shell)", r"\1 \2", word, flags=re.I)
    return word.strip()

def build_search_queries(ingredient: str) -> list[str]:
    ing = ingredient.lower().strip()
    ing = ing.replace("_", " ").replace("-", " ")
    ing = re.sub(r"\s+", " ", ing).strip()

    ing2 = split_camel_or_joined(ing)

    queries = []
    if ing in INGR_ALIASES:
        queries.extend(INGR_ALIASES[ing])

    if ing2 != ing:
        queries.append(ing2)

    queries.append(ing)

    # remove duplicates
    seen = set()
    final = []
    for q in queries:
        if q not in seen:
            final.append(q)
            seen.add(q)

    return final


# In[46]:


nutrition_results = []
for ingr in ingredients:
    grams = float(input(f"Enter grams for {ingr}: "))
    nutrition = calculate_nutrition(ingr, grams)  # نفس دالتك
    nutrition_results.append(nutrition)

nutrition_results


# In[59]:


import pandas as pd

df = pd.DataFrame(nutrition_results)
total = df[["calories","protein","carbs","fat","sugars","added_sugars","sodium_mg"]].sum().to_dict()
print(total)


# In[52]:


def calculate_meal():

    from tkinter import Tk, filedialog
    from PIL import Image

    # ==========================
    # PICK IMAGE
    # ==========================
    root = Tk()
    root.withdraw()

    image_path = filedialog.askopenfilename(
        title="Select Food Image",
        filetypes=[("Images", "*.jpg *.jpeg *.png")]
    )

    if not image_path:
        return {
            "dish": "unknown_food",
            "ingredients": [],
            "calories": 0,
            "protein": 0,
            "carbs": 0,
            "fat": 0,
            "sodium_mg": 0,
            "added_sugars": 0
        }

    image = Image.open(image_path).convert("RGB")

       # ==========================
    # DISH PREDICTION
    # ==========================

    try:

        inputs = food_processor(
            images=image,
            return_tensors="pt"
        )

        with torch.no_grad():
            outputs = food_model(**inputs)
            logits = outputs.logits

        pred_idx = logits.argmax(-1).item()

        confidence = torch.softmax(
            logits,
            dim=-1
        )[0][pred_idx].item()

        raw_label = food_model.config.id2label[
            pred_idx
        ]

        # ------------------------------
        # Food101 + Ollama Decision
        # ------------------------------

        ollama_label = ""

        if confidence < 0.70:
            try:
                ollama_label = detect_food_with_ollama(
                    image_path
                )
                print("🧠 Ollama:", ollama_label)

            except Exception as e:
                print("Ollama failed:", e)
                ollama_label = ""

        raw_clean = raw_label.lower().strip().replace("_", " ")
        ollama_clean = ollama_label.lower().strip()

        # لو Ollama رجع اسم استخدمه
        if ollama_clean:
            dish = ollama_clean
        else:
            dish = raw_clean

        print("✅ Final Dish:", dish)

    except Exception as e:

        print(
            "Dish prediction failed:",
            e
        )

        dish = "unknown_dish"

    # ==========================
    # INGREDIENTS
    # ==========================

    try:

        recipe_result = predict_recipe_from_image(
            image,
            dish_label=dish
        )

        ingredients = recipe_result.get(
            "ingredients",
            []
        )

    except Exception as e:

        print(
            "Recipe prediction failed:",
            e
        )

        ingredients = []

    # ==========================
    # NUTRITION (TEMP)
    # ==========================

    calories = 150
    protein = 10
    carbs = 15
    fat = 5
    sodium = 200
    sugar = 2

    # ==========================
    # RETURN
    # ==========================

    return {

        "dish": dish,
        "ingredients": ingredients,
        "calories": calories,
        "protein": protein,
        "carbs": carbs,
        "fat": fat,
        "sodium_mg": sodium,
        "added_sugars": sugar

    }
# =====================================
# SAVE OUTPUT TO JSON
# =====================================

import json
from pathlib import Path

output_data = {
    "dish": dish_label,
    "ingredients": ingredients,
    "calories": total["calories"],
    "protein": total["protein"],
    "carbs": total["carbs"],
    "fat": total["fat"],
    "sugars": total["sugars"],
    "added_sugars": total["added_sugars"],
    "sodium_mg": total["sodium_mg"]
}

# حفظ داخل المشروع في نفس الملف الذي يقرأ منه main.py
output_path = Path(__file__).resolve().parent.parent / "feature_output.json"

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(
        output_data,
        f,
        indent=4,
        ensure_ascii=False
    )

print("\n✅ Meal saved to:")
print(output_path)