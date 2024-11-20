from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import time
import threading
import copy
from openai import OpenAI
import json
from functionDefinitions import TOOLS
from queue import Queue

app = Flask(__name__)
CORS(app)
client = OpenAI()

# Initialize the message queue
message_queue = Queue()

# Define the initial context for the application
context = {
    'inventory': {
        'X200': 50  # We currently have 50 units of Smart Home Hub X200 in stock
    },
    'orders': [
        {
            'order_id': 'ORD3001',
            'product_id': 'X200',
            'quantity': 200,
            'customer_id': 'CUST9001',
            'destination': 'Los Angeles',
            'weight': 1.5,  # Weight per unit in kg
            'dimensions': {'length': 20, 'width': 15, 'height': 10}  # Dimensions in cm
        }
    ],
    'available_suppliers': ['SUPP1001', 'SUPP1002'],
    'suppliers': {
        'SUPP1001': {
            'components': {
                'COMP_X200': {'available_quantity': 500}
            }
        },
        'SUPP1002': {
            'components': {
                'COMP_X300': {'available_quantity': 300}
            }
        }
    },
    'production_capacity': {
        'immediate': 100,      # Units we can produce immediately
        'next_week': 150       # Units we can produce next week
    },
    'shipping_options': {
        'Los Angeles': [
            {
                'carrier_id': 'CARRIER1',
                'service_level': 'Standard',
                'cost': 1000,
                'estimated_days': 5
            },
            {
                'carrier_id': 'CARRIER2',
                'service_level': 'Express',
                'cost': 1500,
                'estimated_days': 2
            }
        ]
    },
    'customers': {
        'CUST9001': {
            'name': 'ElectroWorld',
            'address': '123 Market Street, Los Angeles, CA'
        }
    },
    'products': {
        'X200': {
            'name': 'Smart Home Hub X200',
            'components_needed': {
                'COMP_X200': 1  # Each unit requires 1 component COMP_X200
            }
        }
    }
}

# Store the initial state of context
initial_context = copy.deepcopy(context)

# Prompt for o1 model
o1_prompt = """
You are a supply chain management assistant. The first input you will receive will be a complex task that needs to be carefully reasoned through to solve. 
Your task is to review the challenge, and create a detailed plan to process customer orders, manage inventory, and handle logistics.

You will have access to an LLM agent that is responsible for executing the plan that you create and will return results.

The LLM agent has access to the following functions:
    - get_inventory_status(product_id)
        - This gets the currently available product that we have
    - get_product_details(product_id)
        - This function gets the necessary components we need to manufacture additional product
    - update_inventory(product_id, quantity_change)
        - This function updates the currently available inventory of product.
        - This function should be called after we have allocated stock to an order.
    - fetch_new_orders()
        - The function checks the current status of new orders
    - allocate_stock(order_id, product_id, quantity)
        - This function allocates the stock of a product to an order.
    - check_available_suppliers()
        - This function checks the list of available suppliers we can leverage for additional components.
    - get_supplier_info(supplier_id)
        - This function returns the components the supplier can produce and the quantity of that component.
        - It is necessary to get the components required in order to place a purchase order with the supplier.
    - place_purchase_order(supplier_id, component_id, quantity)
        - This function places a purchase order with the supplier for additional components
        - In order to place the purchase order, we need to know the necessary components and the supplier id.
        - If the supplier specified does not have this component available, the function will fail.
    - check_production_capacity(time_frame)
        - Based on the amount of components we have, this function determines how much product we can produce on-site within a specific time-frame
        - If we do not have sufficient production capacity, a purchase order will need to be made to the supplier
    - schedule_production_run(product_id, quantity, time_frame)
        - This function convert the available production supply to product.
        - Any production scheduled will reduce the production capacity immediately available and available next week.
        - The time frame values can match the production capacity options: 'immediate' or 'next_week'
        - If a production run is scheduled with time frame 'immediate', it will automatically update our inventory with the new capacity. We should not call 'update_inventory' after.
    - calculate_shipping_options(destination, weight, dimensions)
        - This function determines the available shipping options and costs
        - Only currently available inventory can be shipped
        - Destination should match the destination name on the order
    - book_shipment(order_id, carrier_id, service_level)
        - This will book a shipment for a current order.
    - send_order_update(customer_id, order_id, message)
        - This will send an update to the customer and is necessary for any communications
        - It is important to keep customers in the loop about the status of the order

When creating a plan for the LLM to execute, break your instructions into a logical, step-by-step order, using the specified format:
    - **Main actions are numbered** (e.g., 1, 2, 3).
    - **Sub-actions are lettered** under their relevant main actions (e.g., 1a, 1b).
        - **Sub-actions should start on new lines**
    - **Specify conditions using clear 'if...then...else' statements** (e.g., 'If the product was purchased within 30 days, then...').
    - **For actions that require using one of the above functions defined**, write a step to call a function using backticks for the function name (e.g., `call the get_inventory_status function`).
        - Ensure that the proper input arguments are given to the model for instruction. There should not be any ambiguity in the inputs.
    - **The last step** in the instructions should always be calling the `instructions_complete` function. This is necessary so we know the LLM has completed all of the instructions you have given it.
    - **Detailed steps** The plan generated must be extremely detailed and thorough with explanations at every step.
Use markdown format when generating the plan with each step and sub-step.

Please find the scenario below.
"""

