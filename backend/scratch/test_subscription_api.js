const http = require("http");

function makeRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";
    const options = {
      hostname: "localhost",
      port: 5000,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on("error", (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  const userId = "6aaa685bc7a8e4a210c6d15f";
  console.log("--- 1. Testing GET Plans ---");
  const plans = await makeRequest("/api/subscription/plans", "GET");
  console.log("Plans Status:", plans.status, "Gold Yearly Price:", plans.body.pricing?.Gold?.yearly);

  console.log("\n--- 2. Testing Create Order (Gold Yearly) ---");
  const order = await makeRequest("/api/subscription/create-order", "POST", {
    userId,
    plan: "Gold",
    billingCycle: "yearly"
  });
  console.log("Create Order Result:", order.status, order.body);

  console.log("\n--- 3. Testing Verify Payment (Success Scenario) ---");
  const verifySuccess = await makeRequest("/api/subscription/verify-payment", "POST", {
    userId,
    razorpayOrderId: order.body.orderId,
    razorpayPaymentId: "pay_test_gold_123",
    razorpaySignature: "sig_test_verified",
    plan: "Gold",
    billingCycle: "yearly",
    simulateResult: "success"
  });
  console.log("Verify Payment Success Result:", verifySuccess.status, verifySuccess.body.message);
  console.log("New User Plan:", verifySuccess.body.user?.subscriptionPlan, "Quality:", verifySuccess.body.user?.streamingQuality);

  console.log("\n--- 4. Testing Duplicate Payment Prevention ---");
  const verifyDup = await makeRequest("/api/subscription/verify-payment", "POST", {
    userId,
    razorpayOrderId: order.body.orderId,
    razorpayPaymentId: "pay_test_gold_123",
    razorpaySignature: "sig_test_verified",
    plan: "Gold",
    billingCycle: "yearly",
    simulateResult: "duplicate"
  });
  console.log("Duplicate Payment Result:", verifyDup.status, verifyDup.body.message);

  console.log("\n--- 5. Testing Payment Failure Simulation ---");
  const verifyFail = await makeRequest("/api/subscription/verify-payment", "POST", {
    userId,
    razorpayOrderId: "order_test_fail_999",
    razorpayPaymentId: "pay_test_fail_999",
    plan: "Silver",
    billingCycle: "monthly",
    simulateResult: "failed",
    failureReason: "Card declined by issuing bank"
  });
  console.log("Failed Payment Result:", verifyFail.status, verifyFail.body.message);

  console.log("\n--- 6. Testing Billing History ---");
  const history = await makeRequest(`/api/subscription/history/${userId}`, "GET");
  console.log("Billing History Count:", history.body.transactions?.length);
  console.log("Latest Transaction Invoice:", history.body.transactions?.[0]?.invoiceNumber, "Status:", history.body.transactions?.[0]?.status);

  console.log("\n--- 7. Testing Expiry Auto-Downgrade ---");
  // Set expiry to past date
  await makeRequest(`/api/users/expiry/${userId}`, "PUT", { isExpired: true });
  const statusExpired = await makeRequest(`/api/subscription/status/${userId}`, "GET");
  console.log("Status after expiry test:", statusExpired.body.user?.subscriptionPlan, "| Was Downgraded:", statusExpired.body.wasDowngraded);

  // Restore active status
  await makeRequest(`/api/users/expiry/${userId}`, "PUT", { isExpired: false });
}

runTests().catch(console.error);
