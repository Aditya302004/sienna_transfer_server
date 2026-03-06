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
    console.log("Incoming request:", JSON.stringify(req.body, null, 2));
    
    const body = req.body;
    const message = body.message;
    const call = body.call;
    
    // Handle different VAPI request formats
    const toolCall = message?.toolCallList?.[0] || message?.toolCalls?.[0];
    const department = toolCall?.function?.arguments?.department || toolCall?.arguments?.department;
    const controlUrl = call?.monitor?.controlUrl;
    const dept = DEPARTMENTS[department];

    if (!dept || !controlUrl) {
      console.log("Missing dept or controlUrl:", { department, controlUrl });
      return res.json({ results: [{ toolCallId: toolCall?.id, result: "error" }] });
    }

    // Respond to VAPI immediately
    res.json({
      results: [{ toolCallId: toolCall.id, result: "transferring" }]
    });

    // Initiate transfer
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

    // Cancel after 15 seconds if not answered
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
