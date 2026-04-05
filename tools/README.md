# LEARN-mode audio generation

Generate studio-quality Hindi / Tamil / Telugu / English voice-overs for
the "Teach Me First" lessons, fully offline, using free open-source models.

## Why not just use the browser?

The browser's Web Speech API is the default runtime fallback and works well
for English and Hindi on Chrome Android. Tamil and Telugu voice availability
is patchy and quality varies. For the best classroom experience we
pre-generate MP3s once and ship them as static assets.

## Recommended engine: AI4Bharat Indic Parler-TTS

- Model: [`ai4bharat/indic-parler-tts`](https://huggingface.co/ai4bharat/indic-parler-tts)
- Built by IIT Madras specifically for Indian languages
- Trained on 1400 hours of native speech across all 22 scheduled Indian languages
- Named speaker voices per language (Rohit, Divya, Jaya, Prakash, ...)
- Apache 2.0 — free for any use
- Runs fully offline after one-time ~2 GB download
- Quality is significantly better than Meta MMS for Tamil/Telugu/Marathi/etc.

Fallback engine (still free, lighter): Meta `facebook/mms-tts-*` — used only
for English + Hindi since those are already acceptable.

## One-time setup

```bash
# From repo root
python3 -m venv .venv
source .venv/bin/activate

python3 -m pip install --upgrade \
    git+https://github.com/huggingface/parler-tts.git \
    transformers torch soundfile sentencepiece

# Optional: install ffmpeg to get smaller .mp3 files alongside the .wav
brew install ffmpeg
```

## Generate audio

```bash
# Everything (all lessons × all 4 languages) with Parler
python3 tools/generate_tts.py

# Just Tamil + Telugu (the weak ones)
python3 tools/generate_tts.py --langs ta te

# Regenerate a single lesson
python3 tools/generate_tts.py --lessons frame

# Force MMS engine for EN+HI (faster, still good)
python3 tools/generate_tts.py --engine mms --langs en hi
```

First run downloads the model weights (~2 GB for Parler, ~500 MB/lang for
MMS). Subsequent runs use the local cache at `~/.cache/huggingface/hub/`.

Output files land in `learn-audio/<lang>/<station>-<lessonId>.{wav,mp3}`.

## Wire the MP3s into the app

In `learn-content.js`, add an `audio` field to each lesson:

```js
{
    id: 'frame',
    name: { ... },
    ttsText: { ... },
    audio: {
        en: 'learn-audio/en/phone-assembly-frame.mp3',
        hi: 'learn-audio/hi/phone-assembly-frame.mp3',
        ta: 'learn-audio/ta/phone-assembly-frame.mp3',
        te: 'learn-audio/te/phone-assembly-frame.mp3',
    }
}
```

`learn-engine.js` automatically prefers the MP3 URL over the browser TTS
fallback. If a file is missing it silently falls back — so you can roll out
languages incrementally.

## Model comparison (subjective, but consistent with public benchmarks)

| Language | MMS-TTS       | Parler Indic  |
|----------|---------------|---------------|
| English  | Good          | Very good     |
| Hindi    | Good          | Excellent     |
| Tamil    | Mediocre      | Excellent     |
| Telugu   | Mediocre      | Excellent     |
| Bengali  | Mediocre      | Excellent     |
| Marathi  | Poor          | Very good     |

## Hardware

- CPU works fine for one-time batch generation. Expect ~15 sec per
  utterance on a recent laptop with Parler, ~3 sec with MMS.
- GPU (CUDA or Apple Metal/MPS) is auto-detected and used if available —
  5–10× faster.
- Total generation time for 8 lessons × 4 languages with Parler on CPU is
  roughly 10 minutes after the initial model download.

## Troubleshooting

- `ImportError: parler_tts` → run the pip install line above
- `out of memory` (macOS with Parler on MPS) → add `--engine mms` fallback
  temporarily, or set `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0`
- Audio sounds robotic or repetitive → re-run with a different speaker
  description (edit `PARLER_DESC` in `generate_tts.py`)
