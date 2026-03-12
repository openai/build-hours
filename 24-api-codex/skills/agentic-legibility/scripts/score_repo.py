#!/usr/bin/env python3
"""Score a repository's agentic legibility from repo-visible evidence."""

from __future__ import annotations

import argparse
import fnmatch
import json
import os
import re
from pathlib import Path


IGNORED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".next",
    ".nuxt",
    ".turbo",
    ".yarn",
    ".venv",
    ".pytest_cache",
    ".mypy_cache",
    "__pycache__",
    "node_modules",
    "vendor",
    "dist",
    "build",
    "coverage",
    "target",
    "out",
}

DOC_EXTENSIONS = {".md", ".mdx", ".rst", ".txt"}
MAX_TEXT_SIZE = 250_000
MAX_EVIDENCE = 5
ROOT_SCOPE = "."
AGENT_DOC_NAMES = {"agents.md", "claude.md", "copilot-instructions.md"}
ROOT_AGENT_DOC_PATHS = {"AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"}
TASK_FILE_NAMES = {"makefile", "justfile", "taskfile.yml", "taskfile.yaml", "package.json"}
MANIFEST_FILE_NAMES = {
    "package.json",
    "pyproject.toml",
    "cargo.toml",
    "go.mod",
    "gemfile",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "requirements.txt",
    "mix.exs",
}


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def read_text(path: Path) -> str:
    try:
        if path.stat().st_size > MAX_TEXT_SIZE:
            return ""
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""


def walk_repo(root: Path, excludes: list[str]) -> list[Path]:
    paths: list[Path] = []
    exclude_patterns = [pattern.strip("/") for pattern in excludes if pattern.strip("/")]
    for dirpath, dirnames, filenames in os.walk(root):
        current = Path(dirpath)
        dirnames[:] = [
            name
            for name in dirnames
            if name not in IGNORED_DIRS
            and not matches_exclude(rel(current / name, root), exclude_patterns)
        ]
        for filename in filenames:
            file_path = current / filename
            relpath = rel(file_path, root)
            if matches_exclude(relpath, exclude_patterns):
                continue
            paths.append(file_path)
    return paths


def matches_exclude(relpath: str, patterns: list[str]) -> bool:
    if not patterns:
        return False
    for pattern in patterns:
        if relpath == pattern or relpath.startswith(pattern.rstrip("/") + "/"):
            return True
        if fnmatch.fnmatch(relpath, pattern):
            return True
    return False


def find_files(paths: list[Path], *patterns: str) -> list[Path]:
    matches: list[Path] = []
    for path in paths:
        relpath = path.as_posix()
        name = path.name
        if any(fnmatch.fnmatch(name, pattern) or fnmatch.fnmatch(relpath, pattern) for pattern in patterns):
            matches.append(path)
    return matches


def read_candidates(paths: list[Path], root: Path, patterns: tuple[str, ...]) -> dict[str, str]:
    selected = {}
    for path in find_files(paths, *patterns):
        selected[rel(path, root)] = read_text(path)
    return selected


def parse_package_scripts(text: str) -> set[str]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return set()
    scripts = data.get("scripts", {})
    if not isinstance(scripts, dict):
        return set()
    return {str(name).strip() for name in scripts}


def parse_make_targets(text: str) -> set[str]:
    targets = set()
    for line in text.splitlines():
        if line.startswith("\t") or line.startswith(" "):
            continue
        match = re.match(r"^([A-Za-z0-9_.-]+):(?:\s|$)", line)
        if not match:
            continue
        target = match.group(1)
        if target.startswith("."):
            continue
        targets.add(target)
    return targets


def parse_just_targets(text: str) -> set[str]:
    targets = set()
    for line in text.splitlines():
        match = re.match(r"^([A-Za-z0-9_.-]+):(?:\s|$)", line)
        if match:
            targets.add(match.group(1))
    return targets


