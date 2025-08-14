"""Plotting utilities for runs stored via utils.eval_helpers."""
from __future__ import annotations

import json
import numpy as np
import matplotlib.pyplot as plt
from collections import defaultdict
from typing import Dict, List, Any, Callable

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from utils import load_runs

# ---------------------------------------------------------------------------
# Data loading helpers
# ---------------------------------------------------------------------------

def load_scores_by_item(
    dataset: str,
    prompt_id: str,
    model: str,
    grader_name: str,
    reasoning_effort: str | None = None,
    split: str | None = None,
):
    """Return mapping item_id -> list[score] across runs that match exactly the specified parameters."""

    def meta_match(m: dict) -> bool:
        gr_match = False
        if m.get("grader_name") == grader_name:
            gr_match = True
        else:
            gns = m.get("grader_names") or []
            if grader_name in gns:
                gr_match = True

        return (
            m.get("prompt_id") == prompt_id
            and m.get("model") == model
            and gr_match
            and (reasoning_effort is None or m.get("reasoning_effort") == reasoning_effort)
            and (split is None or m.get("split") == split)
        )

    runs = load_runs(dataset, meta_match)
    scores_by_item: Dict[Any, List[float]] = defaultdict(list)
    for r in runs:
        for s in r["items"]:
            # ``s["score"]`` can now be either a scalar or a dict mapping grader_name -> score.
            raw_score = s.get("score")
            if isinstance(raw_score, dict):
                score_val = raw_score.get(grader_name)
            else:
                score_val = raw_score

            if score_val is not None:
                scores_by_item[s["item_id"]].append(score_val)
    return scores_by_item, runs

# ---------------------------------------------------------------------------
# Stats + plotting (adapted from original plotting_functions)
# ---------------------------------------------------------------------------

def compute_score_stats(scores_by_key: Dict[Any, List[float]]):
    stats = {}
    for k, scores in scores_by_key.items():
        arr = np.array(scores)
        stats[k] = {
            "mean": np.mean(arr),
            "max": np.max(arr),
            "var": np.var(arr, ddof=1) if len(arr) > 1 else 0.0,
            "std": np.std(arr, ddof=1) if len(arr) > 1 else 0.0,
            "n": len(arr),
        }
    return stats

# colour-blind-safe palette (Okabe–Ito)
GREEN = "#009E73"
RED = "#D55E00"
GREY = "0.45"
ORNG = "#E69F00"

# Brand colour palette (OpenAI design system)
COLORS: Dict[str, str] = {
    "white": "#ffffff",
    "black": "#000000",
    "openai": "#0071cf",
    "chatgpt": "#86daff",
    "sora": "#c5bfee",
    "api": "#0000ff",
    "research": "#0e315c",
}

def plot_score_stats(
    stats: Dict[Any, Dict[str, float]],
    *,
    n_runs: int | None = None,
    order_by: str = "mean",
    explicit_order: List[Any] | None = None,
    show: bool = True,
    context: str | None = None,
):
    """Replicate original bar ± std + max plot for new data structure."""

    import matplotlib.pyplot as plt
    import numpy as np

    keys = list(stats.keys())
    means = np.array([stats[k]["mean"] for k in keys])
    maxs = np.array([stats[k]["max"] for k in keys])
    stds = np.array([stats[k]["std"] for k in keys])

    # determine ordering
    if explicit_order is not None:
        ordered = explicit_order
    elif order_by == "max":
        ordered = [k for k, _ in sorted(stats.items(), key=lambda kv: kv[1]["max"])]
    else:  # default mean
        ordered = [k for k, _ in sorted(stats.items(), key=lambda kv: kv[1]["mean"])]

    idx = {k: i for i, k in enumerate(keys)}
    mean_vals = np.array([means[idx[k]] for k in ordered])
    max_vals = np.array([maxs[idx[k]] for k in ordered])
    std_vals = np.array([stds[idx[k]] for k in ordered])

    x = np.arange(len(ordered))
    fig, ax = plt.subplots(figsize=(10, 6))

    ax.bar(
        x,
        mean_vals,
        width=0.8,
        alpha=0.18,
        color="tab:blue",
        edgecolor="none",
        label="Mean",
    )

    # Clip error bars so they do not extend outside [0, 1]
    lower_err = np.minimum(std_vals, mean_vals)  # cannot go below 0
    upper_cap = np.clip(1.0 - mean_vals, 0.0, None)
    upper_err = np.minimum(std_vals, upper_cap)
    yerr = np.vstack([lower_err, upper_err])

    ax.errorbar(
        x,
        mean_vals,
        yerr=yerr,
        fmt="none",
        ecolor="navy",
        capsize=3,
        label="±1 σ",
    )
    rng = np.random.default_rng(0)
    ax.scatter(x + 0.05 * rng.standard_normal(len(x)), max_vals, marker="x", s=25, color="crimson", label="Max")

    ax.set_xlabel("Sample id (ordered by " + order_by + ")")
    ax.set_ylabel("Score")
    ax.set_ylim(0, 1.05)
    base_title = "Mean ± Std and Max per Sample"
    if context:
        ax.set_title(f"{base_title} – {context}")
    else:
        ax.set_title(base_title)
    ax.grid(axis="y", linestyle="--", linewidth=.5, alpha=.4)
    ax.legend(frameon=False)
    ax.set_xticks(x)
    ax.set_xticklabels([str(k) for k in ordered], rotation=90, fontsize=6)

    # Summary annotation
    overall_mean = np.mean([v["mean"] for v in stats.values()])
    mean_max = np.mean([v["max"] for v in stats.values()])
    mean_variance = np.mean([v["var"] for v in stats.values()])
    summary = (
        f"overall μ = {overall_mean:.3f}\n"
        f"mean(max) = {mean_max:.3f}\n"
        f"mean variance = {mean_variance:.4f}"
    )
    if n_runs is not None:
        summary += f"\n#runs = {n_runs}"

    ax.text(0.995, 0.02, summary, ha="right", va="bottom",
            transform=ax.transAxes, fontsize=9,
            bbox=dict(facecolor="white", alpha=.7, edgecolor="none"))

    plt.tight_layout()
    if show:
        plt.show()
    return fig, ax 

