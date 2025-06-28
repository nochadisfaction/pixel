# Enhanced Synthetic Dialogue Generator

This tool generates realistic therapy conversations with advanced features including scenario categorization, templating, and multi-step generation.

## Features

- **🔍 Scenario Categories**: Each prompt has a scenario type (e.g., "suicidality", "trauma") for better organization
- **🧩 Templating**: Apply different prompting templates to the same scenarios
- **⛓️ Multi-step Generation**: Generate additional content like supervisor feedback or session notes
- **🌐 Multiple Generation Methods**: Support for local models, GPU acceleration, and commercial APIs
- **🛡️ Robust Error Handling**: Retries, timeouts, and comprehensive logging
- **📊 Output Analysis**: Generate parsed dialogue pairs for training data
- **📱 Notifications**: Optional Slack alerts for long-running generations
- **🎭 Automated Scenario Creation**: Generate new therapy scenarios with categorization
- **🖥️ Modern Interface**: User-friendly menu system with clear descriptions

## Interactive Usage

The easiest way to use this tool is through the interactive shell script:

```bash
bash ai/generate_dialogues.sh
```

This will launch a modern, user-friendly interface with the following options:

1. **⭐ Simple Conversation Creator** - Quick and easy therapy conversations
2. **🔮 Template-Based Conversation Creator** - Better quality with customizable templates
3. **🔄 Advanced Multi-Step Creator** - Conversations with additional materials
4. **🌐 External API Creator** - Use services like OpenAI or Together.ai
5. **⚡ GPU-Accelerated Creator** - Much faster generation with GPU
6. **🎭 Scenario Creator** - Create new therapy scenarios
7. **🔄 All-in-One Pipeline** - Complete process from scenarios to conversations
8. **ℹ️ Help** - Learn more about these tools

## Files

- `enhanced_generator.py` - Main dialogue generation script
- `generate_prompts.py` - Scenario prompt generation script
- `generate_dialogues.sh` - Interactive shell script with modern interface
- `edge_case_prompts_with_categories.jsonl` - Example prompts with scenario categories
- `template_examples.json` - Example prompt templates
- `chain_templates.json` - Example chaining templates for multi-step generation

## Requirements

Install dependencies:

```bash
pip install requests tqdm dotenv python-dotenv
# Optional dependencies for additional features
pip install slack_sdk  # For Slack notifications
pip install vllm       # For faster generation (requires GPU)
```

## Command Line Usage

### Generate Scenario Prompts

```bash
python ai/generate_prompts.py --num 10 --output ai/generated/prompts.jsonl
```

Options:
- `--num` - Number of prompts to generate (default: 10)
- `--scenario-types` - Specific scenario types to use (e.g., "trauma suicidality boundaries")
- `--list-types` - List all available scenario types
- `--output` - Output file path (default: auto-named with timestamp)

### Basic Usage for Dialogue Generation

```bash
python ai/generate_synthetic.py --input ai/edge_case_prompts_with_categories.jsonl
```

### Using Templates

```bash
python ai/generate_synthetic.py --input ai/edge_case_prompts_with_categories.jsonl --templates ai/template_examples.json
```

### Using Multi-step Generation

```bash
python ai/generate_synthetic.py --input ai/edge_case_prompts_with_categories.jsonl --templates ai/template_examples.json --chain --chain_templates ai/chain_templates.json
```

### Using External API

```bash
python ai/generate_synthetic.py --input ai/edge_case_prompts_with_categories.jsonl --api_key YOUR_API_KEY --api_url https://api.example.com/generate
```

### Using vLLM (Requires GPU)

```bash
python ai/generate_synthetic.py --input ai/edge_case_prompts_with_categories.jsonl --use_vllm --model meta-llama/Llama-3-8B
```

## Command Line Arguments

### For generate_prompts.py

| Argument | Description |
|----------|-------------|
| `--num` | Number of prompts to generate (default: 10) |
| `--scenario-types` | Specific scenario types to use (space-separated list) |
| `--list-types` | List all available scenario types |
| `--output` | Output file path (default: auto-named with timestamp) |

### For enhanced_generator.py