def parse_taskfile_targets(text: str) -> set[str]:
    targets = set()
    in_tasks = False
    for line in text.splitlines():
        if re.match(r"^tasks:\s*$", line):
            in_tasks = True
            continue
        if in_tasks and re.match(r"^[A-Za-z]", line):
            break
        if in_tasks:
            match = re.match(r"^\s{2,}([A-Za-z0-9_.-]+):\s*$", line)
            if match:
                targets.add(match.group(1))
    return targets


def normalize_scope(root: Path, scope: str) -> str:
    scope_path = (root / scope).resolve()
    try:
        relative = scope_path.relative_to(root)
    except ValueError as error:
        raise SystemExit(f"Scope path must stay inside the repository root: {scope}") from error

    normalized = relative.as_posix()
    return normalized or ROOT_SCOPE


def scope_candidates_for_path(path: Path) -> list[str]:
    return [Path(*path.parts[:index]).as_posix() for index in range(1, len(path.parts))]


def root_routes_to_scope(root_readme: str, scope: str) -> bool:
    return (
        f"{scope}/" in root_readme
        or f"`{scope}`" in root_readme
        or f"cd {scope}" in root_readme
    )


def discover_scopes(ctx: dict) -> list[dict]:
    relpaths = sorted(ctx["relpaths"])
    root_readme = (
        ctx["doc_texts"].get("README.md", "")
        or ctx["doc_texts"].get("README.mdx", "")
    ).lower()
    task_surface_files = ctx["task_surface_files"]
    signals_by_scope: dict[str, set[str]] = {}

    for relpath in relpaths:
        path = Path(relpath)
        if len(path.parts) < 2:
            continue

        direct_scope = path.parent.as_posix()
        filename = path.name.lower()
        candidate_scopes = scope_candidates_for_path(path)

        if filename in AGENT_DOC_NAMES:
            signals_by_scope.setdefault(direct_scope, set()).add(f"agent_doc:{path.name}")
        if filename == "readme.md":
            signals_by_scope.setdefault(direct_scope, set()).add("scope_readme:README.md")

        for scope in candidate_scopes:
            signals = signals_by_scope.setdefault(scope, set())
            if filename in TASK_FILE_NAMES and relpath in task_surface_files:
                signals.add(f"task_surface:{path.name}")
            if filename in MANIFEST_FILE_NAMES:
                signals.add(f"manifest:{path.name}")
            if root_routes_to_scope(root_readme, scope):
                signals.add("root_routes_here:README.md")

    candidates = []
    for scope, signals in signals_by_scope.items():
        score = score_scope_signals(signals)
        if score < 3:
            continue
        if not any(signal.startswith(("agent_doc:", "task_surface:", "manifest:")) for signal in signals):
            continue
        candidates.append(
            {
                "path": scope,
                "signals": sorted(signals),
                "score": score,
            }
        )

    return sorted(candidates, key=lambda item: (-item["score"], item["path"]))


def score_scope_signals(signals: set[str]) -> int:
    score = 0
    if any(signal.startswith("agent_doc:") for signal in signals):
        score += 4
    if any(signal.startswith("task_surface:") for signal in signals):
        score += 2
    if any(signal.startswith("manifest:") for signal in signals):
        score += 2
    if any(signal.startswith("scope_readme:") for signal in signals):
        score += 1
    if any(signal.startswith("root_routes_here:") for signal in signals):
        score += 1
    return score


def choose_scope(ctx: dict, explicit_scope: str | None = None) -> tuple[str, list[dict], str]:
    discovered = discover_scopes(ctx)

    if explicit_scope:
        return explicit_scope, discovered, "explicit"

    top_level_agent_doc = any(path in ctx["relpaths"] for path in ROOT_AGENT_DOC_PATHS)
    strong_candidates = [candidate for candidate in discovered if candidate["score"] >= 5]
    if len(strong_candidates) == 1 and not top_level_agent_doc:
        return strong_candidates[0]["path"], discovered, "auto_single_nested_scope"

    if len(strong_candidates) >= 2:
        return ROOT_SCOPE, discovered, "root_multiple_nested_scopes"

    return ROOT_SCOPE, discovered, "root_default"


