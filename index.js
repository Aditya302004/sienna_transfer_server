const express = require("express");
const app = express();
app.use(express.json());

// Department phone numbers
const DEPARTMENTS = {
  sales: "+447860377531",
  lettings: "+447860377531",
  property_management: "+447860377531",
  accounts: "+447860377531",
  tenancy_progression: "+447860377531"
};

// Caller IDs per department
const CALLER_IDS = {
  sales: "+447782357559",
  lettings: "+442038550904",
  property_management: "+447782357559",
  accounts: "+447782357559",
  tenancy_progression: "+447782357559"
};

app.post("/transfer", async (req, res) => {
  try {
    const { call, message } = req.body;
    const toolCall = message.toolCallList[0];
    const department = toolCall.arguments.department;
    const controlUrl = call.monitor.controlUrl;
    const destinationNumber = DEPARTMENTS[department];
    const callerId = CALLER_IDS[department];

    // Immediately acknowledge the tool call so Sienna doesn't time out
    res.json({
      results: [{ toolCallId: toolCall.id, result: "transferring" }]
    });

    // Initiate the transfer
    await fetch(controlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.VAPI_API_KEY}`
      },
      body: JSON.stringify({
        type: "transfer-call",
        destination: {
          type: "number",
          number: destinationNumber,
          callerId: callerId
        }
      })
    });

    // Wait 15 seconds then cancel if not answered
    setTimeout(async () => {
      try {
        await fetch(controlUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.VAPI_API_KEY}`
          },
          body: JSON.stringify({
            type: "end-call"
          })
        });
      } catch (err) {
        console.log("Cancel transfer error:", err.message);
      }
    }, 15000);

  } catch (err) {
    console.error("Error:", err);
  }
});

app.get("/", (req, res) => res.send("Sienna Transfer Server Running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
