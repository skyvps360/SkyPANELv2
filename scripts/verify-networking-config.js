#!/usr/bin/env node

/**
 * Verify Admin Networking rDNS endpoints
 * - Logs in as default admin
 * - Fetches current rDNS config
 * - Updates rDNS base domain
 * - Reads back to confirm
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.VITE_API_URL?.replace(/\/$/, '') || `http://localhost:${process.env.PORT || 3001}/api`;

async function main() {
  try {
    console.log(`🔗 Using API base: ${API_BASE}`);

    // Login
    console.log('🔐 Logging in as admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@containerstacks.com',
      password: 'admin123'
    });
    const token = loginRes.data?.token;
    if (!token) {
      throw new Error('No token in login response');
    }
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    console.log('✅ Logged in, token acquired');

    // GET current config
    console.log('📥 Fetching current rDNS config...');
    const get1 = await axios.get(`${API_BASE}/admin/networking/rdns`, auth);
    console.log('   Current:', get1.data);

    // PUT update config
    const newDomain = 'ip.rev.skyvps360.xyz';
    console.log(`📝 Updating rDNS base domain to: ${newDomain}`);
    const put = await axios.put(`${API_BASE}/admin/networking/rdns`, { rdns_base_domain: newDomain }, auth);
    console.log('   Updated:', put.data);

    // GET again to confirm
    const get2 = await axios.get(`${API_BASE}/admin/networking/rdns`, auth);
    console.log('📥 After update:', get2.data);

    console.log('🎉 Verification complete');
  } catch (err) {
    console.error('❌ Verification failed:', err?.response?.data || err?.message || err);
    process.exit(1);
  }
}

main();