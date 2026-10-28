const http = require("http");

function request(path, method = "GET", body = null) {
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

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runComprehensiveAudit() {
  console.log("================================================================================");
  console.log("STARTING FULL END-TO-END PROJECT VERIFICATION & DATABASE AUDIT");
  console.log("================================================================================\n");

  const userId = "6aaa685bc7a8e4a210c6d15f";
  const videoId = "6aaa688fc7a8e4a210c6d160";

  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = "") {
    total++;
    if (condition) {
      passed++;
      console.log(`  [PASS] ${testName}`);
    } else {
      console.error(`  [FAIL] ${testName}: ${details}`);
    }
  }

  // -------------------------------------------------------------------------
  // 1. MULTILINGUAL COMMENTING SYSTEM AUDIT
  // -------------------------------------------------------------------------
  console.log("--- TEST SUITE 1: MULTILINGUAL COMMENTING SYSTEM ---");

  // 1.1 Post clean comment
  const cleanPost = await request("/api/comments", "POST", {
    userId,
    username: "harikaran",
    videoId,
    text: "This is an extraordinary tutorial! @harikaran Thank you!",
    language: "en"
  });
  assert(cleanPost.status === 201 && cleanPost.body.comment?.id, "1.1 Post Clean Comment & Mongo Storage", JSON.stringify(cleanPost.body));
  const commentId = cleanPost.body.comment?.id;

  // 1.2 Profanity filter
  const badWordPost = await request("/api/comments", "POST", {
    userId,
    username: "harikaran",
    text: "You are an idiot and stupid",
    language: "en"
  });
  assert(badWordPost.status === 400 && badWordPost.body.message.includes("abusive words"), "1.2 Profanity Filter Block", badWordPost.body?.message);

  // 1.3 Spam filter
  const spamPost = await request("/api/comments", "POST", {
    userId,
    username: "harikaran",
    text: "Click here to buy now and get free money winner prize",
    language: "en"
  });
  assert(spamPost.status === 400 && spamPost.body.message.includes("spam"), "1.3 Spam Filter Block", spamPost.body?.message);

  // 1.4 Malicious links
  const linkPost = await request("/api/comments", "POST", {
    userId,
    username: "harikaran",
    text: "Check out this update: https://bit.ly/malicious-link.exe",
    language: "en"
  });
  assert(linkPost.status === 400 && linkPost.body.message.includes("malicious link"), "1.4 Malicious Link Detection", linkPost.body?.message);

  // 1.5 Repeated special characters / emojis
  const symbolPost = await request("/api/comments", "POST", {
    userId,
    username: "harikaran",
    text: "Amazing video !!!!!!!!!!!!!!!",
    language: "en"
  });
  assert(symbolPost.status === 400 && symbolPost.body.message.includes("repeated symbols"), "1.5 Repeated Symbol/Emoji Detection", symbolPost.body?.message);

  // 1.6 Duplicate comment prevention
  const dupPost = await request("/api/comments", "POST", {
    userId,
    username: "harikaran",
    videoId,
    text: "This is an extraordinary tutorial! @harikaran Thank you!",
    language: "en"
  });
  assert(dupPost.status === 400 && dupPost.body.message.includes("Duplicate"), "1.6 Duplicate Comment Prevention", dupPost.body?.message);

  // 1.7 Translation API
  const transRes = await request("/api/translate", "POST", {
    text: "Hello, welcome to our video platform!",
    target: "es",
    source: "en"
  });
  assert(transRes.status === 200 && transRes.body.translated, "1.7 Translation API (en -> es)", transRes.body?.translated);

  // 1.8 Reply to comment
  const replyRes = await request("/api/comments", "POST", {
    userId,
    username: "sophia",
    parentId: commentId,
    text: "I completely agree with @harikaran on this point!",
    language: "en"
  });
  assert(replyRes.status === 201 && replyRes.body.comment?.parentId === commentId, "1.8 Nested Reply to Comment", JSON.stringify(replyRes.body));
  const replyId = replyRes.body.comment?.id;

  // 1.9 Like & Dislike
  const likeRes = await request(`/api/comments/${commentId}/like`, "POST");
  assert(likeRes.status === 200 && likeRes.body.comment?.likes >= 1, "1.9 Like Comment Counter", JSON.stringify(likeRes.body));

  const dislikeRes = await request(`/api/comments/${commentId}/dislike`, "POST");
  assert(dislikeRes.status === 200 && dislikeRes.body.comment?.dislikes >= 1, "1.10 Dislike Comment Counter", JSON.stringify(dislikeRes.body));

  // 1.11 Edit comment with version lock
  const editRes = await request(`/api/comments/${commentId}`, "PUT", {
    text: "This is an extraordinary tutorial! [Edited Note added]",
    expectedVersion: 1
  });
  assert(editRes.status === 200 && editRes.body.comment?.version === 2, "1.11 Edit Comment & Version Increment", JSON.stringify(editRes.body));

  // 1.12 Simultaneous edit concurrency conflict
  const conflictRes = await request(`/api/comments/${commentId}`, "PUT", {
    text: "Concurrent edit conflict test",
    expectedVersion: 1 // Outdated version!
  });
  assert(conflictRes.status === 409 && conflictRes.body.message.includes("conflict"), "1.12 Simultaneous Edit Concurrency Conflict (409)", conflictRes.body?.message);

  // 1.13 Report comment
  const reportRes = await request(`/api/comments/${commentId}/report`, "POST", {
    username: "auditor_user",
    reason: "offensive"
  });
  assert(reportRes.status === 200 && reportRes.body.message.includes("flagged for administrator review"), "1.13 Inappropriate Comment Report", reportRes.body?.message);

  // 1.14 Duplicate report prevention
  const dupReportRes = await request(`/api/comments/${commentId}/report`, "POST", {
    username: "auditor_user",
    reason: "offensive"
  });
  assert(dupReportRes.status === 400 && dupReportRes.body.message.includes("already submitted"), "1.14 Duplicate Report Prevention", dupReportRes.body?.message);

  // 1.15 Delete parent with existing reply (Soft delete preservation)
  const delParent = await request(`/api/comments/${commentId}`, "DELETE");
  assert(delParent.status === 200, "1.15 Delete Parent with Existing Reply Handled", JSON.stringify(delParent.body));

  const allComments = await request(`/api/comments?videoId=${videoId}`, "GET");
  const parentInList = allComments.body.comments?.find((c) => c.id === commentId);
  assert(parentInList && parentInList.deleted === true && parentInList.text === "[Deleted comment]", "1.16 Parent Comment Retained as [Deleted comment] to preserve reply thread", JSON.stringify(parentInList));

  // 1.17 Moderation records
  const modRecords = await request("/api/comments/moderation", "GET");
  assert(modRecords.status === 200 && modRecords.body.records?.length > 0, "1.17 Moderation Records Stored in MongoDB", `Count: ${modRecords.body.records?.length}`);

  // 1.18 Comment Flooding Rate Limiting & CAPTCHA Requirement
  const spammerUser = `spammer_${Date.now()}`;
  const runTag = Date.now();
  for (let i = 0; i < 3; i++) {
    await request("/api/comments", "POST", {
      username: spammerUser,
      text: `Rapid successive comment ${i + 1} - ${runTag}`,
      language: "en"
    });
  }
  const fourthPost = await request("/api/comments", "POST", {
    username: spammerUser,
    text: `Fourth post attempting flood - ${runTag}`,
    language: "en"
  });
  assert(fourthPost.status === 429 && fourthPost.body.requiresCaptcha === true, "1.18 Rate Limiting & Flooding Block with CAPTCHA Requirement (429)", fourthPost.body?.message);

  // 1.19 Rate Limit Bypass with Valid CAPTCHA Token
  const verifiedPost = await request("/api/comments", "POST", {
    username: spammerUser,
    text: `Fourth post with solved CAPTCHA - ${runTag}`,
    language: "en",
    captchaToken: "VALID_CAPTCHA"
  });
  assert(verifiedPost.status === 201, "1.19 Post Allowed After Valid CAPTCHA Verification", verifiedPost.body?.message);


  // -------------------------------------------------------------------------
  // 2. CONTROLLED VIDEO DOWNLOAD MANAGEMENT AUDIT
  // -------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 2: CONTROLLED VIDEO DOWNLOAD SYSTEM ---");

  // Create clean user for quota testing
  const dlUserRes = await request("/api/users/create", "POST", {
    name: "Download Test User",
    email: `dltest_${Date.now()}@example.com`,
    subscriptionPlan: "Free"
  });
  const dlUserId = dlUserRes.body.user?._id;
  await request(`/api/users/device/${dlUserId}`, "PUT", { registeredDevice: "Audit Test Browser" });

  // 2.1 First Download (Free Plan: 1 allowed)
  const dl1 = await request("/api/downloads/download", "POST", {
    userId: dlUserId,
    videoId,
    deviceId: "Audit Test Browser"
  });
  assert(dl1.status === 201 && dl1.body.remainingQuota === 0, "2.1 Free Plan Authorized Download (Quota 1/1 Used)", dl1.body.message);

  // 2.2 15-Minute Duplicate Download Grace Window (Re-downloading same video without burning quota)
  const dlDupe = await request("/api/downloads/download", "POST", {
    userId: dlUserId,
    videoId,
    deviceId: "Audit Test Browser"
  });
  assert(dlDupe.status === 200 && dlDupe.body.isDuplicate === true, "2.2 15-Minute Duplicate Grace Window (No Quota Decrement)", dlDupe.body.message);

  // Wait for 3-second stream start lock to release before testing second video quota
  await new Promise(r => setTimeout(r, 3100));

  // 2.3 Free User Exceeding Daily Limit on Different Video
  const altVideoRes = await request("/api/videos/create", "POST", {
    title: "Second Quota Test Video",
    fileSize: "50 MB",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
  });
  const altVideoId = altVideoRes.body.video?._id;
  const dlExceed = await request("/api/downloads/download", "POST", {
    userId: dlUserId,
    videoId: altVideoId,
    deviceId: "Audit Test Browser"
  });
  assert(dlExceed.status === 403 && dlExceed.body.message.includes("Daily download limit reached"), "2.3 Daily Download Limit Enforced (Free Plan Blocked from >1/day)", dlExceed.body.message);

  // 2.4 Registered Device Binding Lock
  const dlDeviceMismatch = await request("/api/downloads/download", "POST", {
    userId: dlUserId,
    videoId,
    deviceId: "Unregistered Rogue Device"
  });
  assert(dlDeviceMismatch.status === 403 && dlDeviceMismatch.body.message.includes("Unauthorized device"), "2.4 Unauthorized Device Binding Check", dlDeviceMismatch.body.message);

  // 2.5 Subscription Expiry Check
  await request(`/api/users/expiry/${dlUserId}`, "PUT", { isExpired: true });
  const dlExpired = await request("/api/downloads/download", "POST", {
    userId: dlUserId,
    videoId,
    deviceId: "Audit Test Browser"
  });
  assert(dlExpired.status === 403 && dlExpired.body.message.includes("expired"), "2.5 Download Rejected After Subscription Expiry", dlExpired.body.message);
  await request(`/api/users/expiry/${dlUserId}`, "PUT", { isExpired: false }); // restore

  // 2.6 Simultaneous Download Prevention
  const dlConcurrent = await request("/api/downloads/download", "POST", {
    userId: dlUserId,
    videoId,
    deviceId: "Audit Test Browser",
    simulateConcurrent: true
  });
  assert(dlConcurrent.status === 429 && dlConcurrent.body.message.includes("Simultaneous"), "2.6 Simultaneous Download Stream Block (429)", dlConcurrent.body.message);

  // 2.7 Download History Audit Records in MongoDB
  const dlHistory = await request(`/api/downloads/history/${dlUserId}`, "GET");
  assert(dlHistory.status === 200 && dlHistory.body.downloads?.length > 0, "2.7 Complete Download Records Stored in MongoDB", `Records: ${dlHistory.body.downloads?.length}`);


  // -------------------------------------------------------------------------
  // 3. COMPREHENSIVE SUBSCRIPTION MANAGEMENT AUDIT
  // -------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 3: SUBSCRIPTION MANAGEMENT & RAZORPAY TEST PAYMENT ---");

  // 3.1 Get Plans & Specs
  const plansRes = await request("/api/subscription/plans", "GET");
  assert(plansRes.status === 200 && plansRes.body.pricing?.Gold?.yearly === 8999, "3.1 Plans Matrix & Pricing Matrix (Free, Bronze, Silver, Gold)", JSON.stringify(plansRes.body.pricing));

  // 3.2 Create Razorpay Order
  const createOrderRes = await request("/api/subscription/create-order", "POST", {
    userId,
    plan: "Silver",
    billingCycle: "quarterly"
  });
  assert(createOrderRes.status === 200 && createOrderRes.body.orderId, "3.2 Razorpay Order Creation", JSON.stringify(createOrderRes.body));
  const orderId = createOrderRes.body.orderId;

  // 3.3 Verify Successful Payment & Premium Activation
  const verifyRes = await request("/api/subscription/verify-payment", "POST", {
    userId,
    razorpayOrderId: orderId,
    razorpayPaymentId: `pay_audit_${Date.now()}`,
    plan: "Silver",
    billingCycle: "quarterly",
    simulateResult: "success"
  });
  assert(verifyRes.status === 200 && verifyRes.body.user?.subscriptionPlan === "Silver", "3.3 Successful Razorpay Payment Verification & Plan Upgrade", verifyRes.body.message);
  assert(verifyRes.body.user?.adFree === true && verifyRes.body.user?.streamingQuality === "1080p Full HD", "3.4 Premium Benefits Activated (1080p Full HD, Ad-Free)", `Quality: ${verifyRes.body.user?.streamingQuality}`);

  // 3.5 Duplicate Payment Attempt Detection
  const dupPayRes = await request("/api/subscription/verify-payment", "POST", {
    userId,
    razorpayOrderId: orderId,
    razorpayPaymentId: verifyRes.body.transaction?.razorpayPaymentId,
    plan: "Silver",
    billingCycle: "quarterly",
    simulateResult: "duplicate"
  });
  assert(dupPayRes.status === 400 && dupPayRes.body.message.includes("Duplicate"), "3.5 Duplicate Payment Attempt Detection", dupPayRes.body.message);

  // 3.6 Failed Payment / Card Decline Simulation
  const failPayRes = await request("/api/subscription/verify-payment", "POST", {
    userId,
    razorpayOrderId: "order_fail_sim",
    plan: "Gold",
    simulateResult: "failed",
    failureReason: "Card declined by bank"
  });
  assert(failPayRes.status === 400 && failPayRes.body.transaction?.status === "Failed", "3.6 Failed Payment Logged to Database Without Upgrading", failPayRes.body.message);

  // 3.7 Cancel Subscription & Auto-Renew Off
  const cancelRenewRes = await request("/api/subscription/cancel-subscription", "POST", {
    userId,
    immediateDowngrade: false
  });
  assert(cancelRenewRes.status === 200 && cancelRenewRes.body.user?.autoRenew === false, "3.7 Cancel Subscription: Auto-Renew Disabled while preserving active validity", cancelRenewRes.body.message);

  // 3.8 Expiry Auto-Downgrade to Free
  await request(`/api/users/expiry/${userId}`, "PUT", { isExpired: true });
  const statusAfterExp = await request(`/api/subscription/status/${userId}`, "GET");
  assert(statusAfterExp.status === 200 && statusAfterExp.body.wasDowngraded === true && statusAfterExp.body.user?.subscriptionPlan === "Free", "3.8 Expired Subscription Auto-Downgraded to Free Plan", `Plan: ${statusAfterExp.body.user?.subscriptionPlan}`);
  await request(`/api/users/expiry/${userId}`, "PUT", { isExpired: false });

  // 3.9 Billing & Invoices History in MongoDB
  const billHistory = await request(`/api/subscription/history/${userId}`, "GET");
  assert(billHistory.status === 200 && billHistory.body.transactions?.length > 0, "3.9 Billing History & Invoice Records Stored in MongoDB", `Count: ${billHistory.body.transactions?.length}`);


  // -------------------------------------------------------------------------
  // 4. PERSONALIZED & SECURE USER EXPERIENCE AUDIT
  // -------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 4: LOGIN TIME ADAPTATION & SECURITY AUDIT ---");

  // 4.1 Morning IST Light Theme Simulation (5 AM to 12 PM IST)
  const mornSim = await request("/api/security/simulate-login", "POST", {
    userId,
    scenario: "morning_ist"
  });
  assert(mornSim.body.theme === "light" && mornSim.body.timeInfo?.isLightWindow === true, "4.1 IST 5 AM - 12 PM Auto Light Theme Detection", `Theme: ${mornSim.body.theme}`);

  // 4.2 Evening IST Dark Theme Simulation (12 PM to 5 AM IST)
  const eveSim = await request("/api/security/simulate-login", "POST", {
    userId,
    scenario: "evening_ist"
  });
  assert(eveSim.body.theme === "dark" && eveSim.body.timeInfo?.isLightWindow === false, "4.2 IST Other Times Auto Dark Theme Detection", `Theme: ${eveSim.body.theme}`);

  // 4.3 New Browser / Location Triggers OTP Verification
  const newLocSim = await request("/api/security/simulate-login", "POST", {
    userId,
    scenario: "new_location"
  });
  assert(newLocSim.body.requiresOtp === true && newLocSim.body.otpCode, "4.3 New IP/Location Triggers OTP Verification Code", `Code: ${newLocSim.body.otpCode}`);
  const secOtp = newLocSim.body.otpCode;
  const historyId = newLocSim.body.historyId;

  // 4.4 Verify OTP & Mark Trusted Device for 30 Days
  const verifyOtpRes = await request("/api/security/verify-otp", "POST", {
    userId,
    otpCode: secOtp,
    trustDevice: true,
    historyId,
    browser: "Chrome 128.0",
    ipAddress: "185.220.101.4",
    city: "Mumbai",
    state: "Maharashtra"
  });
  assert(verifyOtpRes.status === 200 && verifyOtpRes.body.trustedDevice, "4.4 Verify OTP & Save Trusted Device in MongoDB", verifyOtpRes.body.message);

  // 4.5 Trusted Device List
  const trustedList = await request(`/api/security/trusted-devices/${userId}`, "GET");
  assert(trustedList.status === 200 && trustedList.body.devices?.length > 0, "4.5 Trusted Devices List Fetched", `Devices: ${trustedList.body.devices?.length}`);

  // 4.6 Revoke Trusted Device
  if (trustedList.body.devices?.[0]?._id) {
    const revRes = await request(`/api/security/trusted-devices/${trustedList.body.devices[0]._id}`, "DELETE");
    assert(revRes.status === 200 && revRes.body.device?.isRevoked === true, "4.6 Revoke Trusted Device Session", revRes.body.message);
  }

  // 4.7 Login Audit History Logs
  const loginAudit = await request(`/api/security/history/${userId}`, "GET");
  assert(loginAudit.status === 200 && loginAudit.body.history?.length > 0, "4.7 Detailed Login Audit Information in MongoDB", `Logs: ${loginAudit.body.history?.length}`);


  // -------------------------------------------------------------------------
  // 5. HTML5 VIDEO PLAYER & WATCH PROGRESS AUDIT
  // -------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 5: HTML5 VIDEO PLAYER & WATCH PROGRESS ---");

  // 5.1 Save Periodic Watch Progress
  const saveProg = await request("/api/videos/progress", "POST", {
    userId,
    videoId,
    lastPosition: 120,
    duration: 300,
    completionThreshold: 90
  });
  assert(saveProg.status === 200 && saveProg.body.progress?.lastPosition === 120, "5.1 Save Watch Position to MongoDB", `Position: ${saveProg.body.progress?.lastPosition}s`);

  // 5.2 Fetch Saved Position for Auto-Resume
  const getProg = await request(`/api/videos/progress/${userId}/${videoId}`, "GET");
  assert(getProg.status === 200 && getProg.body.progress?.lastPosition === 120, "5.2 Fetch Saved Position for Playback Auto-Resume", `Position: ${getProg.body.progress?.lastPosition}s`);

  // 5.3 Mark Completed when Threshold Exceeded (e.g. 280s / 300s = 93% >= 90%)
  const markComp = await request("/api/videos/progress", "POST", {
    userId,
    videoId,
    lastPosition: 280,
    duration: 300,
    completionThreshold: 90
  });
  assert(markComp.status === 200 && markComp.body.progress?.isCompleted === true, "5.3 Mark Video Completed upon reaching Watch Percentage Threshold", `isCompleted: ${markComp.body.progress?.isCompleted}`);


  // -------------------------------------------------------------------------
  // 6. REAL-TIME VIDEO CALLING AUDIT
  // -------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 6: REAL-TIME VIDEO CALLING CONFERENCING ---");

  // 6.1 Create Meeting Room
  const createMeeting = await request("/api/meetings/create", "POST", {
    userId,
    userName: "Hari Karan",
    title: "Sprint Planning Conference",
    accessCode: "9876",
    maxParticipants: 10
  });
  assert(createMeeting.status === 201 && createMeeting.body.meeting?.roomId, "6.1 Create Meeting Room in MongoDB", `RoomId: ${createMeeting.body.meeting?.roomId}`);
  const roomId = createMeeting.body.meeting?.roomId;

  // 6.2 Join Meeting Room with Access Code
  const joinMeeting = await request("/api/meetings/join", "POST", {
    roomId,
    userId: "user-bob",
    userName: "Bob Dylan",
    accessCode: "9876"
  });
  assert(joinMeeting.status === 200 && joinMeeting.body.meeting?.participants?.length >= 2, "6.2 Join Meeting Room with Access Code", `Participants: ${joinMeeting.body.meeting?.participants?.length}`);

  // 6.3 In-Call Chat Message
  const chatRes = await request(`/api/meetings/${roomId}/chat`, "POST", {
    senderId: userId,
    senderName: "Hari Karan",
    text: "Hello everyone, let's start the video conference!"
  });
  assert(chatRes.status === 201 && chatRes.body.chatMessage?.text, "6.3 In-Call Chat Message Saved to Meeting in MongoDB", chatRes.body.chatMessage?.text);

  // 6.4 Update Participant State (Mic Mute / Camera Off / Hand Raise)
  const stateRes = await request(`/api/meetings/${roomId}/participant-state`, "PUT", {
    userId: "user-bob",
    isMuted: true,
    isHandRaised: true
  });
  const bobP = stateRes.body.meeting?.participants?.find((p) => p.userId === "user-bob");
  assert(stateRes.status === 200 && bobP?.isMuted === true && bobP?.isHandRaised === true, "6.4 Participant State Sync (Muted & Hand Raised)", JSON.stringify(bobP));

  // 6.5 Host Moderation: Lock Room
  const modLock = await request(`/api/meetings/${roomId}/moderation`, "PUT", {
    requesterId: userId,
    action: "toggle-lock",
    isLocked: true
  });
  assert(modLock.status === 200 && modLock.body.meeting?.isLocked === true, "6.5 Host Moderation: Lock Meeting Room", `isLocked: ${modLock.body.meeting?.isLocked}`);

  // 6.6 Host Moderation: Mute Participant
  const modMute = await request(`/api/meetings/${roomId}/moderation`, "PUT", {
    requesterId: userId,
    action: "mute-participant",
    targetUserId: "user-bob"
  });
  assert(modMute.status === 200, "6.6 Host Moderation: Mute Participant", modMute.body.message);

  // 6.7 Leave Meeting
  const leaveRes = await request(`/api/meetings/${roomId}/leave`, "POST", {
    userId: "user-bob"
  });
  assert(leaveRes.status === 200, "6.7 Participant Leave Meeting Room", leaveRes.body.message);


  // -------------------------------------------------------------------------
  // FINAL SCORE & SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`AUDIT RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("================================================================================\n");
}

runComprehensiveAudit().catch(console.error);
