// Simple test script for waitlist API
async function testWaitlistAPI() {
  try {
    console.log("🧪 Testing waitlist API...");
    
    const response = await fetch('http://localhost:3000/api/waitlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        full_name: 'Test User'
      })
    });

    console.log("📡 Response status:", response.status);
    console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log("📄 Response data:", data);

    if (!response.ok) {
      console.error("❌ API returned error:", data);
    } else {
      console.log("✅ API test successful!");
    }
  } catch (error) {
    console.error("💥 Test failed:", error);
  }
}

testWaitlistAPI(); 