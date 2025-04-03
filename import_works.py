import json
import sys
import os
import time
import django
from tqdm import tqdm

# Latin character code ranges for text sanitization
LATIN_RANGES = [
    (0x0000, 0x007F),  # Basic Latin
    (0x0080, 0x00FF),  # Latin-1 Supplement (includes ä, ö, etc.)
    (0x0100, 0x017F),  # Latin Extended-A
    (0x0180, 0x024F),  # Latin Extended-B
    (0x1E00, 0x1EFF),  # Latin Extended Additional
    (0x2C60, 0x2C7F),  # Latin Extended-C
    (0xA720, 0xA7FF),  # Latin Extended-D
    (0xAB30, 0xAB6F),  # Latin Extended-E
]

# Set up Django environment
PROJECT_ROOT = '/home/gard/2900/BookClub'
sys.path.append(PROJECT_ROOT)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from myapp.models import Books
from django.db import connections

def check_books_model_columns():
    """Get the actual database columns in the books table"""
    with connections['default'].cursor() as cursor:
        cursor.execute("PRAGMA table_info(myapp_books)")
        columns = [column[1] for column in cursor.fetchall()]
        print("Available columns in myapp_books table:", columns)
        return columns

def create_book_if_not_exists(key, title, description=None, subjects=None, 
                             author=None, cover=None, first_published=None,
                             available_columns=None):
    """Create a Books object with only the columns that exist in the database"""
    # Check if book already exists
    if Books.objects.filter(key=key).exists():
        return None
    
    # Sanitize text fields to ensure they only contain Latin characters
    title = sanitize_latin_text(title)
    description = sanitize_latin_text(description)
    subjects = sanitize_latin_text(subjects)
    author = sanitize_latin_text(author)
    
    # Skip if title is None after sanitization
    if not title:
        return None
    
    # Create a dictionary with all possible fields
    book_data = {
        'key': key,
        'title': title
    }
    
    # Only add fields if they exist in the database AND have data
    if 'description' in available_columns and description is not None:
        book_data['description'] = description
    
    if 'subjects' in available_columns and subjects is not None:
        book_data['subjects'] = subjects
    
    if 'author' in available_columns and author is not None:
        book_data['author'] = author
    
    if 'cover' in available_columns and cover is not None:
        book_data['cover'] = cover
    
    if 'first_published' in available_columns and first_published is not None:
        book_data['first_published'] = first_published
    
    # Create and return the Books object
    return Books(**book_data)

def is_latin_char(char):
    """Check if a character is part of the Latin alphabet"""
    code = ord(char)
    for start, end in LATIN_RANGES:
        if start <= code <= end:
            return True
    return False

def sanitize_latin_text(text):
    """Filter text to only include Latin characters, spaces, and basic punctuation"""
    if text is None:
        return None
        
    # Allow basic punctuation and whitespace regardless of Latin ranges
    allowed_chars = set(" .,;:!?'\"-_()[]{}/\\@#$%&*+=0123456789\n\t")
    
    result = ''.join(c for c in text if is_latin_char(c) or c in allowed_chars)
    return result.strip() or None  # Return None if result is empty after stripping

def parse_and_import_books(data_file_path, start_index=0, batch_size=1000):
    """
    Parse the data dump file and import books into the database
    """
    print(f"Starting import from line {start_index}...")
    
    # Get database columns to handle missing fields
    available_columns = check_books_model_columns()
    print(f"Will only use these fields from data: {available_columns}")
    
    count = 0
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
                
        for line_number, line in enumerate(tqdm(file, desc="Processing books"), start=start_index):
            try:
                # Only process work records
                if not line.startswith('/type/work'):
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
                
                # Extract fields
                key = json_data.get('key', '').replace('/works/', '')
                title = json_data.get('title', '')
                
                if title:
                    title = title[:255]  # Truncate to max length
                else:
                    # Skip entries without titles
                    continue
                
                # Extract description - handle both string and object formats
                description = None
                if 'description' in json_data:
                    if isinstance(json_data['description'], dict) and 'value' in json_data['description']:
                        description = json_data['description']['value']
                    elif isinstance(json_data['description'], str):
                        description = json_data['description']
                
                # Extract subjects
                subjects = None
                if 'subjects' in json_data and json_data['subjects']:
                    if isinstance(json_data['subjects'], list):
                        subjects = ", ".join(json_data['subjects'])
                    else:
                        subjects = str(json_data['subjects'])
                
                # Extract author
                author = ""  # Default empty string instead of None
                if 'authors' in json_data and json_data['authors']:
                    try:
                        author_info = json_data['authors'][0]
                        if 'author' in author_info and 'key' in author_info['author']:
                            author = author_info['author']['key'].replace('/authors/', '')
                    except (IndexError, TypeError):
                        # Handle case where authors list is empty or malformed
                        pass
                
                # Extract cover ID
                cover = None
                if 'covers' in json_data and json_data['covers']:
                    try:
                        cover = json_data['covers'][0]
                    except (IndexError, TypeError):
                        pass
                
                # Extract first published date
                first_published = None
                if 'first_publish_date' in json_data:
                    try:
                        year_str = json_data['first_publish_date'].split()[0]
                        if year_str.isdigit():
                            first_published = int(year_str)
                    except:
                        pass
                
                # Skip if we don't have the required fields
                if not key or not title:
                    continue
                
                try:
                    # Create book object using our helper function
                    book = create_book_if_not_exists(
                        key=key,
                        title=title,
                        description=description,
                        subjects=subjects,
                        author=author,
                        cover=cover,
                        first_published=first_published,
                        available_columns=available_columns
                    )
                    
                    # Only add to batch if not None (meaning it doesn't already exist)
                    if book:
                        batch.append(book)
                        total_imported += 1
                    
                    count += 1
                    
                    # Save in batches to improve performance
                    if len(batch) >= batch_size:
                        try:
                            Books.objects.bulk_create(batch)
                            print(f"Imported {len(batch)} books (total: {total_imported}, at line: {line_number})")
                        except Exception as e:
                            print(f"Error saving batch at line {line_number}: {str(e)}")
                            # Try saving one by one to identify problematic records
                            saved_count = 0
                            for b in batch:
                                try:
                                    b.save()
                                    saved_count += 1
                                except Exception as e2:
                                    print(f"Could not save book: {b.key} - {str(e2)}")
                            print(f"Saved {saved_count}/{len(batch)} books individually")
                        finally:
                            batch = []
                
                except Exception as e:
                    print(f"Error processing record at line {line_number}: {str(e)}")
                    errors += 1
                    continue
            
            except Exception as e:
                print(f"Error processing line {line_number}: {str(e)}")
                errors += 1
                continue
    
    # Save any remaining books
    if batch:
        try:
            Books.objects.bulk_create(batch)
            print(f"Imported final {len(batch)} books")
        except Exception as e:
            print(f"Error saving final batch: {str(e)}")
            # Try saving one by one
            saved_count = 0
            for b in batch:
                try:
                    b.save()
                    saved_count += 1
                except Exception:
                    pass
            print(f"Saved {saved_count}/{len(batch)} books individually")
    
    print(f"Import completed. Total lines processed: {total_processed}")
    print(f"Total books imported: {total_imported}")
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
        print("Usage: python import_works.py <data_file_path> [start_index] [batch_size] [--settings=myproject.settings]")
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
    parse_and_import_books(data_file_path, start_index, batch_size)
    end_time = time.time()
    
    print(f"Total execution time: {end_time - start_time:.2f} seconds")