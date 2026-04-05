#!/usr/bin/env python3
"""
Generate pre-recorded audio for LEARN mode — studio-quality Indic TTS.

ENGINES (all free, Apache 2.0, fully offline after one-time download)
---------------------------------------------------------------------
    parler  [default]  ai4bharat/indic-parler-tts
                       • Purpose-built for Indian languages by IIT Madras.
                       • Trained on 1400 h of native speech across 22 Indian
                         languages including Tamil, Telugu, Hindi, Bengali,
                         Marathi, Gujarati, Kannada, Malayalam, Punjabi,
                         Urdu, Odia, Assamese, plus Indian English.
                       • Named speaker voices per language (Rohit, Divya,
                         Jaya, Prakash, etc.).
                       • ~2 GB model. CPU works, GPU recommended.
                       • Best quality for all 4 languages we need.
    mms     [legacy]   facebook/mms-tts-{eng,hin,tam,tel}
                       • Meta MMS. Fast and light (~500 MB/lang) but
                         Tamil/Telugu output is mediocre. Kept as fallback.

USAGE
-----
    # install (one-time)
    python3 -m pip install --upgrade \\
        git+https://github.com/huggingface/parler-tts.git \\
        transformers torch soundfile sentencepiece

    # generate ALL lessons in ALL 4 languages with Parler (default)
    python3 tools/generate_tts.py

    # only Tamil + Telugu (the ones that were weak)
    python3 tools/generate_tts.py --langs ta te

    # fall back to MMS for English + Hindi
    python3 tools/generate_tts.py --engine mms --langs en hi

    # one specific lesson
    python3 tools/generate_tts.py --lessons frame pcb

OUTPUT
------
    learn-audio/<lang>/<station>-<lesson-id>.wav
    learn-audio/<lang>/<station>-<lesson-id>.mp3   (if ffmpeg is on PATH)

Add the URL to each lesson in learn-content.js to use it at runtime:
    audio: { hi: 'learn-audio/hi/phone-assembly-frame.mp3' }

The engine automatically prefers the MP3 over the browser Web Speech API.

TIMING ESTIMATES (CPU, 2024 MacBook Air M2)
-------------------------------------------
    parler  ~15 sec per utterance (first run downloads weights, ~8 min)
    mms     ~3  sec per utterance (first run downloads weights, ~2 min)
Full batch of 8 lessons × 4 languages = 32 files → ~10 min with Parler.
"""

from __future__ import annotations
import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_JS = ROOT / "learn-content.js"
OUT_DIR = ROOT / "learn-audio"

MMS_MODELS = {
    "en": "facebook/mms-tts-eng",
    "hi": "facebook/mms-tts-hin",
    "ta": "facebook/mms-tts-tam",
    "te": "facebook/mms-tts-tel",
}

# AI4Bharat Indic Parler-TTS — one multilingual checkpoint handles all.
PARLER_MODEL = "ai4bharat/indic-parler-tts"

# Per-language speaker + description prompts. Parler takes a natural-language
# "description" that steers the voice style. We pick calm, clear, factory-
# floor-friendly voices (one male, one female per language would be ideal;
# we use a single consistent speaker per language for brand consistency).
PARLER_DESC = {
    "en": (
        "Thoma speaks in a clear, calm and confident voice at a moderate "
        "pace. The recording is very high quality with no background noise."
    ),
    "hi": (
        "Rohit speaks in a clear, calm and confident voice at a moderate "
        "pace, with a slight Indian accent. The recording is very high "
        "quality with no background noise."
    ),
    "ta": (
        "Jaya speaks in a clear, calm and confident voice at a moderate "
        "pace. The recording is very high quality with no background noise."
    ),
    "te": (
        "Prakash speaks in a clear, calm and confident voice at a moderate "
        "pace. The recording is very high quality with no background noise."
    ),
}


