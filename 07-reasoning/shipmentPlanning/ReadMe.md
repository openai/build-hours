# Shipping Planner

## How to run
If you don't already, have your OpenAI API key set as an environment variable `OPENAI_API_KEY`

### Spin up the backend
- In your terminal, navigate to the backend directory
- Install the required Python packages by running `pip install -r requirements.txt`
- Run `python app.py`


### Spin up the frontend
- In a separate terminal, go to the frontend directory
- Ensure you have Node.js version 21 or higher installed.
- Run `npm i`
- Run `npm start`
- A window should automatically appear, but if not, navigate to your [http://localhost:3000](http://localhost:3000/)


## Prompt
We will be using the following scenario prompt for today's demo:

"We just received a major shipment of new orders. Please generate a plan that gets the list of awaiting orders and determines the best policy to fulfill them. 

The plan should include checking inventory, ordering necessary components from suppliers, scheduling production runs with available capacity, ordering new components required from suppliers, and arranging shipping to the retailer’s distribution center in Los Angeles. Notify the customer before completing.

Prioritize getting any possible orders out that you can while placing orders for any backlog items."