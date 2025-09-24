document.addEventListener("DOMContentLoaded", () => {
  const result = document.getElementById('result');
  const trackBtn = document.getElementById("trackBtn");
  const logoutBtn = document.getElementById("logout");
  const notificationBox = document.getElementById("notificationBox");
  const userId = localStorage.getItem("user_id");

  // Show notification if user is logged in
  async function loadNotifications() {
    if (!userId || !notificationBox) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/user/notifications/${userId}`);
      if (!res.ok) return;

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const last = data[data.length - 1];
        notificationBox.innerHTML = `✅ Order <strong>${last.order_id}</strong> is <strong>${last.status}</strong>`;
      } else {
        notificationBox.innerHTML = ""; // No notifications
      }
    } catch (err) {
      console.warn("Notification fetch error:", err);
      notificationBox.innerHTML = "";
    }
  }

  // Load notifications on page load
  loadNotifications();

  // Logout
  logoutBtn.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/index.html";
  });

  // Track order
  trackBtn.addEventListener("click", async () => {
    const id = document.getElementById('orderId').value.trim();
    result.innerHTML = "";

    if (!id) {
      result.innerHTML = "<span style='color: yellow;'>Please enter a valid Order ID.</span>";
      return;
    }

    result.innerHTML = "⏳ Fetching order...";

    try {
      const response = await fetch(`http://127.0.0.1:8000/order/${id}`);
      const data = await response.json();

      if (!response.ok) {
        result.innerHTML = `<span style="color: red;">${data.detail || "Order not found. Please check the ID."}</span>`;
        return;
      }

      const date = new Date(data.date_created).toLocaleString();

      result.innerHTML = `
        <strong>Item:</strong> ${data.item_type}<br>
        <strong>Quantity:</strong> ${data.quantity}<br>
        <strong>Status:</strong> ${data.status}<br>
        <strong>Total Price:</strong> ₹${data.total_price}<br>
        ${data.note ? `<strong>Note:</strong> ${data.note}<br>` : ''}
        ${data.image_url ? `<br><img src="http://127.0.0.1:8000/${data.image_url}" width="100" alt="Uploaded Image"><br>` : ''}
        <strong>Date:</strong> ${date}
      `;
    } catch (error) {
      console.error("Tracking error:", error);
      result.innerHTML = "<span style='color: orange;'>Something went wrong. Please try again later.</span>";
    }
  });
});
