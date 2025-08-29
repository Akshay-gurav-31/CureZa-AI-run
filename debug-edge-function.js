/**
 * Debug script for testing the Edge Function locally
 * Run with: node debug-edge-function.js
 */

// Simple test to verify the Edge Function is working
async function testEdgeFunction() {
  const EDGE_FUNCTION_URL = 'https://uzfvianjqrdimuxkaqvf.supabase.co/functions/v1/google-drive-auth';
  
  console.log('🔍 Testing Edge Function:', EDGE_FUNCTION_URL);
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log();
  
  // Test 1: Basic connectivity and auth URL generation
  console.log('📋 Test 1: Get Auth URL (should work without credentials)');
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:8080'
      },
      body: JSON.stringify({
        action: 'get_auth_url'
      })
    });
    
    console.log('📡 Response Status:', response.status, response.statusText);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success:', data);
      console.log('🔗 Auth URL generated:', !!data.auth_url);
    } else {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
    }
    
  } catch (error) {
    console.log('💥 Network Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 2: Test with missing parameters (should return 400)
  console.log('📋 Test 2: Missing Parameters (should return 400)');
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'list_folders'
        // Missing access_token intentionally
      })
    });
    
    console.log('📡 Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('✅ Expected Error:', errorData);
    } else {
      const data = await response.json();
      console.log('❓ Unexpected Success:', data);
    }
    
  } catch (error) {
    console.log('💥 Network Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 3: Test with invalid action (should return 400)
  console.log('📋 Test 3: Invalid Action (should return 400)');
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'invalid_action_test'
      })
    });
    
    console.log('📡 Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('✅ Expected Error:', errorData);
    } else {
      const data = await response.json();
      console.log('❓ Unexpected Success:', data);
    }
    
  } catch (error) {
    console.log('💥 Network Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 4: Test with malformed JSON (should handle gracefully)
  console.log('📋 Test 4: Malformed Request (should handle gracefully)');
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: '{"action": invalid json'
    });
    
    console.log('📡 Response Status:', response.status, response.statusText);
    
    const responseText = await response.text();
    console.log('📄 Response Body:', responseText);
    
  } catch (error) {
    console.log('💥 Network Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('🏁 Debug test complete!');
  console.log('💡 If all tests pass, the Edge Function is working correctly.');
  console.log('💡 The issue might be with the access token or specific request from your app.');
}

// Run the tests
testEdgeFunction().catch(console.error);