import json

with open("scratch/execution_35524.json") as f:
    data = json.load(f)

# The structure of n8n execution data:
# It's a dict containing nodeExecutionStates, which maps node name to execution details.
node_states = data.get("resultData", {}).get("runData", {})
for node_name, states in node_states.items():
    print(f"\nNode: {node_name}")
    for i, state in enumerate(states):
        error = state.get("error")
        if error:
            print(f"  Execution {i} failed: {error}")
        else:
            print(f"  Execution {i} succeeded")