def collect_context(root: Path, excludes: list[str]) -> dict:
    files = walk_repo(root, excludes)
    relpaths = {rel(path, root) for path in files}
    docs = [path for path in files if path.suffix.lower() in DOC_EXTENSIONS]
    doc_texts = {
        rel(path, root): read_text(path)
        for path in docs
        if path.name.lower()
        in {
            "readme.md",
            "readme.mdx",
            "contributing.md",
            "agents.md",
            "claude.md",
            "copilot-instructions.md",
        }
        or path.parts[:1] == ("docs",)
    }

    task_files = read_candidates(
        files,
        root,
        (
            "Makefile",
            "makefile",
            "justfile",
            "Justfile",
            "Taskfile.yml",
            "Taskfile.yaml",
            "package.json",
        ),
    )

    task_surface: set[str] = set()
    task_surface_files: set[str] = set()
    entrypoint_files: list[str] = []
    for relpath, text in task_files.items():
        entrypoint_files.append(relpath)
        lower = relpath.lower()
        if lower.endswith("package.json"):
            scripts = parse_package_scripts(text)
            task_surface.update(scripts)
            if scripts:
                task_surface_files.add(relpath)
        elif lower.endswith("makefile"):
            task_surface_files.add(relpath)
            task_surface.update(parse_make_targets(text))
        elif lower.endswith("justfile"):
            task_surface_files.add(relpath)
            task_surface.update(parse_just_targets(text))
        elif lower.endswith((".yml", ".yaml")):
            task_surface_files.add(relpath)
            task_surface.update(parse_taskfile_targets(text))

    return {
        "root": root,
        "files": files,
        "relpaths": relpaths,
        "doc_paths": [rel(path, root) for path in docs],
        "doc_texts": doc_texts,
        "task_surface": task_surface,
        "task_surface_files": task_surface_files,
        "entrypoint_files": entrypoint_files,
    }


def clip_evidence(items: list[str], limit: int = MAX_EVIDENCE) -> list[str]:
    unique = []
    seen = set()
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        unique.append(item)
    return unique[:limit]


def metric(score: int, confidence: str, evidence: list[str], gaps: str, next_step: str) -> dict:
    return {
        "score": score,
        "confidence": confidence,
        "evidence": clip_evidence(evidence),
        "gaps": gaps,
        "next_step": next_step,
    }


def score_bootstrap(ctx: dict) -> dict:
    relpaths = ctx["relpaths"]
    task_surface = {name.lower() for name in ctx["task_surface"]}
    declarative = sorted(
        path
        for path in relpaths
        if path in {
            "devcontainer.json",
            ".devcontainer/devcontainer.json",
            "docker-compose.yml",
            "docker-compose.yaml",
            "compose.yml",
            "compose.yaml",
            "flake.nix",
            "shell.nix",
            "mise.toml",
            ".tool-versions",
            "Brewfile",
        }
        or path.startswith(".devcontainer/")
    )
    runtime_pins = sorted(
        path
        for path in relpaths
        if path in {".python-version", ".nvmrc", ".node-version", ".ruby-version", ".java-version"}
    )
    lockfiles = sorted(
        path
        for path in relpaths
        if Path(path).name
        in {
            "package-lock.json",
            "pnpm-lock.yaml",
            "yarn.lock",
            "poetry.lock",
            "Pipfile.lock",
            "uv.lock",
            "Cargo.lock",
            "go.sum",
            "Gemfile.lock",
        }
    )
    bootstrap_commands = sorted(name for name in task_surface if name in {"setup", "bootstrap", "install", "init", "dev", "up"})
    categories = sum(bool(group) for group in (declarative, runtime_pins, lockfiles, bootstrap_commands))
    evidence = declarative + runtime_pins + lockfiles + [f"task:{name}" for name in bootstrap_commands]

    if declarative and bootstrap_commands and (runtime_pins or lockfiles):
        return metric(3, "high", evidence, "Little obvious setup debt from repo-visible signals.", "Keep one canonical bootstrap command and keep manifests pinned.")
    if categories >= 2:
        return metric(2, "medium", evidence, "Setup is partly declared, but the repo does not advertise one clearly dominant bootstrap path.", "Add a canonical `setup` or `bootstrap` entrypoint and point docs at it.")
    if categories == 1:
        return metric(1, "medium", evidence, "Some setup signals exist, but an agent still has to infer too much about the environment.", "Add declarative environment files or a single bootstrap command.")
    return metric(0, "high", evidence, "No strong repo-visible bootstrap path was found.", "Declare the toolchain and local services in version control and expose a `setup` task.")


