import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './style/sidebar-widget.css';
import defaultAvatar from './pictures/user.png';

const MostActiveUsers = ({ limit = 5 }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMostActiveUsers = async () => {
            try {
                setLoading(true);
                const response = await axios.get('http://127.0.0.1:8000/api/most-active-users/', {
                    params: { num: limit }
                });
                console.log("Most active users:", response.data);
                setUsers(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching active users:", err);
                setError("Failed to load active users");
                setLoading(false);
            }
        };
        fetchMostActiveUsers();
    }, [limit]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    return (
        <div className="sidebar-widget">
            <h3 className="widget-title">Top Reviewers</h3>
            {loading ? (
                <div className="widget-loading">Loading top reviewers...</div>
            ) : error ? (
                <div className="widget-error">{error}</div>
            ) : users.length > 0 ? (
                <div className="widget-list">
                    {users.map(user => (
                        <div key={user.id} className="active-user-card">
                            <Link to={`/profile/${user.username}`} className="user-link">
                                <div className="user-info">
                                    <img 
                                        src={defaultAvatar} 
                                        alt={user.username} 
                                        className="user-avatar"
                                    />
                                    <div className="user-details">
                                        <h4 className="username">{user.username}</h4>
                                        <p className="review-count">{user.review_count} reviews</p>
                                    </div>
                                </div>
                            </Link>
                            {user.latest_activity && (
                                <div className="latest-activity">
                                    <small>Recently reviewed:</small>
                                    <Link to={`/books/${user.latest_activity.book_id}`} className="activity-link">
                                        <div className="activity-details">
                                            <span className="book-title">{user.latest_activity.book_title}</span>
                                            <div className="rating-date">
                                                <span className="rating">★ {user.latest_activity.rating}</span>
                                                <span className="activity-date">{formatDate(user.latest_activity.date)}</span>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="widget-empty">No active users found</div>
            )}
        </div>
    );
};

export default MostActiveUsers;