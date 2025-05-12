import collections
collections.Callable = collections.abc.Callable
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from myapp.models import  Review, UserInfo, UserBookList, Books, NewTable, Author
from rest_framework.authtoken.models import Token
from django.test import TestCase
from django.urls import reverse
from django.db import transaction
from unittest.mock import patch, MagicMock


class UserTests(APITestCase):
    '''
    8 Tests related to signing up, logging in and logging out,
    including right and wrong inputs
    '''
    
    signup = reverse('signup_user')
    login = reverse('login_user')
    logout = reverse('logout_user')
    delete = reverse('delete_account')
    
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_signup_and_login_successfull(self):
        response = self.client.post(self.signup,{
            'username':'newtestuser',
            'password1':'password123',
            'password2':'password123',        
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        response = self.client.post(self.login,{
            'username':'testuser',
            'password':'password123'
        })
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        
        response = self.client.delete(self.delete)
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        

    def test_logout_successfull(self):
        response = self.client.post(self.logout)
        self.assertEqual(response.status_code,status.HTTP_200_OK)

    def test_signup_missing_fields(self):
        """Signup should fail if required fields are missing"""
        response = self.client.post(self.signup, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_signup_password_mismatch(self):
        """Signup should fail if passwords don't match"""
        response = self.client.post(self.signup, {
            'username': 'newuser',
            'password1': 'password123',
            'password2': 'wrongpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_signup_duplicate_username(self):
        """Signup should fail if the username already exists"""
        response = self.client.post(self.signup, {
            'username': 'testuser',
            'password1': 'password123',
            'password2': 'password123'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_wrong_password(self):
        """Login should fail with incorrect password"""
        response = self.client.post(self.login, {
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_non_existent_user(self):
        """Login should fail for a non-existent user"""
        response = self.client.post(self.login, {
            'username': 'nonexistent',
            'password': 'password123'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_no_token(self):
        """Logout should fail if no authentication token is provided"""
        self.client.credentials()  
        response = self.client.post(self.logout)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class BookTests(APITestCase):
    '''
    see if the search function works
    '''

    def setUp(self):
        self.book = Books.objects.create(
            key="test_key",
            title="Test Book",
            description="A test description",
            subjects="Test Subject",
            author="Test Author",
            first_published=2000
        )
        self.book1 = Books.objects.filter(id=1).first() 
        
    def test_search_books_title(self):
        '''Test to see if the book is in the API response.
        this doesnt work as intended, it only searches and checks if it managed to search, not if there were any books in results'''
        response = self.client.get('/api/search/', {
            "q": self.book.title
            })
        self.assertEqual(response.status_code, status.HTTP_200_OK) 
        
    # def test_search_books_out_of_range_page(self):
    #     """
    #     Test that search_books falls back to the last available page
    #     if requested page number is too high.
    #     """
    #     for i in range(15):
    #         Books.objects.create(
    #             title=f"Test Book {i}",
    #             author="Author",
    #             cover=123,
    #             key=f"key{i}"
    #         )

    #     url = reverse('search_books')
    #     response = self.client.get(url, {'q': 'Test Book', 'page': 999, 'per_page': 5})
        
    #     self.assertEqual(response.status_code, 200)

    #     data = response.json()
        
    #     self.assertEqual(data['pagination']['total_pages'], 3)
    #     self.assertEqual(data['pagination']['current_page'], 3)
    #     self.assertLessEqual(len(data['results']), 5)

        
    def test_search_books_invalid_page_and_per_page(self):
        '''Ensure non-integer pagination params are handled gracefully'''
        response = self.client.get('/api/search/', {
            "q": self.book.title,
            "page": "invalid",
            "per_page": "invalid"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertIn("pagination", data)
        self.assertEqual(data["pagination"]["current_page"], 1)
        self.assertEqual(data["pagination"]["per_page"], 10)

            
    def test_search_filter_returns_400_when_missing_param(self):
        response = self.client.get(reverse('search_filter'))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], "Filter parameter is required")

    def test_search_filter_returns_400_when_param_is_empty(self):
        response = self.client.get(reverse('search_filter') + '?filter=')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], "Filter parameter is required")
        
    def test_search_books_empty(self):
        '''test to see if the no query gives bad response, should give 400'''
        response = self.client.get('/api/search/')
        self.assertEqual(response.status_code,status.HTTP_400_BAD_REQUEST)
    
    def test_retrieve_book_info(self):
        '''
        retrieve_book_info used here
        ''' 
        url = reverse('retrieve_book_info', kwargs={'book_id':self.book1.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        
    def test_retrieve_book_info_error(self):
        '''
        hoping for 404 because book does not exist
        ''' 
        url = reverse('retrieve_book_info', kwargs={'book_id':999999999})
        response = self.client.get(url)
        self.assertEqual(response.status_code,status.HTTP_404_NOT_FOUND)
        
    def test_random_book_valid_num(self):
        '''
        Test random_book with valid num=1
        '''
        url = reverse('random_book')
        response = self.client.get(url, {'num': 1})
        
        self.assertIn(response.status_code, [status.HTTP_200_OK])
        self.assertTrue(isinstance(response.data, dict) or isinstance(response.data, list))

        if isinstance(response.data, list):
            self.assertLessEqual(len(response.data), 1)

    def test_random_book_invalid_num(self):
        '''
        Test random_book with invalid num (empty string)
        '''
        url = reverse('random_book')
        response = self.client.get(url, {'num': ''})
        
        self.assertIn(response.status_code, [status.HTTP_200_OK])
        self.assertTrue(isinstance(response.data, dict) or isinstance(response.data, list))

        if isinstance(response.data, list):
            self.assertLessEqual(len(response.data), 1)

    def test_random_book_multiple(self):
        '''
        Test random_book with num > 1
        '''
        url = reverse('random_book')
        response = self.client.get(url, {'num': 3})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(isinstance(response.data, list))
        self.assertLessEqual(len(response.data), 3)
        
    def test_random_book_no_results(self):
        '''
        Test random_book returns empty list when no books match criteria
        '''
        Books.objects.all().delete()  # Ensure no books exist

        url = reverse('random_book')
        response = self.client.get(url, {'num': 1})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_random_book_single_valid(self):
        '''
        Test random_book returns a single book dict when num=1 and match found
        '''
        Books.objects.create(
            key='OL1M',
            title='Test Book',
            description='A book',
            subjects='Fiction',
            author='Author',
            cover=123,
            first_published=2000
        )

        url = reverse('random_book')
        response = self.client.get(url, {'num': 1})

        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, dict)
        self.assertEqual(response.data['title'], 'Test Book')

        
        
    def test_filter(self):
        '''
        testing search filter
        '''
        url = reverse('search_filter')
        
        response = self.client.get(url,{
            'filter':'documentary'
        })
        
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        
    def test_filter_valueerror(self):
        '''
        testing search filter whilst hitting the valueerror exception
        '''
        url = reverse('search_filter')
        
        response = self.client.get(url,{
            'filter':'documentary',
            'page':'abc',
            'per_page':'xyz'
        })
        
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        
    
    def test_filter_out_of_range_page(self):
        '''
        needed to reach the out of range page statement.
        '''
        for i in range(3):
            Books.objects.create(
                key=f'OL{i}M',
                title=f'Fantasy Book {i}',
                author='Author X',
                subjects='Fantasy',
                cover=None,
                first_published=2000 + i
            )

        url = reverse('search_filter')
        response = self.client.get(url, {
            'filter': 'Fantasy',
            'page': '9999',
            'per_page': '1'
        })

        self.assertEqual(response.status_code, 200)

        data = response.json()

        self.assertEqual(data['pagination']['total_pages'], 3)
        self.assertEqual(data['pagination']['current_page'], 3)
        self.assertEqual(len(data['results']), 1)


        
    def test_autocomplete(self):
        '''
        autocomplete test:
            one test looking that an empty query returns an empty result
            
            second test looking for not empty list of query results
        '''
        url1 = reverse('autocomplete')
        
        response = self.client.get(url1,{
            'query': ''
        })
        
        self.assertListEqual(response.data,[])
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        
        
        url2 = reverse('autocomplete')
        
        response = self.client.get(url2,{
            'query': 'mathe'
        })
        
        self.assertIsNotNone(response.data)
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        
    @patch('myapp.views.NewTable.objects')
    def test_get_isbn_mock(self, mock_objects):
        mock_instance = MagicMock()
        mock_instance.isbn_10 = '1234567890'
        mock_objects.filter.return_value.first.return_value = mock_instance

        url = reverse('isbn', kwargs={'work_key': 'OL123W'})
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, '1234567890')

        
        
class ReviewTests(APITestCase):
    '''
    Tests making reviews on book already present in the database,
    a lot easier than making temporary book 
    '''

    def setUp(self):
        self.user = User.objects.create_user(username='reviewer', password='password123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.book = Books.objects.create(
            id = 111,
            title = "testing book"
        )
    
    def test_add_and_get_review(self):
        '''
        uses the add_review and get_reviews functions in views.py
        '''
        
        #start add review
        add_url = reverse('add_review', kwargs={'book_id1': self.book.id})
        response = self.client.post(add_url, {
            'text': 'Great book!', 'rating': 5
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        #start get review
        getreview_url = reverse('get_reviews', kwargs={'bid':self.book.id})
        response = self.client.get(getreview_url)
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)
        review_texts = [review['text'] for review in response.data]
        self.assertIn('Great book!', review_texts)
        
    @patch('myapp.models.Review.objects.filter')
    def test_get_reviews_raises_exception_returns_500(self, mock_filter):
        mock_filter.side_effect = Exception("DB exploded")

        response = self.client.get(reverse('get_reviews', args=[1]))

        self.assertEqual(response.status_code, 500)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'DB exploded')

        
    def test_add_review_fake_book(self):
        '''
        Add a review to fake book
        '''
        
        add_url = reverse('add_review', kwargs={'book_id1': 2904429})
        response = self.client.post(add_url, {
            'text': 'Great book!', 'rating': 5
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_review_from_book_with_no_reviews(self):
        #start get review
        getreview_url = reverse('get_reviews', kwargs={'bid':2904408})
        response = self.client.get(getreview_url)
        self.assertEqual(response.status_code,status.HTTP_204_NO_CONTENT)

    def test_add_review_internal_server_error(self):
        """
        Test to trigger 500 Internal Server Error by omitting required fields.
        """
        add_url = reverse('add_review', kwargs={'book_id1': self.book.id})
        
        response = self.client.post(add_url, {
            'text': 'Missing rating!'  
        })

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn('error', response.data)
        
    def test_get_books_by_author_no_key(self):
        url = reverse("books_by_author")
        
        response = self.client.get(url,{
            'key':''
        })
        self.assertEqual(response.status_code,status.HTTP_400_BAD_REQUEST)
        
    def test_get_books_by_author(self):
        url = reverse('books_by_author')
        
        response = self.client.get(url,{
            'key': 12345678
        })
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        
    def test_get_books_by_author_with_excludeid(self):
        url = reverse('books_by_author')
        
        response = self.client.get(url,{
            'key': 12345678,
            'exclude_id': 12345678
        })
        self.assertEqual(response.status_code,status.HTTP_200_OK)
    
    def test_highest_rated_books(self):
        # Create author
        author = Author.objects.create(key='author_key', name='John Doe')

        # Create books with cover and same author
        book1 = Books.objects.create(id=201, title='Book One', author=author.key, cover=101, key='b1')
        book2 = Books.objects.create(id=202, title='Book Two', author=author.key, cover=102, key='b2')
        book3 = Books.objects.create(id=203, title='Book Three', author=author.key, cover=103, key='b3')

        # Add 3+ reviews for each book
        for book, rating in [(book1, 5), (book2, 4), (book3, 3)]:
            for _ in range(3):
                Review.objects.create(book_id=book.id, user_id=self.user.id, rating=rating, text=f"{book.title} is good.")

        # Call the view
        url = reverse('highest-rated')
        response = self.client.get(url, {'num': 3})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

        # Check that the first book has the highest rating
        top_book = response.data[0]
        self.assertEqual(top_book['id'], book1.id)
        self.assertEqual(top_book['avg_rating'], 5.0)

    def test_highest_rated_books_missing_author(self):
        book = Books.objects.create(id=201, key="b201", title="Unknown Author Book", author="nonexistent_author_key", cover=123)
        for _ in range(3):
            Review.objects.create(book_id=book.id, user_id=self.user.id, rating=4, text="Solid book")
        
        url = reverse('highest-rated')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]['author'], "nonexistent_author_key")  

    def test_highest_rated_books_exception_handling(self):
        url = reverse('highest-rated')  # Make sure this is the correct route name

        # Patch just the cursor() method on the connection inside the view
        with patch('myapp.views.connection') as mock_connection:
            mock_cursor = MagicMock()
            mock_cursor.execute.side_effect = Exception("Simulated DB failure")
            mock_connection.cursor.return_value.__enter__.return_value = mock_cursor

            response = self.client.get(url, {'num': 5})

        assert response.status_code == 500
        assert response.data == {"error": "Failed to retrieve highest rated books"}


    def test_most_liked_books_success(self):
        # Set up a mock liked list
        user_list = UserBookList.objects.create(name="Liked Books", book_ids=[1, 2, 1, 3])
        
        # Create books and author
        author = Author.objects.create(key="auth1", name="Author Name")
        Books.objects.create(id=1, key="b1", title="Book 1", author="auth1")
        Books.objects.create(id=2, key="b2", title="Book 2", author="auth1")
        Books.objects.create(id=3, key="b3", title="Book 3", author="auth1")

        url = reverse('most-liked')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 3)
        self.assertEqual(response.data[0]['likes_count'], 2)

    def test_most_liked_books_limit(self):
        UserBookList.objects.create(name="Liked Books", book_ids=list(range(1, 30)))
        author = Author.objects.create(key="auth", name="A")

        # Create 30 books
        for i in range(1, 31):
            Books.objects.create(id=i, key=f"bk{i}", title=f"Book {i}", author="auth")

        url = reverse('most-liked') + "?num=10"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 10)  # Should be limited to 10

    def test_most_liked_books_error_handling(self):
        with patch('myapp.views.UserBookList.objects.filter') as mock_filter:
            mock_filter.side_effect = Exception("forced error")
            url = reverse('most-liked')
            response = self.client.get(url)
            self.assertEqual(response.status_code, 500)
            self.assertIn("error", response.data)


    def test_most_active_users_success(self):
        # Create users
        user1 = User.objects.create(username="alice")
        user2 = User.objects.create(username="bob")

        # User info
        UserInfo.objects.create(user_id=user1, bio="Reader 1")

        # Create books and reviews
        book = Books.objects.create(id=1, title="Some Book", key="key1", author="auth")
        Review.objects.create(user=user1, book_id=book.id, rating=5, created_at="2024-05-01")
        Review.objects.create(user=user1, book_id=book.id, rating=4, created_at="2024-05-02")
        Review.objects.create(user=user2, book_id=book.id, rating=3, created_at="2024-05-03")

        url = reverse('most-active-users')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["username"], "alice")  # 2 reviews
        self.assertEqual(response.data[0]["review_count"], 2)
        self.assertIn("latest_activity", response.data[0])

    def test_most_active_users_limit(self):
        for i in range(10):
            user = User.objects.create(username=f"user{i}")
            book = Books.objects.create(id=i, title=f"Book {i}", key=f"k{i}", author="auth")
            Review.objects.create(user=user, book_id=book.id, rating=5)

        url = reverse('most-active-users') + "?num=5"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 5)

    def test_most_active_users_missing_info(self):
        user = User.objects.create(username="lonely")
        book = Books.objects.create(id=99, title="Ghost Book", key="gk", author="ghost")
        # Add review but don't add UserInfo
        Review.objects.create(user=user, book_id=book.id, rating=2)

        url = reverse('most-active-users')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["bio"], "No bio available")

    def test_most_active_users_missing_book(self):
        user = User.objects.create(username="broken")
        Review.objects.create(user=user, book_id=999, rating=4)  # Book does not exist

        url = reverse('most-active-users')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data[0]["latest_activity"])
        
            
    def test_most_active_users_exception_handling(self):
        url = reverse('most-active-users')  # Replace with the actual name of your URL pattern

        with patch('myapp.views.connection') as mock_connection:
            mock_cursor = MagicMock()
            mock_cursor.execute.side_effect = Exception("Simulated SQL error")
            mock_connection.cursor.return_value.__enter__.return_value = mock_cursor

            response = self.client.get(url, {'num': 5})

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.data == {"error": "Failed to retrieve most active users"}




class UserProfileTests(APITestCase):
    '''
    test for getting a user profile:
    it makes a temp user profile
    checks if the added info is there and if profile can be updated
    '''

    def setUp(self):
        self.user = User.objects.create_user(username='profileuser', password='password123')
        User.objects.create_user(username='alice', password='testpass')
        User.objects.create_user(username='alexander', password='testpass')
        User.objects.create_user(username='bob', password='testpass')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        UserInfo.objects.create(user_id=self.user, bio='I love books!', location='USA')
        

    def test_get_user_profile(self):
        '''
        user_profile function is used here
        '''
        response = self.client.get(f'/api/profile/{self.user.username}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['bio'], 'I love books!')

    def test_update_profile(self):
        '''
        update_profile is used here
        '''
        response = self.client.post('/api/update-profile/', {
            'bio': 'Updated bio', 'location': 'UK'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['bio'], 'Updated bio')
        
    def test_update_profile_no_auth(self):
        '''
        update_profile is used here
        '''
        print("in updateprofile no auth")
        self.client.credentials()
        response = self.client.post('/api/update-profile/', {
            'bio': 'Updated bio', 'location': 'UK'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        
    def test_update_username(self):
        '''
        testing update_username
        '''
        url1 = reverse('update_username')
        response = self.client.post(url1,{
            'new_username':'test'
        })
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        
    
    def test_update_username_empty(self):
        '''
        testing update_username
        '''
        url1 = reverse('update_username')
        response = self.client.post(url1,{})
        self.assertEqual(response.status_code,status.HTTP_400_BAD_REQUEST)
        
        
    def test_update_password(self):
        '''
        testing update password
        '''
        url2 = reverse('update_password')
        response = self.client.post(url2,{
            'current_password':'password123',
            'new_password':'123'
        })
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        
    def test_update_password_empty(self):
        '''
        testing update password
        '''
        url2 = reverse('update_password')
        response = self.client.post(url2,{})
        self.assertEqual(response.status_code,status.HTTP_400_BAD_REQUEST)
        
    
    def test_non_existing_profile(self):
        '''
        user_profile function is used here
        '''
        response = self.client.get(f'/api/profile/{"non-existing-profile"}/')
        self.assertEqual(response.status_code,status.HTTP_404_NOT_FOUND)

    def test_get_user_profile_noauth(self):
        '''
        user_profile function is used here
        Looking for profile without authorization
        '''
        self.client.credentials()
        response = self.client.get(f'/api/profile/{self.user.username}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
    def test_update_profile_invalid_birth_date(self):
        '''
        update_profile with invalid birth_date format should return 400
        '''
        response = self.client.post('/api/update-profile/', {
            'bio': 'Test Bio',
            'location': 'Test Location',
            'birth_date': 'not-a-date'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        
    def test_update_username_already_taken(self):
        '''
        update_username should return 400 if new username is already taken
        '''
        # Create another user with the username you want to test
        User.objects.create_user(username='taken_username', password='somepass')

        # Attempt to change current user's username to the one already taken
        response = self.client.post('/api/update-username/', {
            'new_username': 'taken_username'
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Username already taken')

    def test_update_password_incorrect_current(self):
        '''
        update_password should return 400 if current password is incorrect
        '''
        url = reverse('update_password')  # make sure the URL name matches your config

        response = self.client.post(url, {
            'current_password': 'wrongpassword',  # incorrect current password
            'new_password': 'newsecurepassword123'
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Current password is incorrect')
        
    def test_update_email_already_taken(self):
        '''
        update_email should return 400 if the email is already taken
        '''
        # Create another user with a specific email
        User.objects.create_user(username='someoneelse', password='pass123', email='existing@example.com')

        url = reverse('update_email')  # Make sure your URL pattern name matches

        response = self.client.post(url, {
            'new_email': 'existing@example.com'  # Attempt to reuse this email
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Email already taken')

    def test_update_email_missing_email(self):
        '''
        update_email should return 400 if new_email is not provided
        '''
        url = reverse('update_email')  # Adjust to match your URL pattern name
        
        # Send the request without a new_email
        response = self.client.post(url, {})

        # Assert the response status and error message
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'New email is required')

    def test_update_email_success(self):
        '''
        update_email should successfully update the user's email if valid
        '''
        # New email
        new_email = 'newemail@example.com'

        url = reverse('update_email')  # Adjust to match your URL pattern name
        
        # Send the request with a new valid email
        response = self.client.post(url, {'new_email': new_email})

        # Assert the response status and success message
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Email updated successfully')
        self.assertEqual(response.data['email'], new_email)

        # Reload the user from the database to check the updated email
        user = User.objects.get(username=self.user.username)
        self.assertEqual(user.email, new_email)

    def test_autocomplete_profile_with_query(self):
        url = reverse('autocomplete_profile')  # Ensure this name is in your urls.py
        response = self.client.get(url, {'query': 'al'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(isinstance(data, list))
        self.assertGreaterEqual(len(data), 1)
        for item in data:
            self.assertIn('id', item)
            self.assertIn('username', item)
            self.assertIn('al', item['username'].lower())

    def test_autocomplete_profile_without_query(self):
        url = reverse('autocomplete_profile')
        response = self.client.get(url)  # No query param

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), [])
        
    def test_block_genre(self):
        url = reverse('block_genre')
        response = self.client.post(url,{
            'blocked_genres':['']
        })
        self.assertEqual(response.status_code,status.HTTP_400_BAD_REQUEST)
    

    def test_no_blocked_genres(self):
        # No UserBookList created
        response = self.client.get(reverse('blocked_genres'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"blocked_genres": []})

    def test_with_blocked_genres(self):
        UserBookList.objects.create(user_id=self.user, name="Blocked Books", book_ids=["Fantasy", "Sci-Fi"])
        response = self.client.get(reverse('blocked_genres'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"blocked_genres": ["Fantasy", "Sci-Fi"]})
        
    def test_block_genre_success(self):
        url = reverse('block_genre')
        genres = ['Horror', 'Romance']
        response = self.client.post(url, data={'blocked_genres': genres}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['blocked_genres'], genres)
        
    def test_unblock_genre(self):
        url = reverse('unblock_genre')
        response = self.client.post(url,{
            'blocked_genres':['']
        })
        self.assertEqual(response.status_code,status.HTTP_400_BAD_REQUEST)
        
    def test_unblock_genre_no_blocked_list(self):
        url = reverse('unblock_genre')
        
        response = self.client.post(url, data={'blocked_genre': 'Horror'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], "No blocked genres.")

    
    def test_unblock_genre_success(self):

        UserBookList.objects.create(
            user_id=self.user,
            name="Blocked Books",
            book_ids=['Horror', 'Romance']
        )

        url = reverse('unblock_genre')
        response = self.client.post(url, data={'blocked_genre': 'Romance'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn('Romance', response.data['blocked_genres'])
        self.assertIn('Horror', response.data['blocked_genres'])
        self.assertEqual(response.data['message'], "Genre 'Romance' removed from blocked list.")
        
    def test_unblock_genre_not_found(self):
        UserBookList.objects.create(
            user_id=self.user,
            name="Blocked Books",
            book_ids=['Sci-Fi']
        )

        url = reverse('unblock_genre')
        response = self.client.post(url, data={'blocked_genre': 'Romance'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], "Genre 'Romance' not found in blocked list.")
        self.assertIn('Sci-Fi', response.data['blocked_genres'])





class RecommendedBookTests(APITestCase):
    def setUp(self):
        # Create user and log in
        self.user = User.objects.create_user(username='profileuser', password='password123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        UserInfo.objects.create(user_id=self.user, bio='I love books!', location='USA')
        
        # Create books with valid data
        for i in range(10):
            Books.objects.create(
                key=f"book_{i}",
                title=f"Test Book {i}",
                description="Some description",
                subjects="Fiction" if i % 2 == 0 else "Science",
                author="Author",
                first_published=1999 + i,
                cover=i + 1
            )

        self.url = reverse('random_book_api')

    def test_authenticated_user_gets_recommendation(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("title", response.data)

    def test_unauthenticated_user_gets_denied(self):
        self.client.logout()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_num_defaults_to_one(self):
        response = self.client.get(self.url + "?num=invalid")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)  # Should return single book

    def test_requesting_multiple_books(self):
        response = self.client.get(self.url + "?num=3")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertLessEqual(len(response.data), 3)

    def test_recommendation_ignores_blocked_genres(self):
        UserBookList.objects.create(user_id=self.user, name="Blocked Books", book_ids=["Fiction"])
        response = self.client.get(self.url + "?num=5")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        if isinstance(response.data, list):
            for book in response.data:
                self.assertNotIn("fiction", book["subjects"].lower())

    def test_cache_returns_same_result(self):
        response1 = self.client.get(self.url + "?num=2")
        response2 = self.client.get(self.url + "?num=2")
        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response1.data, response2.data)



class UserBookListTests(APITestCase):
    '''
    Databases need to be defined,
    as Works table is in another database file
    '''     
    
    def setUp(self):
        self.user = User.objects.create_user(username='listuser', password='password123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.book_list_name = 'Saved Books'
        self.book = Books.objects.create(
            id = 111,
            title = "testing book"
        )
        self.valid_book = Books.objects.create(id=1, title="Valid Book", key="valid_book_key")
        
        self.invalid_book_id = 999999  
        self.book_list_name = "Saved Books"
        
        self.book_list = UserBookList.objects.create(
            user_id=self.user,
            name=self.book_list_name,
            book_ids=[self.valid_book.id, self.invalid_book_id]
        )
        
    def test_add_book_wrong_list_name(self):
        url = reverse('add_book',kwargs={'book_id': self.book.id}) + "?name=poopoo"
        response = self.client.post(url)
        self.assertEqual(response.status_code,status.HTTP_400_BAD_REQUEST)
        
    def test_add_book_to_list_and_get_saved_books(self):
        '''
        Send book list name as part of the URL parameter, 
        check to see if it's accepted and book list isn't empty.
        Then check if the added book can be retrieved in the saved books list.
        '''
        
        url = reverse('add_book', kwargs={'book_id': self.book.id}) + "?name=Saved Books"
        response = self.client.post(url) 
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('status'), 'success')
        
        book_list = UserBookList.objects.filter(user_id=self.user, name="Saved Books").first()
        self.assertIsNotNone(book_list)
        self.assertIn(self.book.id, book_list.book_ids)
        saved_books_url = reverse('book_list') + "?name=Saved Books"
        response = self.client.get(saved_books_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_add_book_to_list_and_get_liked_books(self):
        '''
        Send book list name as part of the URL parameter, 
        check to see if it's accepted and book list isn't empty.
        Then check if the added book can be retrieved in the liked books list.
        '''
        
        url = reverse('add_book', kwargs={'book_id': self.book.id}) + "?name=Liked Books"
        response = self.client.post(url) 
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('status'), 'success')
        
        book_list = UserBookList.objects.filter(user_id=self.user, name="Liked Books").first()
        self.assertIsNotNone(book_list)
        self.assertIn(self.book.id, book_list.book_ids)
        liked_books_url = reverse('book_list') + "?name=Liked Books"
        response = self.client.get(liked_books_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_add_empty_book_to_list(self):
        '''
        Adding a book that doesnt exist from the database,
        should report 404
        '''
        
        url = reverse('add_book', kwargs={'book_id': 2904427}) + "?name=Saved Books"
        response = self.client.post(url) 
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
    def test_remove_book_from_list(self):
        '''
        Test to ensure that when the same book is added twice,
        the first addition will succeed and the second addition will remove the book.
        '''
        url = reverse('add_book', kwargs={'book_id': self.book.id}) + f"?name={self.book_list_name}"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('status'), 'success')

        book_list = UserBookList.objects.filter(user_id=self.user, name=self.book_list_name).first()
        self.assertIsNotNone(book_list)
        self.assertIn(self.book.id, book_list.book_ids)

        print("Book List after first add:", book_list.book_ids)

        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('status'), 'removed')

        book_list = UserBookList.objects.filter(user_id=self.user, name=self.book_list_name).first()
        self.assertIsNotNone(book_list)
        self.assertNotIn(self.book.id, book_list.book_ids)

        print("Book List after second action:", book_list.book_ids)
        
    def test_get_saved_books_with_invalid_book_ids(self):
        
        url = reverse('book_list') + "?name=Saved Books"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response_data = response.data
        valid_book_titles = [book['title'] for book in response_data]
        self.assertIn(self.valid_book.title, valid_book_titles)

        invalid_book_ids = [book['id'] for book in response_data]
        self.assertNotIn(self.invalid_book_id, invalid_book_ids)

        print(response_data)

    def test_view_other_users_liked_books(self):
        '''
        see if others liked books are visible
        '''
        other_user = User.objects.create_user(username='otheruser', password='testpass')
        liked_books = UserBookList.objects.create(user_id=other_user, name="Liked Books", book_ids=[])

        url = reverse('book_list') + f"?username={other_user.username}&name=Liked Books"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_cannot_view_other_users_non_liked_books(self):
        '''
        try to see if non liked books if unauthenticated
        '''
        other_user = User.objects.create_user(username='otheruser', password='testpass')
        private_list = UserBookList.objects.create(user_id=other_user, name="Saved Books", book_ids=[])

        url = reverse('book_list') + f"?username={other_user.username}&name=Saved Books"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data.get('error'), "You can only view other users' liked books")
        
    def test_view_nonexistent_users_list_returns_404(self):
        '''
        if no appropriate user name is given, return an error
        '''
        url = reverse('book_list') + "?username=ghostuser&name=Liked Books"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data.get('error'), "User not found")



            

          
class GameTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='listuser', password='password123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        
    def test_score_get(self):
        url = reverse('high_score')
        response = self.client.get(url)
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        
    
    def test_score_post(self):
        url = reverse('high_score')
        response = self.client.post(url)
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        
    def test_score_post_error_handling(self):
        url = reverse('high_score')
        with patch('myapp.views.UserInfo.objects.get_or_create') as mocked_get_or_create:
            mocked_get_or_create.side_effect = Exception("forced error")
            response = self.client.post(url, {'high_score': 100}, format='json')
            self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
            self.assertIn("error", response.data)
            
            
    def test_score_is_updated_when_higher(self):
        UserInfo.objects.create(user_id=self.user, high_score_titlegame=50)

        url = reverse('high_score')
        response = self.client.post(url, {'high_score': 100}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], "High score updated")
        self.assertEqual(response.data['high_score'], 100)

        self.assertEqual(UserInfo.objects.get(user_id=self.user).high_score_titlegame, 100)


class ModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass123')

    def test_newtable_creation(self):
        obj = NewTable(id=1, works_key='abc123', isbn_10='1234567890')
        self.assertEqual(obj.works_key, 'abc123')

    def test_userinfo_optional_fields(self):
        info = UserInfo.objects.create()
        info.save()
        self.assertIsNone(info.bio)
        self.assertIsNone(info.location)
        self.assertIsNone(info.birth_date)
        self.assertEqual(info.high_score_titlegame, 0)  # default

    def test_userbooklist_empty_books(self):
        book_list = UserBookList.objects.create(name='Empty List')
        book_list.save()
        self.assertEqual(book_list.book_ids, [])

    
    def test_review_creation(self):
        review = Review.objects.create(
            book_id=1,
            text='Loved it!',
            rating=5
        )
        review.save()
        self.assertEqual(review.text, 'Loved it!')
        self.assertEqual(review.rating, 5)
        self.assertIn('Loved it!', review.text)

    def test_userinfo_creation(self):
        info = UserInfo.objects.create(
            user_id=self.user,
            bio='Just a test user',
            location='Internet',
            high_score_titlegame=99
        )
        info.save()
        self.assertEqual(info.user_id.username, 'testuser')
        self.assertEqual(info.high_score_titlegame, 99)

    def test_user_book_list(self):
        book_list = UserBookList.objects.create(
            user_id=self.user,
            name='Favorites',
            book_ids=[1, 2, 3]
        )
        book_list.save()
        self.assertEqual(book_list.name, 'Favorites')
        self.assertEqual(book_list.book_ids, [1, 2, 3])
        self.assertListEqual(book_list.book_ids, [1, 2, 3])

    def test_books_model(self):
        book = Books.objects.create(
            key='OL456M',
            title='Another Book',
            description='Another awesome book',
            subjects='Drama',
            author='John Smith',
            cover=42,
            first_published=1999
        )
        book.save()
        self.assertEqual(book.title, 'Another Book')
        self.assertEqual(book.cover, 42)
    
    def test_books_with_optional_fields(self):
        book = Books.objects.create(
            key='OL789M',
            title='Optional Fields Book',
            author='Jane Doe'
        )
        book.save()
        self.assertIsNone(book.cover)
        self.assertIsNone(book.description)

    def test_author_key_uniqueness(self):
        Author.objects.create(key='unique_key', name='Author One')
        with self.assertRaises(Exception):  # or IntegrityError if you want to be specific
            Author.objects.create(key='unique_key', name='Author Two')
            
    def test_author_model(self):
        author = Author.objects.create(key='auth_001', name='George Orwell')
        self.assertEqual(author.key, 'auth_001')
        self.assertEqual(author.name, 'George Orwell')





'''
tests done:


User:
    Login
    Signup
    Logout
    delete_account test
    Update-profile
    update-username and update-password, i thought update_profile function did the same thing,
    but no it only updates bio, location, birthdate, and not username or password
    Add_book to list (in this case 'Saved books' list)
    get_saved_books (again 'Saved books' list)
    (for the last two should probably test for 'Liked Books' lists as well, just to cover everything)

Book:
    retrieve_book_info test
    Add review
    get review(s)
    random book test
    api/filter test

Search:
    Search
    autocomplete test
    

Game:

'''