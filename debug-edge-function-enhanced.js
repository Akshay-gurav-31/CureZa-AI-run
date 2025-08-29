// Enhanced Edge Function Debug Script
// This script helps identify the exact cause of non-2xx status code errors

const SUPABASE_URL = 'https://uzfvianjqrdimuxkaqvf.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/google-drive-auth`;

// Test different scenarios that might cause non-2xx status codes
async function testEdgeFunction() {
    console.log('🔍 Enhanced Edge Function Debugging');
    console.log('=====================================');
    
    // Test 1: Basic function availability (OPTIONS request)
    console.log('\n1. Testing basic function availability...');
    try {
        const response = await fetch(FUNCTION_URL, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:8080'
            }
        });
        console.log(`✅ OPTIONS request: ${response.status} ${response.statusText}`);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));
    } catch (error) {
        console.error('❌ OPTIONS request failed:', error.message);
    }

    // Test 2: Missing action parameter
    console.log('\n2. Testing missing action parameter...');
    try {
        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:8080'
            },
            body: JSON.stringify({})
        });
        console.log(`Status: ${response.status} ${response.statusText}`);
        const result = await response.text();
        console.log('Response:', result);
    } catch (error) {
        console.error('❌ Missing action test failed:', error.message);
    }

    // Test 3: Invalid action
    console.log('\n3. Testing invalid action...');
    try {
        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:8080'
            },
            body: JSON.stringify({
                action: 'invalid_action'
            })
        });
        console.log(`Status: ${response.status} ${response.statusText}`);
        const result = await response.text();
        console.log('Response:', result);
    } catch (error) {
        console.error('❌ Invalid action test failed:', error.message);
    }

    // Test 4: Valid get_auth_url request
    console.log('\n4. Testing get_auth_url action...');
    try {
        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:8080'
            },
            body: JSON.stringify({
                action: 'get_auth_url'
            })
        });
        console.log(`Status: ${response.status} ${response.statusText}`);
        const result = await response.text();
        console.log('Response:', result);
        
        if (response.status !== 200) {
            console.log('❌ This might be the source of your non-2xx error!');
        }
    } catch (error) {
        console.error('❌ get_auth_url test failed:', error.message);
    }

    // Test 5: Missing access token for protected action
    console.log('\n5. Testing missing access token...');
    try {
        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:8080'
            },
            body: JSON.stringify({
                action: 'list_folders'
            })
        });
        console.log(`Status: ${response.status} ${response.statusText}`);
        const result = await response.text();
        console.log('Response:', result);
    } catch (error) {
        console.error('❌ Missing access token test failed:', error.message);
    }

    // Test 6: Invalid JSON body
    console.log('\n6. Testing invalid JSON...');
    try {
        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:8080'
            },
            body: 'invalid json content'
        });
        console.log(`Status: ${response.status} ${response.statusText}`);
        const result = await response.text();
        console.log('Response:', result);
    } catch (error) {
        console.error('❌ Invalid JSON test failed:', error.message);
    }

    // Test 7: Environment variables check (this will show if credentials are missing)
    console.log('\n7. Testing environment configuration...');
    try {
        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:8080'
            },
            body: JSON.stringify({
                action: 'get_auth_url'
            })
        });
        
        const result = await response.json();
        if (result.errorCode === 'ENV_MISSING') {
            console.log('❌ FOUND THE ISSUE: Missing environment variables!');
            console.log('You need to set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Supabase');
            console.log('Go to: Supabase Dashboard → Edge Functions → google-drive-auth → Settings → Environment Variables');
        } else if (result.auth_url) {
            console.log('✅ Environment variables are properly configured');
        }
    } catch (error) {
        console.error('❌ Environment test failed:', error.message);
    }

    console.log('\n🎯 Debug Summary:');
    console.log('================');
    console.log('If you see any non-2xx status codes above, those are likely the cause.');
    console.log('Common causes:');
    console.log('- Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in Supabase Edge Function env vars');
    console.log('- Invalid request format (missing action, invalid JSON)');
    console.log('- Network connectivity issues');
    console.log('- Expired or invalid access tokens for protected actions');
}

// Run the debug tests
testEdgeFunction().catch(console.error);