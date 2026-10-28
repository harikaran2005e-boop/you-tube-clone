const express = require("express");
const router = express.Router();
const Meeting = require("../models/Meeting");

// Create Video Call Meeting Room
router.post("/create", async (req, res) => {
  try {
    const { userId, userName, title, accessCode, maxParticipants = 10 } = req.body;

    const roomId = `call-${Math.floor(100000 + Math.random() * 900000)}`;

    const newMeeting = await Meeting.create({
      roomId,
      title: title || "High-Quality Video Conference",
      hostId: userId,
      accessCode: accessCode || "",
      maxParticipants,
      participants: [
        {
          userId,
          name: userName || "Host User",
          isHost: true,
          isCoHost: true,
          isMuted: false,
          isCameraOff: false,
          isHandRaised: false
        }
      ]
    });

    res.status(201).json({
      message: "Video call meeting room created successfully",
      meeting: newMeeting
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create video meeting room",
      error: error.message
    });
  }
});

// Join Video Call Meeting Room
router.post("/join", async (req, res) => {
  try {
    const { roomId, userId, userName, accessCode } = req.body;

    let meeting = await Meeting.findOne({ roomId, status: "active" });

    if (!meeting) {
      meeting = await Meeting.create({
        roomId,
        title: roomId.includes("demo") ? "Team Demo Room" : (roomId.includes("design") ? "Design Review Room" : `Meeting Room (${roomId})`),
        hostId: userId || "host-system",
        accessCode: accessCode || "",
        maxParticipants: 15,
        participants: [
          { userId: "user-201", name: "Alex Rivers", isHost: false, isCoHost: false, isMuted: false, isCameraOff: false, isHandRaised: false },
          { userId: "user-202", name: "Sophia Chen", isHost: false, isCoHost: true, isMuted: true, isCameraOff: false, isHandRaised: true }
        ]
      });
    }

    if (meeting.isLocked) {
      return res.status(403).json({ message: "Meeting room is locked by the host" });
    }

    if (meeting.accessCode && meeting.accessCode !== accessCode) {
      return res.status(401).json({ message: "Invalid meeting access code" });
    }

    if (meeting.participants.length >= meeting.maxParticipants) {
      return res.status(400).json({ message: `Room limit reached (Max ${meeting.maxParticipants} participants)` });
    }

    // Check if user already in room
    const existingIndex = meeting.participants.findIndex((p) => p.userId === userId);

    if (existingIndex >= 0) {
      meeting.participants[existingIndex].name = userName || meeting.participants[existingIndex].name;
    } else {
      meeting.participants.push({
        userId,
        name: userName || `Participant ${meeting.participants.length + 1}`,
        isHost: meeting.participants.length === 0,
        isCoHost: false,
        isMuted: false,
        isCameraOff: false,
        isHandRaised: false
      });
    }

    await meeting.save();

    res.status(200).json({
      message: "Joined video call meeting successfully",
      meeting
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to join video call meeting",
      error: error.message
    });
  }
});

// Get Meeting Details & Active Participants
router.get("/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    let meeting = await Meeting.findOne({ roomId });

    if (!meeting) {
      if (roomId.startsWith("call-")) {
        meeting = await Meeting.create({
          roomId,
          title: roomId.includes("demo") ? "Team Demo Room" : (roomId.includes("design") ? "Design Review Room" : `Meeting Room (${roomId})`),
          hostId: "host-system",
          maxParticipants: 15,
          participants: [
            { userId: "user-201", name: "Alex Rivers", isHost: false, isCoHost: false, isMuted: false, isCameraOff: false, isHandRaised: false },
            { userId: "user-202", name: "Sophia Chen", isHost: false, isCoHost: true, isMuted: true, isCameraOff: false, isHandRaised: true }
          ]
        });
      } else {
        return res.status(404).json({ message: "Meeting room not found" });
      }
    }

    res.status(200).json({
      message: "Meeting details fetched",
      meeting
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch meeting details",
      error: error.message
    });
  }
});

