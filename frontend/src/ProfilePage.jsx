import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/profile/')
      .then(response => setProfile(response.data))
      .catch(error => console.error('Error fetching profile:', error));
  }, []);

  if (!profile) return <div>Loading...</div>;

  return (
  <Header />
  
  );

};

export default ProfilePage;
