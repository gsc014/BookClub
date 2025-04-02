#!/usr/bin/env python
import os
import re
import django
import sys
import unicodedata
import time
from tqdm import tqdm

# Set up Django
PROJECT_ROOT = '/home/gard/2900/BookClub'
sys.path.append(PROJECT_ROOT)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from myapp.models import Books
from django.db.models import Q, F, Value, CharField, Func
from django.db.models.functions import Length
from django.db import connection, transaction

# Define Latin unicode ranges
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

def is_latin_char(char_code):
    """Check if a character code is in the Latin ranges"""
    return any(start <= char_code <= end for start, end in LATIN_RANGES)

def is_mostly_non_latin(text, threshold=0.4):
    """Check if more than threshold (default 40%) of characters are non-Latin"""
    if not text:
        return False
        
    # Count non-Latin characters (excluding common punctuation and numbers)
    non_latin_count = 0
    text_count = 0
    
    for char in text:
        if not char.isspace() and not char.isdigit() and char not in ',.;:!?()[]{}"\'-_/\\':
            text_count += 1
            char_code = ord(char)
            
            if not is_latin_char(char_code):
                non_latin_count += 1
    
    # If more than threshold non-Latin, consider it non-Latin
    return text_count > 0 and (non_latin_count / text_count) > threshold

def delete_non_latin_books(dry_run=True, batch_size=10000, threshold=0.4, show_examples=5):
    """Delete books with titles in non-Latin scripts"""
    print(f"Starting deletion of books with >{threshold*100}% non-Latin characters in title...")
    
    start_time = time.time()
    total_books = Books.objects.count()
    print(f"Total books before deletion: {total_books:,}")
    
    offset = 0
    deleted_count = 0
    processed_count = 0
    
    with tqdm(total=total_books, desc="Processing books") as progress_bar:
        while True:
            # Get a batch of books
            books_batch = Books.objects.all().order_by('id')[offset:offset+batch_size]
            batch_list = list(books_batch)
            
            if not batch_list:
                break
                
            batch_size_actual = len(batch_list)
            processed_count += batch_size_actual
            
            # Find books with non-Latin titles in this batch
            non_latin_ids = []
            non_latin_examples = []
            
            for book in batch_list:
                if is_mostly_non_latin(book.title, threshold):
                    non_latin_ids.append(book.id)
                    if len(non_latin_examples) < show_examples:
                        non_latin_examples.append((book.id, book.title))
                    
            # Delete these books if not in dry run mode
            if non_latin_ids:
                if not dry_run:
                    with transaction.atomic():
                        Books.objects.filter(id__in=non_latin_ids).delete()
                    deleted_count += len(non_latin_ids)
                    print(f"\nDeleted {len(non_latin_ids):,} books with non-Latin titles")
                else:
                    deleted_count += len(non_latin_ids)
                    if non_latin_examples:
                        print("\nSample books that would be deleted:")
                        for book_id, title in non_latin_examples:
                            print(f"  ID={book_id}, Title='{title}'")
            
            offset += batch_size_actual
            progress_bar.update(batch_size_actual)
            
            # Print periodic stats
            if processed_count % (batch_size * 5) == 0:
                elapsed = time.time() - start_time
                rate = processed_count / elapsed if elapsed > 0 else 0
                print(f"\nProcessed {processed_count:,} books ({rate:.1f} books/sec), "
                      f"Found {deleted_count:,} non-Latin titles so far...")
    
    print(f"\nTotal books with non-Latin titles {'that would be' if dry_run else ''} deleted: {deleted_count:,}")
    print(f"Processing time: {time.time() - start_time:.1f} seconds")
    return deleted_count

