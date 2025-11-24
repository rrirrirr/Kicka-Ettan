// Environment configuration
const getApiUrl = () => {
    // Check if we're in development (localhost)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:4000';
    }
    // Production - use same domain as frontend
    return `${window.location.protocol}//${window.location.host}`;
};

const getWebSocketUrl = () => {
    // Check if we're in development (localhost)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'ws://localhost:4000/socket';
    }
    // Production - use wss with same domain
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/socket`;
};

export const config = {
    apiUrl: getApiUrl(),
    wsUrl: getWebSocketUrl(),
};