def score_task_entrypoints(ctx: dict) -> dict:
    surface = {name.lower() for name in ctx["task_surface"]}
    files = ctx["entrypoint_files"]
    canonical = {"setup", "bootstrap", "install", "dev", "start", "build", "test", "lint", "format", "fmt", "check", "ci"}
    matched = sorted(name for name in surface if name in canonical)
    evidence = files + [f"task:{name}" for name in matched]

    has_setup = any(name in matched for name in {"setup", "bootstrap", "install", "dev", "start"})
    has_validation = any(name in matched for name in {"test", "lint", "check", "ci"})
    has_build = "build" in matched

    if len(matched) >= 5 and has_setup and has_validation and has_build:
        return metric(3, "high", evidence, "Common workflows appear to have stable entrypoints.", "Keep entrypoint names consistent across docs and CI.")
    if len(matched) >= 3:
        return metric(2, "high", evidence, "Several common tasks are exposed, but the task surface is not yet complete.", "Expose `setup`, `dev`, `test`, `lint`, and `build` through one canonical task layer.")
    if files or matched:
        return metric(1, "medium", evidence, "Some task entrypoints exist, but coverage is narrow or inconsistent.", "Add a single command surface such as `make`, `just`, `task`, or package scripts for routine work.")
    return metric(0, "high", evidence, "No canonical task surface was detected.", "Add repo-level entrypoints for setup, validation, and build tasks.")


def score_validation_harness(ctx: dict) -> dict:
    relpaths = ctx["relpaths"]
    surface = {name.lower() for name in ctx["task_surface"]}
    test_dirs = sorted(
        path
        for path in relpaths
        if re.search(r"(^|/)(tests?|__tests__|spec|specs|integration|e2e|cypress|playwright|testdata|fixtures)(/|$)", path)
    )
    test_configs = sorted(
        path
        for path in relpaths
        if fnmatch.fnmatch(Path(path).name, "pytest.ini")
        or fnmatch.fnmatch(Path(path).name, "tox.ini")
        or fnmatch.fnmatch(Path(path).name, "jest.config.*")
        or fnmatch.fnmatch(Path(path).name, "vitest.config.*")
        or fnmatch.fnmatch(Path(path).name, "playwright.config.*")
        or fnmatch.fnmatch(Path(path).name, "cypress.config.*")
    )
    test_commands = sorted(name for name in surface if name in {"test", "check", "ci", "smoke", "integration", "e2e"})
    layered = any(part in path for path in test_dirs for part in ("integration", "e2e", "cypress", "playwright"))
    fixtures = any(part in path for path in test_dirs for part in ("fixtures", "testdata"))
    evidence = test_dirs + test_configs + [f"task:{name}" for name in test_commands]

    if (test_dirs or test_configs) and test_commands and (layered or fixtures):
        return metric(3, "high", evidence, "The repo appears to support more than one validation layer or reusable test state.", "Keep smoke or integration coverage aligned with the most common change types.")
    if (test_dirs or test_configs) and test_commands:
        return metric(2, "high", evidence, "The repo has a credible local validation path for ordinary changes.", "Add smoke, integration, or e2e coverage for cross-cutting changes.")
    if test_dirs or test_configs or test_commands:
        return metric(1, "medium", evidence, "Some validation signals exist, but the harness looks narrow or hard to trust end-to-end.", "Add a canonical `test` or `check` command and keep tests in predictable locations.")
    return metric(0, "high", evidence, "No meaningful local validation harness was detected.", "Add a basic test or smoke-test path that an agent can run after changes.")


