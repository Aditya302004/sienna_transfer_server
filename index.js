const express = require("express");
const app = express();
app.use(express.json());

const DEPARTMENTS = {
  sales: { number: "+447860377531", callerId: "+447782357559" },
  lettings: { number: "+447860377531", callerId: "+442038550904" },
  property_management: { number: "+447860377531", callerId: "+447782357559" },
  accounts: { number: "+447860377531", callerId: "+447782357559" },
  tenancy_progression: { number: "+447860377531", callerId: "+447782357559" }
};

app.post("/transfer", async (req, res) => {
  try {
    const { call, message } = req.body;
    const toolCall = message.toolCallList[0];
    const department = toolCall.arguments.department;
    const controlUrl = call.monitor.controlUrl;
    const dept = DEPARTMENTS[department];

    // Respond to VAPI immediately so it doesn't timeout
    res.json({
      results: [{ toolCallId: toolCall.id, result: "transferring" }]
    });

    // Initiate transfer after responding
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
          number: dept.number,
          callerId: dept.callerId
        }
      })
    });

    // Wait 15 seconds then cancel transfer
    setTimeout(async () => {
      try {
        await fetch(controlUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.VAPI_API_KEY}`
          },
          body: JSON.stringify({ type: "cancel-transfer" })
        });
      } catch (err) {
        console.log("Cancel error:", err.message);
      }
    }, 15000);

  } catch (err) {
    console.error("Error:", err);
  }
});

app.get("/", (req, res) => res.send("Sienna Transfer Server Running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
