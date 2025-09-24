const BASE_URL = 'http://127.0.0.1:8000';

window.onload = () => {
  const userId = localStorage.getItem('user_id');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPlanDisplay = document.getElementById('userPlan');
  const notificationBox = document.getElementById('notificationBox');

  if (!userId || !user?.plan) {
    alert("Session expired. Please login again.");
    window.location.href = "/login.html";
    return;
  }

  userPlanDisplay.textContent = `Your Plan: ${user.plan}`;

  document.getElementById("logout").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/index.html";
  });

  document.getElementById('requestForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const item_type = document.getElementById('item_type').value.trim();
    const quantity = parseInt(document.getElementById('quantity').value.trim());
    const note = document.getElementById('item_note').value.trim();
    const fileInput = document.getElementById('item_image');
    const paymentMethod = document.getElementById('payment_method').value;
    const hostelName = document.getElementById('hostel_name').value.trim();
    const roomNumber = document.getElementById('room_number').value.trim();
    const pickupTimeSlot = document.getElementById('pickup_time_slot').value;

    if (!item_type || isNaN(quantity) || quantity <= 0) {
      alert('Enter valid item type and quantity.');
      return;
    }

    if (!paymentMethod || !hostelName || !roomNumber || !pickupTimeSlot) {
      alert('Please fill all required fields.');
      return;
    }

    const formData = new FormData();
    formData.append('item_type', item_type);
    formData.append('quantity', quantity);
    formData.append('user_id', userId);
    formData.append('payment_method', paymentMethod);
    formData.append('hostel_name', hostelName);
    formData.append('room_number', roomNumber);
    formData.append('pickup_time_slot', pickupTimeSlot);
    if (note) formData.append('note', note);
    if (fileInput?.files.length > 0) {
      formData.append('image', fileInput.files[0]);
    }

    try {
      const res = await fetch(`${BASE_URL}/upload-request`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Request submitted! Order ID: ${data.order_id}`);
        document.getElementById('requestForm').reset();
        document.getElementById('estimatedPrice').textContent = '';
        fetchRequests();
      } else {
        alert(data.detail || 'Request submission failed.');
      }
    } catch (err) {
      console.error('Request failed:', err);
      alert('Something went wrong while submitting.');
    }
  });

  fetchRequests();
  fetchNotifications();  // ✅ Call notifications on load
};

async function fetchRequests() {
  const userId = localStorage.getItem('user_id');
  try {
    const res = await fetch(`${BASE_URL}/order-history/${userId}`);
    const data = await res.json();
    const list = document.getElementById('requestList');
    list.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
      list.innerHTML = '<li>No requests found.</li>';
      return;
    }

    data.forEach(req => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>Order ID:</strong> <code>${req.id}</code><br>
        <strong>${req.item_type}</strong> - ${req.quantity} pcs
        <br>Status: <strong>${req.status}</strong>
        ${req.payment_method ? `<br><strong>Payment:</strong> ${req.payment_method}` : ''}
        ${req.hostel_name ? `<br><strong>Hostel:</strong> ${req.hostel_name}` : ''}
        ${req.room_number ? `<br><strong>Room No:</strong> ${req.room_number}` : ''}
        ${req.pickup_time_slot ? `<br><strong>Pickup Slot:</strong> ${req.pickup_time_slot}` : ''}
        ${req.image_url ? `<br><img src="${BASE_URL}/${req.image_url}" width="100">` : ''}
        ${req.note ? `<br><em>Note: ${req.note}</em>` : ''}
        <hr>
      `;
      list.appendChild(li);
    });
  } catch (error) {
    console.error('Failed to fetch requests:', error);
    alert('Error fetching requests.');
  }
}

async function calculatePrice() {
  const item = document.getElementById('item_type').value.trim();
  const qty = parseInt(document.getElementById('quantity').value.trim());

  if (!item || isNaN(qty) || qty <= 0) {
    alert('Enter valid item and quantity.');
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/calculate-price?item_type=${encodeURIComponent(item)}&quantity=${qty}`);
    const data = await res.json();

    if (res.ok) {
      document.getElementById('estimatedPrice').textContent = `Estimated Cost: ₹${data.estimated_price}`;
    } else {
      document.getElementById('estimatedPrice').textContent = 'Pricing not found.';
    }
  } catch (err) {
    console.error('Calculation failed:', err);
    document.getElementById('estimatedPrice').textContent = 'Error calculating price.';
  }
}

// ✅ Fetch notifications for completed orders
async function fetchNotifications() {
  const userId = localStorage.getItem('user_id');
  const notificationBox = document.getElementById('notificationBox');

  try {
    const res = await fetch(`${BASE_URL}/user/notifications/${userId}`);
    const notifications = await res.json();

    if (res.ok && Array.isArray(notifications) && notifications.length > 0) {
      const message = notifications
        .filter(n => n.status === 'Completed')
        .map(n => `✅ Your Order #${n.order_id} is Completed!`)
        .join('<br>');

      if (message) {
        notificationBox.innerHTML = message;
        notificationBox.style.display = 'block';
      } else {
        notificationBox.style.display = 'none';
      }
    } else {
      notificationBox.style.display = 'none';
    }
  } catch (err) {
    console.error('Notification fetch failed:', err);
    notificationBox.style.display = 'none';
  }
}
