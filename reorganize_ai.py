#!/usr/bin/env python3
"""
AI Folder Reorganization Script
Efficiently reorganizes the AI folder into a clean, structured format
"""

import os
import shutil
import logging
from pathlib import Path
from typing import Dict, List, Set

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AIFolderReorganizer:
    def __init__(self, source_dir: str = "ai", target_dir: str = "ai_new"):
        self.source_dir = Path(source_dir)
        self.target_dir = Path(target_dir)
        self.moved_items: Set[str] = set()
        
        # Define the new structure mapping
        self.structure_map: Dict[str, List[str]] = {
            # Core Python modules and packages
            'core': [
                '__init__.py',
                'extract_features.py',
                'extract_features_from_samples.py',
                'extract_small_sample.py',
                'combine_datasets.py',
                'generate_prompts.py',
                'generate_synthetic.py',
            ],
            
            # Data processing and ML pipelines
            'pipelines': [
                'dataset_pipeline',  # Move entire folder
                'edge_case_pipeline_standalone',
                'dual_persona_training',
                'youtube-transcription-pipeline',
            ],
            
            # Datasets and data-related files
            'datasets': [
                'datasets',  # Move entire folder
                'data',
                'empathetic_dialogues',
                'therapy-bot-data-10k',
                'generated',
                'generated_dialogues',
                'merged_mental_health_dataset.jsonl',
                'sentiment-analysis-for-mental-health-metadata - Copy.jsonl',
                'nltk_data',
            ],
            
            # ML models, training scripts, and model artifacts
            'models': [
                'ClimbMix',
                'MERTools',
                'ConvLab-3',
                'Syn-R1',
                'pixel',
                'finetuning.ipynb',  # Training notebook
            ],
            
            # Jupyter notebooks for experimentation
            'notebooks': [
                'dareofficer.ipynb',
                'facial-emotions-image-detection-vit.ipynb',
                'facial-expression-eda-cnn.ipynb',
                'Edge_Case_Pipeline.ipynb',
                'meta_snythetic.ipynb',
                'trade-embargo.ipynb',
            ],
            
            # Configuration files
            'configs': [
                'configs',  # Move entire folder
                'chain_templates.json',
                'template_examples.json',
            ],
            
            # Utility scripts and tools
            'scripts': [
                'generate_dialogues.js',
                'generate_dialogues.sh',
                'install-dataset-deps.sh',
                'synthetic_dashboard.py',
                'check_ollama.py',
            ],
            
            # Documentation and research papers
            'docs': [
                'README.md',
                'README-dialogue-generation.md',
                'Business Plan _ Psych.pdf',
                'Forward Therapeutics.pdf',
                'Primate2022_agreement.pdf',
                'Books',
            ],
            
            # Legacy/outdated code
            'legacy': [
                'Wendy',
                'Wendy-master',
                '1.PsychologyTest',
                '6-2-leftovers',
                'prompts',  # Old prompts folder
                'quality_reports',  # Old reports
            ],
        }

    def create_structure(self):
        """Create the new directory structure"""
        logger.info(f"Creating new directory structure in {self.target_dir}")
        
        # Create main directories
        for category in self.structure_map.keys():
            category_dir = self.target_dir / category
            category_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created directory: {category_dir}")

    def move_items(self):
        """Move items according to the structure map"""
        logger.info("Starting reorganization...")
        
        for category, items in self.structure_map.items():
            category_dir = self.target_dir / category
            
            for item in items:
                source_path = self.source_dir / item
                target_path = category_dir / item
                
                if source_path.exists():
                    try:
                        if source_path.is_dir():
                            shutil.copytree(source_path, target_path, dirs_exist_ok=True)
                            logger.info(f"Copied directory: {source_path} -> {target_path}")
                        else:
                            shutil.copy2(source_path, target_path)
                            logger.info(f"Copied file: {source_path} -> {target_path}")
                        
                        self.moved_items.add(item)
                        
                    except Exception as e:
                        logger.error(f"Failed to move {source_path}: {e}")
                else:
                    logger.warning(f"Item not found: {source_path}")

    def handle_remaining_items(self):
        """Handle any items not explicitly mapped"""
        logger.info("Checking for unmapped items...")
        
        for item in self.source_dir.iterdir():
            if item.name not in self.moved_items and item.name != '.git':
                target_path = self.target_dir / 'legacy' / item.name
                
                try:
                    if item.is_dir():
                        shutil.copytree(item, target_path, dirs_exist_ok=True)
                        logger.info(f"Moved unmapped directory to legacy: {item.name}")
                    else:
                        shutil.copy2(item, target_path)
                        logger.info(f"Moved unmapped file to legacy: {item.name}")
                        
                except Exception as e:
                    logger.error(f"Failed to move unmapped item {item}: {e}")

    def create_index_files(self):
        """Create README files for each category"""
        logger.info("Creating index files...")
        
        category_descriptions = {
            'core': 'Core Python modules and shared utilities',
            'pipelines': 'Data processing and machine learning pipelines',
            'datasets': 'Training data, processed datasets, and data loaders',
            'models': 'ML models, training scripts, and model artifacts',
            'notebooks': 'Jupyter notebooks for experimentation and analysis',
            'configs': 'Configuration files and templates',
            'scripts': 'Utility scripts and automation tools',
            'docs': 'Documentation, research papers, and guides',
            'legacy': 'Archived code and deprecated components',
        }
        
        for category, description in category_descriptions.items():
            readme_path = self.target_dir / category / 'README.md'
            
            # List items in the category
            category_dir = self.target_dir / category
            items = []
            if category_dir.exists():
                items = [item.name for item in category_dir.iterdir() 
                        if item.name != 'README.md']
            
            content = f"""# {category.title()}

{description}

## Contents

"""
            for item in sorted(items):
                content += f"- `{item}`\n"
            
            content += f"""
## Last Updated

{Path(__file__).stat().st_mtime}

---
*This directory is part of the AI folder reorganization for better project structure and maintainability.*
"""
            
            with open(readme_path, 'w') as f:
                f.write(content)
            
            logger.info(f"Created README for {category}")

    def create_main_readme(self):
        """Create main README for the reorganized AI folder"""
        readme_content = """# AI Module - Reorganized Structure

This directory contains all AI-related code, data, and documentation organized into logical categories.

## Directory Structure

```
ai/
├── core/           # Core Python modules and shared utilities
├── pipelines/      # Data processing and ML pipelines
├── datasets/       # Training data and processed datasets
├── models/         # ML models and training scripts
├── notebooks/      # Jupyter notebooks for experimentation
├── configs/        # Configuration files and templates
├── scripts/        # Utility scripts and automation tools
├── docs/           # Documentation and research papers
└── legacy/         # Archived and deprecated components
```

## Quick Start

1. **Data Processing**: Start with `pipelines/dataset_pipeline/`
2. **Model Training**: Check `models/` for training scripts
3. **Experimentation**: Use notebooks in `notebooks/`
4. **Configuration**: Modify settings in `configs/`

## Development Guidelines

- Keep core utilities in `core/`
- Add new datasets to `datasets/`
- Document experiments in `notebooks/`
- Archive unused code in `legacy/`

## Dependencies

Install dependencies for specific components:
```bash
# For dataset processing
pip install -r pipelines/dataset_pipeline/requirements.txt

# For model training
pip install torch transformers datasets
```

---
*Reorganized for better maintainability and development workflow.*
"""
        
        readme_path = self.target_dir / 'README.md'
        with open(readme_path, 'w') as f:
            f.write(readme_content)
        
        logger.info("Created main README")

    def run_reorganization(self):
        """Execute the complete reorganization"""
        logger.info("Starting AI folder reorganization...")

        # Ensure source directory exists
        if not self.source_dir.exists():
            logger.error(f"Source directory {self.source_dir} does not exist")
            return False

        try:
            return self._extracted_from_run_reorganization_11()
        except Exception as e:
            logger.error(f"Reorganization failed: {e}")
            return False

    # TODO Rename this here and in `run_reorganization`
    def _extracted_from_run_reorganization_11(self):
        self.create_structure()
        self.move_items()
        self.handle_remaining_items()
        self.create_index_files()
        self.create_main_readme()

        logger.info("✅ AI folder reorganization completed successfully!")
        logger.info(f"New structure created in: {self.target_dir}")
        logger.info("Review the new structure and then replace the old 'ai' folder if satisfied")

        return True


def main():
    """Main execution function"""
    reorganizer = AIFolderReorganizer()
    if success := reorganizer.run_reorganization():
        _extracted_from_main_7()
    else:
        print("\n❌ Reorganization failed. Check the logs above.")


# TODO Rename this here and in `main`
def _extracted_from_main_7():
    print("\n🎉 Reorganization completed!")
    print("\nNext steps:")
    print("1. Review the new structure in 'ai_new/'")
    print("2. Test that everything works correctly")
    print("3. Replace 'ai/' with 'ai_new/' when ready:")
    print("   mv ai ai_old && mv ai_new ai")


if __name__ == "__main__":
    main()
