/**
 * Realtime Event Hub sử dụng Server-Sent Events (SSE)
 * Cung cấp cơ chế thông báo và đồng bộ thời gian thực 2 chiều giữa Admin và Customer.
 * Đảm bảo:
 * 1. Phân quyền kênh (Admin channel, Customer personal channel, Public channel).
 * 2. Tự động gửi heartbeat duy trì kết nối chống ngắt đường truyền.
 * 3. Hỗ trợ tự phục hồi và đồng bộ lại khi mất mạng.
 */

const clients = new Set();
let eventSequence = 0;

// Bộ đệm 50 sự kiện gần nhất để hỗ trợ đồng bộ lại sau khi mất kết nối (Reconnection sync)
const recentEvents = [];
const MAX_RECENT_EVENTS = 50;

/**
 * Thêm một kết nối client mới vào danh sách lắng nghe SSE
 */
function addClient(res, clientInfo = {}) {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const client = {
    id: clientId,
    res,
    role: clientInfo.role || 'GUEST',
    userId: clientInfo.userId || null,
    guestSessionId: clientInfo.guestSessionId || null,
    connectedAt: new Date(),
  };

  clients.add(client);

  // Thiết lập HTTP Headers chuẩn cho SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Gửi sự kiện ban đầu xác nhận kết nối thành công
  sendEventToClient(client, 'CONNECTED', {
    clientId,
    role: client.role,
    userId: client.userId,
    serverTime: new Date().toISOString(),
    message: 'Kết nối đồng bộ thời gian thực thành công.',
  });

  // Lắng nghe sự kiện ngắt kết nối
  res.on('close', () => {
    clients.delete(client);
  });

  return clientId;
}

/**
 * Gửi một sự kiện SSE tới một client cụ thể
 */
function sendEventToClient(client, eventType, data) {
  try {
    const eventId = ++eventSequence;
    client.res.write(`id: ${eventId}\n`);
    client.res.write(`event: ${eventType}\n`);
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (err) {
    clients.delete(client);
  }
}

/**
 * Phát sự kiện thời gian thực (Emit event)
 * @param {string} eventType - Tên sự kiện (PRODUCT_CREATED, ORDER_CREATED, ...)
 * @param {object} payload - Dữ liệu kèm theo
 * @param {string} target - Phạm vi nhận ('ALL' | 'ADMIN' | 'USER:<id>' | 'GUEST:<id>')
 */
function emit(eventType, payload, target = 'ALL') {
  const eventId = ++eventSequence;
  const eventRecord = {
    id: eventId,
    eventType,
    payload,
    target,
    timestamp: new Date().toISOString(),
  };

  // Lưu vào hàng đợi sự kiện gần nhất
  recentEvents.push(eventRecord);
  if (recentEvents.length > MAX_RECENT_EVENTS) {
    recentEvents.shift();
  }

  // Lọc và gửi sự kiện theo đúng quyền hạn
  for (const client of clients) {
    let shouldSend = false;

    if (target === 'ALL') {
      shouldSend = true;
    } else if (target === 'ADMIN') {
      shouldSend = client.role === 'ADMIN';
    } else if (target.startsWith('USER:')) {
      const targetUserId = target.replace('USER:', '');
      shouldSend = client.role === 'ADMIN' || (client.userId && client.userId === targetUserId);
    } else if (target.startsWith('GUEST:')) {
      const targetGuestId = target.replace('GUEST:', '');
      shouldSend = client.role === 'ADMIN' || (client.guestSessionId && client.guestSessionId === targetGuestId);
    }

    if (shouldSend) {
      sendEventToClient(client, eventType, payload);
    }
  }

  return { emitted: true, eventId, totalSubscribers: clients.size };
}

/**
 * Lấy số lượng kết nối đang hoạt động
 */
function getActiveConnectionsCount() {
  return clients.size;
}

/**
 * Lấy danh sách sự kiện gần nhất để hỗ trợ đồng bộ lại sau khi mất kết nối
 */
function getRecentEvents(sinceEventId = 0, role = 'GUEST', userId = null) {
  return recentEvents.filter((e) => {
    if (e.id <= sinceEventId) return false;
    if (e.target === 'ALL') return true;
    if (role === 'ADMIN') return true;
    if (e.target.startsWith('USER:') && userId && e.target === `USER:${userId}`) return true;
    return false;
  });
}

// Gửi heartbeat ping mỗi 20 giây để giữ kết nối không bị timeout bởi proxy / router
setInterval(() => {
  for (const client of clients) {
    try {
      client.res.write(': ping\n\n');
    } catch {
      clients.delete(client);
    }
  }
}, 20000);

module.exports = {
  addClient,
  emit,
  getActiveConnectionsCount,
  getRecentEvents,
};
