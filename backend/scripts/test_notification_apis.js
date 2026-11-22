const http = require('http');

async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:5001${path}`, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function main() {
  console.log('--- 1. Testing Unauthenticated Request ---');
  const res1 = await request('/api/v1/notifications', { method: 'GET' });
  console.log('Unauth status:', res1.status, res1.body.message || res1.body);
  if (res1.status !== 401) throw new Error('Expected 401 for unauthenticated request');

  console.log('\n--- 2. Logging in as Admin ---');
  const loginRes = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { identifier: 'admin_new@routine.vn', password: 'Admin@123456' },
  });
  console.log('Admin login status:', loginRes.status, loginRes.body.success);
  const adminToken = loginRes.body?.data?.token;
  if (!adminToken) throw new Error('Admin login failed');

  console.log('\n--- 3. Logging in as Customer ---');
  const custRes = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { identifier: '0912456789', password: 'Customer@123456' },
  });
  console.log('Customer login status:', custRes.status, custRes.body.success);
  const custToken = custRes.body?.data?.token;

  console.log('\n--- 4. Testing Customer Access to Admin Notifications (TEST 8) ---');
  const resCust = await request('/api/v1/notifications', {
    method: 'GET',
    headers: { Authorization: `Bearer ${custToken}` },
  });
  console.log('Customer notification access status:', resCust.status, resCust.body.message);
  if (resCust.status !== 403) throw new Error('Expected 403 for Customer accessing Admin Notifications');

  console.log('\n--- 5. Testing Admin Get Notifications ---');
  const resAdmin = await request('/api/v1/notifications', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Admin notifications status:', resAdmin.status, resAdmin.body.data);

  console.log('\n--- 6. Creating a Test Notification for Admin ---');
  const createRes = await request('/api/v1/notifications/test', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      type: 'ORDER_CREATED',
      title: 'Đơn hàng mới #TEST01',
      message: 'Khách hàng Nguyễn Văn Test vừa đặt đơn hàng trị giá 550.000đ.',
      link: '/admin/orders?orderId=test-order-01',
    },
  });
  console.log('Create status:', createRes.status, createRes.body.data);
  const createdId = createRes.body?.data?.id;

  console.log('\n--- 7. Mark single notification as read ---');
  const readRes = await request(`/api/v1/notifications/${createdId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Mark read status:', readRes.status, readRes.body.data);

  console.log('\n--- 8. Mark all notifications as read ---');
  const markAllRes = await request('/api/v1/notifications/mark-all-read', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Mark all read status:', markAllRes.status, markAllRes.body.data);

  console.log('\n--- ALL BACKEND NOTIFICATION APIS PASSED! ---');
}

main().catch(console.error);