# System prompt for gpt-4o
gpt4o_system_prompt = """
You are a helpful assistant responsible for executing the policy on handling incoming orders. Your task is to follow the policy exactly as it is written and perform the necessary actions.

You must explain your decision-making process across various steps.

# Steps

1. **Read and Understand Policy**: Carefully read and fully understand the given policy on handling incoming orders.
2. **Identify the exact step in the policy**: Determine which step in the policy you are at, and execute the instructions according to the policy.
3. **Decision Making**: Briefly explain your actions and why you are performing them.
4. **Action Execution**: Perform the actions required by calling any relevant functions and input parameters.

POLICY:
{policy}

"""

# Function Definitions
def get_inventory_status(product_id):
    quantity = context['inventory'].get(product_id, 0)
    return {'product_id': product_id, 'quantity': quantity}

def get_product_details(product_id):
    product = context['products'].get(product_id, 0)
    return {"name": product['name'], "components_needed": product["components_needed"]}

def update_inventory(product_id, quantity_change):
    if product_id not in context['inventory']:
        return {'error': f"Product ID {product_id} not found in inventory."}
    
    new_quantity = context['inventory'][product_id] + int(quantity_change)
    
    if new_quantity < 0:
        return {'error': 'Resulting inventory cannot be negative.'}
    
    context['inventory'][product_id] = new_quantity
    return {'product_id': product_id, 'new_quantity': new_quantity}

def fetch_new_orders():
    return context['orders'][0]

def allocate_stock(order_id, product_id, quantity):
    available = context['inventory'].get(product_id, 0)
    if available >= quantity:
        return {'order_id': order_id, 'allocated_quantity': quantity}
    else:
        allocated_quantity = available
        context['inventory'][product_id] = 0
        return {
            'order_id': order_id,
            'allocated_quantity': allocated_quantity,
            'error': 'Insufficient stock'
        }

def check_available_suppliers():
    available_suppliers = context['available_suppliers']
    return {"available_suppliers": available_suppliers}

def get_supplier_info(supplier_id):
    supplier = context['suppliers'].get(supplier_id)
    if not supplier:
        return {'error': f"Supplier {supplier_id} not found."}
    
    components = supplier.get('components', {})
    return {'supplier_id': supplier_id, 'components': components}

def place_purchase_order(supplier_id, component_id, quantity):
    supplier = context['suppliers'].get(supplier_id)
    if not supplier:
        return {'error': f"Supplier {supplier_id} not found."}
    component = supplier['components'].get(component_id)
    if not component:
        return {'error': f"Component {component_id} not found with supplier {supplier_id}."}
    if component['available_quantity'] < quantity:
        return {'error': f"Insufficient component quantity available from supplier {supplier_id}."}
    component['available_quantity'] -= quantity
    po_number = f"PO_{supplier_id}_{component_id}"
    context['production_capacity']['next_week'] += quantity
    
    return {'po_number': po_number, 'status': 'Placed'}

def check_production_capacity(time_frame):
    capacity = context['production_capacity'].get(time_frame, 0)
    return {'time_frame': time_frame, 'available_capacity': capacity}

def schedule_production_run(product_id, quantity, time_frame):
    capacity = context['production_capacity'].get(time_frame, 0)
    if capacity >= quantity:
        context['production_capacity']['immediate'] = max(0, context['production_capacity']['immediate'] - quantity)
        context['production_capacity']['next_week'] = max(0, context['production_capacity']['next_week'] - quantity)
        context['inventory'][product_id] += quantity
        return {'production_id': 'PROD1001', 'status': 'Scheduled', 'time_frame': time_frame}
    else:
        return {'error': 'Insufficient production capacity, please order more from supplier.'}

