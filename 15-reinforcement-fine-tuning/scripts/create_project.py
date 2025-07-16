#!/usr/bin/env python3
"""Bootstrap a new project folder under `projects/`.

Usage
-----
python scripts/create_project.py <project_name>

Creates the folder tree:
projects/<project_name>/
    pipelines/
    data/
    prompts/
    eval_runs/
    graders_saved/
    structured_outputs/
    tools/

It also writes a template `pipelines/pipeline.py` (and a matching `pipeline.ipynb` if `nbformat` is available) with the same self-configuring
logic as the toy example.
"""

from __future__ import annotations

import argparse
import os
import pathlib
import shutil

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
PROJECTS_DIR = REPO_ROOT / "projects"
TEMPLATE_PROJECT = REPO_ROOT / "projects" / "toy"  # used to copy pipeline


def create_project(name: str) -> None:
    proj_dir = PROJECTS_DIR / name
    if proj_dir.exists():
        raise FileExistsError(f"Project {name!r} already exists")

    for sub in ("pipelines", "data", "prompts/developer", "prompts/grader", "eval_runs", "graders_saved", "structured_outputs", "tools"):
        (proj_dir / sub).mkdir(parents=True, exist_ok=True)

    # Create empty __init__.py files so pipelines can be imported as modules
    (proj_dir / "__init__.py").touch(exist_ok=True)
    (proj_dir / "pipelines" / "__init__.py").touch(exist_ok=True)
    (proj_dir / "structured_outputs" / "__init__.py").touch(exist_ok=True)
    (proj_dir / "prompts" / "__init__.py").touch(exist_ok=True)

    # Write template pipeline
    pipeline_path = proj_dir / "pipelines" / "pipeline.py"

    toy_pipeline = PROJECTS_DIR / "toy" / "pipelines" / "pipeline.py"
    rft_template = PROJECTS_DIR / "toy" / "pipelines" / "rft_pipeline.py"
    if not toy_pipeline.exists():
        raise FileNotFoundError("Reference pipeline projects/toy/pipelines/pipeline.py not found. Cannot create new project.")

    shutil.copy(toy_pipeline, pipeline_path)
    if rft_template.exists():
        shutil.copy(rft_template, proj_dir / "pipelines" / "rft_pipeline.py")

    # Optionally create Jupyter notebook versions of the templates -----------------
    try:
        import nbformat
        from nbformat import v4 as nbf

        def _py_to_notebook(src_py: pathlib.Path) -> None:
            """Convert a # %% delimited script into a minimal Jupyter notebook."""
            lines = src_py.read_text().splitlines()
            cells, buf = [], []
            for line in lines:
                if line.lstrip().startswith("# %"):
                    if buf:
                        cells.append(nbf.new_code_cell("\n".join(buf)))
                        buf = []
                    # skip marker
                    continue
                buf.append(line)
            if buf:
                cells.append(nbf.new_code_cell("\n".join(buf)))
            nb = nbf.new_notebook(cells=cells, metadata={"language": "python"})
            nb_path = src_py.with_suffix(".ipynb")
            nbformat.write(nb, nb_path)
            print(f"  ↳ Notebook created at {nb_path.relative_to(REPO_ROOT)}")

        # Generate notebooks for main and RFT pipelines
        _py_to_notebook(pipeline_path)
        rft_py = proj_dir / "pipelines" / "rft_pipeline.py"
        if rft_py.exists():
            _py_to_notebook(rft_py)
    except ImportError:
        # nbformat is optional – skip notebook generation if not installed
        print("nbformat not found – skipping .ipynb generation.")

    print(f"Project created at {proj_dir}")


def main():
    parser = argparse.ArgumentParser(description="Create a new Evals project folder")
    parser.add_argument("name", help="project name (folder under projects/)")
    args = parser.parse_args()

    create_project(args.name)


if __name__ == "__main__":
    main() 