import axios from 'axios';
import { apiStatusStore, getUserStore, globalErrorStore, loaderStore, getTenantId } from '$lib/helpers/store.js';


// Add a request interceptor to attach authentication tokens or headers
axios.interceptors.request.use(
    (config) => {
        // Add your authentication logic here
        const user = getUserStore();
        const tenantId = getTenantId();
        if (!skipLoader(config)) {
            loaderStore.set(true);
        }
        // Attach an authentication token to the request headers
        if (user.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
            
            if (tenantId) {
                config.headers['__tenant'] = tenantId;
            }
        } else {
            redirectToLogin();
        }
        return config;
    },
    (error) => {
        loaderStore.set(false);
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401 errors globally
axios.interceptors.response.use(
    (response) => {
        loaderStore.set(false);
        apiStatusStore.set('online');
        return response;
    },
    (error) => {
        loaderStore.set(false);
        // No `response` means the request never reached anyone — DNS, refused connection,
        // dropped wifi. Any status code, 401 and 500 included, means the server answered.
        apiStatusStore.set(error?.response ? 'online' : 'offline');
        const originalRequest = error?.config || {};
        const user = getUserStore();

        // No token, an expired token or a 401 all mean the session is over: send the user to login.
        if (!user?.token || error?.response?.status === 401 || isTokenExired(user.expires)) {
            redirectToLogin();
            return Promise.reject(error);
        }

        if (!skipGlobalError(originalRequest)) {
            globalErrorStore.set(true);
            setTimeout(() => {
                globalErrorStore.set(false);
            }, 2500);
        }

        // Return the error to the calling function
        return Promise.reject(error);
    }
);

/**
 * @param {number} expires
 */
function isTokenExired(expires) {
    return Date.now() / 1000 > expires;
}

function redirectToLogin() {
    const curUrl = window.location.pathname + window.location.search;
    let loginUrl = 'login';
    if (curUrl) {
        loginUrl += `?redirect=${encodeURIComponent(curUrl)}`;
    }
    window.location.href = loginUrl;
}

/** @param {import('axios').InternalAxiosRequestConfig<any>} config */
function skipLoader(config) {
    /** @type {RegExp[]} */
    const postRegexes = [
        new RegExp('http(s*)://(.*?)/conversation/(.*?)/(.*?)', 'g'),
        new RegExp('http(s*)://(.*?)/agent', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/data/page', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/query', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/file/page', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/file/upload', 'g'),
        // new RegExp('http(s*)://(.*?)/knowledge/entity/analyze', 'g'),
        new RegExp('http(s*)://(.*?)/users', 'g'),
        new RegExp('http(s*)://(.*?)/instruct/(.*?)', 'g'),
        new RegExp('http(s*)://(.*?)/agent/(.*?)/code-scripts', 'g'),
        new RegExp('http(s*)://(.*?)/agent/(.*?)/code-script/generate', 'g'),
        new RegExp('http(s*)://(.*?)/renew-token', 'g')
    ];

    /** @type {RegExp[]} */
    const putRegexes = [
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/data', 'g'),
        new RegExp('http(s*)://(.*?)/conversation/(.*?)/update-message', 'g'),
        new RegExp('http(s*)://(.*?)/conversation/(.*?)/update-tags', 'g'),
        new RegExp('http(s*)://(.*?)/users', 'g'),
    ];

    /** @type {RegExp[]} */
    const deleteRegexes = [
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/data/(.*?)', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/data', 'g'),
        new RegExp('http(s*)://(.*?)/conversation/(.*?)/message/(.*?)', 'g')
    ];

    /** @type {RegExp[]} */
    const getRegexes = [
        new RegExp('http(s*)://(.*?)/plugin/menu', 'g'),
        new RegExp('http(s*)://(.*?)/setting/(.*?)', 'g'),
        new RegExp('http(s*)://(.*?)/roles', 'g'),
        new RegExp('http(s*)://(.*?)/role/options', 'g'),
        new RegExp('http(s*)://(.*?)/role/(.*?)/details', 'g'),
        new RegExp('http(s*)://(.*?)/user/(.*?)/details', 'g'),
        new RegExp('http(s*)://(.*?)/user/me', 'g'),
        new RegExp('http(s*)://(.*?)/address/options(.*?)', 'g'),
        new RegExp('http(s*)://(.*?)/agents', 'g'),
        new RegExp('http(s*)://(.*?)/agent/options', 'g'),
        new RegExp('http(s*)://(.*?)/agent/labels', 'g'),
        new RegExp('http(s*)://(.*?)/agent/tasks', 'g'),
        new RegExp('http(s*)://(.*?)/agent/(.*?)/code-scripts', 'g'),
        new RegExp('http(s*)://(.*?)/rule/triggers', 'g'),
        new RegExp('http(s*)://(.*?)/conversation/state/keys', 'g'),
        new RegExp('http(s*)://(.*?)/conversation/(.*?)/files/(.*?)', 'g'),
        new RegExp('http(s*)://(.*?)/llm-configs', 'g'),
        new RegExp('http(s*)://(.*?)/llm-provider/(.*?)/models', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collections', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/exist', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/details', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/processors', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/entity/analyzers', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/entity/data-providers', 'g'),
        new RegExp('http(s*)://(.*?)/logger/instruction/log', 'g'),
        new RegExp('http(s*)://(.*?)/logger/instruction/log/keys', 'g'),
        new RegExp('http(s*)://(.*?)/logger/conversation/(.*?)/content-log', 'g'),
        new RegExp('http(s*)://(.*?)/logger/conversation/(.*?)/state-log', 'g'),
        new RegExp('http(s*)://(.*?)/mcp/server-configs', 'g')
    ];

    if (config.method === 'post' && postRegexes.some(regex => regex.test(config.url || ''))) {
        return true;
    }

    if (config.method === 'put' && putRegexes.some(regex => regex.test(config.url || ''))) {
        return true;
    }

    if (config.method === 'delete' && deleteRegexes.some(regex => regex.test(config.url || ''))) {
        return true;
    }

    if (config.method === 'get' && getRegexes.some(regex => regex.test(config.url || ''))) {
        return true;
    }

    return false;
}

/** @param {import('axios').InternalAxiosRequestConfig<any>} config */
function skipGlobalError(config) {
    /** @type {RegExp[]} */
    const postRegexes = [
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/data', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/data/page', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/query', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/file/page', 'g'),
        new RegExp('http(s*)://(.*?)/refresh-agents', 'g')
    ];

    /** @type {RegExp[]} */
    const putRegexes = [
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/data', 'g'),
        new RegExp('http(s*)://(.*?)/role', 'g'),
        new RegExp('http(s*)://(.*?)/user', 'g'),
        new RegExp('http(s*)://(.*?)/conversation/(.*?)/update-message', 'g'),
        new RegExp('http(s*)://(.*?)/conversation/(.*?)/update-tags', 'g')
    ];

    /** @type {RegExp[]} */
    const deleteRegexes = [
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/data/(.*?)', 'g'),
        new RegExp('http(s*)://(.*?)/knowledge/collection/(.*?)/data', 'g'),
    ];

    /** @type {RegExp[]} */
    const getRegexes = [
        new RegExp('http(s*)://(.*?)/agents', 'g')
    ];

    if (config.method === 'post' && postRegexes.some(regex => regex.test(config.url || ''))) {
        return true;
    }

    if (config.method === 'put' && putRegexes.some(regex => regex.test(config.url || ''))) {
        return true;
    }

    if (config.method === 'delete' && deleteRegexes.some(regex => regex.test(config.url || ''))) {
        return true;
    }

    if (config.method === 'get' && getRegexes.some(regex => regex.test(config.url || ''))) {
        return true;
    }

    return false;
}

/**
 * @param {String} url
 * @param {Object} args
 * @returns {String}
 */
export function replaceUrl(url, args) {
    const keys = Object.keys(args);
    keys.forEach(key => {
        // @ts-ignore
        url = url.replace("{" + key + "}", args[key]);
    });
    return url;
}

/**
 * Replace new line as <br>
 * @param {string} text
 * @returns string
 */
export function replaceNewLine(text) {
    return text.replace(/(?:\r\n|\r|\n)/g, '<br>');
}

/**
 * Replace unnecessary markdown
 * @param {string} text
 * @returns {string}
 */
export function replaceMarkdown(text) {
    let res = text.replace(/#([\s]+)/g, '\\# ').replace(/^-[ \t]+/gm, '• ').replace(/[-|=]{3,}/g, '•••');

    let regex1 = new RegExp('\\*(.*)\\*', 'g');
    let regex2 = new RegExp('\\*([\\*]+)\\*', 'g');

    if (!regex1.test(text) || regex2.test(text)) {
        res = res.replace(/\*/g, '\\*');
    }

    return res;
}