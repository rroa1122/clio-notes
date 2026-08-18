import json

transcript_path = r"C:\Users\REINIER\.gemini\antigravity\brain\55313013-aeb9-40df-842b-659301b57b45\.system_generated\logs\transcript.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if not line.strip():
            continue
        try:
            data = json.loads(line)
            if data.get("type") == "PLANNER_RESPONSE":
                tcalls = data.get("tool_calls", [])
                for tc in tcalls:
                    if tc.get("name") in ["replace_file_content", "multi_replace_file_content"]:
                        args = tc.get("arguments", {})
                        if "Record.tsx" in str(args.get("TargetFile", "")) or "Record.tsx" in str(args.get("TargetContent", "")):
                            print(f"Line {line_num}: Tool {tc.get('name')}")
                            print("--------------------------------------------------")
                            print(json.dumps(args, indent=2))
                            print("==================================================\n")
        except Exception as e:
            pass
