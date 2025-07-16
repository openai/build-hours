# Evals RFT – Repository layout & setup

**Purpose**  
This repository provides an end-to-end template for evaluating OpenAI models on
custom datasets (via the Evals API), analysing variance across multiple runs,
and iteratively improving model behaviour with **Reinforcement Fine-Tuning
(RFT)**.  It ships with:

* A ready-made project structure (`projects/<name>/…`) that keeps data,
  prompts, evaluation runs, graders, structured-output schemas and helper
  tools neatly isolated per project.
* Opinionated helper utilities (`utils/`) for common chores: uploading files
  once and caching their `file_id`, polling runs, saving manifests, building
  RFT jsonl files, and spinning up RFT jobs programmatically.
* Two reference pipelines (evaluation + RFT) that work in both
  Jupyter-style notebooks and as plain Python modules.

Clone, create a new project via `scripts/create_project.py`, drop your data &
prompts in the right folders, and you're ready to evaluate models and fine-tune
them—all driven from code, no manual clicks required.

This repo is organised to support **multiple independent projects** while re-using a common helper library (`utils/`).

```
├─ projects/
│   ├─ toy/                     # ← example project
│   │   ├─ data/                # dataset JSONL files (train/val/test)
│   │   ├─ prompts/             # system/developer/grader prompts
│   │   ├─ pipelines/
│   │   │   ├─ pipeline.ipynb       # interactive evaluation pipeline notebook
│   │   │   └─ rft_pipeline.ipynb   # dataset → RFT JSONL helper notebook
│   │   ├─ eval_runs/           # outputs & runs_manifest.jsonl
│   │   ├─ graders_saved/       # auto-saved grader definitions
│   │   ├─ structured_outputs/  # Pydantic models (response schemas)
│   │   └─ tools/               # JSON schemas or helper scripts
│   └─ <another_project>/ …
│
├─ scripts/                # helper utilities (e.g., create_project.py)
└─ utils/                  # shared helper library (project-aware)
```

Datasets are located directly under each project's `data/` folder.  The pipeline auto-detects a file that matches `*_train.jsonl`; you can add other splits like `toy_val.jsonl`, `toy_test.jsonl` — just keep the `<name>_<split>.jsonl` pattern.

`utils.project_paths` resolves all file-system paths **per project**.  The active
project is inferred automatically by the pipeline (based on its folder name),
but you can override it via the `PROJECT` environment variable:
```bash
export PROJECT=my_project   # optional
```

---
## 1. Python environment
```bash
python3 -m venv venv     # create venv (once)
source venv/bin/activate # activate
pip install -r requirements.txt
```

### Adding packages
```bash
pip install <package>
pip freeze > requirements.txt
```

---
## 2. Creating a new project folder
Add via helper script:
```bash
python scripts/create_project.py my_project
```
This generates the full folder tree (including `prompts/developer`, `prompts/grader`, `tools/`, `eval_runs/` and `graders_saved/`) and copies the latest template pipelines.

---
## 3. Running the evaluation pipeline
```bash
# from repo root
export OPENAI_API_KEY=sk-…

# Open the notebook in Jupyter Lab
jupyter lab projects/toy/pipelines/pipeline.ipynb
```
All prompts, runs, graders will be created under `projects/toy/`.

---
## 4. Generating an RFT dataset

Each project ships with `pipelines/rft_pipeline.py` which converts your eval
datasets into a JSONL format suitable for **Retrieval-Finetuning** jobs and
uploads it once (cached):

Open the `rft_pipeline.ipynb` notebook and run the cells.  It iterates over
every `*_*.jsonl` split (train/val/test) it finds, builds a prompt-augmented
messages list, uploads the resulting files once (caching their `file_id`), and
prints the IDs ready for the RFT API.

---
## 5. Manual project creation (optional)

That's it!  Feel free to customise the structure further; just update `utils.project_paths` accordingly. 

### Dataset files

Each split is stored in a **JSONL** file named
`<dataset>_<split>.jsonl` (e.g. `toy_train.jsonl`, `toy_val.jsonl`).

Records **must** be wrapped in a top-level `"item"` object (this matches the
schema expected by the evaluation data-source):

```jsonl
{"item": {"id": "1", "text_input": "I love this product!", "reference_answer": "Positive"}}
{"item": {"id": "2", "text_input": "This is terrible.",   "reference_answer": "Negative"}}
```

The evaluation pipeline unwraps `item` automatically.  These same files are
converted into **Retrieval-Fine-Tuning** datasets by
`pipelines/rft_pipeline.py` – one RFT file per split and prompt.

---
### File-upload cache
Every dataset file is uploaded to the OpenAI API once.  A JSON cache is kept
in `data/.file_cache.json` mapping *absolute file path → file_id* so repeated
runs reuse the same file_id and avoid rate-limits.

---
### Runs manifest
After each eval run the pipeline appends a line to
`eval_runs/runs_manifest.jsonl` containing metadata (prompt id, split, model,
grader, timestamp, etc.).  Plotting helpers read this manifest to analyse
variance across multiple runs:

```python
from utils.plot_eval_runs import load_scores_by_item, compute_score_stats
```
`runs_manifest.jsonl` lives in the project's `eval_runs/` folder. All per-item
outputs are stored under `eval_runs/<run_id>/outputs.jsonl`. 