import json
import difflib

def main():
    # Load original prompt from workflow JSON
    with open('scratch/autofill_assessment.json', 'r', encoding='utf-8') as f:
        wf = json.load(f)
        
    original_prompt = ""
    for node in wf:
        if node.get('name') == 'Message a model':
            original_prompt = node.get('parameters', {}).get('responses', {}).get('values', [])[0].get('content', '')
            
    # Load current prompt
    with open('scratch/prompt_autofill_assessment.txt', 'r', encoding='utf-8') as f:
        current_prompt = f.read()
        
    # Check if they are equal
    if original_prompt == current_prompt:
        print("Prompts are identical!")
        return
        
    print("Prompts differ! Printing line-by-line diff:")
    
    # We want to do line by line diff
    orig_lines = original_prompt.splitlines()
    curr_lines = current_prompt.splitlines()
    
    diff = difflib.unified_diff(orig_lines, curr_lines, fromfile='original', tofile='current', lineterm='')
    for line in diff:
        print(line)

if __name__ == '__main__':
    main()
