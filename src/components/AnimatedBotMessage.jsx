import React, { useState, useEffect, useRef } from 'react';

const AnimatedBotMessage = ({ htmlContent }) => {
    const [displayedContent, setDisplayedContent] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const timeoutRef = useRef(null);

    useEffect(() => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Reset state for new content
        setDisplayedContent('');
        setIsTyping(true);

        // Create a temporary div to parse HTML and extract text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';

        let currentIndex = 0;
        const typeSpeed = 30; // milliseconds per character

        const typeWriter = () => {
            if (currentIndex < textContent.length) {
                setDisplayedContent(textContent.substring(0, currentIndex + 1));
                currentIndex++;
                timeoutRef.current = setTimeout(typeWriter, typeSpeed);
            } else {
                // When typing is complete, show the full HTML content
                setIsTyping(false);
                setDisplayedContent(htmlContent);
            }
        };

        // Start typing after a small delay
        timeoutRef.current = setTimeout(typeWriter, 100);

        // Cleanup function
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [htmlContent]);

    if (isTyping) {
        // While typing, show only text content
        return (
            <div className="typing-animation">
                {displayedContent}
                <span className="typing-cursor">|</span>
            </div>
        );
    } else {
        // When typing is complete, show full HTML content
        return (
            <div 
                key={htmlContent} // Force re-render when content changes
                className="typed-complete"
                dangerouslySetInnerHTML={{ __html: displayedContent }}
            />
        );
    }
};

export default AnimatedBotMessage;