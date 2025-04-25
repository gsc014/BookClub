from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from myapp.models import  Review, UserInfo, UserBookList, Books, NewTable
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
        
    def test_search_filter_returns_400_when_missing_param(self):
        response = self.client.get(reverse('search_filter'))  # no ?filter= param
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], "This shouldnt happen")

    def test_search_filter_returns_400_when_param_is_empty(self):
        response = self.client.get(reverse('search_filter') + '?filter=')  # empty string
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], "This shouldnt happen")
        
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
        
    def test_random_book(self):
        '''
        testing random_book to see if it gives correct status codes
        '''
        url = reverse('random_book')
        
        response = self.client.get(url,{
            'num': 1
        })
        
        self.assertEqual(response.status_code,status.HTTP_200_OK)
    
    def test_random_book_error(self):
        '''
        testing random_book_error to see if it gives correct status codes
        '''
        url = reverse('random_book')
        
        response = self.client.get(url,{
            'num': ''
        })
        
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        
        
    def test_filter(self):
        '''
        testing search filter
        '''
        url = reverse('search_filter')
        
        response = self.client.get(url,{
            'filter':'documentary'
        })
        
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        
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


class UserProfileTests(APITestCase):
    '''
    test for getting a user profile:
    it makes a temp user profile
    checks if the added info is there and if profile can be updated
    '''

    def setUp(self):
        self.user = User.objects.create_user(username='profileuser', password='password123')
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
        # Step 2: Create a valid book in the database
        self.valid_book = Books.objects.create(id=1, title="Valid Book", key="valid_book_key")
        
        # Step 3: Create a list of book IDs (including a valid and invalid one)
        self.invalid_book_id = 999999  # ID that doesn't exist
        self.book_list_name = "Saved Books"
        
        # Step 4: Create a UserBookList with both valid and invalid book IDs
        self.book_list = UserBookList.objects.create(
            user_id=self.user,
            name=self.book_list_name,
            book_ids=[self.valid_book.id, self.invalid_book_id]
        )
        
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
        # Add the book to the list
        url = reverse('add_book', kwargs={'book_id': self.book.id}) + f"?name={self.book_list_name}"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('status'), 'success')

        # Check if the book is in the list
        book_list = UserBookList.objects.filter(user_id=self.user, name=self.book_list_name).first()
        self.assertIsNotNone(book_list)
        self.assertIn(self.book.id, book_list.book_ids)

        # Now print the book list to verify
        print("Book List after first add:", book_list.book_ids)

        # Add the same book again, which should trigger the else block and remove the book
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('status'), 'removed')

        # Check if the book is removed from the list
        book_list = UserBookList.objects.filter(user_id=self.user, name=self.book_list_name).first()
        self.assertIsNotNone(book_list)
        self.assertNotIn(self.book.id, book_list.book_ids)

        # Print the book list after the second add/remove
        print("Book List after second action:", book_list.book_ids)
        
    def test_get_saved_books_with_invalid_book_ids(self):
        # Step 1: Send a GET request to fetch saved books
        url = reverse('book_list') + "?name=Saved Books"
        response = self.client.get(url)

        # Step 2: Check that the response is successful (status 200)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Step 3: Check if the valid book is in the response
        response_data = response.data
        valid_book_titles = [book['title'] for book in response_data]
        self.assertIn(self.valid_book.title, valid_book_titles)

        # Step 4: Check that the invalid book ID is NOT in the response
        invalid_book_ids = [book['id'] for book in response_data]
        self.assertNotIn(self.invalid_book_id, invalid_book_ids)

        # Optionally: Print out the response data for debugging
        print(response_data)


          
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