// Environment configuration
const getApiUrl = () => {
    // In development, always use the dev server
    // This works for localhost, 127.0.0.1, and local network IPs like 192.168.x.x
    if (import.meta.env.DEV) {
        // If accessing via local network IP, use that IP for the API too
        const hostname = window.location.hostname;
        const port = window.location.port === '4002' ? '4002' : '4000';
        return `http://${hostname}:${port}`;
    }
    // Production - use same domain as frontend
    return `${window.location.protocol}//${window.location.host}`;
};

const getWebSocketUrl = () => {
    // In development, always use the dev server
    if (import.meta.env.DEV) {
        const hostname = window.location.hostname;
        const port = window.location.port === '4002' ? '4002' : '4000';
        return `ws://${hostname}:${port}/socket`;
    }
    // Production - use wss with same domain
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/socket`;
};

export const config = {
    apiUrl: getApiUrl(),
    wsUrl: getWebSocketUrl(),
};
