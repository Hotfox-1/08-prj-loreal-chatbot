/* Find the page elements that the chatbot needs to update. */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");
const latestQuestion = document.getElementById("latestQuestion");
const latestQuestionBox = document.querySelector(".latest-question");

// Replace this example address with the Worker URL provided by your instructor.
// Never put an OpenAI API key in this public frontend file.
const WORKER_URL = "https://loreal-bot.dracunyan2000.workers.dev/";

// Keep earlier questions and replies so the assistant can follow the conversation.
const conversation = [
  {
    role: "system",
    content:
      "You are a warm, concise L’Oréal beauty assistant. Only answer questions about L’Oréal products, skincare, haircare, makeup, fragrance, beauty routines, and beauty recommendations. If a request is unrelated to these topics, politely say you can help with L’Oréal and beauty questions, then invite the user to ask one. Do not invent product details, ingredients, availability, or results; say when you are unsure. Do not diagnose or treat medical conditions, and suggest consulting a qualified professional for medical concerns. Use relevant details the user has shared in this conversation to personalize on-topic answers.",
  },
];

// Add a message using textContent so user text is never treated as HTML.
function addMessage(role, text, isPending = false) {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  const label = document.createElement("span");
  label.className = "message-label";
  label.textContent = role === "user" ? "You" : "Beauty assistant";

  const bubble = document.createElement("div");
  bubble.className = `msg ${role === "user" ? "user" : "ai"}`;
  if (isPending) {
    bubble.classList.add("pending");
  }
  bubble.textContent = text;

  row.append(label, bubble);
  chatWindow.appendChild(row);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return bubble;
}

// Start with a friendly welcome in the conversation area.
addMessage(
  "ai",
  "Hello! Tell me what you’re looking for, and I’ll help you explore L’Oréal beauty products and routines.",
);

/* Send each question to the Cloudflare Worker and show the reply. */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = userInput.value.trim();

  if (!question) {
    return;
  }

  // Show the latest question above the chat and add it to the conversation.
  latestQuestion.textContent = question;
  latestQuestionBox.hidden = false;
  addMessage("user", question);
  const answerBubble = addMessage("ai", "Thinking…", true);
  conversation.push({ role: "user", content: question });
  userInput.value = "";
  sendBtn.disabled = true;

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversation }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "The assistant could not reply right now.");
    }

    const reply = data.choices?.[0]?.message?.content;
    if (!reply) {
      throw new Error("The assistant returned an empty reply. Please try again.");
    }

    answerBubble.classList.remove("pending");
    answerBubble.textContent = reply;
    conversation.push({ role: "assistant", content: reply });
  } catch (error) {
    // Keep failed requests out of the conversation history so they can be retried.
    conversation.pop();
    answerBubble.classList.remove("pending");
    answerBubble.textContent =
      error.message === "Failed to fetch"
        ? "I couldn’t reach the chat service. Check the Worker URL and your connection, then try again."
        : error.message;
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
});
