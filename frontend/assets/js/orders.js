document.addEventListener("DOMContentLoaded", () => {
  const userId = localStorage.getItem("user_id");

  if (!userId) {
    alert("Session expired. Please log in again.");
    window.location.href = "/login.html";
    return;
  }

  const orderList = document.getElementById("orderList");
  const notificationBox = document.getElementById("notificationBox");

  async function loadNotifications() {
    if (!notificationBox) return;

    notificationBox.innerHTML = "🔔 Checking for updates...";
    try {
      const res = await fetch(`http://127.0.0.1:8000/user/notifications/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch notifications");

      const notifications = await res.json();

      if (Array.isArray(notifications) && notifications.length > 0) {
        notificationBox.innerHTML = notifications
          .map(n => `<div class="notification">✅ Order ${n.order_id} is ${n.status}</div>`)
          .join("");
      } else {
        notificationBox.innerHTML = ""; // No notifications
      }
    } catch (err) {
      console.error("Notification error:", err);
      notificationBox.innerHTML = "";
    }
  }

  async function fetchOrders(month = "", year = "") {
    orderList.innerHTML = "🔄 Loading...";

    try {
      const url = new URL(`http://127.0.0.1:8000/order-history/${userId}`);
      if (month) url.searchParams.append("month", month);
      if (year) url.searchParams.append("year", year);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const orders = await res.json();
      if (!Array.isArray(orders) || orders.length === 0) {
        orderList.innerHTML = "📭 No orders found.";
        return;
      }

      orderList.innerHTML = "";

      orders.forEach((order) => {
        const status = order.status || "Pending";
        const statusClass = `status-${status.toLowerCase()}`;
        const formattedDate = order.date_created
          ? new Date(order.date_created).toLocaleString()
          : "N/A";
        const estimatedDelivery = order.date_created
          ? new Date(new Date(order.date_created).getTime() + 3 * 86400000).toLocaleDateString()
          : "N/A";

        const card = document.createElement("div");
        card.className = "order-card";
        card.innerHTML = `
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Item:</strong> ${order.item_type}</p>
          <p><strong>Quantity:</strong> ${order.quantity}</p>
          <p><strong>Hostel:</strong> ${order.hostel_name || "N/A"}</p>
          <p><strong>Room Number:</strong> ${order.room_number || "N/A"}</p>
          <p><strong>Pickup Slot:</strong> ${order.pickup_time_slot || "N/A"}</p>
          <p><strong>Status:</strong> <span class="${statusClass}">${status}</span></p>
          <p><strong>Total:</strong> ₹${order.total_price ?? 0}</p>
          <p><strong>Ordered:</strong> ${formattedDate}</p>
          <p><strong>Est. Delivery:</strong> ${estimatedDelivery}</p>
          ${
            status.toLowerCase() === "pending"
              ? `<button class="cancel-btn" data-id="${order.id}">Cancel</button>`
              : ""
          }
          <br><br>
          <button class="receipt-btn" data-id="${order.id}">Download Receipt</button><br/>
          <input type="text" class="feedback-input" data-id="${order.id}" placeholder="Leave feedback..." />
        `;
        orderList.appendChild(card);
      });

      addButtonListeners();
    } catch (err) {
      console.error("Error loading orders:", err);
      orderList.innerHTML = "⚠️ Failed to load orders.";
    }
  }

  function addButtonListeners() {
    document.querySelectorAll(".cancel-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const orderId = btn.dataset.id;
        const confirmCancel = confirm("Are you sure you want to cancel this order?");
        if (!confirmCancel) return;

        try {
          const res = await fetch(`http://127.0.0.1:8000/cancel-order/${orderId}`, {
            method: "PUT",
          });
          if (res.ok) {
            alert("Order cancelled.");
            document.getElementById("filterForm").dispatchEvent(new Event("submit"));
          } else {
            alert("Failed to cancel.");
          }
        } catch (err) {
          console.error("Cancel error:", err);
          alert("Error cancelling order.");
        }
      });
    });

    document.querySelectorAll(".receipt-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const orderId = btn.dataset.id;
        window.open(`http://127.0.0.1:8000/download-receipt/${orderId}`, "_blank");
      });
    });

    document.querySelectorAll(".feedback-input").forEach((input) => {
      input.addEventListener("blur", async (e) => {
        const orderId = e.target.dataset.id;
        const feedback = e.target.value.trim();
        if (!feedback) return;

        try {
          const formData = new FormData();
          formData.append("feedback", feedback);

          const res = await fetch(`http://127.0.0.1:8000/feedback/${orderId}`, {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            alert("Feedback submitted!");
            e.target.value = "";
          } else {
            alert("Failed to submit feedback.");
          }
        } catch (err) {
          console.error("Feedback error:", err);
          alert("Error while submitting feedback.");
        }
      });
    });
  }

  document.getElementById("filterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const month = document.getElementById("month").value;
    const year = document.getElementById("year").value;
    fetchOrders(month, year);
  });

  document.getElementById("logout").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/index.html";
  });

  const now = new Date();
  document.getElementById("month").value = String(now.getMonth() + 1);
  document.getElementById("year").value = String(now.getFullYear());

  loadNotifications(); // ✅ Load status updates
  fetchOrders(String(now.getMonth() + 1), String(now.getFullYear()));
});