# ---------------------------------------------------------------------------
# JS → lessons extractor (no JS runtime required)
# ---------------------------------------------------------------------------
def parse_learn_content(js_path: Path) -> dict:
    text = js_path.read_text(encoding="utf-8")
    lessons_by_station: dict[str, list[dict]] = {}
    for st_match in re.finditer(r"'([\w-]+)'\s*:\s*\{", text):
        station = st_match.group(1)
        if station not in ("phone-assembly", "pcb-design", "smt-line", "qc-inspector"):
            continue
        start = st_match.end()
        lessons_start = text.find("lessons:", start)
        if lessons_start < 0:
            continue
        arr_start = text.find("[", lessons_start)
        depth = 0
        i = arr_start
        while i < len(text):
            ch = text[i]
            if ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    break
            i += 1
        block = text[arr_start : i + 1]

        station_lessons = []
        for lm in re.finditer(r"\{\s*id:\s*'([\w-]+)'[\s\S]+?\}\s*(?:,|\])", block):
            body = lm.group(0)
            lesson_id = lm.group(1)
            tts = {}
            tm = re.search(r"ttsText\s*:\s*\{([\s\S]+?)\}", body)
            if tm:
                for kv in re.finditer(r"(\w{2})\s*:\s*'((?:[^'\\]|\\.)*)'", tm.group(1)):
                    tts[kv.group(1)] = kv.group(2).encode().decode("unicode_escape")
                for kv in re.finditer(r'(\w{2})\s*:\s*"((?:[^"\\]|\\.)*)"', tm.group(1)):
                    tts[kv.group(1)] = kv.group(2).encode().decode("unicode_escape")
            if tts:
                station_lessons.append({"id": lesson_id, "ttsText": tts})
        if station_lessons:
            lessons_by_station[station] = station_lessons
    return lessons_by_station


# ---------------------------------------------------------------------------
# Engine: Parler (primary)
# ---------------------------------------------------------------------------
def synth_parler(lang: str, text: str, out_wav: Path):
    import torch
    import soundfile as sf
    from transformers import AutoTokenizer

    # parler_tts is a separate package from HF
    try:
        from parler_tts import ParlerTTSForConditionalGeneration
    except ImportError:
        sys.exit(
            "Parler-TTS not installed. Run:\n"
            "  pip install git+https://github.com/huggingface/parler-tts.git"
        )

    if not hasattr(synth_parler, "_cache"):
        synth_parler._cache = {}
    if "mdl" not in synth_parler._cache:
        print(f"  [loading] {PARLER_MODEL} (first run downloads ~2 GB)", flush=True)
        device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")
        print(f"  [device]  {device}")
        mdl = ParlerTTSForConditionalGeneration.from_pretrained(PARLER_MODEL).to(device)
        prompt_tok = AutoTokenizer.from_pretrained(PARLER_MODEL)
        # Parler uses a separate text-encoder tokenizer for the description
        desc_name = mdl.config.text_encoder._name_or_path
        desc_tok = AutoTokenizer.from_pretrained(desc_name)
        synth_parler._cache = {
            "mdl": mdl,
            "prompt_tok": prompt_tok,
            "desc_tok": desc_tok,
            "device": device,
        }

    cache = synth_parler._cache
    mdl = cache["mdl"]
    device = cache["device"]
    description = PARLER_DESC.get(lang, PARLER_DESC["en"])

    desc_ids = cache["desc_tok"](description, return_tensors="pt").input_ids.to(device)
    desc_mask = cache["desc_tok"](description, return_tensors="pt").attention_mask.to(device)
    prompt_ids = cache["prompt_tok"](text, return_tensors="pt").input_ids.to(device)
    prompt_mask = cache["prompt_tok"](text, return_tensors="pt").attention_mask.to(device)

    with torch.no_grad():
        gen = mdl.generate(
            input_ids=desc_ids,
            attention_mask=desc_mask,
            prompt_input_ids=prompt_ids,
            prompt_attention_mask=prompt_mask,
        )
    audio = gen.cpu().to(torch.float32).numpy().squeeze()
    out_wav.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(out_wav), audio, mdl.config.sampling_rate)


