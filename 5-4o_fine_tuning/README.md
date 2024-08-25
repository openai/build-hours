# Static analysis gpt-4o fine-tuning


Demo code used in the gpt-4o fine-tuning webinar on Aug 26, 2024.

- Training dataset: https://huggingface.co/datasets/patched-codes/synth-vuln-fixes
- Evals: https://huggingface.co/datasets/patched-codes/static-analysis-eval

## Setup

- Set your OpenAI API key ([docs](https://platform.openai.com/docs/quickstart)).

```bash
export OPENAI_API_KEY="sk_XXX..."
```


## Running Evals

To run evaluations, use the `eval.py` script with the following arguments:

- `--model`: Specifies the OpenAI model name, either base or fine-tuned. Default is `gpt-4o-mini`.
- `--n_shot`: Sets the number of examples for few-shot learning. Default is 0, indicating zero-shot.
- `--use_similarity`: Enables similarity-based retrieval of dataset examples if set to `True`.

Example command to run an evaluation with the `gpt-4o` 5-shot:

```bash
python eval.py --model gpt-4o --n_shot 5
```

