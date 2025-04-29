from django.core.management.base import BaseCommand
from myapp.models import Books, RecommendedBooks
from django.db import connection

class Command(BaseCommand):
    help = 'Populate the RecommendedBooks table with 100 high-quality books'

    def handle(self, *args, **kwargs):
        # Clear existing recommended books
        RecommendedBooks.objects.all().delete()
        
        # Select 100 quality books that have descriptions and cover images
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, key, title, author, cover, first_published 
                FROM myapp_books
                WHERE 
                    description IS NOT NULL
                    AND description != ''
                    AND cover IS NOT NULL
                    AND title IS NOT NULL
                    AND title != ''
                    AND author IS NOT NULL
                ORDER BY RANDOM()
                LIMIT 400
            """)
            
            books_count = 0
            for row in cursor.fetchall():
                book_id, key, title, author, cover, first_published = row
                
                # Create the recommended book entry
                RecommendedBooks.objects.create(
                    book_id=book_id,
                    title=title,
                    author=author,
                    cover=cover,
                    first_published=first_published
                )
                books_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully added {books_count} books to RecommendedBooks table')
        )