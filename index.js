const express = require("express");
const app = express();
app.use(express.json());

const DEPARTMENTS = {
  sales: { number: "+447860377531" },
  lettings: { number: "+447860377531" },
  property_management: { number: "+447860377531" },
  accounts: { number: "+447860377531" },
  tenancy_progression: { number: "+447860377531" }
};

app.post("/transfer", async (req, res) => {
  try {
    const body = req.body;
    const message = body.message;
    const toolCall = message?.toolCallList?.[0] || message?.toolCalls?.[0];
    const department = toolCall?.function?.arguments?.department || toolCall?.arguments?.department;
    const dept = DEPARTMENTS[department];

    console.log("Department:", department);

    if (!dept) {
      console.log("Missing department:", department);
      return res.json({ results: [{ toolCallId: toolCall?.id, result: "error" }] });
    }

    const transferPayload = {
      type: "transferCall",
      function: { name: "route_to_department" },
      destinations: [
        {
          type: "number",
          number: dept.number,
          transferPlan: {
            mode: "warm-transfer-experimental",
            transferAssistant: {
              firstMessage: "Hello, I have a caller for your department. Are you available to take this call?",
              firstMessageMode: "assistant-speaks-first",
              maxDurationSeconds: 15,
              silenceTimeoutSeconds: 10,
              model: {
                provider: "openai",
                model: "gpt-4o",
                messages: [
                  {
                    role: "system",
                    content: "You are a transfer assistant for Right Now Residential. When the operator answers, tell them you have a caller for their department and ask if they are available. If they say yes, call transferSuccessful. If they say no, do not answer, or you detect voicemail, call transferCancel immediately."
                  }
                ]
              }
            }
          }
        }
      ],
      messages: [
        {
          type: "request-start",
          content: "Of course, just bear with me one moment while I connect you."
        },
        {
          type: "request-failed",
          content: "I'm sorry about that, the team are unavailable at the moment. Would you like to leave your details and someone will call you back as soon as possible?"
        }
      ]
    };

    console.log("Sending warm transfer for department:", department);
    res.json(transferPayload);

  } catch (err) {
    console.error("Error:", err);
  }
});

app.get("/", (req, res) => res.send("Sienna Transfer Server Running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
