file_path = '/var/www/clinicflow-website/vip/push-server/server.js'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("backgroundColor: 'rgb(255, 30, 70)',", "backgroundColor: color || '#ff1e46',\n        hexBackgroundColor: color || '#ff1e46',")
text = text.replace("primaryFields: [],", """headerFields: [
          { key: 'stamps_hdr', label: 'PERLAS', value: f"{stampsNum} / {maxStamps}" }
        ],
        primaryFields: [
          { key: 'reward_primary', label: 'PREMIO', value: reward }
        ],""")
text = text.replace("{ key: 'reward', label: 'PREMIO', value: reward }", "{ key: 'progress', label: 'SELLOS', value: '●'*stampsNum + '○'*max(0, 8 - stampsNum) }")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
print("SUCCESSFULLY_UPDATED")
