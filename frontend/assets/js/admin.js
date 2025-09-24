const BASE_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {
  const loginSection = document.getElementById("adminLogin");
  const loginBtn = document.getElementById("adminLoginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const controls = document.getElementById("adminControls");
  const summaryContainer = document.getElementById("summary");
  const chartCanvas = document.getElementById("orderChart");
  const ordersList = document.getElementById("ordersList");

  // ✅ If already logged in
  if (localStorage.getItem("role") === "admin") {
    renderAdminDashboard();
  }

  // ✅ Login logic
  loginBtn.addEventListener("click", async () => {
    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value.trim();

    if (!username || !password) {
      alert("Please enter username and password.");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.role === "admin") {
        localStorage.setItem("role", "admin");
        localStorage.setItem("user_id", data.user_id);
        renderAdminDashboard();
      } else {
        alert("❌ Access denied. Only admins are allowed.");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed. Check server/network.");
    }
  });

  // ✅ Logout logic
  logoutBtn.addEventListener("click", () => {
    localStorage.clear();
    window.location.reload();
  });

  // ✅ Render dashboard
  function renderAdminDashboard() {
    loginSection.classList.add("hidden");
    controls.classList.remove("hidden");
    summaryContainer.classList.remove("hidden");
    chartCanvas.classList.remove("hidden");
    ordersList.classList.remove("hidden");
    loadDashboard();
  }

  // ✅ Load dashboard data
  async function loadDashboard() {
    await fetchAdminSummary();
    await renderChart();
    await fetchAllOrders();
  }

  // ✅ Admin summary
  async function fetchAdminSummary() {
    try {
      const res = await fetch(`${BASE_URL}/admin/summary`);
      const data = await res.json();

      summaryContainer.innerHTML = `
        <div><strong>Total Users:</strong> ${data.total_users}</div>
        <div><strong>Completed Orders:</strong> ${data.completed_orders}</div>
        <div><strong>Total Revenue:</strong> ₹${data.total_revenue}</div>
        <div><strong>Most Washed Item:</strong> ${data.most_washed_item || "N/A"}</div>
      `;
    } catch (err) {
      console.error("Summary fetch error:", err);
      summaryContainer.innerHTML = "<div>❌ Failed to load summary</div>";
    }
  }

  // ✅ Chart: Orders per Month
  async function renderChart() {
    try {
      const res = await fetch(`${BASE_URL}/admin/orders-per-month`);
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        chartCanvas.classList.add("hidden");
        return;
      }

      const labels = data.map(item => `Month ${item.month}`);
      const values = data.map(item => item.count);

      new Chart(chartCanvas.getContext("2d"), {
        type: "bar",
        data: {
          labels: labels,
          datasets: [{
            label: "Orders per Month",
            data: values,
            backgroundColor: "#007bff"
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: "Monthly Order Stats" }
          }
        }
      });

    } catch (err) {
      console.error("Chart rendering error:", err);
    }
  }

  // ✅ Fetch and display all orders
  async function fetchAllOrders() {
    try {
      const res = await fetch(`${BASE_URL}/all-orders`);

      if (!res.ok) {
        const text = await res.text();
        console.error("Non-OK response from /all-orders:", text);
        throw new Error("Failed to fetch orders: " + text);
      }

      const orders = await res.json();
      ordersList.innerHTML = "";

      if (orders.length === 0) {
        ordersList.innerHTML = "<p>No orders found.</p>";
        return;
      }

      orders.forEach(order => {
        const box = document.createElement("div");
        box.className = "order-box";
        box.innerHTML = `
          <div><strong>Order ID:</strong> ${order.id}</div>
          <div><strong>Item:</strong> ${order.item_type}</div>
          <div><strong>Quantity:</strong> ${order.quantity}</div>
          <div><strong>Status:</strong> ${order.status}</div>
          <div><strong>User ID:</strong> ${order.user_id}</div>
          <div><strong>Hostel:</strong> ${order.hostel_name || ""}, Room: ${order.room_number || ""}</div>
          <div><strong>Pickup Slot:</strong> ${order.pickup_time_slot || ""}</div>
          ${
            order.status === "Pending"
              ? `<button onclick="markCompleted('${order.id}', this)">✅ Mark as Completed</button>`
              : `<button class="disabled" disabled>✔ Completed</button>`
          }
        `;
        ordersList.appendChild(box);
      });
    } catch (err) {
      console.error("Error loading orders", err);
      ordersList.innerHTML = "<p>❌ Failed to load orders.</p>";
    }
  }
});


async function markCompleted(orderId, btn) {
  try {
    const res = await fetch(`http://localhost:8000/admin/update-status/${orderId}`, {
      method: "PUT"
    });

    const data = await res.json();
    if (res.ok) {
      btn.textContent = "✔ Completed";
      btn.classList.add("disabled");
      btn.disabled = true;
      alert("✅ Order marked as completed and user notified.");

      document.getElementById("summary").scrollIntoView({ behavior: "smooth" });
      document.querySelector("#summary").innerHTML = "...Updating...";
      setTimeout(() => window.location.reload(), 1000);
    } else {
      alert("❌ Failed to mark order: " + data.detail);
    }
  } catch (err) {
    console.error("Mark complete error:", err);
    alert("Error updating order status.");
  }
}
