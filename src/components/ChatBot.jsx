import React, { useEffect, useRef, useState, useCallback } from "react";
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
  const [useTreeApi, setUseTreeApi] = useState(false);
  const [treeQuestions, setTreeQuestions] = useState([]);
  const [showTreeOptions, setShowTreeOptions] = useState(false);
  const [treePath, setTreePath] = useState([]);
  const messagesEndRef = useRef(null);
  const [currentDate, setCurrentDate] = useState("");
  const [placeholder, setPlaceholder] = useState("اكتب سؤالك هنا....");
  const [isLoading, setIsLoading] = useState(false);
  const [isBotAnimating, setIsBotAnimating] = useState(false);

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

  // Helper function to ensure all links have target="_blank" attribute
  const addLinkTargetAttribute = (html) => {
    return html.replace(/<a(?![^>]*target=)/g, '<a target="_blank" rel="noopener noreferrer"');
  };

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
      line = line.trim();

      // If the line is empty, skip it and do nothing.
      // This prevents it from closing the list.
      if (!line) {
        return;
      }

      if (/^[\d١-٩]+\.\s/.test(line)) { // Matches "1. ", "2. ", "١. ", "٢. ", etc.
        if (!inList || listType !== 'ol') {
          if (inList) html += `</${listType}>`;
          html += '<ol>';
          inList = true;
          listType = 'ol';
        }
        html += `<li>${line.substring(line.indexOf(' ') + 1)}</li>`;
      } else if (/^-\s/.test(line)) { // Matches "- "
        if (!inList || listType !== 'ul') {
          if (inList) html += `</${listType}>`;
          html += '<ul>';
          inList = true;
          listType = 'ul';
        }
        html += `<li>${line.substring(2)}</li>`;
      } else {
        // This part now only runs for non-empty, non-list lines
        if (inList) {
          html += `</${listType}>`;
          inList = false;
          listType = null;
        }
        // Add sentence formatting with <br> after periods (from old function)
        const formattedLine = line.replace(/\.\s/g, '.<br> ');
        html += `<p>${formattedLine}</p>`;
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

// Function to fetch tree questions
const fetchTreeQuestions = async () => {
  try {
    const response = await axios.get("http://127.0.0.1:8000/api/tree/");
    console.log("Tree questions response:", response.data);
    return response.data.tree || [];
  } catch (error) {
    console.error("Error fetching tree questions:", error);
    return [];
  }
};

// Function to fetch tree questions by language
const fetchTreeQuestionsByLanguage = async (language) => {
  try {
    const response = await axios.post("http://127.0.0.1:8000/api/tree-by-language/", {
      language: language.toLowerCase()
    });
    console.log("Tree questions by language response:", response.data);
    return response.data.tree || [];
  } catch (error) {
    console.error("Error fetching tree questions by language:", error);
    return [];
  }
};

// Function to handle language selection
const handleLanguageSelection = async (language, messageId) => {
  setIsLoading(true);
  setIsBotAnimating(true);
  
  // Hide the current language selection options
  const updatedMessages = messages.map(msg => {
    if (msg.id === messageId && msg.type === 'languageSelection') {
      return { ...msg, hidden: true };
    }
    return msg;
  });
  
  // Add user's language selection as a message
  updatedMessages.push({
    text: `اللغة المختارة: ${language}`,
    sender: "user",
    id: Date.now(),
  });
  
  try {
    // Fetch tree questions for the selected language
    const questions = await fetchTreeQuestionsByLanguage(language);
    console.log("Questions fetched for language:", language, questions);
    setTreeQuestions(questions);
    
    // Add language confirmation message
    const languageConfirmMessage = {
      text: `تم اختيار اللغة ${language} بنجاح! يمكنك الآن اختيار أحد الأسئلة التالية:`,
      sender: "bot",
      icon: "https://i.postimg.cc/YSzf3QQx/chatbot-1.png",
      id: Date.now() + 1,
    };
    
    // Add questions as options
    const questionsMessage = {
      text: "",
      sender: "bot",
      type: "treeQuestions",
      questions: Array.isArray(questions) ? questions : [],
      showBackButton: false,
      id: Date.now() + 2,
    };
    
    updatedMessages.push(languageConfirmMessage, questionsMessage);
    setMessages(updatedMessages);
    setIsLoading(false);
  } catch (error) {
    console.error("Error processing language selection:", error);
    const errorMessage = {
      text: "آسف، حدث خطأ في جلب الأسئلة للغة المختارة. يرجى المحاولة مرة أخرى.",
      sender: "bot",
      icon: "https://i.postimg.cc/wB80F6Z9/chatbot.png",
      id: Date.now() + 1,
    };
    updatedMessages.push(errorMessage);
    setMessages(updatedMessages);
    setIsLoading(false);
  }
};

// Function to handle tree question selection
const handleTreeQuestionSelect = async (question, messageId) => {
  setIsLoading(true);
  const shouldAnimateAnswer = Boolean(question.answer);
  if (shouldAnimateAnswer) {
    setIsBotAnimating(true);
  }
  
  // Hide the current options by removing the message that contains them
  const updatedMessages = messages.map(msg => {
    if (msg.id === messageId && msg.type === 'treeQuestions') {
      return { ...msg, hidden: true };
    }
    return msg;
  });
  
  // Add user's selection as a message
  updatedMessages.push({
    text: question.title,
    sender: "user",
    id: Date.now(),
  });
  
  try {
    // First, show navigation options (buttons) before the answer
    
     // Always show navigation options
     if (question.has_children && question.children && question.children.length > 0) {
       // Update path for navigation
       setTreePath(prev => [...prev, question]);
       
       const childrenMessage = {
         text: "",
         sender: "bot",
         type: "treeQuestions",
         questions: question.children,
         showBackButton: true,
         currentPath: treePath.length + 1, // Add path level info
         id: Date.now() + 1,
       };
       
       updatedMessages.push(childrenMessage);
     } else {
       // If no children, show the current level questions again with back options
       const currentLevelQuestions = treePath.length > 0 ? 
         (treePath[treePath.length - 1].children || treeQuestions) : 
         treeQuestions;
       
       const questionsMessage = {
         text: "",
         sender: "bot",
         type: "treeQuestions", 
         questions: currentLevelQuestions,
         showBackButton: treePath.length > 0,
         currentPath: treePath.length,
         id: Date.now() + 1,
       };
       
       updatedMessages.push(questionsMessage);
     }
    
    // Then, show the answer after the navigation options
    if (question.answer) {
      const formattedText = formatBotResponse(question.answer);
      
       updatedMessages.push({
         text: formattedText,
         originalText: question.answer,
         sender: "bot",
         icon: "https://i.postimg.cc/YSzf3QQx/chatbot-1.png",
         isHtml: true,
         id: Date.now() + Math.random() + 10, // Higher ID to ensure it comes after buttons
       });
    } else if (!question.answer && (!question.has_children || !question.children || question.children.length === 0)) {
      // If no answer and no children, show error
      updatedMessages.push({
        text: "آسف، لا توجد معلومات متاحة لهذا السؤال.",
        sender: "bot",
        icon: "https://i.postimg.cc/wB80F6Z9/chatbot.png",
        id: Date.now() + Math.random() + 10,
      });
    }
    
    setMessages(updatedMessages);
    setIsLoading(false);
    if (!shouldAnimateAnswer) {
      setIsBotAnimating(false);
    }
  } catch (error) {
    console.error("Error processing question:", error);
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        text: "آسف، حدث خطأ في معالجة السؤال.",
        sender: "bot",
        icon: "https://i.postimg.cc/wB80F6Z9/chatbot.png",
      },
    ]);
    setIsLoading(false);
    setIsBotAnimating(false);
  }
};

