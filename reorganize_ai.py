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
        self.duplicates_found: Set[str] = set()
        self.renamed_files: Dict[str, str] = {}
        
        # Define the new structure mapping
        self.structure_map: Dict[str, List[str]] = {
            # Core Python modules and utilities
            'core': [
                'extract_features.py',
                'extract_features_from_samples.py', 
                'extract_small_sample.py',
                'combine_datasets.py',
                'create_unified_dataset.py',
                'create_unified_training_dataset.py',
                'generate_prompts.py',
                'generate_synthetic.py',
                'generate_edge_cases_batch.py',
                'pixelated_empathy_inference.py',
                'train_pixelated_empathy.py',
                'training_pipeline.py',
                'setup_training_infrastructure.py',
                'master_dataset_integration_plan.py',
            ],
            
            # Data processing and ML pipelines
            'pipelines': [
                'dataset_pipeline',
                'edge_case_pipeline_standalone', 
                'dual_persona_training',
                'youtube-transcription-pipeline',
                'pipelines',  # existing pipelines folder
            ],
            
            # Datasets and data files
            'datasets': [
                'datasets',
                'data',
                'empathetic_dialogues',
                'therapy-bot-data-10k',
                'generated',
                'generated_dialogues',
                'merged_mental_health_dataset.jsonl',
                'sentiment-analysis-for-mental-health-metadata - Copy.jsonl',
                'emotional-reactions-reddit.csv',
                'edge_case_prompts_batch.jsonl',
                'edge_case_prompts_for_generation.txt', 
                'edge_case_prompts_improved.jsonl.json',
                'environment_summary.json',
                'stevieray.json',
                'nltk_data',
                'trans',
            ],
            
            # ML models and training components
            'models': [
                'ClimbMix',
                'MERTools', 
                'Syn-R1',
                'pixel',
                'models',  # existing models folder
                'Kurtis-E1-MLX-Voice-Agent',
                'third_party',
            ],
            
            # Training and fine-tuning notebooks
            'notebooks': [
                'dareofficer.ipynb',
                'facial-emotions-image-detection-vit.ipynb',
                'facial-expression-eda-cnn.ipynb', 
                'Edge_Case_Pipeline.ipynb',
                'meta_snythetic.ipynb',
                'trade-embargo.ipynb',
                'finetuning.ipynb',
                # Note: notebooks/ folder will be flattened into this directory
            ],
            
            # Configuration and templates
            'configs': [
                'configs',
                'chain_templates.json',
                'template_examples.json',
                'requirements_enhanced.txt',
                'requirements_training.txt',
            ],
            
            # Scripts and automation
            'scripts': [
                'generate_dialogues.js',
                'generate_dialogues.sh', 
                'install-dataset-deps.sh',
                'synthetic_dashboard.py',
                'scripts',  # existing scripts folder
                'scripts2',
            ],
            
            # Documentation
            'docs': [
                'README.md',
                'README-dialogue-generation.md',
                'README.md.bak',
                'Business Plan _ Psych.pdf',
                'Forward Therapeutics.pdf', 
                'Primate2022_agreement.pdf',
                'MODMADatasetUserLicenseAgreement.docx',
                'PIXELATED_EMPATHY_EXECUTION_PLAN.md',
                'model_architecture_design.md',
                'Books',
                'docs',  # existing docs folder
                'docs2',
            ],
            
            # Reports and validation
            'reports': [
                'quality_reports',
                'validation_reports',
            ],
            
            # Legacy and deprecated
            'legacy': [
                'Wendy',
                'Wendy-master',
                'prompts',  # old prompts system
                'legacy',  # existing legacy folder
            ],
        }
        
        # Files to rename for consistency
        self.rename_map = {
            'Copy_of_Damnit_Janet (1).ipynb': 'emotion_analysis_experiment.ipynb',
            'notebooks2': 'fine_tuning_wandb.ipynb',  # It's actually a notebook file
            'sentiment-analysis-for-mental-health-metadata - Copy.jsonl': 'mental_health_sentiment_metadata.jsonl',
        }

    def create_structure(self):
        """Create the new directory structure"""
        logger.info(f"Creating new directory structure in {self.target_dir}")
        
        # Create main directories
        for category in self.structure_map.keys():
            category_dir = self.target_dir / category
            category_dir.mkdir(parents=True, exist_ok=True)
            logger.info("Created directory: {category_dir}")

    def move_items(self):
        """Move items according to the structure map"""
        logger.info("Starting reorganization...")

        for category, items in self.structure_map.items():
            category_dir = self.target_dir / category

            for item in items:
                source_path = self.source_dir / item

                # Handle renaming
                target_name = self.rename_map.get(item, item)
                target_path = category_dir / target_name

                if item != target_name:
                    self.renamed_files[item] = target_name
                    logger.info(f"Renaming: {item} -> {target_name}")

                if source_path.exists():
                    try:
                        if source_path.is_dir():
                            # Check for existing directory and merge if needed
                            if target_path.exists():
                                logger.warning(f"Merging duplicate directory: {source_path} into {target_path}")
                                self._merge_directories(source_path, target_path)
                            else:
                                shutil.copytree(source_path, target_path, dirs_exist_ok=True)
                                logger.info(f"Copied directory: {source_path} -> {target_path}")
                        elif target_path.exists():
                            logger.warning(f"Duplicate file found: {item} - checking if identical")
                            if self._are_files_identical(source_path, target_path):
                                logger.info(f"Identical file skipped: {item}")
                                self.duplicates_found.add(item)
                            else:
                                # Create versioned copy
                                versioned_path = self._create_versioned_path(target_path)
                                shutil.copy2(source_path, versioned_path)
                                logger.info(f"Copied with version: {source_path} -> {versioned_path}")
                        else:
                            shutil.copy2(source_path, target_path)
                            logger.info(f"Copied file: {source_path} -> {target_path}")

                        self.moved_items.add(item)

                    except Exception as e:
                        logger.error(f"Failed to move {source_path}: {e}")
                else:
                    logger.warning(f"Item not found: {source_path}")

    def _merge_directories(self, source_dir: Path, target_dir: Path):
        """Merge source directory into target directory"""
        for item in source_dir.rglob('*'):
            if item.is_file():
                relative_path = item.relative_to(source_dir)
                target_file = target_dir / relative_path
                
                # Create parent directories if needed
                target_file.parent.mkdir(parents=True, exist_ok=True)
                
                if target_file.exists():
                    if not self._are_files_identical(item, target_file):
                        versioned_path = self._create_versioned_path(target_file)
                        shutil.copy2(item, versioned_path)
                        logger.info(f"Merged with version: {item} -> {versioned_path}")
                else:
                    shutil.copy2(item, target_file)
                    logger.info(f"Merged file: {item} -> {target_file}")

    def _are_files_identical(self, file1: Path, file2: Path) -> bool:
        """Check if two files are identical"""
        try:
            import hashlib
            
            def get_file_hash(filepath):
                hash_md5 = hashlib.md5()
                with open(filepath, "rb") as f:
                    for chunk in iter(lambda: f.read(4096), b""):
                        hash_md5.update(chunk)
                return hash_md5.hexdigest()
            
            return get_file_hash(file1) == get_file_hash(file2)
        except Exception as e:
            logger.error(f"Error comparing files {file1} and {file2}: {e}")
            return False

    def _create_versioned_path(self, original_path: Path) -> Path:
        """Create a versioned filename for duplicates"""
        stem = original_path.stem
        suffix = original_path.suffix
        parent = original_path.parent
        
        counter = 1
        while True:
            versioned_name = f"{stem}_v{counter}{suffix}"
            versioned_path = parent / versioned_name
            if not versioned_path.exists():
                return versioned_path
            counter += 1

    def handle_remaining_items(self):
        """Handle any items not explicitly mapped"""
        logger.info("Checking for unmapped items...")
        
        for item in self.source_dir.iterdir():
            if item.name not in self.moved_items and item.name != '.git':
                target_path = self.target_dir / 'legacy' / item.name
                
                try:
                    if item.is_dir():
                        shutil.copytree(item, target_path, dirs_exist_ok=True)
                        logger.info("Moved unmapped directory to legacy: {item.name}")
                    else:
                        shutil.copy2(item, target_path)
                        logger.info("Moved unmapped file to legacy: {item.name}")
                        
                except Exception as e:
                    logger.error("Failed to move unmapped item {item}: {e}")

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

            content = """# {category.title()}

{description}

## Contents

"""
            for _ in sorted(items):
                content += "- `{item}`\n"

            content += """
## Last Updated

{Path(__file__).stat().st_mtime}

---
*This directory is part of the AI folder reorganization for better project structure and maintainability.*
"""

            with open(readme_path, 'w') as f:
                f.write(content)

            logger.info("Created README for {category}")

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
            logger.error("Source directory {self.source_dir} does not exist")
            return False

        try:
            return self.execute_reorganization_steps()
        except Exception as e:
            logger.error("Reorganization failed: {e}")
            return False

    def execute_reorganization_steps(self):
        self.create_structure()
        self.move_items()
        self.handle_remaining_items()
        self.create_index_files()
        self.create_main_readme()
        self.create_summary_report()

        logger.info("✅ AI folder reorganization completed successfully!")
        logger.info(f"New structure created in: {self.target_dir}")
        
        # Print summary
        if self.renamed_files:
            logger.info(f"📝 {len(self.renamed_files)} files renamed for consistency")
        if self.duplicates_found:
            logger.info(f"🔍 {len(self.duplicates_found)} duplicate files handled")
        
        logger.info("Review the new structure and then replace the old 'ai' folder if satisfied")

        return True

    def create_summary_report(self):
        """Create a summary report of the reorganization"""
        report_path = self.target_dir / 'REORGANIZATION_SUMMARY.md'
        
        report_content = f"""# AI Folder Reorganization Summary

## Overview
Reorganization completed on {Path(__file__).stat().st_mtime}

### Statistics
- **Total categories**: {len(self.structure_map)}
- **Items moved**: {len(self.moved_items)}
- **Files renamed**: {len(self.renamed_files)}
- **Duplicates found**: {len(self.duplicates_found)}

### Renamed Files
"""
        
        if self.renamed_files:
            for old_name, new_name in self.renamed_files.items():
                report_content += f"- `{old_name}` → `{new_name}`\n"
        else:
            report_content += "- No files were renamed\n"
        
        report_content += "\n### Duplicate Files Handled\n"
        
        if self.duplicates_found:
            for duplicate in self.duplicates_found:
                report_content += f"- `{duplicate}`\n"
        else:
            report_content += "- No duplicates found\n"
        
        report_content += """
### Directory Structure Created

```
ai/
├── core/           # Core Python modules and utilities
├── pipelines/      # Data processing and ML pipelines  
├── datasets/       # Training data and processed datasets
├── models/         # ML models and training components
├── notebooks/      # Training and experimentation notebooks
├── configs/        # Configuration and templates
├── scripts/        # Scripts and automation tools
├── docs/           # Documentation and research papers
├── reports/        # Quality reports and validation
└── legacy/         # Archived and deprecated components
```

### Next Steps
1. Review the reorganized structure
2. Test that all imports and references still work
3. Update any hardcoded paths in your code
4. Consider removing the original `ai` folder after verification
"""
        
        with open(report_path, 'w') as f:
            f.write(report_content)
        
        logger.info("Created reorganization summary report")


def main():
    """Main execution function"""
    reorganizer = AIFolderReorganizer()
    if success := reorganizer.run_reorganization():
        print_completion_message()
    else:
        print("❌ Reorganization failed. Check the logs above.")


def print_completion_message():
    print("🎉 AI Folder Reorganization completed successfully!")
    print("\n📊 Summary:")
    print("- Cleaned up file naming conventions")
    print("- Organized content into logical categories") 
    print("- Handled duplicates and conflicts")
    print("- Created comprehensive documentation")
    print("\n📁 New structure created in 'ai_new/'")
    print("\n🔍 Next steps:")
    print("1. Review the new structure in 'ai_new/'")
    print("2. Check the REORGANIZATION_SUMMARY.md report")
    print("3. Test that everything works correctly")
    print("4. Update any hardcoded paths in your code")
    print("5. Replace 'ai/' with 'ai_new/' when ready:")
    print("   mv ai ai_old && mv ai_new ai")
    print("\n💡 The old folder will be preserved as 'ai_old' for safety")


if __name__ == "__main__":
    main()