def score_lint_format(ctx: dict) -> dict:
    relpaths = ctx["relpaths"]
    surface = {name.lower() for name in ctx["task_surface"]}
    lint_files = sorted(
        path
        for path in relpaths
        if Path(path).name
        in {
            ".eslintrc",
            ".eslintrc.js",
            ".eslintrc.cjs",
            ".eslintrc.json",
            ".eslintrc.yml",
            ".eslintrc.yaml",
            "eslint.config.js",
            "eslint.config.cjs",
            "eslint.config.mjs",
            ".golangci.yml",
            ".golangci.yaml",
            ".markdownlint.json",
            ".markdownlint.yaml",
            ".markdownlint.yml",
            "ruff.toml",
            ".ruff.toml",
        }
    )
    format_files = sorted(
        path
        for path in relpaths
        if Path(path).name
        in {
            ".prettierrc",
            ".prettierrc.json",
            ".prettierrc.yml",
            ".prettierrc.yaml",
            "prettier.config.js",
            "prettier.config.cjs",
            "rustfmt.toml",
            ".editorconfig",
        }
    )
    pyproject_text = ""
    if "pyproject.toml" in relpaths:
        pyproject_text = read_text(ctx["root"] / "pyproject.toml")
        if any(token in pyproject_text for token in ("[tool.ruff", "[tool.black", "[tool.isort")):
            lint_files.append("pyproject.toml")
        if any(token in pyproject_text for token in ("[tool.black", "[tool.ruff.format")):
            format_files.append("pyproject.toml")

    extra = []
    if ".pre-commit-config.yaml" in relpaths or ".pre-commit-config.yml" in relpaths:
        extra.append(".pre-commit-config.yaml")
    if any(path.startswith(".github/workflows/") for path in relpaths):
        extra.extend(sorted(path for path in relpaths if path.startswith(".github/workflows/"))[:2])

    lint_commands = sorted(name for name in surface if name in {"lint", "check", "typecheck"})
    format_commands = sorted(name for name in surface if name in {"format", "fmt"})
    evidence = lint_files + format_files + [f"task:{name}" for name in lint_commands + format_commands] + extra

    if lint_files and format_files and (lint_commands or format_commands) and extra:
        return metric(3, "high", evidence, "Static checks look integrated into the repository workflow.", "Keep lint and format commands stable and easy to run locally.")
    if (lint_files or format_files) and (lint_commands or format_commands):
        return metric(2, "high", evidence, "The repo has usable lint or format gates, but enforcement signals are still modest.", "Add both lint and format entrypoints and wire them into pre-commit or repo-local CI workflows.")
    if lint_files or format_files or lint_commands or format_commands:
        return metric(1, "medium", evidence, "Lint or format tooling exists, but the workflow is incomplete or weakly surfaced.", "Expose `lint` and `format` commands through the canonical task surface.")
    return metric(0, "high", evidence, "No lint or format gates were detected.", "Add at least one linter and formatter with explicit repo-level commands.")