def delete_empty_description_books(dry_run=True, show_examples=5):
    """Delete books without descriptions"""
    print("\nStarting deletion of books without descriptions...")
    start_time = time.time()
    
    # Create a query for books without descriptions
    query = Books.objects.filter(
        Q(description__isnull=True) | Q(description='')
    )
    
    # Count books meeting criteria
    empty_desc_count = query.count()
    print(f"Found {empty_desc_count:,} books without descriptions")
    
    if not dry_run:
        with transaction.atomic():
            deleted = query.delete()[0]
        print(f"Deleted {deleted:,} books without descriptions")
    else:
        # Show some examples
        examples = query.order_by('?')[:show_examples]  # Get random examples
        
        if examples:
            print("\nSample books that would be deleted:")
            for book in examples:
                print(f"  ID={book.id}, Title='{book.title}'")
                print(f"    Description: [No description]")
                print(f"    Subjects: {book.subjects or '[No subjects]'}")
                print()
    
    print(f"Processing time: {time.time() - start_time:.1f} seconds")
    return empty_desc_count

def delete_empty_subjects_books(dry_run=True, show_examples=5):
    """Delete books without subjects"""
    print("\nStarting deletion of books without subjects...")
    start_time = time.time()
    
    # Create a query for books without subjects
    query = Books.objects.filter(
        Q(subjects__isnull=True) | Q(subjects='')
    )
    
    # Count books meeting criteria
    empty_subj_count = query.count()
    print(f"Found {empty_subj_count:,} books without subjects")
    
    if not dry_run:
        with transaction.atomic():
            deleted = query.delete()[0]
        print(f"Deleted {deleted:,} books without subjects")
    else:
        # Show some examples
        examples = query.order_by('?')[:show_examples]  # Get random examples
        
        if examples:
            print("\nSample books that would be deleted:")
            for book in examples:
                desc = book.description or "[No description]"
                print(f"  ID={book.id}, Title='{book.title}'")
                print(f"    Description: {desc[:50]}{'...' if len(desc) > 50 else ''}")
                print(f"    Subjects: [No subjects]")
                print()
    
    print(f"Processing time: {time.time() - start_time:.1f} seconds")
    return empty_subj_count

def delete_short_books(dry_run=True, min_desc_length=100, show_examples=5):
    """Delete books with very short descriptions"""
    print(f"\nStarting deletion of books with descriptions shorter than {min_desc_length} characters...")
    start_time = time.time()
    
    # Create a query for books with short descriptions
    query = Books.objects.exclude(
        Q(description__isnull=True) | Q(description='')
    ).annotate(
        desc_len=Length('description')
    ).filter(desc_len__lt=min_desc_length)
    
    # Count books meeting criteria
    short_books_count = query.count()
    print(f"Found {short_books_count:,} books with descriptions shorter than {min_desc_length} characters")
    
    if not dry_run:
        with transaction.atomic():
            deleted = query.delete()[0]
        print(f"Deleted {deleted:,} books with short descriptions")
    else:
        # Show some examples
        examples = query.order_by('?')[:show_examples]  # Get random examples
        
        if examples:
            print("\nSample books that would be deleted:")
            for book in examples:
                desc = book.description or "[No description]"
                print(f"  ID={book.id}, Title='{book.title}'")
                print(f"    Description ({len(desc)} chars): {desc}")
                print()
    
    print(f"Processing time: {time.time() - start_time:.1f} seconds")
    return short_books_count

def optimize_database():
    """Optimize the database after deletions"""
    print("\nOptimizing database...")
    
    if connection.vendor == 'sqlite':
        cursor = connection.cursor()
        cursor.execute("PRAGMA vacuum;")
        cursor.execute("PRAGMA optimize;")
        cursor.execute("ANALYZE;")
        print("SQLite database optimized (VACUUM, OPTIMIZE, ANALYZE completed)")
    elif connection.vendor == 'postgresql':
        cursor = connection.cursor()
        cursor.execute("VACUUM ANALYZE myapp_books;")
        print("PostgreSQL database optimized (VACUUM ANALYZE completed)")
    elif connection.vendor == 'mysql':
        cursor = connection.cursor()
        cursor.execute("OPTIMIZE TABLE myapp_books;")
        print("MySQL database optimized (OPTIMIZE TABLE completed)")
    else:
        print(f"No optimization available for {connection.vendor}")

