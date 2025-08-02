import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { FiSend } from "react-icons/fi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFacebook,
  faTwitter,
  faWhatsapp,
} from "@fortawesome/free-brands-svg-icons";
import { faGlobeAmericas } from "@fortawesome/free-solid-svg-icons";
import "./ChatBot.css";
import AnimatedBotMessage from './AnimatedBotMessage'; // Or wherever you placed it
const LoadingDots = () => (
  <div className="loading-dots" style={{ textAlign: 'center', margin: '10px 0' }}>
    <span className="dot">.</span>
    <span className="dot">.</span>
    <span className="dot">.</span>
  </div>
);

const ChatPage = () => {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    document.body.className = theme === "light" ? "light-mode" : "";
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [useUnaApi, setUseUnaApi] = useState(false);
  const messagesEndRef = useRef(null);
  const [currentDate, setCurrentDate] = useState("");
  const [placeholder, setPlaceholder] = useState("اكتب سؤالك هنا....");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Set the document title
    document.title = "UNA BOT";

    // Get today's date in Arabic format
    const date = new Date();
    const formattedDate = new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
    setCurrentDate(formattedDate);
  }, []);

  const formatBotResponse = (text) => {
    // Check if the text already contains HTML tags (indicating it's already processed)
    const containsHtml = /<[^>]+>/.test(text);
    
    if (containsHtml) {
      // If it's already HTML, return as-is
      return text;
    }


    // Process URLs more carefully to avoid corrupting HTML
    const processUrls = (inputText) => {
      // Find all URLs in the text
      const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
      const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i;
      
      return inputText.replace(urlRegex, (url) => {
        // Check if this URL is for an image
        if (imageExtensions.test(url)) {
          const imgTag = `<img src="${url}" alt="Image from bot" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 10px;" />`;
          return imgTag;
        } else {
          const linkTag = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline;">اضغط هنا</a>`;
          return linkTag;
        }
      });
    };

    // First process URLs
    let processedText = processUrls(text);

    const lines = processedText.split('\n');
    let html = '';
    let listType = null;
    let inList = false;

    lines.forEach(line => {
      const trimmedLine = line.trim();

      if (/^\d+\.\s/.test(trimmedLine)) {
        if (!inList || listType !== 'ol') {
          if (inList) html += `</${listType}>`;
          html += '<ol>';
          inList = true;
          listType = 'ol';
        }
        html += `<li>${trimmedLine.substring(trimmedLine.indexOf(' ') + 1)}</li>`;
      } else if (/^-\s/.test(trimmedLine)) {
        if (!inList || listType !== 'ul') {
          if (inList) html += `</${listType}>`;
          html += '<ul>';
          inList = true;
          listType = 'ul';
        }
        html += `<li>${trimmedLine.substring(2)}</li>`;
      } else {
        if (inList) {
          html += `</${listType}>`;
          inList = false;
          listType = null;
        }
        // Only add non-empty lines as paragraphs. This avoids adding empty <p> tags.
        if (trimmedLine) {
          html += `<p>${line}</p>`; // Use original line to preserve content inside tags
        }
      }
    });

    if (inList) {
      html += `</${listType}>`;
    }

    return html;
  };

  function getChatHistory(messages) {
  // Ignore any system/welcome/init messages if needed
  return messages
    .filter(msg => msg.sender === "user" || msg.sender === "bot")
    .map(msg => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.originalText || msg.text // Use originalText if available, fallback to text
    }));
}

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { text: input, sender: "user" }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const history = getChatHistory(newMessages);

    const apiUrl = useUnaApi
      ? "https://unachatbot-po0f.onrender.com/ask_una/"
      : "https://unachatbot-po0f.onrender.com/chat/";


    try {
      const response = await axios.post(apiUrl, { question: input, history });
      const updatedMessages = [...newMessages];

      if (useUnaApi) {
        if (response.data.answer && response.data.answer.length > 0) {
          response.data.answer.forEach((answer) => {
            if (answer.search_url) {
              updatedMessages.push({
                text: `
                  <div style="text-align: center;">
                    <a href="${answer.search_url}"
                       target="_blank"
                       rel="noopener noreferrer"
                       style="color: #007bff; text-decoration: underline; font-weight: bold; display: inline-block; margin-top: 10px; text-align: center;">
                       لللإطلاع على المزيد من الأخبار إضغط هنا
                    </a>
                  </div>
                `,
                sender: "bot",
                icon: "https://i.postimg.cc/YSzf3QQx/chatbot-1.png",
                isHtml: true,
              });
            } else {
              const imageHtml = answer.image_url
                ? `<img src="${answer.image_url}" alt="Image" style="width: 100%; height: auto; margin-top: 10px; border-radius: 10px;">`
                : "";

              updatedMessages.push({
                text: `
                  <div style="border: 1px solid #ddd; border-radius: 10px; overflow: hidden; padding: 15px; margin-bottom: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                    ${imageHtml}
                    <p style="color: #ffffff; font-size: 12px; margin-top: 10px; text-align: center;">${answer.date}</p>
                    <h3 style="font-size: 18px; color: #ffffff; margin-top: 10px;">${answer.title}</h3>
                    <p style="color: #ffffff; font-size: 14px; line-height: 1.6; margin-top: 10px;">${answer.content}</p>
                    <a href="${answer.link}"
                       target="_blank"
                       rel="noopener noreferrer"
                       style="color: #007bff; text-decoration: underline; font-weight: bold; display: inline-block; margin-top: 10px; text-align: center;">
                      أكمل القراءة
                    </a>
                  </div>
                `,
                sender: "bot",
                icon: "https://i.postimg.cc/YSzf3QQx/chatbot-1.png",
                isHtml: true,
              });
            }
          });
        } else {
          updatedMessages.push({
            text: "آسف، لم أتمكن من العثور على إجابة.",
            sender: "bot",
            icon: "https://i.postimg.cc/wB80F6Z9/chatbot.png",
          });
        }
      } else {
        if (response.data.answer_type === "multiple") {
          const overview = response.data.overview_description || "";
          const collapsibleItems = response.data.answer
            .split("\n")
            .filter(line => line.startsWith("-"))
            .map(line => {
              const [titlePart, ...descParts] = line.split(":");
              return {
                title: titlePart.replace("-", "").trim(),
                description: formatBotResponse(descParts.join(":").trim()),
                isExpanded: false
              };
            });

          updatedMessages.push({
            sender: "bot",
            overview: formatBotResponse(overview),
            collapsibleItems: collapsibleItems,
            type: "multipleAnswers"
          });
        } else if (response.data.answer) {
          // Handle "none" response
          if (response.data.answer.trim().toLowerCase() === "none") {
            updatedMessages.push({
              text: "لا توجد إجابة على هذا السؤال في الوقت الحالي. يرجى طرح سؤال آخر.",
              sender: "bot",
              icon: "https://i.postimg.cc/wB80F6Z9/chatbot.png",
            });
          } else {
            const originalAnswer = response.data.answer;

            // No need to check for isRealHtml anymore, our formatter handles it.
            // We format the text into proper HTML (lists, paragraphs) and then add link attributes.
            const formattedText = formatBotResponse(originalAnswer);

            updatedMessages.push({
              text: formattedText,
              originalText: originalAnswer, // Store the original text for chat history
              sender: "bot",
              icon: "https://i.postimg.cc/YSzf3QQx/chatbot-1.png",
              isHtml: true, // Always treat the output as HTML now
            });
          }
        } else {
          updatedMessages.push({
            text: "آسف، لم أتمكن من العثور على الإجابة.",
            sender: "bot",
            icon: "https://i.postimg.cc/wB80F6Z9/chatbot.png",
          });
        }
      }

      setMessages(updatedMessages);
      setIsLoading(false);
    } catch (error) {
      // This is the block that will run for the 404 error
      // It uses your exact desired message.
      console.error("Error sending message:", error.response || error.message);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          text: "<P>عذراً لا يمكنني توفير إجابة لهذا السؤال. أنا لازلت تحت التدريب للإجابة على كل الأسئلة في سياق مجال عملنا. إذا كان سؤالك في هذا المجال، أعدك بتوفير الإجابة في المرة القادمة.</P>",
          sender: "bot",
          icon: "https://i.postimg.cc/wB80F6Z9/chatbot.png",
        },
      ]);
    } finally {
      // This block will ALWAYS run after the try or catch is finished.
      setIsLoading(false); // Set loading OFF
    }
  };

  const toggleItem = (messageIndex, itemIndex) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg, msgIdx) => {
        if (msgIdx === messageIndex && msg.type === "multipleAnswers") {
          return {
            ...msg,
            collapsibleItems: msg.collapsibleItems.map((item, idx) =>
              idx === itemIndex ? { ...item, isExpanded: !item.isExpanded } : item
            ),
          };
        }
        return msg;
      })
    );
  };

  const renderContent = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // فصل الفقرات الأولى عن الباقي
    const firstParagraph = doc.body.firstElementChild?.outerHTML || '';
    const additionalContent = Array.from(doc.body.children)
      .slice(1)
      .map(el => el.outerHTML)
      .join('');

    return {
      main: firstParagraph,
      additional: additionalContent
    };
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.onstart = () => {
      console.log("Voice recognition started. Speak into the microphone.");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      sendMessage(new Event("submit"));
    };

    recognition.onerror = (event) => {
      console.error("Error occurred in recognition: " + event.error);
    };

    recognition.start();
  };

  const handleUnaClick = () => {
    setUseUnaApi(true); // استخدام API الخاص بـ يونا
    setPlaceholder("اسأل عن خبر من منصة يونا..."); // تغيير placeholder
  };

  const handleGeneralClick = () => {
    setUseUnaApi(false); // استخدام API الخاص بالأسئلة العامة
    setPlaceholder("ماذا تريد أن تعرف..."); // تغيير placeholder
  };



  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          title="تبديل الوضع"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

          <img src={theme === "dark" ? "/unalogo-dark.png" : "/unalogo-light.png"} alt="UNA Logo" className="una-logo" />
        <div className="current-date">{currentDate}</div>
      </div>
      {/* Chat messages container */}
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg, index) => {
            const { main } = renderContent(msg.text);






            // For ALL bot messages, use the new animated component
            if (msg.sender === 'bot') {
              return (
                  <div key={index} className={`chat-message ${msg.sender}`}>
                    <div className="message-text">
                      <AnimatedBotMessage htmlContent={msg.text} />
                    </div>
                  </div>
              );
            }
            return (
                <div key={index} className={`chat-message ${msg.sender}`}>
                  <div className="message-text">{msg.text}</div>
                </div>
            );
          })}
          {isLoading && <LoadingDots />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input form */}
      <form onSubmit={sendMessage} className="chat-input-form">
        <div className="api-toggle-buttons-container">
          <button
            type="button"
            onClick={handleGeneralClick}
            className={`api-toggle-button ${!useUnaApi ? "active" : ""}`}
          >
            أسئلة عامة
          </button>
          <button
            type="button"
            onClick={handleUnaClick}
            className={`api-toggle-button ${useUnaApi ? "active" : ""}`}
          >
            (UNA) أسئلة من منصة
          </button>
        </div>
        <div className="form-question-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="chat-input"
          />
          <button
            type="submit"
            className="send-button"
            disabled={isLoading}
            style={{ opacity: isLoading ? 0.6 : 1, cursor: isLoading ? "not-allowed" : "pointer" }}
          >
            <FiSend />
          </button>

          <button
            type="button"
            onMouseDown={startListening}
            className="microphone-button"
          >
            <img
              src="../microphone.png"
              alt="ميكروفون"
              style={{
                width: "27px",
                height: "27px",
              }}
            />
          </button>
        </div>
      </form>

      {/* Buttons for switching question types */}

      {/* Robot animation */}
      <img src="../rob.png" alt="" className="robot-container" />

      {/* Footer */}
      <div className="footer">
        <p>
          © حقوق الطبع والنشر 2025{" "}
          <a
              href="https://una-oic.org/"
              target="_blank"
              rel="noopener noreferrer"
              style={{color: '#2e89a8'}}
          >
            UNA.OIC.ORG
          </a>{" "}
          جميع الحقوق محفوظة
        </p>
        <div className="social-icons">
          <a
              href="https://whatsapp.com/channel/0029Va9VuuE1XquahZEY5S1S"
              target="_blank"
              rel="noopener noreferrer"
          >
            <FontAwesomeIcon icon={faWhatsapp}/>
          </a>
          <a
              href="https://www.facebook.com/unaoic"
              target="_blank"
              rel="noopener noreferrer"
          >
            <FontAwesomeIcon icon={faFacebook}/>
          </a>
          <a
              href="https://una-oic.org/"
              target="_blank"
              rel="noopener noreferrer"
          >
            <FontAwesomeIcon icon={faGlobeAmericas}/>
          </a>
          <a
              href="https://twitter.com/UNAOIC"
              target="_blank"
              rel="noopener noreferrer"
          >
            <FontAwesomeIcon icon={faTwitter}/>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;