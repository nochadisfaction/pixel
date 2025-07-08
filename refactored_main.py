#!/usr/bin/env python3
"""
Backup validation CLI tool with improved structure and error handling.

Environment Variables:
  BACKUP_VALIDATION_DIR     : Default directory containing backup files 
                             (default: /home/vivi/pixel/memory_backups)
  BACKUP_OUTPUT_DIR         : Primary override for cleaned backup output directory
  BACKUP_VALIDATION_OUTPUT_DIR : Secondary option for cleaned backup output directory
                             (default: {BACKUP_VALIDATION_DIR}/cleaned)

Examples:
  # Use default paths
  python refactored_main.py --backup-dir /path/to/backups
  
  # Use environment variables
  export BACKUP_VALIDATION_DIR=/custom/backup/path
  export BACKUP_OUTPUT_DIR=/custom/output/path
  python refactored_main.py
  
  # Override environment with command line
  BACKUP_VALIDATION_DIR=/env/path python refactored_main.py --backup-dir /override/path
"""

import argparse
import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional

# Assuming these imports exist in your codebase
from backup_validator import BackupContentValidator
from logger import logger


class BackupValidationCLI:
    """Command-line interface for backup validation operations."""
    
    def __init__(self):
        self.validator = BackupContentValidator()
    
    @staticmethod
    def get_default_backup_dir() -> Path:
        """Get default backup directory from environment or fallback to default."""
        default_path = os.getenv(
            'BACKUP_VALIDATION_DIR', 
            '/home/vivi/pixel/memory_backups'
        ).strip()
        return Path(default_path).expanduser().resolve()
    
    @staticmethod
    def get_default_output_dir() -> Path:
        """Get default output directory from environment or fallback to default."""
        # First try the specific output dir env var
        output_dir = os.getenv('BACKUP_OUTPUT_DIR')
        if output_dir:
            return Path(output_dir.strip()).expanduser().resolve()
        
        # Fallback to subdirectory of backup dir
        backup_dir = BackupValidationCLI.get_default_backup_dir()
        default_output = os.getenv(
            'BACKUP_VALIDATION_OUTPUT_DIR',
            str(backup_dir / 'cleaned')
        ).strip()
        return Path(default_output).expanduser().resolve()
    
    def create_parser(self) -> argparse.ArgumentParser:
        """Create and configure argument parser."""
        parser = argparse.ArgumentParser(
            description="Validate memory backup files",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  %(prog)s --backup-dir /path/to/backups
  %(prog)s --validate-file backup.json
  %(prog)s --clean-file backup.json --output-dir cleaned/
            """
        )
        
        parser.add_argument(
            '--backup-dir', 
            type=Path, 
            default=self.get_default_backup_dir(),
            help=f'Directory containing backup files (env: BACKUP_VALIDATION_DIR, default: {self.get_default_backup_dir()})'
        )
        parser.add_argument(
            '--validate-file', 
            type=Path, 
            help='Validate a specific backup file'
        )
        parser.add_argument(
            '--clean-file', 
            type=Path, 
            help='Create cleaned version of a backup file'
        )
        parser.add_argument(
            '--output-dir', 
            type=Path, 
            default=self.get_default_output_dir(),
            help=f'Directory for cleaned backup files (env: BACKUP_OUTPUT_DIR or BACKUP_VALIDATION_OUTPUT_DIR, default: {self.get_default_output_dir()})'
        )
        
        return parser
    
    def validate_single_file(self, file_path: Path) -> bool:
        """Validate a single backup file and display results."""
        try:
            logger.info(f"Validating file: {file_path}")
            is_valid, results = self.validator.validate_backup_file(file_path)
            
            self._display_validation_results(file_path, is_valid, results)
            return is_valid
            
        except Exception as e:
            logger.error(f"Failed to validate {file_path}: {e}")
            print(f"Error validating file: {e}")
            return False
    
    def clean_single_file(self, source_file: Path, output_dir: Path) -> bool:
        """Clean a single backup file and display results."""
        try:
            return self._process_file_cleaning(output_dir, source_file)
        except Exception as e:
            logger.error(f"Failed to clean {source_file}: {e}")
            print(f"Error cleaning file: {e}")
            return False

    def _process_file_cleaning(self, output_dir, source_file):
        output_dir.mkdir(parents=True, exist_ok=True)
        cleaned_file = output_dir / f"cleaned_{source_file.name}"

        logger.info(f"Cleaning file: {source_file}")
        results = self.validator.create_cleaned_backup(source_file, cleaned_file)

        self._display_cleaning_results(results)
        return True
    
    def scan_backup_directory(self, backup_dir: Path) -> bool:
        """Scan entire backup directory and display results."""
        try:
            logger.info(f"Scanning backup directory: {backup_dir}")
            results = self.validator.scan_backup_directory(backup_dir)
            
            self._display_directory_scan_results(results)
            return True
            
        except Exception as e:
            logger.error(f"Failed to scan directory {backup_dir}: {e}")
            print(f"Error scanning directory: {e}")
            return False
    
    def _display_validation_results(self, file_path: Path, is_valid: bool, results: Dict[str, Any]) -> None:
        """Display validation results for a single file."""
        print(f"\nValidation Results for {file_path}:")
        print(f"Valid: {is_valid}")
        print(f"Total memories: {results['total_memories']}")
        print(f"Valid memories: {results['valid_memories']}")
        print(f"Invalid memories: {results['invalid_memories']}")
        
        if results.get('errors'):
            print(f"Errors: {results['errors']}")
        
        if invalid_details := results.get('invalid_memory_details'):
            print("\nInvalid memory details:")
            for detail in invalid_details[:5]:  # Show first 5
                error_info = detail.get('errors', detail.get('error', 'Unknown error'))
                print(f"  Index {detail['index']}: {error_info}")
                print(f"    Preview: {detail['content_preview']}")
    
    def _display_cleaning_results(self, results: Dict[str, Any]) -> None:
        """Display cleaning results."""
        print(f"\nCleaning Results:")
        print(f"Source: {results['source_file']}")
        print(f"Target: {results['target_file']}")
        print(f"Original count: {results['original_count']}")
        print(f"Cleaned count: {results['cleaned_count']}")
        print(f"Removed count: {results['removed_count']}")
        
        if results.get('errors'):
            print(f"Errors: {results['errors']}")
    
    def _display_directory_scan_results(self, results: Dict[str, Any]) -> None:
        """Display directory scan results."""
        print(f"\nBackup Directory Scan Results:")
        print(f"Directory: {results['directory']}")
        print(f"Total files: {results['total_files']}")
        print(f"Valid files: {results['valid_files']}")
        print(f"Invalid files: {results['invalid_files']}")
        
        self._display_validation_statistics(results['summary']['validation_stats'])
        self._display_recommendations(results['summary'].get('recommendations', []))
        self._display_invalid_files_details(results['file_results'])
    
    def _display_validation_statistics(self, stats: Dict[str, Any]) -> None:
        """Display validation statistics."""
        print(f"\nValidation Statistics:")
        print(f"Total memories checked: {stats['total_checked']}")
        print(f"Valid memories: {stats['valid_memories']}")
        print(f"Invalid memories: {stats['invalid_memories']}")
    
    def _display_recommendations(self, recommendations: list) -> None:
        """Display recommendations if any."""
        if recommendations:
            print(f"\nRecommendations:")
            for rec in recommendations:
                print(f"  • {rec}")
    
    def _display_invalid_files_details(self, file_results: list) -> None:
        """Display details for invalid files."""
        if invalid_files := [f for f in file_results if not f['is_valid']]:
            print(f"\nInvalid Files Details:")
            for file_result in invalid_files[:3]:  # Show first 3
                print(f"  {file_result['file_path']}:")
                print(f"    Total: {file_result['total_memories']}, "
                      f"Valid: {file_result['valid_memories']}, "
                      f"Invalid: {file_result['invalid_memories']}")

                if file_result.get('errors'):
                    print(f"    Errors: {file_result['errors']}")
    
    def run(self, args: Optional[list] = None) -> int:
        """Run the CLI application."""
        parser = self.create_parser()
        parsed_args = parser.parse_args(args)
        
        try:
            if parsed_args.validate_file:
                success = self.validate_single_file(parsed_args.validate_file)
            elif parsed_args.clean_file:
                success = self.clean_single_file(parsed_args.clean_file, parsed_args.output_dir)
            else:
                success = self.scan_backup_directory(parsed_args.backup_dir)
            
            return 0 if success else 1
            
        except KeyboardInterrupt:
            print("\nOperation cancelled by user.")
            return 130
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            print(f"Unexpected error: {e}")
            return 1


def main():
    """Main entry point for the backup validation CLI."""
    cli = BackupValidationCLI()
    sys.exit(cli.run())


if __name__ == "__main__":
    main()