import json

with open('scratch/autofill_assessment.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for node in data:
    if node.get('name') == 'Message a model' and node.get('type') == '@n8n/n8n-nodes-langchain.openAi':
        content = node['parameters']['responses']['values'][0]['content']
        if content.startswith('='):
            content = content[1:]
        with open('scratch/prompt_autofill_assessment.txt', 'w', encoding='utf-8') as pf:
            pf.write(content)
        print("Successfully extracted prompt to scratch/prompt_autofill_assessment.txt")
        break
