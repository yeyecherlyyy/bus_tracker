import { useState, useRef } from "react";
import { chatApi } from "../../api/endpoints";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  async function sendMessage(text) {
    if (!text.trim()) return;

    const userMsg = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await chatApi.send(text.trim());
      setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "bot", text: "Sorry, something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
      sendMessage(transcript);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    setListening(true);
    recognition.start();
  }

  function stopVoice() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  }

  if (!open) {
    return (
      <button className="chat-fab" onClick={() => setOpen(true)} title="Chat with TrackMyBus AI">
        💬
      </button>
    );
  }

  return (
    <div className="chat-widget">
      <div className="chat-header">
        <span>🤖 TrackMyBus AI</span>
        <button className="chat-close" onClick={() => setOpen(false)}>✕</button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-hint">
            Ask me about bus times, routes, or report an issue!
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {loading && <div className="chat-msg chat-msg-bot chat-loading">Thinking...</div>}
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={loading}
        />
        <button
          type="button"
          className={`chat-voice-btn ${listening ? "listening" : ""}`}
          onClick={listening ? stopVoice : startVoice}
          title="Voice input"
        >
          🎤
        </button>
        <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}
