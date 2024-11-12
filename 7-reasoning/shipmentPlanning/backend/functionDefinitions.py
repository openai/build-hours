TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_inventory_status",
            "description": "Retrieves the current inventory status for a given product. This only shows the currently available inventory for PRODUCTS and not components.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {
                        "type": "string",
                        "description": "The unique identifier for the product.",
                        "enum": ["X100", "X200", "X300"]
                    },
                },
                "required": ["product_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_inventory",
            "description": "Updates the inventory quantity for a specific product. This should be called after we have allocated stock to an order",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {
                        "type": "string",
                        "description": "The unique identifier for the product.",
                    },
                    "quantity_change": {
                        "type": "integer",
                        "description": "The amount to adjust the inventory by (positive or negative).",
                    },
                },
                "required": ["product_id", "quantity_change"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_new_orders",
            "description": "Fetches new customer orders that have not been processed yet. There are no input parameters for this function.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_available_suppliers",
            "description": "This functions checks the list of available suppliers we can leverage for additional components.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_product_details",
            "description": "Fetches the product details included the required components necessary for creating more of the product.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {
                        "type": "string",
                        "description": "The unique identifier of the product.",
                    }
                },
                "required": ["product_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_supplier_info",
            "description": "This function returns the components the supplier can produce and the quantity of that component. It is necessary to get the components required in order to place a purchase order with the supplier.",
            "parameters": {
                "type": "object",
                "properties": {
                    "supplier_id": {
                        "type": "string",
                        "description": "The unique identifier of the supplier.",
                    }
                },
                "required": ["supplier_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "allocate_stock",
            "description": "Allocates stock for a specific order and product.",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "string",
                        "description": "The unique identifier of the customer order.",
                    },
                    "product_id": {
                        "type": "string",
                        "description": "The unique identifier of the product.",
                    },
                    "quantity": {
                        "type": "integer",
                        "description": "The quantity of the product to allocate.",
                    },
                },
                "required": ["order_id", "product_id", "quantity"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "place_purchase_order",
            "description": "This function places a purchase order with the supplier for additional components. In order to place the purchase order, we need to know the necessary components and the supplier id. If the supplier specified does not have this component available, the function will fail.",
            "parameters": {
                "type": "object",
                "properties": {
                    "supplier_id": {
                        "type": "string",
                        "description": "The unique identifier of the supplier.",
                    },
                    "component_id": {
                        "type": "string",
                        "description": "The unique identifier of the component.",
                    },
                    "quantity": {
                        "type": "integer",
                        "description": "The quantity of the component to order.",
                    },
                },
                "required": ["supplier_id", "component_id", "quantity"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_production_capacity",
            "description": "Based on the amount of components we have, this function determines how much product we can produce on-site within a specific time-frame. If we do not have sufficient production capacity, a purchase order will need to be made to the supplier",
            "parameters": {
                "type": "object",
                "properties": {
                    "time_frame": {
                        "type": "string",
                        "description": "The time frame to check,",
                        "enum": ["immediate", "next_week"]
                    },
                },
                "required": ["time_frame"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "schedule_production_run",
            "description": "This function convert the available production supply to product. Any production scheduled will reduce the production capacity immediately available and available next week. If the quantity exceeds the immediately available production, it will fail. If a production run is scheduled with time frame 'immediate', it will automatically update our inventory with the new capacity.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {
                        "type": "string",
                        "description": "The unique identifier of the product.",
                    },
                    "quantity": {
                        "type": "integer",
                        "description": "The quantity of the product to produce.",
                    },
                    "time_frame": {
                        "type": "string",
                        "description": "The time frame for when the production run needs to be scheduled.",
                        "enum": ["immediate", "next_week"]
                    },
                },
                "required": ["product_id", "quantity", "time_frame"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_shipping_options",
            "description": "This function determines the available shipping options and costs. Only currently available inventory can be shipped",
            "parameters": {
                "type": "object",
                "properties": {
                    "destination": {
                        "type": "string",
                        "description": "The shipping destination address.",
                    },
                    "weight": {
                        "type": "number",
                        "description": "The weight of the package in kilograms.",
                    },
                    "dimensions": {
                        "type": "string",
                        "description": "The dimensions of the package (LxWxH) in centimeters.",
                    },
                },
                "required": ["destination", "weight", "dimensions"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "book_shipment",
            "description": "Books a shipment for an order using a specific carrier and service level.",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "string",
                        "description": "The unique identifier of the customer order.",
                    },
                    "carrier_id": {
                        "type": "string",
                        "description": "The unique identifier of the shipping carrier.",
                    },
                    "service_level": {
                        "type": "string",
                        "description": "The level of shipping service, e.g., 'Standard', 'Express'.",
                    },
                },
                "required": ["order_id", "carrier_id", "service_level"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "send_order_update",
            "description": "This will send an update to the customer and is necessary for any communications. It is important to keep customers in the loop about the status of the order",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {
                        "type": "string",
                        "description": "The unique identifier of the customer.",
                    },
                    "order_id": {
                        "type": "string",
                        "description": "The unique identifier of the order.",
                    },
                    "message": {
                        "type": "string",
                        "description": "The message content to send to the customer.",
                    },
                },
                "required": ["customer_id", "order_id", "message"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "instructions_complete",
            "description": "Function should be called when we have completed ALL of the instructions.",
        },
    }
]