from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Work, Review, UserInfo, UserBookList,Books
from rest_framework.authtoken.models import Token
from django.test import TestCase
from django.urls import reverse
from django.db import transaction
from unittest.mock import patch

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

class UserBookListTests(APITestCase):
    '''
    Databases need to be defined,
    as Works table is in another database file
    '''     
    
    def setUp(self):
        self.user = User.objects.create_user(username='listuser', password='password123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

        self.book = Books.objects.create(
            id = 111,
            title = "testing book"
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
        # Create an existing UserInfo with a lower score
        UserInfo.objects.create(user_id=self.user, high_score_titlegame=50)

        url = reverse('high_score')
        response = self.client.post(url, {'high_score': 100}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], "High score updated")
        self.assertEqual(response.data['high_score'], 100)

        # Optional: confirm in DB
        self.assertEqual(UserInfo.objects.get(user_id=self.user).high_score_titlegame, 100)

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