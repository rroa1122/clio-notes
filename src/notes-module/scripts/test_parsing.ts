
import { parseClinicalNote } from '../lib/parseClinicalNote';

const runTests = () => {
    console.log("=== CLINICAL NOTE PARSER TEST SUITE ===\n");

    const tests = [
        {
            name: "1. Clean Object",
            input: {
                structured_note: {
                    patient: { name: "John Doe", age: "30" },
                    chief_complaint: "Headache"
                }
            },
            expectedOk: true
        },
        {
            name: "2. JSON String (Double Encoded)",
            input: JSON.stringify({
                structured_note: {
                    patient: { name: "Jane Smith" },
                    chief_complaint: "Fever"
                }
            }),
            expectedOk: true
        },
        {
            name: "3. Markdown Embedded JSON (Real-world N8N/AI output)",
            input: "Here is the clinical note output:\n```json\n{\n  \"structured_note\": {\n    \"meta\": {\n      \"note_type\": \"Psychiatry Progress Note\",\n      \"encounter_mode\": \"Telehealth\"\n    },\n    \"patient\": {\n      \"name\": \"Maria Garcia\",\n      \"dob\": \"05/15/1985\",\n      \"age\": \"38\"\n    },\n    \"chief_complaint\": \"Anxiety and insomnia\",\n    \"history_of_present_illness\": \"Patient reports increased anxiety...\",\n    \"current_medications\": [\n      { \"name\": \"Sertraline\", \"dose\": \"50mg\", \"frequency\": \"daily\" }\n    ],\n    \"assessments\": [\n        { \"diagnosis\": \"Generalized Anxiety Disorder\", \"icd10\": \"F41.1\" }\n    ],\n    \"treatment\": {\n        \"plan_recommendations_instructions\": \"Continue current meds.\"\n    }\n  }\n}\n```\nNote generated successfully.",
            expectedOk: true
        },
        {
            name: "4. Messy/Partial Payload",
            input: {
                // Missing structured_note wrapper, direct fields
                patient: { name: "Direct Patient" },
                cc: "Direct CC",
                random_field: "ignore me"
            },
            expectedOk: true
        },
        {
            name: "5. Invalid Input (Null)",
            input: null,
            expectedOk: false
        },
        {
            name: "6. Broken JSON String",
            input: "{ broken_json: true",
            expectedOk: false
        },
        {
            name: "7. Real Flat N8N Payload (Fuzzy Keys)",
            input: {
                "INITIAL PSYCHIATRY EVALUATION": "Not reported",
                "CHIEF COMPLAINT- CC:": "Not reported",
                "SUBJECTIVE/ HISTORY OF PRESENT ILLNESS-HPI:": "TELEHEALTH:\nThe patient was evaluated by Telehealth.",
                "CURRENT PSYCHIATRIC TREATMENT:": "Not reported",
                "ASSESSMENT-DSM 5:": "Anxiety Disorder"
            },
            expectedOk: true
        }
    ];

    let passed = 0;
    let failed = 0;

    tests.forEach(test => {
        try {
            const result = parseClinicalNote(test.input);
            const success = result.ok === test.expectedOk;

            console.log(`Test: ${test.name}`);
            console.log(`Input Type: ${test.input === null ? 'null' : typeof test.input}`);
            console.log(`Status: ${result.ok ? 'OK' : 'ERROR'} ${result.error ? `(${result.error.code})` : ''}`);

            if (success) {
                console.log("✅ PASS");
                passed++;
                if (result.ok && result.data) {
                    // Check a field to ensure mapping worked
                    // const pt = result.data.patient;
                    // const name = pt ? pt.full_name : 'N/A';
                    // const cc = result.data.chief_complaint;
                }
            } else {
                console.log("❌ FAIL");
                console.log("   Result:", JSON.stringify(result, null, 2));
                failed++;
            }
            console.log("----------------------------------------");

        } catch (e) {
            console.log(`Test: ${test.name} - CRASHED 🚨`);
            console.error(e);
            failed++;
        }
    });

    console.log(`\nSUMMARY: ${passed} Passed, ${failed} Failed`);
    process.exit(failed > 0 ? 1 : 0);
};

runTests();
