import json
import sys
import os
import time
from tqdm import tqdm

# Set up Django environment
PROJECT_ROOT = '/home/gard/2900/BookClub'
sys.path.append(PROJECT_ROOT)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

import django
django.setup()

from myapp.models import Author
from django.db import connections

def check_author_model_columns():
    """Get the actual database columns in the author table"""
    with connections['default'].cursor() as cursor:
        cursor.execute("PRAGMA table_info(myapp_author)")
        columns = [column[1] for column in cursor.fetchall()]
        print("Available columns in myapp_author table:", columns)
        return columns

def parse_and_import_authors(data_file_path, start_index=0, batch_size=1000):
    """
    Parse the data dump file and import authors into the database
    """
    print(f"Starting author import from line {start_index}...")
    
    # Get database columns to handle missing fields
    available_columns = check_author_model_columns()
    print(f"Will use these fields from data: {available_columns}")
    
    batch = []
    total_processed = 0
    total_imported = 0
    errors = 0
    
    with open(data_file_path, 'r', encoding='utf-8') as file:
        # Skip lines if starting from a specific index
        if start_index > 0:
            print(f"Skipping to line {start_index}...")
            for _ in range(start_index):
                next(file, None)
                
        for line_number, line in enumerate(tqdm(file, desc="Processing authors"), start=start_index):
            try:
                # Only process author records
                if not line.startswith('/type/author'):
                    continue
                
                total_processed += 1
                parts = line.strip().split('\t')
                if len(parts) < 5:
                    continue
                
                # Parse the JSON data part
                try:
                    json_data = json.loads(parts[4])
                except json.JSONDecodeError:
                    print(f"Invalid JSON at line {line_number}")
                    errors += 1
                    continue
                
                # Extract key (remove '/authors/' prefix)
                key = json_data.get('key', '').replace('/authors/', '')
                
                # Extract name
                name = json_data.get('name', '')
                
                # Skip if we don't have the required fields
                if not key or not name:
                    continue
                
                # Check if author already exists
                if not Author.objects.filter(key=key).exists():
                    author = Author(key=key, name=name)
                    batch.append(author)
                    total_imported += 1
                
                # Save in batches to improve performance
                if len(batch) >= batch_size:
                    try:
                        Author.objects.bulk_create(batch)
                        print(f"Imported {len(batch)} authors (total: {total_imported}, at line: {line_number})")
                    except Exception as e:
                        print(f"Error saving batch at line {line_number}: {str(e)}")
                        # Try saving one by one to identify problematic records
                        saved_count = 0
                        for author in batch:
                            try:
                                author.save()
                                saved_count += 1
                            except Exception as e2:
                                print(f"Could not save author: {author.key} - {str(e2)}")
                        print(f"Saved {saved_count}/{len(batch)} authors individually")
                    finally:
                        batch = []
            
            except Exception as e:
                print(f"Error processing line {line_number}: {str(e)}")
                errors += 1
                continue
    
    # Save any remaining authors
    if batch:
        try:
            Author.objects.bulk_create(batch)
            print(f"Imported final {len(batch)} authors")
        except Exception as e:
            print(f"Error saving final batch: {str(e)}")
            # Try saving one by one
            saved_count = 0
            for author in batch:
                try:
                    author.save()
                    saved_count += 1
                except Exception:
                    pass
            print(f"Saved {saved_count}/{len(batch)} authors individually")
    
    print(f"Author import completed. Total lines processed: {total_processed}")
    print(f"Total authors imported: {total_imported}")
    print(f"Total errors encountered: {errors}")

if __name__ == "__main__":
    # Parse command line arguments
    args = sys.argv[1:]
    
    # Process arguments
    data_file_path = None
    start_index = 0
    batch_size = 1000
    
    i = 0
    while i < len(args):
        if args[i].startswith('--settings='):
            settings_module = args[i].split('=', 1)[1]
            os.environ['DJANGO_SETTINGS_MODULE'] = settings_module
            i += 1
        elif args[i].startswith('--'):
            # Skip other options
            i += 1
        elif data_file_path is None:
            data_file_path = args[i]
            i += 1
        elif start_index == 0:
            try:
                start_index = int(args[i])
            except ValueError:
                print(f"Invalid start index: {args[i]}")
                sys.exit(1)
            i += 1
        elif batch_size == 1000:
            try:
                batch_size = int(args[i])
            except ValueError:
                print(f"Invalid batch size: {args[i]}")
                sys.exit(1)
            i += 1
        else:
            i += 1
    
    if not data_file_path:
        print("Usage: python import_authors.py <data_file_path> [start_index] [batch_size] [--settings=myproject.settings]")
        sys.exit(1)
    
    # Check if the data file exists
    if not os.path.exists(data_file_path):
        print(f"Error: Data file '{data_file_path}' not found.")
        sys.exit(1)
    
    print(f"Django settings module: {os.environ.get('DJANGO_SETTINGS_MODULE')}")
    print(f"Data file: {data_file_path}")
    print(f"Start index: {start_index}")
    print(f"Batch size: {batch_size}")
    
    start_time = time.time()
    parse_and_import_authors(data_file_path, start_index, batch_size)
    end_time = time.time()
    
    print(f"Total execution time: {end_time - start_time:.2f} seconds")