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

async function runSecurityTests() {
  const userId = "6aaa685bc7a8e4a210c6d15f";

  console.log("--- 1. Testing Standard Login & IST Time Theme Detection ---");
  const loginNormal = await makeRequest("/api/security/login", "POST", {
    userId,
    browser: "Chrome 128.0",
    ipAddress: "103.21.124.89",
    city: "Chennai"
  });
  console.log("Normal Login Result:", loginNormal.status, "Resolved Theme:", loginNormal.body.theme, "IST Time:", loginNormal.body.timeInfo?.timeStringIST);

  console.log("\n--- 2. Testing Morning IST Time Simulation (08:30 AM IST) ---");
  const morningTest = await makeRequest("/api/security/simulate-login", "POST", {
    userId,
    scenario: "morning_ist"
  });
  console.log("Morning IST Test (Expected: light):", morningTest.body.theme, "Is Light Window:", morningTest.body.timeInfo?.isLightWindow);

  console.log("\n--- 3. Testing Evening IST Time Simulation (08:30 PM IST) ---");
  const eveningTest = await makeRequest("/api/security/simulate-login", "POST", {
    userId,
    scenario: "evening_ist"
  });
  console.log("Evening IST Test (Expected: dark):", eveningTest.body.theme, "Is Light Window:", eveningTest.body.timeInfo?.isLightWindow);

  console.log("\n--- 4. Testing New Location & IP Risk Check (Mumbai IP: 185.220.101.4) ---");
  const newLocationLogin = await makeRequest("/api/security/simulate-login", "POST", {
    userId,
    scenario: "new_location"
  });
  console.log("New Location Result - Requires OTP:", newLocationLogin.body.requiresOtp, "Risk Flags:", newLocationLogin.body.riskFlags, "OTP Code:", newLocationLogin.body.otpCode);

  console.log("\n--- 5. Testing OTP Verification ---");
  const otpToVerify = newLocationLogin.body.otpCode;
  const verifyResult = await makeRequest("/api/security/verify-otp", "POST", {
    userId,
    otpCode: otpToVerify,
    trustDevice: true,
    historyId: newLocationLogin.body.historyId,
    browser: "Chrome 128.0",
    ipAddress: "185.220.101.4",
    city: "Mumbai",
    state: "Maharashtra"
  });
  console.log("Verify OTP Result:", verifyResult.status, verifyResult.body.message);

  console.log("\n--- 6. Testing Trusted Devices List ---");
  const trustedDevs = await makeRequest(`/api/security/trusted-devices/${userId}`, "GET");
  console.log("Active Trusted Devices Count:", trustedDevs.body.devices?.length, "Device Name:", trustedDevs.body.devices?.[0]?.deviceName);

  console.log("\n--- 7. Testing Login Audit History Logs ---");
  const auditLogs = await makeRequest(`/api/security/history/${userId}`, "GET");
  console.log("Login Audit History Count:", auditLogs.body.history?.length);
  console.log("Latest Log Status:", auditLogs.body.history?.[0]?.status, "Location:", auditLogs.body.history?.[0]?.locationString);

  if (trustedDevs.body.devices?.[0]?._id) {
    console.log("\n--- 8. Testing Revoke Trusted Device ---");
    const revokeRes = await makeRequest(`/api/security/trusted-devices/${trustedDevs.body.devices[0]._id}`, "DELETE");
    console.log("Revoke Device Result:", revokeRes.status, revokeRes.body.message);
  }
}

runSecurityTests().catch(console.error);
