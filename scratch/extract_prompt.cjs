const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scratch/autofill_assessment.json', 'utf8'));

for (const node of data) {
    if (node.name === 'Message a model' && node.type === '@n8n/n8n-nodes-langchain.openAi') {
        let content = node.parameters.responses.values[0].content;
        if (content.startsWith('=')) {
            content = content.slice(1);
        }
        fs.writeFileSync('scratch/prompt_autofill_assessment.txt', content, 'utf8');
        console.log("Successfully extracted prompt to scratch/prompt_autofill_assessment.txt");
        break;
    }
}
