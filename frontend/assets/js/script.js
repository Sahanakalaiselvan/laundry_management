async function fetchOrders() {
  const userId = localStorage.getItem('user_id');

  if (!userId) {
    alert('You are not logged in.');
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch(`http://localhost:8000/my-orders?user_id=${userId}`);

    if (!res.ok) {
      throw new Error('Failed to fetch orders');
    }

    const orders = await res.json();
    const list = document.getElementById('ordersList');
    list.innerHTML = '';

    if (orders.length === 0) {
      list.innerHTML = '<li>No orders found.</li>';
      return;
    }

    orders.forEach(order => {
      const li = document.createElement('li');
      li.textContent = `${order.item_type} - ${order.quantity} pcs - Status: ${order.status}`;
      list.appendChild(li);
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    alert('Could not load orders. Please try again.');
  }
}

function logout() {
  localStorage.removeItem('user_id');
  localStorage.removeItem('role');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

window.onload = fetchOrders;
