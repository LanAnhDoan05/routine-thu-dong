const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== EXECUTE SAFE CLEANUP OF TEST/JUNK DATA ===');

  const testUserEmails = [
    'test_customer_1794599192771@gmail.com',
    'test_customer_1794599037198@gmail.com',
    'test_customer_1794599258955@gmail.com',
    'test_customer_1794599073823@gmail.com',
    'test_customer_1794599222692@gmail.com',
    'pkg_a_test@routine.vn',
    'abc1@gmail.com',
    'hihihi@gmail.com',
    'nguoidepdatcang05@gmail.com'
  ];

  const testOrderIds = [
    'TEST-ORD-1794244043248',
    'TEST-ORD-1794597160524'
  ];

  // 1. Tìm các User cần xóa
  const usersToDelete = await prisma.user.findMany({
    where: { email: { in: testUserEmails } },
    select: { id: true, email: true, fullName: true }
  });
  const userIds = usersToDelete.map(u => u.id);
  console.log(`Tìm thấy ${usersToDelete.length} tài khoản test cần dọn dẹp:`, usersToDelete.map(u => u.email));

  // 2. Tìm các đơn hàng liên quan đến các user này
  const ordersOfTestUsers = await prisma.order.findMany({
    where: { userId: { in: userIds } },
    select: { id: true }
  });
  const allOrderIdsToDelete = [...new Set([...testOrderIds, ...ordersOfTestUsers.map(o => o.id)])];
  console.log(`Tìm thấy ${allOrderIdsToDelete.length} đơn hàng test cần xóa:`, allOrderIdsToDelete);

  // 3. Xóa theo đúng thứ tự ràng buộc khóa ngoại (Foreign Key Integrity)
  // 3.1. Xóa order_items của các đơn hàng test
  const deletedOrderItems = await prisma.orderItem.deleteMany({
    where: { orderId: { in: allOrderIdsToDelete } }
  });
  console.log(`  -> Đã xóa ${deletedOrderItems.count} chi tiết đơn hàng test (order_items)`);

  // 3.2. Xóa stock_reservations nếu có
  const deletedReservations = await prisma.stockReservation.deleteMany({
    where: { orderId: { in: allOrderIdsToDelete } }
  });
  console.log(`  -> Đã xóa ${deletedReservations.count} bản ghi giữ hàng (stock_reservations)`);

  // 3.3. Xóa các đơn hàng test
  const deletedOrders = await prisma.order.deleteMany({
    where: { id: { in: allOrderIdsToDelete } }
  });
  console.log(`  -> Đã xóa ${deletedOrders.count} đơn hàng test (orders)`);

  // 3.4. Xóa cart_items và carts của các user test
  const userCarts = await prisma.cart.findMany({
    where: { userId: { in: userIds } },
    select: { id: true }
  });
  const cartIds = userCarts.map(c => c.id);
  const deletedCartItems = await prisma.cartItem.deleteMany({
    where: { cartId: { in: cartIds } }
  });
  console.log(`  -> Đã xóa ${deletedCartItems.count} sản phẩm trong giỏ hàng test (cart_items)`);

  const deletedCarts = await prisma.cart.deleteMany({
    where: { id: { in: cartIds } }
  });
  console.log(`  -> Đã xóa ${deletedCarts.count} giỏ hàng test (carts)`);

  // 3.5. Xóa wishlist_items và wishlists
  const userWishlists = await prisma.wishlist.findMany({
    where: { userId: { in: userIds } },
    select: { id: true }
  });
  const wishlistIds = userWishlists.map(w => w.id);
  const deletedWishlistItems = await prisma.wishlistItem.deleteMany({
    where: { wishlistId: { in: wishlistIds } }
  });
  console.log(`  -> Đã xóa ${deletedWishlistItems.count} sản phẩm yêu thích test (wishlist_items)`);

  const deletedWishlists = await prisma.wishlist.deleteMany({
    where: { id: { in: wishlistIds } }
  });
  console.log(`  -> Đã xóa ${deletedWishlists.count} danh sách yêu thích test (wishlists)`);

  // 3.6. Xóa addresses của các user test
  const deletedAddresses = await prisma.address.deleteMany({
    where: { userId: { in: userIds } }
  });
  console.log(`  -> Đã xóa ${deletedAddresses.count} địa chỉ test (addresses)`);

  // 3.7. Xóa reviews của các user test nếu có
  const deletedReviews = await prisma.review.deleteMany({
    where: { userId: { in: userIds } }
  });
  console.log(`  -> Đã xóa ${deletedReviews.count} đánh giá test (reviews)`);

  // 3.8. Xóa tài khoản users test
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: userIds } }
  });
  console.log(`  -> Đã xóa ${deletedUsers.count} tài khoản người dùng test (users)`);

  // 4. Thống kê lại sau khi dọn dẹp
  const [remUsers, remOrders, remItems, remProducts] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.product.count()
  ]);

  console.log('\n=== KẾT QUẢ SAU KHI LÀM SẠCH ===');
  console.log(`- Tài khoản người dùng còn lại: ${remUsers}`);
  console.log(`- Đơn hàng còn lại:            ${remOrders}`);
  console.log(`- Chi tiết đơn còn lại:        ${remItems}`);
  console.log(`- Sản phẩm (bảo toàn 100%):    ${remProducts}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
