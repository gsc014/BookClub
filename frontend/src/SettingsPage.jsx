import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [updatedSettings, setUpdatedSettings] = useState({
    theme: 'dark',
    notifications: true,
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/settings/')
      .then(response => setSettings(response.data))
      .catch(error => setError('Error fetching settings'));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('http://127.0.0.1:8000/api/settings/', updatedSettings)
      .then(response => alert(response.data.message))
      .catch(error => console.error('Error updating settings:', error));
  };

  if (error) return <div>{error}</div>;
  if (!settings) return <div>Loading...</div>;

  return (
    <div>
      <h1>Settings</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Theme:
          <select
            value={updatedSettings.theme}
            onChange={(e) => setUpdatedSettings({ ...updatedSettings, theme: e.target.value })}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label>
          Notifications:
          <input
            type="checkbox"
            checked={updatedSettings.notifications}
            onChange={(e) => setUpdatedSettings({ ...updatedSettings, notifications: e.target.checked })}
          />
        </label>
        <button type="submit">Save</button>
      </form>
    </div>
  );
};

export default SettingsPage;
