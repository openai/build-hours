import inspect


def color(text, color):
    color_codes = {
        "red": "\033[91m",
        "green": "\033[92m",
        "yellow": "\033[93m",
        "blue": "\033[94m",
        "magenta": "\033[95m",
        "cyan": "\033[96m",
        "white": "\033[97m",
        "reset": "\033[0m",
        "grey": "\033[90m",
    }
    return f"{color_codes.get(color, color_codes['reset'])}{text}{color_codes['reset']}"


def function_to_schema(func) -> dict:
    type_map = {
        str: "string",
        int: "integer",
        float: "number",
        bool: "boolean",
        list: "array",
        dict: "object",
        type(None): "null",
    }

    try:
        signature = inspect.signature(func)
    except ValueError as e:
        raise ValueError(
            f"Failed to get signature for function {func.__name__}: {str(e)}"
        )

    parameters = {}
    for param in signature.parameters.values():
        try:
            param_type = type_map.get(param.annotation, "string")
        except KeyError as e:
            raise KeyError(
                f"Unknown type annotation {param.annotation} for parameter {param.name}: {str(e)}"
            )
        parameters[param.name] = {"type": param_type}

    required = [
        param.name
        for param in signature.parameters.values()
        if param.default == inspect._empty
    ]

    return {
        "type": "function",
        "function": {
            "name": func.__name__,
            "description": func.__doc__ or "",
            "parameters": {
                "type": "object",
                "properties": parameters,
                "required": required,
            },
        },
    }


# ===== Examle =====


def sample_function(param_1, param_2, the_third_one: int):
    """
    This is my docstring. Call this function when you want.
    """
    print("Hello, world")


# Input:
function_to_schema(sample_function)
# Output:
{
    "type": "function",
    "function": {
        "name": "sample_function",
        "description": "This is my docstring. Call this function when you want.",
        "parameters": {
            "type": "object",
            "properties": {
                "param_1": {"type": "string"},
                "param_2": {"type": "string"},
                "the_third_one": {"type": "integer"},
            },
            "required": ["param_1", "param_2", "the_third_one"],
        },
    },
}
