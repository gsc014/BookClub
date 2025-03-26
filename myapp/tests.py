from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Work, Review, UserInfo, UserBookList
from rest_framework.authtoken.models import Token
from django.test import TestCase
from django.urls import reverse
from django.db import transaction


class UserTests(APITestCase):
    '''
    8 Tests related to signing up, logging in and logging out,
    including right and wrong inputs
    '''
    
    signup = reverse('signup_user')
    login = reverse('login_user')
    logout = reverse('logout_user')
    
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
    
    databases = {'default', 'open_lib'} 

    def setUp(self):
        self.book = Work.objects.using('open_lib').create(
            key="test_key",
            title="Test Book",
            description="A test description",
            subjects="Test Subject",
            author="Test Author",
            first_published=2000
        )
        
    def test_search_books_title(self):
        '''Test to see if the book is in the API response'''
        response = self.client.get('/api/search/', {
            "q": self.book.title
            })
        self.assertEqual(response.status_code, status.HTTP_200_OK)  
        
class ReviewTests(APITestCase):
    '''
    Tests making reviews on book already present in the open_lib database,
    a lot easier than making temporary book 
    '''

    databases = {'default', 'open_lib'} 
    def setUp(self):
        self.user = User.objects.create_user(username='reviewer', password='password123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.book = Work.objects.using('open_lib').filter(id=1).first() 
    
    def test_add_review(self):
        '''
        uses the add_review function in views.py
        '''
        self.assertIsNotNone(self.book.id, "The book ID should not be None.")
        
        add_url = reverse('add_review', kwargs={'book_id1': self.book.id})
        response = self.client.post(add_url, {
            'text': 'Great book!', 'rating': 5
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        getreview_url = reverse('get_reviews', kwargs={'bid':self.book.id})
        response = self.client.get(getreview_url)
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)
        review_texts = [review['text'] for review in response.data]
        self.assertIn('Great book!', review_texts)

class UserProfileTests(APITestCase):
    '''
    test for getting a user profile:
    it makes a temp user profile
    checks if the added info is there and if profile can be updated
    
    NEED TO ADD:
    testing for non existing user profile, expect 404 <-- DONE i think
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
    databases = {'default', 'open_lib'}
    
    def setUp(self):
        self.user = User.objects.create_user(username='listuser', password='password123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

        self.book = Work.objects.using('open_lib').filter(id=1).first()

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
        
'''
tests done:

Login
Signup
Logout
Search
Add review
get review(s)
Update-profile
Add_book to list (in this case 'Saved books' list)
get_saved_books (again 'Saved books' list)
(for the last two should probably test for 'Liked Books' lists as well, just to cover everything)


'''


'''
tests to add:

delete_account test

api/filter test

update-username and update-password, but these are in essence update profile split into two,
could probably fix update_profile to be the alfa omega of updating instead of having 3 functions

retrieve_book_info test

check_auth test

autocomplete test, no clue how to test if this is even working without using my eyes 
(i have not looked at the function)

i have two profile views one of which is depreciated, why not remove it? dont ask me

random book test, should be easy

'''


'''
We need to make a list of what tests the API endpoints need,
so far the only test i feel is really comprehensive is for User tests.
'''