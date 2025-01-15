import pandas as pd
import sqlite3
import json
from tqdm import tqdm

# Connect to SQLite database
conn = sqlite3.connect("open_library.db")
cursor = conn.cursor()

# Create the simplified works table
cursor.execute('''
CREATE TABLE IF NOT EXISTS works (
    key TEXT PRIMARY KEY,
    title TEXT,
    subtitle TEXT,
    description TEXT,
    subjects TEXT,
    authors TEXT,
    first_publish_date TEXT
);
''')

# File path and chunk size
data_dump = "/home/gard/uit/2900/ol_dump_works_2025-01-08.txt/ol_dump_works_2025-01-08.txt"  # Replace with your actual file path
chunk_size = 3  # Number of rows to process in each iteration
total_lines = 3  # Total lines to process (for testing)

# Set up progress bar
with tqdm(total=total_lines, unit='lines') as pbar:
    # Read the file in chunks
    for chunk in pd.read_csv(data_dump, sep="\t", header=None, dtype=str, chunksize=chunk_size):
        for _, row in chunk.iterrows():
            try:
                # Parse the JSON content
                record = json.loads(row[4])  # Assuming the 5th column (index 4) contains JSON

                # Extract relevant fields
                title = record.get('title', None)
                subtitle = record.get('subtitle', None)
                description = record.get('description', {}).get('value', None) if isinstance(record.get('description', {}), dict) else None
                subjects = ", ".join(record.get('subjects', []))
                authors = ", ".join([author.get('author', {}).get('key', '') for author in record.get('authors', [])])
                first_publish_date = record.get('first_publish_date', None)

                # Insert into the database
                cursor.execute('''
                INSERT OR IGNORE INTO works (key, title, subtitle, description, subjects, authors, first_publish_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (row[1], title, subtitle, description, subjects, authors, first_publish_date))

                # Commit after each row (optional for testing)
                conn.commit()

                # Print extracted data for verification (optional)
                # print(f"Processed: key={row[1]}, title={title}, authors={authors}")

            except json.JSONDecodeError:
                print(f"JSONDecodeError for row {row[1]}")  # Handle JSON decoding errors

            except sqlite3.Error as e:
                print(f"SQLite Error: {e}")  # Handle database errors

            # Update progress bar
            pbar.update(1)

# Verify the data in the table
cursor.execute("SELECT * FROM works LIMIT 10;")
rows = cursor.fetchall()
print("First 10 rows in 'works' table:", rows)

# Close the database connection
conn.close()