# ---------------------------------------------------------------------------
# Plotly implementation
# ---------------------------------------------------------------------------

def plot_score_stats_plotly(
    stats: Dict[Any, Dict[str, float]],
    *,
    n_runs: int | None = None,
    order_by: str = "mean",
    explicit_order: List[Any] | None = None,
    show: bool = True,
    context: str | None = None,
    bar_color: str = COLORS["chatgpt"],
    max_marker_color: str = COLORS["research"],
    width: int | None = None,
    height: int | None = None,
    font_family: str | None = "Inter, sans-serif",
    dark_mode: bool = False,
):
    """Interactive Plotly version of :pyfunc:`plot_score_stats`.

    Produces an interactive bar chart of mean scores with asymmetric error bars
    and overlaid *x* markers indicating the maximum score observed for each
    sample. Colours are drawn from the provided OpenAI brand palette.

    Parameters
    ----------
    stats : Dict[Any, Dict[str, float]]
        Mapping from item key (e.g. sample id) to statistics as produced by
        :pyfunc:`compute_score_stats`.
    n_runs : int, optional
        Number of runs this plot summarises. If provided, it will appear in the
        annotation box beneath the chart.
    order_by : {"mean", "max"}, default "mean"
        Determines the ordering of bars along the *x*-axis.
    explicit_order : List[Any], optional
        Explicit ordering to use instead of sorting by *order_by*.
    show : bool, default True
        If *True* the figure is immediately displayed using Plotly's default
        renderer.
    context : str, optional
        Extra context string to append to the plot title.
    bar_color : str, default COLORS["openai"]
        Hex colour to use for the mean bars.
    max_marker_color : str, default COLORS["research"]
        Hex colour for the maximum score markers.

    Returns
    -------
    plotly.graph_objects.Figure
        The generated figure instance.
    """

    import numpy as np
    import pandas as pd

    # Extract raw arrays for convenience
    keys = list(stats.keys())
    means = np.array([stats[k]["mean"] for k in keys])
    maxs = np.array([stats[k]["max"] for k in keys])
    stds = np.array([stats[k]["std"] for k in keys])

    # Determine the ordering of bars
    if explicit_order is not None:
        ordered = explicit_order
    elif order_by == "max":
        ordered = [k for k, _ in sorted(stats.items(), key=lambda kv: kv[1]["max"])]
    else:  # default order by mean
        ordered = [k for k, _ in sorted(stats.items(), key=lambda kv: kv[1]["mean"])]

    idx = {k: i for i, k in enumerate(keys)}
    mean_vals = np.array([means[idx[k]] for k in ordered])
    max_vals = np.array([maxs[idx[k]] for k in ordered])
    std_vals = np.array([stds[idx[k]] for k in ordered])

    # Asymmetric error bars, clipped to [0, 1]
    lower_err = np.minimum(std_vals, mean_vals)
    upper_cap = np.clip(1.0 - mean_vals, 0.0, None)
    upper_err = np.minimum(std_vals, upper_cap)

    # Build DataFrame for Plotly Express
    df = pd.DataFrame(
        {
            "sample_id": [str(x) for x in ordered],
            "mean": mean_vals,
            "err_plus": upper_err,
            "err_minus": lower_err,
            "max": max_vals,
        }
    )

    # Main bar plot with asymmetric error bars
    fig = px.bar(
        df,
        x="sample_id",
        y="mean",
        error_y="err_plus",
        error_y_minus="err_minus",
        title="Mean ± Std and Max per Sample" + (f" – {context}" if context else ""),
        template="plotly_dark" if dark_mode else None,
    )

    # Style bar trace
    fig.update_traces(
        marker_color=bar_color,
        opacity=0.5,
        name="Mean",
        selector=dict(type="bar"),
    )

    # Make error bars thinner & darker for readability
    err_colour = "#BBBBBB" if dark_mode else "#666666"
    for tr in fig.data:
        if tr.type == "bar" and tr.error_y is not None:
            tr.error_y.thickness = 2
            tr.error_y.color = err_colour

    # Overlay markers for max values
    fig.add_scatter(
        x=df["sample_id"],
        y=df["max"],
        mode="markers",
        marker=dict(symbol="x-thin", size=8, color=max_marker_color, line=dict(width=1.5)),
        name="Max",
        showlegend=True,
    )

    # Ensure mean bar trace appears in legend (first trace)
    if fig.data and fig.data[0].type == "bar":
        fig.data[0].name = "Mean"
        fig.data[0].showlegend = True

    # Dummy scatter for ±1 σ legend entry (errorbars don't create their own)
    fig.add_scatter(
        x=[None],
        y=[None],
        mode="markers",
        marker=dict(symbol="line-ns-open", color=err_colour, size=12),
        name="±1 σ",
        showlegend=True,
    )

    # Summary annotation (mirrors Matplotlib version)
    overall_mean = np.mean([v["mean"] for v in stats.values()])
    mean_max = np.mean([v["max"] for v in stats.values()])
    mean_variance = np.mean([v["var"] for v in stats.values()])

    summary = (
        f"overall μ = {overall_mean:.3f}<br>"
        f"mean(max) = {mean_max:.3f}<br>"
        f"mean variance = {mean_variance:.4f}"
    )
    if n_runs is not None:
        summary += f"<br>#runs = {n_runs}"

    ann_font_colour = COLORS["white"] if dark_mode else COLORS["black"]
    ann_bg = "rgba(0,0,0,0.6)" if dark_mode else "rgba(255,255,255,0.8)"
    ann_border = "rgba(255,255,255,0.2)" if dark_mode else "rgba(0,0,0,0.15)"

    fig.add_annotation(
        text=summary,
        xref="paper",
        yref="paper",
        x=0.95,
        y=0.02,
        xanchor="right",
        yanchor="bottom",
        showarrow=False,
        align="right",
        font=dict(size=12, color=ann_font_colour, family=font_family),
        bgcolor=ann_bg,
        bordercolor=ann_border,
        borderwidth=1,
    )

    # Layout tweaks for brand consistency
    legend_bg = "rgba(0,0,0,0.5)" if dark_mode else "rgba(255,255,255,0.5)"
    font_colour = COLORS["white"] if dark_mode else COLORS["black"]

    fig.update_layout(
        xaxis_title="Sample id (ordered by " + order_by + ")",
        yaxis_title="Score",
        yaxis_range=[0, 1.05],
        bargap=0.25,
        plot_bgcolor=("#000000" if dark_mode else COLORS["white"]),
        paper_bgcolor=("#000000" if dark_mode else COLORS["white"]),
        font=dict(color=font_colour, family=font_family),
        legend=dict(borderwidth=0, x=0.01, xanchor="left", y=0.99, yanchor="top", bgcolor=legend_bg),
        margin=dict(l=60, r=60, t=80, b=120),
        width=width or 1200,
        height=height or 600,
    )

    # Horizontal grid lines for easier reading
    grid_color = "#333333" if dark_mode else "rgba(0,0,0,0.08)"
    fig.update_yaxes(showgrid=True, gridcolor=grid_color, gridwidth=0.5)
    # Optionally turn off vertical grid lines
    fig.update_xaxes(showgrid=False)

    # Improve x-tick readability
    fig.update_xaxes(tickangle=-90, tickfont=dict(size=9))

    if show:
        fig.show()
    return fig 