| Argument | Description |
|----------|-------------|
| `--input` | Input JSONL file with prompts (default: `ai/edge_case_prompts.jsonl`) |
| `--model` | Ollama model name or path to local model (default: from OLLAMA_MODEL env var or "artifish/llama3.2-uncensored") |
| `--output` | Output file name (default: auto-named) |
| `--raw_output` | Raw model output file (default: auto-named) |
| `--max_retries` | Max retries for API calls (default: 3) |
| `--timeout` | Timeout for API calls in seconds (default: 120) |
| `--log` | Log file name (default: auto-named) |
| `--templates` | Prompt templates JSON file (optional) |
| `--chain` | Enable prompt chaining for multi-step generation |
| `--chain_type` | Type of chaining prompt (default: 'supervisor_critique') |
| `--chain_templates` | Chaining templates JSON file (optional) |
| `--slack_webhook` | Slack webhook URL for alerts (optional) |
| `--use_vllm` | Use vLLM for generation (faster but requires GPU) |
| `--api_key` | API key for external LLM service |
| `--api_url` | API URL for external LLM service |

## Input Format

The input JSONL file should have entries with:
- `prompt_id`: A unique identifier for the prompt (e.g., "01")
- `scenario_type`: The category of the scenario (e.g., "suicidality", "trauma")
- `prompt` or `instructions`: The actual scenario prompt

Example:
```json
{"prompt_id": "01", "scenario_type": "suicidality", "prompt": "Simulate a therapy session..."}
```

## Available Scenario Types

The system includes 20 different scenario types for therapy conversations:

- **🚨 suicidality**: Suicide risk assessment and intervention
- **💔 trauma**: Trauma processing and therapeutic approaches
- **🛡️ boundaries**: Professional boundary setting in therapeutic relationships
- **🆘 abuse**: Responding to disclosures of abuse and violence
- **💊 medication**: Medication management and concerns
- **🍷 addiction**: Substance use disorders and recovery
- **😢 grief**: Grief counseling and bereavement
- **⚖️ ethics**: Ethical dilemmas in therapy
- **🌍 cultural**: Cultural competence and differences
- **🚫 resistance**: Working with resistant clients
- **😰 anxiety**: Anxiety disorders and management
- **😔 depression**: Depressive disorders and approaches
- **👥 relationships**: Relationship issues and conflicts
- **👪 family**: Family therapy scenarios
- **🆘 crisis**: Crisis intervention and stabilization
- **🔪 self_harm**: Self-injury assessment and intervention
- **🧠 cognitive**: Cognitive distortions and restructuring
- **🏃 behavioral**: Behavioral therapy techniques
- **🪞 identity**: Identity exploration in therapy
- **👋 termination**: Therapy relationship closure

## Template Format

Templates are defined in a JSON file as an array of objects with:
- `id`: Template identifier
- `template`: Template text with `{scenario}` placeholder

Example:
```json
[
  {
    "id": "standard",
    "template": "{scenario}"
  },
  {
    "id": "therapy_session",
    "template": "Simulate a therapy session based on the following scenario...\n\n{scenario}"
  }
]
```

## Chain Template Format

Chain templates are defined similarly but use `{dialogue}` as the placeholder:

```json
[
  {
    "id": "supervisor_critique",
    "template": "As a clinical supervisor, critique...\n\n{dialogue}"
  }
]
```

## Output

The script generates three types of files:
1. **💬 Parsed dialogue pairs** - Extracted Q&A pairs for training
2. **📊 Raw model outputs** - Complete model responses
3. **📑 Chained outputs** - Secondary generation results (if enabled)
4. **📝 Log file** - Detailed logging information

## Complete Pipeline Example

To run the entire pipeline from prompt generation to dialogue creation:

```bash
# 1. Generate prompts
python ai/generate_prompts.py --num 10 --output ai/generated/prompts.jsonl

# 2. Use those prompts to generate dialogues
python ai/generate_synthetic.py --input ai/generated/prompts.jsonl --templates ai/template_examples.json

# 3. Alternatively, use the shell script for an interactive experience (recommended)
bash ai/generate_dialogues.sh
# Then select option 7 for the complete pipeline
```

## Analysis

The generated data can be analyzed using tools like:
- pandas for data analysis
- streamlit for visualization
- huggingface datasets for further processing

## License

This project is licensed under the MIT License - see the LICENSE file for details. 