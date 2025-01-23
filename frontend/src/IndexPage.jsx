import React, { useEffect, useState } from 'react';
import axios from 'axios';
import brightmode from './assets/bright-mode.png'

const IndexPage = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        axios.get('http://127.0.0.1:8000')
            .then(response => setData(response.data))
            .catch(error => console.error('Error fetching home data:', error));
    }, []);

    if (!data) return <div>Loading...</div>;

    return (
        <header id="header">
            <div className="logo">
                <a href="" style={{ color: "#ffffff", textDecoration: "none" }}>
                    Book Club
                </a>
            </div>
            <div id="useful_buttons">
                {/* <button id="dark_mode" class="button">Eyes hurting?</button> */}
                <img
                    src={brightmode}
                    id="dark_mode"
                    className="icon jump"
                />
                {/* <img src="{% static 'pictures/user.png' %}" id="User" class="icon jump"> */}
                <a href="{% url 'profile' %}">
                    <img
                        src="{% static 'pictures/user.png' %}"
                        id="User"
                        className="icon jump"
                    />
                </a>
                <a href="{% url 'settings' %}">
                    <img
                        src="{% static 'pictures/settings_icon.png' %}"
                        id="Settings"
                        className="icon spin"
                    />
                </a>
            </div>

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
        </header>
    );
};

export default IndexPage;
