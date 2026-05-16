/* ═══════════════════════════════════════════
   AFREEN TRADERS — Shiprocket API Service
   Authentication, Shipment Creation & Tracking
═══════════════════════════════════════════ */

import axios from 'axios';

const SHIPROCKET_URL = 'https://apiv2.shiprocket.in/v1/external';
let _token = null;
let _tokenExpiry = null;

/**
 * Helper to securely get credentials from Vite env.
 */
function getCredentials() {
    return {
        email: import.meta.env.VITE_SHIPROCKET_EMAIL,
        password: import.meta.env.VITE_SHIPROCKET_PASSWORD
    };
}

/**
 * Authenticate with Shiprocket and retrieve/cache a JWT token.
 */
export async function getShiprocketToken() {
    /* Return cached token if valid */
    if (_token && _tokenExpiry && new Date() < _tokenExpiry) {
        return _token;
    }

    try {
        const { email, password } = getCredentials();
        if (!email || !password) {
            throw new Error("Shiprocket credentials missing from environment.");
        }

        const res = await axios.post(`${SHIPROCKET_URL}/auth/login`, { email, password });
        
        if (res.data && res.data.token) {
            _token = res.data.token;
            
            /* Assuming token lasts around 9 days, we cache it for 24 hours to be safe */
            const expiry = new Date();
            expiry.setHours(expiry.getHours() + 24);
            _tokenExpiry = expiry;
            
            return _token;
        } else {
            throw new Error("Failed to retrieve token from Shiprocket.");
        }
    } catch (err) {
        console.error("Shiprocket Auth Error:", err.response?.data || err.message);
        throw err;
    }
}

/**
 * Base axios instance configured with Authorization header.
 */
async function getApiClient() {
    const token = await getShiprocketToken();
    return axios.create({
        baseURL: SHIPROCKET_URL,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
}

/**
 * Create a custom order and generate a shipment directly.
 * 
 * @param {Object} orderData Custom mapped order data
 * @returns {Object} Shipment creation response (order_id, shipment_id, status_code)
 */
export async function createCustomOrder(orderData) {
    try {
        const api = await getApiClient();
        const response = await api.post('/orders/create/adhoc', orderData);
        return response.data;
    } catch (err) {
        console.error("Shiprocket Order Creation Error:", err.response?.data || err.message);
        throw err;
    }
}

/**
 * Generate AWB for a given shipment_id.
 * Note: Shiprocket auto-assigns courier, but we can specify courier_id if we want.
 * We'll use the AWB generation endpoint.
 * 
 * @param {String|Number} shipmentId 
 * @returns {Object} AWB generation response (awb_code, courier_name, etc.)
 */
export async function generateAWB(shipmentId) {
    try {
        const api = await getApiClient();
        const response = await api.post('/courier/assign/awb', {
            shipment_id: shipmentId
        });
        return response.data;
    } catch (err) {
        console.error("Shiprocket AWB Error:", err.response?.data || err.message);
        throw err;
    }
}

/**
 * Fetch live tracking data for a specific AWB.
 * 
 * @param {String} awbCode 
 * @returns {Object} Tracking timeline data
 */
export async function trackByAWB(awbCode) {
    try {
        const api = await getApiClient();
        const response = await api.get(`/courier/track/awb/${awbCode}`);
        return response.data;
    } catch (err) {
        console.error("Shiprocket Tracking Error:", err.response?.data || err.message);
        throw err;
    }
}

/**
 * Serviceability check to get estimated delivery date
 * 
 * @param {String} pickupPincode 
 * @param {String} deliveryPincode 
 * @param {Number} weight in KG 
 * @param {Number} cod 1 or 0
 * @returns {Object} Courier serviceability data
 */
export async function checkServiceability(pickupPincode, deliveryPincode, weight, cod = 0) {
    try {
        const api = await getApiClient();
        const response = await api.get('/courier/serviceability/', {
            params: {
                pickup_postcode: pickupPincode,
                delivery_postcode: deliveryPincode,
                weight: weight,
                cod: cod
            }
        });
        return response.data;
    } catch (err) {
        console.error("Shiprocket Serviceability Error:", err.response?.data || err.message);
        throw err;
    }
}
