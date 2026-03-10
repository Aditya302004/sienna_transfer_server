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

function findControlUrl(obj, depth = 0) {
  if (depth > 10 || !obj || typeof obj !== "object") return undefined;
  if (obj.controlUrl) return obj.controlUrl;
  for (const key of Object.keys(obj)) {
    const result = findControlUrl(obj[key], depth + 1);
    if (result) return result;
  }
  return undefined;
}

app.post("/transfer", async (req, res) => {
  try {
    const body = req.body;
    const message = body.message;
    const toolCall = message?.toolCallList?.[0] || message?.toolCalls?.[0];
    const department = toolCall?.function?.arguments?.department || toolCall?.arguments?.department;
    const dept = DEPARTMENTS[department];
    const controlUrl = findControlUrl(body);

    console.log("Found controlUrl:", controlUrl);
    console.log("Department:", department);

    if (!dept || !controlUrl) {
      console.log("Missing dept or controlUrl:", { department, controlUrl });
      return res.json({ results: [{ toolCallId: toolCall?.id, result: "error" }] });
    }

    // Respond to VAPI immediately
    res.json({
      results: [{ toolCallId: toolCall.id, result: "transferring" }]
    });

    // Initiate transfer
    const transferResponse = await fetch(controlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.VAPI_API_KEY}`
      },
      body: JSON.stringify({
        type: "transfer",
        destination: {
          type: "number",
          number: dept.number
        }
      })
    });

    const transferResult = await transferResponse.text();
    console.log("Transfer response:", transferResult);

    // Start 15 second timer then cancel if not answered
    setTimeout(async () => {
      try {
        // Step 1 — cancel the transfer
        const cancelResponse = await fetch(controlUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.VAPI_API_KEY}`
          },
          body: JSON.stringify({
            type: "cancel-transfer"
          })
        });
        const cancelResult = await cancelResponse.text();
        console.log("Cancel response:", cancelResult);

        // Step 2 — Sienna speaks immediately after cancel
        const sayResponse = await fetch(controlUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.VAPI_API_KEY}`
          },
          body: JSON.stringify({
            type: "say",
            content: "I'm sorry about that, the team are unavailable at the moment. Would you like to leave your details and someone will call you back as soon as possible?",
            immediate: true
          })
        });
        const sayResult = await sayResponse.text();
        console.log("Say response:", sayResult);

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