// Function to go back in tree navigation
const handleTreeGoBack = (messageId) => {
  if (treePath.length === 0) return;
  
  const newPath = [...treePath];
  newPath.pop(); // Remove last item
  setTreePath(newPath);
  
  // Hide the current options
  const updatedMessages = messages.map(msg => {
    if (msg.id === messageId && msg.type === 'treeQuestions') {
      return { ...msg, hidden: true };
    }
    return msg;
  });
  
  // Add back navigation message
  updatedMessages.push({
    text: "← العودة للخلف",
    sender: "user",
    id: Date.now(),
  });
  
  if (newPath.length === 0) {
    // Back to root level
    const questionsMessage = {
      text: "",
      sender: "bot",
      type: "treeQuestions",
      questions: treeQuestions,
      showBackButton: false,
      id: Date.now() + 1,
    };
    updatedMessages.push(questionsMessage);
  } else {
    // Back to parent level
    const parentQuestion = newPath[newPath.length - 1];
    const questionsMessage = {
      text: "",
      sender: "bot",
      type: "treeQuestions",
      questions: parentQuestion.children,
        showBackButton: true, // Always show back button when not at root
        currentPath: newPath.length,
      id: Date.now() + 1,
    };
    updatedMessages.push(questionsMessage);
  }
  
  setMessages(updatedMessages);
};

  const sendMessage = async (e) => {
  e.preventDefault();
  if (!input.trim() || useTreeApi) return; // Don't send messages in tree mode

  const userMessage = { text: input, sender: "user", id: Date.now() };
  const newMessages = [...messages, userMessage];
  setMessages(newMessages);
  setInput("");
  setIsLoading(true);
  setIsBotAnimating(true); // Start animating

  const history = getChatHistory(newMessages);

  const apiUrl = useUnaApi
      ? "https://unachatbot-po0f.onrender.com/ask_una/"
      : "https://unachatbot-po0f.onrender.com/chat/";

  try {

    const response = await axios.post(
      apiUrl,
        { question: input, history }
    );

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
        if (response.data.answer.trim().toLowerCase() === "none") {
          updatedMessages.push({
            text: "لا توجد إجابة على هذا السؤال في الوقت الحالي. يرجى طرح سؤال آخر.",
            sender: "bot",
            icon: "https://i.postimg.cc/wB80F6Z9/chatbot.png",
          });
        } else {
          const originalAnswer = response.data.answer;
          const formattedText = formatBotResponse(originalAnswer);

          updatedMessages.push({
            text: formattedText,
            originalText: originalAnswer,
            sender: "bot",
            icon: "https://i.postimg.cc/YSzf3QQx/chatbot-1.png",
            isHtml: true,
            id: Date.now() + Math.random(),
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
    console.error("Error sending message:", error.response || error.message);
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        text: "<P>عذراً لا يمكنني توفير إجابة لهذا السؤال. أنا لازلت تحت التدريب للإجابة على كل الأسئلة في سياق مجال عملنا. إذا كان سؤالك في هذا المجال، أعدك بتوفير الإجابة في المرة القادمة.</P>",
        sender: "bot",
        icon: "https://i.postimg.cc/wB80F6Z9/chatbot.png",
      },
    ]);
  }
};

  const handleAnimationComplete = useCallback(() => {
    setIsBotAnimating(false);
  }, []);

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
    
    // Configure for Arabic language
    recognition.lang = 'ar-SA'; // Arabic (Saudi Arabia) - you can also use 'ar-EG' for Egyptian Arabic
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

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
      if (event.error === 'language-not-supported') {
        alert("Arabic language is not supported by your browser for speech recognition.");
      }
    };

    recognition.start();
  };

  const handleGeneralClick = () => {
  setUseUnaApi(false);
  setUseTreeApi(false);
  setIsBotAnimating(false);
  setIsLoading(false);
  setPlaceholder("ماذا تريد أن تعرف...");
};

  const handleUnaClick = () => {
  setUseUnaApi(true);
  setUseTreeApi(false);
  setPlaceholder("اسأل عن خبر من منصة يونا...");
};

  const handleTreeClick = async () => {
  setUseUnaApi(false);
  setUseTreeApi(true);
  setPlaceholder("الرجاء اختيار سؤال من الخيارات أدناه (لا يمكن الكتابة في هذا الوضع)");
  setIsLoading(true);
  setTreePath([]); // Reset navigation path
  
  // Add welcome message
  const welcomeMessage = {
    text: "مرحباً بك في شجرة المعرفة! 🌳<br><br>يرجى اختيار اللغة التي تريد عرض الأسئلة بها:",
    sender: "bot",
    icon: "https://i.postimg.cc/YSzf3QQx/chatbot-1.png",
    isHtml: true,
    id: Date.now(),
  };
  
  // Add language selection options
  const languageMessage = {
    text: "",
    sender: "bot",
    type: "languageSelection",
    languages: ["AR", "EN", "FR"],
    id: Date.now() + 1,
  };
  
  setMessages(prevMessages => [...prevMessages, welcomeMessage, languageMessage]);
  setShowTreeOptions(true);
  setIsLoading(false);
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
          {messages.filter(msg => !msg.hidden).map((msg, index) => {
            const isLastMessage = index === messages.length - 1;
            const { main } = renderContent(msg.text);

            // Handle language selection display
            if (msg.type === 'languageSelection') {
              return (
                <div key={msg.id || `language-selection-${index}`} className="language-selection-wrapper" style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  margin: '12px 0',
                  padding: '0 15px'
                }}>
                  <div className="language-selection-container" style={{
                    width: '100%',
                    maxWidth: '300px',
                    padding: '10px',
                    borderRadius: '0px',
                    backgroundColor: 'transparent',
                    backdropFilter: 'none',
                    border: 'none',
                    boxShadow: 'none'
                  }}>
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '8px',
                      color: theme === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.8)',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                       اختر اللغة:
                    </div>
                    
                    {/* Show language options */}
                    {msg.languages && Array.isArray(msg.languages) && msg.languages.map((language, langIndex) => (
                      <button
                        key={language}
                        className="language-option"
                        onClick={() => handleLanguageSelection(language, msg.id)}
                        style={{
                          display: 'block',
                          width: '100%',
                          margin: '6px 0',
                          padding: '12px 15px',
                          backgroundColor: theme === 'light' ? '#f5f5f5' : 'white',
                          color: theme === 'light' ? 'black' : '#0a4c5a',
                          border: theme === 'light' ? '1px solid #e0e0e0' : 'none',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '14px',
                          fontWeight: '600',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          boxShadow: theme === 'light' ? '0 2px 8px rgba(0, 0, 0, 0.1)' : '0 2px 8px rgba(255, 255, 255, 0.15)',
                          letterSpacing: '0.2px'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.backgroundColor = theme === 'light' ? '#e0e0e0' : 'rgba(255, 255, 255, 0.9)';
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = theme === 'light' ? '0 6px 20px rgba(0, 0, 0, 0.2)' : '0 6px 20px rgba(255, 255, 255, 0.3)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.backgroundColor = theme === 'light' ? '#f5f5f5' : 'white';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = theme === 'light' ? '0 2px 8px rgba(0, 0, 0, 0.1)' : '0 4px 15px rgba(255, 255, 255, 0.2)';
                        }}
                      >
                        {language === 'AR' ? 'العربية' : language === 'EN' ? 'English' : language === 'FR' ? 'Français' : language}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            // Handle tree questions display
            if (msg.type === 'treeQuestions') {
              return (
                <div key={msg.id || `tree-questions-${index}`} className="tree-questions-wrapper" style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  margin: '12px 0',
                  padding: '0 15px'
                }}>
                  <div className="tree-questions-container" style={{
                    width: '100%',
                    maxWidth: '300px',
                    padding: '10px',
                    borderRadius: '0px',
                    backgroundColor: 'transparent',
                    backdropFilter: 'none',
                    border: 'none',
                    boxShadow: 'none'
                  }}>
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '8px',
                      color: theme === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.8)',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                       اختر من الخيارات التالية:
                    </div>
                    {msg.showBackButton && (
                      <button
                        className="tree-back-button"
                        onClick={() => handleTreeGoBack(msg.id)}
                        style={{
                          display: 'block',
                          width: '100%',
                          margin: '4px 0 10px 0',
                          padding: '10px 15px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 8px rgba(220, 53, 69, 0.2)',
                          position: 'relative',
                        }}
                        onMouseOver={(e) => {
                          e.target.style.backgroundColor = '#c82333';
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 6px 20px rgba(220, 53, 69, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.backgroundColor = '#dc3545';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 15px rgba(220, 53, 69, 0.3)';
                        }}
                      >
                        🔙 العودة للقائمة السابقة
                      </button>
                    )}
                    
                    {/* Always show "Back to Main Menu" button if we're not at root level */}
                    {treePath.length > 0 && (
                      <button
                        className="tree-main-menu-button"
                        onClick={() => {
                          // Reset to main menu
                          setTreePath([]);
                          const updatedMessages = messages.map(m => {
                            if (m.id === msg.id && m.type === 'treeQuestions') {
                              return { ...m, hidden: true };
                            }
                            return m;
                          });
                          
                          // Add user message
                          updatedMessages.push({
                            text: "🏠 العودة للقائمة الرئيسية",
                            sender: "user",
                            id: Date.now(),
                          });
                          
                          // Add main menu questions
                          const questionsMessage = {
                            text: "",
                            sender: "bot",
                            type: "treeQuestions",
                            questions: treeQuestions,
                            showBackButton: false,
                            id: Date.now() + 1,
                          };
                          updatedMessages.push(questionsMessage);
                          setMessages(updatedMessages);
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          margin: '0 0 20px 0',
                          padding: '14px 20px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '25px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '15px',
                          fontWeight: '600',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 3px 12px rgba(40, 167, 69, 0.3)',
                        }}
                        onMouseOver={(e) => {
                          e.target.style.backgroundColor = '#218838';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 5px 15px rgba(40, 167, 69, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.backgroundColor = '#28a745';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 3px 12px rgba(40, 167, 69, 0.3)';
                        }}
                      >
                        🏠 العودة للقائمة الرئيسية
                      </button>
                    )}
                    
                     {/* Show questions */}
                     {msg.questions && Array.isArray(msg.questions) && msg.questions.map((question, qIndex) => (
                      <button
                        key={question.id || qIndex}
                        className="tree-question-option"
                        onClick={() => handleTreeQuestionSelect(question, msg.id)}
                        style={{
                          display: 'block',
                          width: '100%',
                          margin: '6px 0',
                          padding: '10px 15px',
                          backgroundColor: theme === 'light' ? '#f5f5f5' : 'white',
                          color: theme === 'light' ? 'black' : '#0a4c5a',
                          border: theme === 'light' ? '1px solid #e0e0e0' : 'none',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          boxShadow: theme === 'light' ? '0 2px 8px rgba(0, 0, 0, 0.1)' : '0 2px 8px rgba(255, 255, 255, 0.15)',
                          letterSpacing: '0.2px'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.backgroundColor = theme === 'light' ? '#e0e0e0' : 'rgba(255, 255, 255, 0.9)';
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = theme === 'light' ? '0 6px 20px rgba(0, 0, 0, 0.2)' : '0 6px 20px rgba(255, 255, 255, 0.3)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.backgroundColor = theme === 'light' ? '#f5f5f5' : 'white';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = theme === 'light' ? '0 2px 8px rgba(0, 0, 0, 0.1)' : '0 4px 15px rgba(255, 255, 255, 0.2)';
                        }}
                      >
                        {question.title}
                        {question.has_children && (
                          <span style={{ 
                            marginRight: '10px', 
                            fontSize: '12px',
                            opacity: 0.8,
                            backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(10, 76, 90, 0.15)',
                            color: theme === 'light' ? 'black' : '#0a4c5a',
                            padding: '6px 12px',
                            borderRadius: '15px',
                            display: 'inline-block',
                            fontWeight: '500'
                          }}>
                          </span>
                        )}
                      </button>
                    ))}
                    {(!msg.questions || !Array.isArray(msg.questions) || msg.questions.length === 0) && (
                      <p style={{ 
                        color: theme === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)', 
                        textAlign: 'center', 
                        padding: '30px 20px',
                        fontSize: '16px',
                        fontWeight: '400',
                        backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '15px',
                        border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        لا توجد أسئلة متاحة حالياً 🤔
                      </p>
                    )}
                  </div>
                </div>
              );
            }

            // For ALL bot messages, use the new animated component
            if (msg.sender === 'bot') {
              return (
                  <div key={msg.id || `bot-${index}`} className={`chat-message ${msg.sender}`}>
                    <div className="message-text">
                      <AnimatedBotMessage
                        htmlContent={msg.text}
                        onAnimationComplete={isLastMessage ? handleAnimationComplete : undefined}
                      />
                    </div>
                  </div>
              );
            }
            return (
                <div key={msg.id || `user-${index}`} className={`chat-message ${msg.sender}`}>
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
            className={`api-toggle-button ${!useUnaApi && !useTreeApi ? "active" : ""}`}
        >
          اسألني
        </button>

        <button
          type="button"
          onClick={handleUnaClick}
          className={`api-toggle-button ${useUnaApi ? "active" : ""}`}
        >
          (UNA) أسئلة من منصة
        </button>

        <button
          type="button"
          onClick={handleTreeClick}
          className={`api-toggle-button ${useTreeApi ? "active" : ""}`}
        >
          الأسئلة الشائعة
        </button>

        </div>
        <div className="form-question-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="chat-input"
            disabled={useTreeApi}
            style={{
              opacity: useTreeApi ? 0.5 : 1,
              cursor: useTreeApi ? 'not-allowed' : 'text'
            }}
          />
          <button
            type="submit"
            className="send-button"
            disabled={isLoading || isBotAnimating || useTreeApi}
            style={{ 
              opacity: isLoading || isBotAnimating || useTreeApi ? 0.6 : 1, 
              cursor: isLoading || isBotAnimating || useTreeApi ? "not-allowed" : "pointer" 
            }}
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
          حقوق الطبع والنشر 2025{" "}
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