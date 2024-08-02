from typing import Dict, Any


def get_assert(output: str, context) -> Dict[str, Any]:
    try:
        ans = output.split("\n")[-1]
        if str(context["vars"]["target"]).lower() in ans.lower():
            return {"pass": True, "score": 1.0, "reason": "passed"}

        return {
            "pass": False,
            "score": 0.0,
            "reason": "Not correct. Ans={}".format(ans),
        }
    except Exception as e:
        return {
            "pass": False,
            "score": 0.0,
            "reason": str(e),
        }