# ---------------------------------------------------------------------------
# Engine: MMS (fallback)
# ---------------------------------------------------------------------------
def synth_mms(lang: str, text: str, out_wav: Path):
    from transformers import VitsModel, AutoTokenizer
    import torch
    import soundfile as sf

    if not hasattr(synth_mms, "_cache"):
        synth_mms._cache = {}
    model_id = MMS_MODELS.get(lang)
    if not model_id:
        print(f"  [skip] no MMS model for {lang}")
        return
    if model_id not in synth_mms._cache:
        print(f"  [loading] {model_id}", flush=True)
        tok = AutoTokenizer.from_pretrained(model_id)
        mdl = VitsModel.from_pretrained(model_id)
        mdl.eval()
        synth_mms._cache[model_id] = (tok, mdl)
    tok, mdl = synth_mms._cache[model_id]

    inputs = tok(text, return_tensors="pt")
    with torch.no_grad():
        wav = mdl(**inputs).waveform.squeeze().cpu().numpy()
    out_wav.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(out_wav), wav, samplerate=mdl.config.sampling_rate)


# ---------------------------------------------------------------------------
# WAV → MP3 via ffmpeg (optional, smaller files)
# ---------------------------------------------------------------------------
def wav_to_mp3(wav: Path) -> Path | None:
    if shutil.which("ffmpeg") is None:
        return None
    mp3 = wav.with_suffix(".mp3")
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(wav), "-codec:a", "libmp3lame",
            "-qscale:a", "4", str(mp3),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return mp3


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description="Generate Indic TTS audio for LEARN mode lessons.",
    )
    ap.add_argument("--engine", choices=["parler", "mms"], default="parler",
                    help="TTS engine (default: parler — AI4Bharat Indic Parler-TTS).")
    ap.add_argument("--langs", nargs="+", default=["en", "hi", "ta", "te"],
                    help="language codes to generate (default: en hi ta te)")
    ap.add_argument("--stations", nargs="+", default=None,
                    help="station ids to filter (default: all)")
    ap.add_argument("--lessons", nargs="+", default=None,
                    help="lesson ids to filter (default: all)")
    ap.add_argument("--no-mp3", action="store_true",
                    help="skip wav→mp3 conversion even if ffmpeg is available")
    args = ap.parse_args()

    print(f"Engine: {args.engine}")
    print(f"Langs : {args.langs}")

    content = parse_learn_content(CONTENT_JS)
    total_lessons = sum(len(v) for v in content.values())
    print(f"Parsed {total_lessons} lessons across {len(content)} stations.\n")

    synth = synth_parler if args.engine == "parler" else synth_mms
    count = 0
    for station, lessons in content.items():
        if args.stations and station not in args.stations:
            continue
        for lesson in lessons:
            if args.lessons and lesson["id"] not in args.lessons:
                continue
            for lang in args.langs:
                text = lesson.get("ttsText", {}).get(lang)
                if not text:
                    continue
                out_wav = OUT_DIR / lang / f"{station}-{lesson['id']}.wav"
                print(f"[{lang}] {station}/{lesson['id']}")
                print(f"       → {out_wav.relative_to(ROOT)}")
                try:
                    synth(lang, text, out_wav)
                    if not args.no_mp3:
                        mp3 = wav_to_mp3(out_wav)
                        if mp3:
                            print(f"       + {mp3.relative_to(ROOT)}")
                    count += 1
                except Exception as e:
                    print(f"  [error] {e}", file=sys.stderr)

    print(f"\nDone. Generated {count} audio files under {OUT_DIR.relative_to(ROOT)}/")
    print("\nNext: add audio URLs to learn-content.js on each lesson, e.g.")
    print("      audio: { hi: 'learn-audio/hi/phone-assembly-frame.mp3' }")


if __name__ == "__main__":
    main()
