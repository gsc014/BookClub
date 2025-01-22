import React, { useEffect, useState } from 'react';
import axios from 'axios';

const IndexPage = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000')
      .then(response => setData(response.data))
      .catch(error => console.error('Error fetching home data:', error));
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <h1>{data.message}</h1>
      <form>
        <label>{data.login_form.username}</label>
        <input type="text" placeholder="Username" />
        <label>{data.login_form.password}</label>
        <input type="password" placeholder="Password" />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default IndexPage;
