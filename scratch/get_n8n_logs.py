with open("/root/n8n/n8nEventLog.log", "r") as f:
    for line in f:
        if "35527" in line:
            print(line.strip())
