async function checkLogin() {
  const loginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin_new@routine.vn',
      password: 'Admin@123456',
    }),
  });
  const data = await loginRes.json();
  console.log('Login response:', JSON.stringify(data, null, 2));

  if (data.data?.tokens) {
    const token = data.data.tokens.accessToken || data.data.tokens.token;
    console.log('Testing auth with token:', token?.slice(0, 30));
    const testRes = await fetch('http://localhost:5001/api/v1/bi/overview', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const testJson = await testRes.json();
    console.log('BI Overview response:', testRes.status, testJson);
  }
}
checkLogin();
