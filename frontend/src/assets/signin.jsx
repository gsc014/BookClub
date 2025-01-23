import React from 'react';

import './login.css';

import close from './pictures/close.png';

const Signin = () => {

    return (
        <div className="form" id="login-form">
                    <h2>
                        Sign In
                        <img
                            src={close}
                            className="icon jump exit"
                            alt=""
                            onclick="closeTabs()"
                        />
                    </h2>
                    <form method="post" action="{% url 'login_user' %}">
                        <div className="input-container ic1">
                            <input
                                className="input"
                                id="username"
                                name="username"
                                type="text"
                                placeholder=" "
                                required=""
                            />
                            <div className="cut" />
                            <label htmlFor="username" className="placeholder">
                                Username
                            </label>
                        </div>
                        <div className="input-container ic2">
                            <input
                                className="input"
                                id="password"
                                name="password"
                                type="password"
                                placeholder=" "
                                required=""
                            />
                            <div className="cut" />
                            <label htmlFor="password" className="placeholder">
                                Password
                            </label>
                        </div>

                        <div className="input-container ic3">
                            <input
                                className="input"
                                id="password"
                                name="password"
                                type="password"
                                placeholder=" "
                                required=""
                            />
                            <div className="cut" />
                            <label htmlFor="password" className="placeholder">
                                Confirm Password
                            </label>
                        </div>

                        <button className="submit button" type="submit">
                            Log In
                        </button>
                    </form>
                    <p className="switch-form">
                        Don't have an account?
                        <button className="button" id="show-signup" onclick="show_sign_in()">
                            Sign Up
                        </button>
                    </p>
                </div>
    );
};

export default Signin;