if __name__ == "__main__":
    # Parse command line arguments
    dry_run = "--execute" not in sys.argv
    only_non_latin = "--only-non-latin" in sys.argv
    only_empty_desc = "--only-empty-desc" in sys.argv
    only_empty_subj = "--only-empty-subj" in sys.argv
    only_short = "--only-short" in sys.argv
    optimize = "--optimize" in sys.argv
    
    # Get threshold if specified
    threshold = 0.4  # default
    for arg in sys.argv:
        if arg.startswith("--threshold="):
            try:
                threshold = float(arg.split("=")[1])
            except ValueError:
                print(f"Invalid threshold value: {arg}")
                sys.exit(1)
    
    # Get min description length if specified
    min_desc_length = 30  # default
    for arg in sys.argv:
        if arg.startswith("--min-desc="):
            try:
                min_desc_length = int(arg.split("=")[1])
            except ValueError:
                print(f"Invalid minimum description length: {arg}")
                sys.exit(1)
    
    # Get batch size if specified
    batch_size = 10000  # default
    for arg in sys.argv:
        if arg.startswith("--batch="):
            try:
                batch_size = int(arg.split("=")[1])
            except ValueError:
                print(f"Invalid batch size: {arg}")
                sys.exit(1)
    
    print("==== Book Database Cleanup Tool ====")
    print(f"Database engine: {connection.vendor}")
    print(f"Total books before cleanup: {Books.objects.count():,}")
    
    if dry_run:
        print("\nRunning in DRY RUN mode. No deletions will be performed.")
        print("Add --execute to perform actual deletions.")
    else:
        print("\n⚠️ CAUTION: Running in EXECUTION mode. Books will be PERMANENTLY DELETED! ⚠️")
        confirm = input("Are you sure you want to continue? (yes/no): ")
        if confirm.lower() != 'yes':
            print("Aborted.")
            sys.exit(0)
    
    # Track statistics
    start_time_total = time.time()
    non_latin_deleted = 0
    empty_desc_deleted = 0
    empty_subj_deleted = 0
    short_deleted = 0
    
    # Run the deletion functions based on flags
    run_all = not (only_non_latin or only_empty_desc or only_empty_subj or only_short)
    
    if run_all or only_non_latin:
        non_latin_deleted = delete_non_latin_books(dry_run, batch_size, threshold)
    
    if run_all or only_empty_desc:
        empty_desc_deleted = delete_empty_description_books(dry_run)
    
    if run_all or only_empty_subj:
        empty_subj_deleted = delete_empty_subjects_books(dry_run)
        
    if run_all or only_short:
        short_deleted = delete_short_books(dry_run, min_desc_length)
    
    # Print summary
    print("\n===== CLEANUP SUMMARY =====")
    print(f"Books with non-Latin titles: {'Would delete' if dry_run else 'Deleted'} {non_latin_deleted:,}")
    print(f"Books without descriptions: {'Would delete' if dry_run else 'Deleted'} {empty_desc_deleted:,}")
    print(f"Books without subjects: {'Would delete' if dry_run else 'Deleted'} {empty_subj_deleted:,}")
    print(f"Books with short descriptions: {'Would delete' if dry_run else 'Deleted'} {short_deleted:,}")
    total_deleted = non_latin_deleted + empty_desc_deleted + empty_subj_deleted + short_deleted
    print(f"Total: {'Would delete' if dry_run else 'Deleted'} {total_deleted:,} books")
    
    if not dry_run and (optimize or run_all):
        optimize_database()
        
    total_time = time.time() - start_time_total
    print(f"\nTotal execution time: {total_time:.1f} seconds")
    print(f"Books remaining: {Books.objects.count():,}")


# Usage examples:
# Run in dry-run mode to see what would be deleted
# python clean_books.py

# Delete books with non-Latin titles only
# python clean_books.py --execute --only-non-latin

# Delete books without descriptions
# python clean_books.py --execute --only-empty-desc

# Delete books without subjects
# python clean_books.py --execute --only-empty-subj

# Delete books with short descriptions (less than 200 chars)
# python clean_books.py --execute --only-short --min-desc=200

# Change the non-Latin threshold (higher = more aggressive)
# python clean_books.py --threshold=0.5

# Process in smaller batches (for memory-constrained systems)
# python clean_books.py --batch=5000

# Full cleanup with database optimization
# python clean_books.py --execute --optimize