def score_agent_repo_map(ctx: dict) -> dict:
    relpaths = ctx["relpaths"]
    doc_texts = ctx["doc_texts"]
    repo_wide_agent_docs = sorted(path for path in ROOT_AGENT_DOC_PATHS if path in relpaths)
    root_support_docs = [
        path
        for path in relpaths
        if path in {"CONTRIBUTING.md", "README.md"}
    ]
    nested_agent_docs = sorted(
        path
        for path in relpaths
        if path.count("/") >= 1 and Path(path).name.lower() in AGENT_DOC_NAMES
    )
    evidence = repo_wide_agent_docs + sorted(root_support_docs)[:2] + nested_agent_docs[:2]

    map_text = ""
    for candidate in (
        "AGENTS.md",
        "CLAUDE.md",
        ".github/copilot-instructions.md",
        "CONTRIBUTING.md",
        "README.md",
    ):
        if candidate in doc_texts:
            map_text = doc_texts[candidate]
            if map_text:
                break
    cues = sum(
        1
        for token in ("command", "setup", "docs", "architecture", "test", "constraint", "workflow")
        if token in map_text.lower()
    )
    has_agent_doc = bool(repo_wide_agent_docs)
    has_nested_agent_doc = bool(nested_agent_docs)
    root_text = "\n".join(
        doc_texts.get(path, "")
        for path in (
            "AGENTS.md",
            "CLAUDE.md",
            ".github/copilot-instructions.md",
            "CONTRIBUTING.md",
            "README.md",
        )
    ).lower()
    nested_guides_are_surfaced = any(
        nested_doc.lower() in root_text
        or root_routes_to_scope(root_text, Path(nested_doc).parent.as_posix().lower())
        for nested_doc in nested_agent_docs
    )

    if has_agent_doc and cues >= 3:
        return metric(3, "high", evidence, "The repo includes a repo-wide navigation aid for agents with actionable cues.", "Keep the repo map short and link outward to deeper docs instead of duplicating them.")
    if has_agent_doc:
        return metric(2, "medium", evidence, "A repo-wide agent guide exists, but it does not yet look like a crisp map of commands, docs, and constraints.", "Tighten the top-level agent guide so it indexes the primary commands, docs, architecture, and validation paths.")
    if has_nested_agent_doc and nested_guides_are_surfaced:
        return metric(2, "medium", evidence, "The repo routes some work through nested scopes with subtree-only agent guidance, but the root still lacks a single repo-wide map.", "Add a short top-level repo map that points to the nested scope guides and their primary commands.")
    if "README.md" in relpaths and cues >= 2:
        return metric(1, "medium", evidence, "The root docs provide some navigation help, but they do not clearly distinguish repo-wide guidance from subtree-specific workflows.", "Add an `AGENTS.md` or equivalent short index linking commands, docs, constraints, and nested scope guides.")
    if has_nested_agent_doc:
        return metric(1, "medium", evidence, "Nested agent guidance exists, but it is not surfaced clearly from the repository root.", "Link the nested scope guides from the root README or add a short top-level AGENTS.md.")
    if evidence:
        return metric(1, "medium", evidence, "Some onboarding docs exist, but the repo lacks a concise map optimized for agent navigation.", "Write a short repo map that points to setup, validation, and architecture docs.")
    return metric(0, "high", evidence, "No obvious repo map or contributor guide was detected.", "Add `AGENTS.md` with the primary commands, docs, and navigation tips.")


def score_structured_docs(ctx: dict) -> dict:
    relpaths = ctx["relpaths"]
    doc_paths = ctx["doc_paths"]
    doc_count = len(doc_paths)
    docs_dir_files = sorted(path for path in doc_paths if path.startswith("docs/"))
    docs_subdirs = {Path(path).parts[1] for path in docs_dir_files if len(Path(path).parts) > 2}
    index_files = [path for path in docs_dir_files if Path(path).name.lower() in {"readme.md", "index.md"}]
    cross_links = 0
    for path, text in ctx["doc_texts"].items():
        if not path.startswith("docs/"):
            continue
        cross_links += len(re.findall(r"\[[^\]]+\]\((?!https?://)[^)]+\)", text))
    evidence = sorted(index_files + docs_dir_files[:3])
    has_docs_tree = bool(docs_dir_files)
    has_docs_index = bool(index_files)
    has_cross_links = cross_links >= 3
    has_depth = bool(docs_subdirs)

    if has_docs_tree and has_docs_index and has_depth and has_cross_links:
        return metric(3, "high", evidence, "Documentation appears organized, indexed, and linked across topics.", "Preserve the index and keep new docs inside the same structure.")
    if has_docs_tree and has_docs_index and len(docs_dir_files) >= 3:
        return metric(2, "high", evidence, "The repo has an indexed docs tree, but it is still fairly shallow or only lightly cross-linked.", "Improve cross-links and add clearer sections for setup, architecture, and contributor flows.")
    if has_docs_tree and len(docs_dir_files) >= 3:
        return metric(1, "medium", evidence or docs_dir_files[:3], "The repo has a shallow docs tree, but it lacks a clear index or stronger cross-links.", "Add `docs/README.md` or `docs/index.md` and improve cross-links between the main setup, architecture, and contributor pages.")
    if has_docs_tree:
        return metric(1, "medium", evidence or docs_dir_files[:3], "A docs directory exists, but it is still sparse or hard to navigate.", "Add `docs/README.md` or `docs/index.md` and improve cross-links as the docs tree grows.")
    if doc_count >= 2:
        return metric(1, "medium", evidence or sorted(doc_paths[:3]), "Some documentation exists, but the structure is shallow or scattered.", "Group repo docs under `docs/` or add an index that links the important pages.")
    return metric(0, "high", evidence, "Very little structured documentation was found.", "Add a `docs/` directory with an index page and a small set of core topics.")