def calculate_shipping_options(destination, weight, dimensions):
    options = context['shipping_options'].get(destination)
    if not options:
        return {'error': f"No shipping options available for destination {destination}."}
    return options

def book_shipment(order_id, carrier_id, service_level):
    tracking_number = f'TRACK_{order_id}'
    return {'tracking_number': tracking_number, 'status': 'Booked'}

def send_order_update(customer_id, order_id, message):
    return {'customer_id': customer_id, 'order_id': order_id, 'message_sent': True}

# Map function names to actual functions
function_mapping = {
    'get_inventory_status': get_inventory_status,
    'get_product_details': get_product_details,
    'update_inventory': update_inventory,
    'fetch_new_orders': fetch_new_orders,
    'allocate_stock': allocate_stock,
    'place_purchase_order': place_purchase_order,
    'check_available_suppliers': check_available_suppliers,
    'get_supplier_info': get_supplier_info,
    'check_production_capacity': check_production_capacity,
    'schedule_production_run': schedule_production_run,
    'calculate_shipping_options': calculate_shipping_options,
    'book_shipment': book_shipment,
    'send_order_update': send_order_update
}

def append_message(message):
    message_queue.put(message)

@app.route('/api/reset', methods=['POST'])
def reset_state():
    global context
    context = copy.deepcopy(initial_context)
    return jsonify({'status': 'State has been reset'})

@app.route('/api/process', methods=['POST'])
def process():
    data = request.json
    scenario = data.get('scenario')
    if not scenario:
        return jsonify({'error': 'No scenario provided'}), 400
    threading.Thread(target=process_scenario, args=(scenario,)).start()
    return jsonify({'status': 'Processing started'})

@app.route('/api/stream')
def stream():
    def event_stream():
        while True:
            message = message_queue.get()
            yield f"data: {json.dumps(message)}\n\n"
            time.sleep(0.01)
    headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'
    }
    return Response(event_stream(), headers=headers)

def process_scenario(scenario):
    append_message({'type': 'status', 'message': 'Generating plan...'})

    plan = call_o1(scenario)

    append_message({'type': 'plan', 'content': plan})

    append_message({'type': 'status', 'message': 'Executing plan...'})

    call_gpt4o(plan)

    append_message({'type': 'status', 'message': 'Processing complete.'})

def call_o1(scenario):
    prompt = f"""
{o1_prompt}
    
Scenario:
{scenario}

Please provide the next steps in your plan."""
    
    response = client.chat.completions.create(
        model='o1-mini',
        messages=[{'role': 'user', 'content': prompt}]
    )
    plan = response.choices[0].message.content
    
    return plan

def call_gpt4o(plan):
    gpt4o_policy_prompt = gpt4o_system_prompt.replace("{policy}", plan)
    messages = [
        {'role': 'system', 'content': gpt4o_policy_prompt},
    ]

    while True:
        response = client.chat.completions.create(
            model='gpt-4o',
            messages=messages,
            tools=TOOLS,
            parallel_tool_calls=False
        )

        assistant_message = response.choices[0].message.to_dict()
        messages.append(assistant_message)

        append_message({'type': 'assistant', 'content': assistant_message.get('content', '')})

        if (response.choices[0].message.tool_calls and
            response.choices[0].message.tool_calls[0].function.name == 'instructions_complete'):
            break

        if not response.choices[0].message.tool_calls:
            continue

        for tool in response.choices[0].message.tool_calls:
            tool_id = tool.id
            function_name = tool.function.name
            input_arguments_str = tool.function.arguments

            append_message({'type': 'tool_call', 'function_name': function_name, 'arguments': input_arguments_str})

            try:
                input_arguments = json.loads(input_arguments_str)
            except (ValueError, json.JSONDecodeError):
                continue

            if function_name in function_mapping:
                try:
                    function_response = function_mapping[function_name](**input_arguments)
                except Exception as e:
                    function_response = {'error': str(e)}
            else:
                function_response = {'error': f"Function '{function_name}' not implemented."}

            try:
                serialized_output = json.dumps(function_response)
            except (TypeError, ValueError):
                serialized_output = str(function_response)

            messages.append({
                "role": "tool",
                "tool_call_id": tool_id,
                "content": serialized_output
            })

            append_message({'type': 'tool_response', 'function_name': function_name, 'response': serialized_output})

    return messages

if __name__ == '__main__':
    app.run(debug=True)