// Post In-Call Chat Message
router.post("/:roomId/chat", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { senderId, senderName, text, fileName, fileUrl } = req.body;

    const meeting = await Meeting.findOne({ roomId, status: "active" });
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (!meeting.allowChat) {
      return res.status(403).json({ message: "In-call chat is currently disabled by host" });
    }

    const newMessage = {
      id: `msg-${Date.now()}`,
      senderId,
      senderName,
      text: text || "",
      fileName: fileName || "",
      fileUrl: fileUrl || "",
      timestamp: new Date()
    };

    meeting.chatMessages.push(newMessage);
    await meeting.save();

    res.status(201).json({
      message: "Chat message sent",
      chatMessage: newMessage
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to send chat message",
      error: error.message
    });
  }
});

// Update Participant State (Mic, Camera, Hand Raise)
router.put("/:roomId/participant-state", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, isMuted, isCameraOff, isHandRaised } = req.body;

    const meeting = await Meeting.findOne({ roomId, status: "active" });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    const participant = meeting.participants.find((p) => p.userId === userId);
    if (!participant) return res.status(404).json({ message: "Participant not found in meeting" });

    if (typeof isMuted === "boolean") participant.isMuted = isMuted;
    if (typeof isCameraOff === "boolean") participant.isCameraOff = isCameraOff;
    if (typeof isHandRaised === "boolean") participant.isHandRaised = isHandRaised;

    await meeting.save();

    res.status(200).json({
      message: "Participant state updated",
      meeting
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update participant state",
      error: error.message
    });
  }
});

// Host Moderation Actions
router.put("/:roomId/moderation", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { requesterId, action, targetUserId, isLocked, allowScreenShare, allowChat } = req.body;

    const meeting = await Meeting.findOne({ roomId, status: "active" });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    const requester = meeting.participants.find((p) => p.userId === requesterId);
    if (!requester || (!requester.isHost && !requester.isCoHost)) {
      return res.status(403).json({ message: "Host or Co-Host privileges required" });
    }

    if (action === "toggle-lock") {
      meeting.isLocked = typeof isLocked === "boolean" ? isLocked : !meeting.isLocked;
    } else if (action === "toggle-screenshare") {
      meeting.allowScreenShare = typeof allowScreenShare === "boolean" ? allowScreenShare : !meeting.allowScreenShare;
    } else if (action === "toggle-chat") {
      meeting.allowChat = typeof allowChat === "boolean" ? allowChat : !meeting.allowChat;
    } else if (action === "mute-participant" && targetUserId) {
      const target = meeting.participants.find((p) => p.userId === targetUserId);
      if (target) target.isMuted = true;
    } else if (action === "mute-all") {
      meeting.participants.forEach((p) => {
        if (p.userId !== requesterId) p.isMuted = true;
      });
    } else if (action === "remove-participant" && targetUserId) {
      meeting.participants = meeting.participants.filter((p) => p.userId !== targetUserId);
    } else if (action === "assign-cohost" && targetUserId) {
      const target = meeting.participants.find((p) => p.userId === targetUserId);
      if (target) target.isCoHost = true;
    }

    await meeting.save();

    res.status(200).json({
      message: `Moderation action "${action}" applied successfully`,
      meeting
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to execute moderation action",
      error: error.message
    });
  }
});

// Leave or End Meeting
router.post("/:roomId/leave", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, endMeetingForAll } = req.body;

    const meeting = await Meeting.findOne({ roomId });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    const requester = meeting.participants.find((p) => p.userId === userId);

    if (endMeetingForAll && requester && (requester.isHost || requester.isCoHost)) {
      meeting.status = "ended";
      meeting.participants = [];
    } else {
      meeting.participants = meeting.participants.filter((p) => p.userId !== userId);
    }

    await meeting.save();

    res.status(200).json({
      message: endMeetingForAll ? "Meeting ended for all participants" : "Left meeting successfully",
      meeting
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to leave meeting",
      error: error.message
    });
  }
});

module.exports = router;