def score_decision_records(ctx: dict) -> dict:
    relpaths = ctx["relpaths"]
    adr_files = sorted(
        path
        for path in relpaths
        if re.search(r"(^|/)(adr|adrs|decisions?)(/|[-_])", path.lower()) and path.lower().endswith((".md", ".mdx"))
    )
    structured = 0
    supersession = 0
    for path in adr_files[:10]:
        text = read_text(ctx["root"] / path)
        lower = text.lower()
        if all(token in lower for token in ("context", "decision")):
            structured += 1
        if "superseded by" in lower or "status" in lower:
            supersession += 1
    evidence = adr_files

    if len(adr_files) >= 2 and structured >= 2 and supersession >= 1:
        return metric(3, "high", evidence, "The repo appears to keep structured, evolving decision records in version control.", "Keep ADR status and supersession links current as decisions change.")
    if len(adr_files) >= 2:
        return metric(2, "high", evidence, "There is a dedicated decision-record trail, but it looks lightly structured.", "Standardize ADR headings such as Context, Decision, Consequences, and Status.")
    if adr_files:
        return metric(1, "medium", evidence, "A decision-record artifact exists, but the practice looks narrow or inconsistent.", "Create a dedicated `docs/adr/` or `docs/decisions/` directory and use it consistently.")
    return metric(0, "high", evidence, "No decision-record artifacts were detected.", "Start recording major architecture and workflow decisions in ADRs.")


METRIC_SCORERS = {
    "bootstrap_self_sufficiency": score_bootstrap,
    "task_entrypoints": score_task_entrypoints,
    "validation_harness": score_validation_harness,
    "lint_format_gates": score_lint_format,
    "agent_repo_map": score_agent_repo_map,
    "structured_docs": score_structured_docs,
    "decision_records": score_decision_records,
}


def summarize(report: dict) -> None:
    metrics = report["metrics"]
    priorities = sorted(
        ((name, data) for name, data in metrics.items()),
        key=lambda item: (item[1]["score"], item[0]),
    )
    quick_wins = [f"{name}: {data['next_step']}" for name, data in priorities[:3]]
    report["quick_wins"] = quick_wins


def normalize_metric_names(raw_metrics: list[str]) -> list[str]:
    if not raw_metrics:
        return list(METRIC_SCORERS)

    names: list[str] = []
    seen = set()
    for item in raw_metrics:
        for token in item.split(","):
            name = token.strip()
            if not name:
                continue
            if name not in METRIC_SCORERS:
                valid = ", ".join(METRIC_SCORERS)
                raise SystemExit(f"Unknown metric '{name}'. Valid metrics: {valid}")
            if name not in seen:
                seen.add(name)
                names.append(name)
    return names


