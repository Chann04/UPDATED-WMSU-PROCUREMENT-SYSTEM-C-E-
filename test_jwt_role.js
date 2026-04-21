// Quick test to verify JWT has correct role claim
// Run this in browser console on your registration page

const jwt = import.meta.env.VITE_SUPABASE_ANON_KEY; // or paste your JWT here

function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch (e) {
    return { error: e.message };
  }
}

const payload = decodeJWT(jwt);
console.log('JWT Payload:', payload);
console.log('Role:', payload.role);
console.log('Expected: anon');
console.log('Match:', payload.role === 'anon' ? '✅ YES' : '❌ NO');