def build_report(root: Path, excludes: list[str], selected_metrics: list[str], scope: str | None = None) -> dict:
    root_ctx = collect_context(root, excludes)
    normalized_scope = normalize_scope(root, scope) if scope else None
    evaluated_scope, discovered_scopes, scope_selection = choose_scope(root_ctx, normalized_scope)
    target_root = root if evaluated_scope == ROOT_SCOPE else (root / evaluated_scope).resolve()
    ctx = collect_context(target_root, excludes)
    metrics = {name: METRIC_SCORERS[name](ctx) for name in selected_metrics}
    total = sum(data["score"] for data in metrics.values())
    max_score = len(metrics) * 3
    percentage = round((total / max_score) * 100) if max_score else 0
    report = {
        "repo": str(root),
        "evaluated_scope": evaluated_scope,
        "evaluated_root": str(target_root),
        "discovered_scopes": discovered_scopes,
        "scope_selection": scope_selection,
        "selected_metrics": selected_metrics,
        "available_metrics": list(METRIC_SCORERS),
        "score": total,
        "max_score": max_score,
        "score_percentage": percentage,
        "metrics": metrics,
        "notes": [
            "This score is limited to repo-visible evidence.",
            "Operational metrics such as CI reliability or debt tracking are intentionally excluded from the main score.",
            "Nested scopes may be auto-selected when the repository clearly routes work into one self-contained subsystem.",
        ],
    }
    summarize(report)
    return report


def to_markdown(report: dict) -> str:
    lines = [
        f"# Agentic Legibility Scorecard",
        "",
        f"- Repository: `{report['repo']}`",
        f"- Evaluated scope: `{report['evaluated_scope']}`",
        f"- Score: **{report['score']}/{report['max_score']}** ({report['score_percentage']}%)",
        "",
        "## Scope Discovery",
        "",
    ]
    if report["discovered_scopes"]:
        for scope in report["discovered_scopes"]:
            signals = ", ".join(f"`{item}`" for item in scope["signals"])
            lines.append(f"- `{scope['path']}` ({scope['score']}): {signals}")
    else:
        lines.append("- No nested scoring scopes discovered.")
    lines.extend(
        [
            "",
        "## Metrics",
        "",
        "| Metric | Score | Confidence | Evidence | Gap | Next step |",
        "| --- | --- | --- | --- | --- | --- |",
        ]
    )
    for name, data in report["metrics"].items():
        evidence = "<br>".join(f"`{item}`" for item in data["evidence"]) if data["evidence"] else "-"
        gap = data["gaps"].replace("|", "\\|")
        next_step = data["next_step"].replace("|", "\\|")
        lines.append(
            f"| `{name}` | {data['score']}/3 | {data['confidence']} | {evidence} | {gap} | {next_step} |"
        )
    lines.extend(
        [
            "",
            "## Quick Wins",
            "",
        ]
    )
    for item in report["quick_wins"]:
        lines.append(f"- {item}")
    lines.extend(["", "## Notes", ""])
    for note in report["notes"]:
        lines.append(f"- {note}")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repo", nargs="?", default=".", help="Repository root to score.")
    parser.add_argument("--format", choices=("json", "markdown"), default="json", help="Output format.")
    parser.add_argument(
        "--metric",
        action="append",
        default=[],
        help="Metric name to score. Repeat or pass a comma-separated list. Defaults to all metrics.",
    )
    parser.add_argument("--list-metrics", action="store_true", help="Print the available metric names and exit.")
    parser.add_argument("--list-scopes", action="store_true", help="Print discovered scoring scopes and exit.")
    parser.add_argument(
        "--scope",
        help="Relative path to a nested scope to score instead of allowing auto-selection.",
    )
    parser.add_argument(
        "--exclude",
        action="append",
        default=[],
        help="Relative path or glob to exclude. Repeat as needed.",
    )
    args = parser.parse_args()
    if args.list_metrics:
        for name in METRIC_SCORERS:
            print(name)
        return 0

    root = Path(args.repo).resolve()
    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Repository path does not exist or is not a directory: {root}")

    normalized_scope = None
    if args.scope:
        normalized_scope = normalize_scope(root, args.scope)
        scope_path = (root / normalized_scope).resolve()
        if not scope_path.exists() or not scope_path.is_dir():
            raise SystemExit(f"Scope path does not exist or is not a directory: {scope_path}")

    if args.list_scopes:
        root_ctx = collect_context(root, args.exclude)
        print(json.dumps(discover_scopes(root_ctx), indent=2, sort_keys=True))
        return 0

    selected_metrics = normalize_metric_names(args.metric)
    report = build_report(root, args.exclude, selected_metrics, normalized_scope)
    if args.format == "json":
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print(to_markdown(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
